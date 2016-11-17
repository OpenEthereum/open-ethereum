// Copyright 2015, 2016 Ethcore (UK) Ltd.
// This file is part of Parity.

// Parity is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Parity is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Parity.  If not, see <http://www.gnu.org/licenses/>.

//! Client-side stratum job dispatcher and mining notifier handler

use ethcore_stratum::{JobDispatcher, RemoteWorkHandler, PushWorkHandler};
use std::sync::{Arc, Weak};
use std::sync::atomic::Ordering;
use std::thread;
use nanoipc;
use util::{H256, U256, FixedHash, H64, clean_0x};
use ethereum::ethash::Ethash;
use ethash::SeedHashCompute;
use util::{Mutex, RwLock};
use miner::{Miner, MinerService};
use client::Client;
use block::IsBlock;
use std::str::FromStr;
use rlp::encode;

/// IPC socket dedicated to stratum
pub const STRATUM_SOCKET_NAME: &'static str = "parity-stratum.ipc";
/// IPC socket for job dispatcher
pub const JOB_DISPATCHER_SOCKET_NAME: &'static str = "parity-mining-jobs.ipc";

/// Job dispatcher for stratum service
pub struct StratumJobDispatcher {
	last_work: RwLock<Option<(H256, U256, u64)>>,
	seed_compute: Mutex<SeedHashCompute>,
	client: Weak<Client>,
	miner: Weak<Miner>,
}

impl JobDispatcher for StratumJobDispatcher {
	fn initial(&self) -> Option<String> {
		// initial payload may contain additional data, not in this case
		self.job()
	}

	fn job(&self) -> Option<String> {
		self.with_core(|client, miner| {
			if let Some((pow_hash, difficulty, number)) = miner.map_sealing_work(&*client, |b| {
				let pow_hash = b.hash();
				let number = b.block().header().number();
				let difficulty = b.block().header().difficulty();

				(pow_hash, *difficulty, number)
			}) {
				*self.last_work.write() = Some((pow_hash, difficulty, number));
				Some(self.payload(pow_hash, difficulty, number))
			} else { None }
		})
	}

	fn submit(&self, payload: Vec<String>) {
		if payload.len() != 3 {
			warn!(target: "stratum", "submit_work: invalid work submit request({:?})", payload);
		}
		else {
			trace!(target: "stratum", "submit_work: {} {} {}", &payload[0], &payload[1], &payload[2]);
		}

		let nonce = match H64::from_str(clean_0x(&payload[0])) {
			Ok(nonce) => nonce,
			Err(e) => {
				warn!(target: "stratum", "submit_work ({}): invalid nonce ({:?})", &payload[0], e);
				return;
			}
		};

		let pow_hash = match H256::from_str(clean_0x(&payload[1])) {
			Ok(pow_hash) => pow_hash,
			Err(e) => {
				warn!(target: "stratum", "submit_work ({}): invalid hash ({:?})", &payload[1], e);
				return;
			}
		};

		let mix_hash = match H256::from_str(clean_0x(&payload[2])) {
			Ok(mix_hash) => mix_hash,
			Err(e) => {
				warn!(target: "stratum", "submit_work ({}): invalid mix-hash ({:?})",  &payload[2], e);
				return;
			}
		};

		trace!(target: "stratum", "submit_work: Decoded: nonce={}, pow_hash={}, mix_hash={}", nonce, pow_hash, mix_hash);
		let client = self.client.upgrade().unwrap();
		let miner = self.miner.upgrade().unwrap();

		let seal = vec![encode(&mix_hash).to_vec(), encode(&nonce).to_vec()];
		if let Err(e) = miner.submit_seal(&*client, pow_hash, seal) {
			warn!(target: "stratum", "submit_work error: {:?}", e);
		};
	}
}

impl StratumJobDispatcher {
	/// New stratum job dispatcher given the miner and client
	fn new(miner: Weak<Miner>, client: Weak<Client>) -> StratumJobDispatcher {
		StratumJobDispatcher {
			seed_compute: Mutex::new(SeedHashCompute::new()),
			last_work: RwLock::new(None),
			client: client,
			miner: miner,
		}
	}

	/// Serializes payload for stratum service
	fn payload(&self, pow_hash: H256, difficulty: U256, number: u64) -> String {
		// TODO: move this to engine
		let target = Ethash::difficulty_to_boundary(&difficulty);
		let seed_hash = &self.seed_compute.lock().get_seedhash(number);
		let seed_hash = H256::from_slice(&seed_hash[..]);
		format!(
			r#"["0x", "0x{}","0x{}","0x{}","0x{:x}"]"#,
			pow_hash.hex(), seed_hash.hex(), target.hex(), number
		)
	}

	fn with_core<F, R>(&self, f: F) -> Option<R> where F: Fn(Arc<Client>, Arc<Miner>) -> Option<R> {
		self.client.upgrade().and_then(|client| self.miner.upgrade().and_then(|miner| (f)(client, miner)))
	}
}

/// Wrapper for dedicated stratum service
pub struct Stratum {
	dispatcher: Arc<StratumJobDispatcher>,
	base_dir: String,
	stop: ::devtools::StopGuard,
}

#[derive(Debug)]
/// Stratum error
pub enum Error {
	/// IPC sockets error
	Nano(nanoipc::SocketError),
}

impl From<nanoipc::SocketError> for Error {
	fn from(socket_err: nanoipc::SocketError) -> Error { Error::Nano(socket_err) }
}

impl super::work_notify::NotifyWork for Stratum {
	#[allow(unused_must_use)]
	fn notify(&self, pow_hash: H256, difficulty: U256, number: u64) {
		nanoipc::generic_client::<RemoteWorkHandler<_>>(&format!("ipc://{}/ipc/{}", self.base_dir, STRATUM_SOCKET_NAME))
			.and_then(|client| {
				client.push_work_all(
					self.dispatcher.payload(pow_hash, difficulty, number)
				).unwrap_or_else(
					|e| warn!(target: "stratum", "Error while pushing work: {:?}", e)
				);
				*self.dispatcher.last_work.write() = Some((pow_hash, difficulty, number));
				Ok(client)
			})
			.map_err(|e| warn!(target: "stratum", "Can't connect to stratum service: {:?}", e));
	}
}

impl Stratum {
	/// New stratum job dispatcher, given the miner, client and dedicated stratum service
	pub fn new(base_dir: &str, miner: Weak<Miner>, client: Weak<Client>) -> Result<Stratum, Error> {
		Ok(Stratum {
			dispatcher: Arc::new(StratumJobDispatcher::new(miner, client)),
			base_dir: base_dir.to_owned(),
			stop: ::devtools::StopGuard::new(),
		})
	}

	/// Run stratum job dispatcher in separate thread
	pub fn run_async(&self) {
		let socket_url = format!("ipc://{}/ipc/{}", &self.base_dir, JOB_DISPATCHER_SOCKET_NAME);
		let stop = self.stop.share();
		let service = self.dispatcher.clone() as Arc<JobDispatcher>;
		thread::spawn(move || {
			let mut worker = nanoipc::Worker::<JobDispatcher>::new(&service);
			worker.add_reqrep(&socket_url).unwrap();

			while !stop.load(Ordering::Relaxed) {
				worker.poll();
			}
		});
	}
}
