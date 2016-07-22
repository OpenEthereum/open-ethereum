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

//! Block chunker and rebuilder tests.

use devtools::RandomTempPath;

use blockchain::generator::{ChainGenerator, ChainIterator, BlockFinalizer};
use blockchain::BlockChain;
use snapshot::{chunk_blocks, BlockRebuilder};
use snapshot::io::{PackedReader, PackedWriter, SnapshotReader, SnapshotWriter};

use util::{Mutex, snappy};

fn chunk_and_restore(amount: u64) {
	let mut canon_chain = ChainGenerator::default();
	let mut finalizer = BlockFinalizer::default();
	let genesis = canon_chain.generate(&mut finalizer).unwrap();

	let orig_path = RandomTempPath::create_dir();
	let new_path = RandomTempPath::create_dir();
	let mut snapshot_path = new_path.as_path().to_owned();
	snapshot_path.push("SNAP");

	let bc = BlockChain::new(Default::default(), &genesis, orig_path.as_path());

	// build the blockchain.
	for _ in 0..amount {
		let block = canon_chain.generate(&mut finalizer).unwrap();
		bc.insert_block(&block, vec![]);
	}

	let best_hash = bc.best_block_hash();

	// snapshot it.
	let mut writer = Mutex::new(PackedWriter::new(&snapshot_path).unwrap());
	let block_hashes = chunk_blocks(&bc, (amount, best_hash), &writer).unwrap();
	writer.into_inner().finish(::snapshot::ManifestData {
		state_hashes: Vec::new(),
		block_hashes: block_hashes,
		state_root: Default::default(),
		block_number: amount,
		block_hash: best_hash,
	}).unwrap();

	// restore it.
	let new_chain = BlockChain::new(Default::default(), &genesis, new_path.as_path());
	let mut rebuilder = BlockRebuilder::new(new_chain).unwrap();
	let reader = PackedReader::new(&snapshot_path).unwrap().unwrap();
	let engine = ::null_engine::NullEngine::new(Default::default(), Default::default());
	for chunk_hash in &reader.manifest().block_hashes {
		let compressed = reader.chunk(*chunk_hash).unwrap();
		let chunk = snappy::decompress(&compressed).unwrap();
		rebuilder.feed(&chunk, &engine).unwrap();
	}

	rebuilder.glue_chunks();
	drop(rebuilder);

	// and test it.
	let new_chain = BlockChain::new(Default::default(), &genesis, new_path.as_path());
	assert_eq!(new_chain.best_block_hash(), best_hash);
}

#[test]
fn chunk_and_restore_500() { chunk_and_restore(500) }

#[test]
fn chunk_and_restore_40k() { chunk_and_restore(40000) }