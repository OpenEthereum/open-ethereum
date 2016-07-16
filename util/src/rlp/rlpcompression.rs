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

use rlp::{UntrustedRlp, View, Compressible, encode, ElasticArray1024, Stream, RlpStream};
use rlp::commonrlps::INVALID_RLP_SWAPPER;
use std::collections::HashMap;

/// Stores RLPs used for compression
pub struct InvalidRlpSwapper<'a> {
	invalid_to_valid: HashMap<&'a [u8], &'a [u8]>,
	valid_to_invalid: HashMap<&'a [u8], &'a [u8]>,
}

impl<'a> InvalidRlpSwapper<'a> {
	/// Construct a swapper from a list of common RLPs
	pub fn new(rlps_to_swap: &[&'a [u8]], invalid_rlps: &[&'a [u8]]) -> Self {
		if rlps_to_swap.len() > 0x7e {
			panic!("Invalid usage, only 127 RLPs can be swappable.");
		}
		let mut invalid_to_valid = HashMap::new();
		let mut valid_to_invalid = HashMap::new();
		for (&rlp, &invalid) in rlps_to_swap.iter().zip(invalid_rlps.iter()) {
			invalid_to_valid.insert(invalid, rlp);
			valid_to_invalid.insert(rlp, invalid);
		}
		InvalidRlpSwapper {
			invalid_to_valid: invalid_to_valid,
			valid_to_invalid: valid_to_invalid
		}
	}
	/// Get a valid RLP corresponding to an invalid one
	fn get_valid(&self, invalid_rlp: &[u8]) -> Option<&[u8]> {
		self.invalid_to_valid.get(invalid_rlp).map(|r| r.clone())
	}
	/// Get an invalid RLP corresponding to a valid one
	fn get_invalid(&self, valid_rlp: &[u8]) -> Option<&[u8]> {
		self.valid_to_invalid.get(valid_rlp).map(|r| r.clone())
	}
}

#[test]
fn invalid_rlp_swapper() {
	let to_swap: &[&[u8]] = &[&[0x83, b'c', b'a', b't'], &[0x83, b'd', b'o', b'g']];
	let invalid_rlp: &[&[u8]] = &[&[0x81, 0x00], &[0x81, 0x01]];
	let swapper = InvalidRlpSwapper::new(to_swap, invalid_rlp);
	assert_eq!(Some(invalid_rlp[0]), swapper.get_invalid(&[0x83, b'c', b'a', b't']));
	assert_eq!(None, swapper.get_invalid(&[0x83, b'b', b'a', b't']));
	assert_eq!(Some(to_swap[1]), swapper.get_valid(invalid_rlp[1]));
}

fn to_elastic(slice: &[u8]) -> ElasticArray1024<u8> {
	let mut out = ElasticArray1024::new();
	out.append_slice(slice);
	out
}

fn map_rlp<F>(rlp: &UntrustedRlp, f: F) -> Option<ElasticArray1024<u8>> where
	F: Fn(&UntrustedRlp) -> Option<ElasticArray1024<u8>> {
	match rlp.iter()
  .fold((false, RlpStream::new_list(rlp.item_count())),
  |(is_some, mut acc), subrlp| {
  	let new = f(&subrlp);
  	if let Some(ref insert) = new {
  		acc.append_raw(&insert[..], 1);
  	} else {
  		acc.append_raw(subrlp.as_raw(), 1);
  	}
  	(is_some || new.is_some(), acc)
  }) {
  	(true, s) => Some(s.drain()),
  	_ => None,
  }
}

impl<'a> Compressible for UntrustedRlp<'a> {
	fn simple_compress(&self) -> ElasticArray1024<u8> {
		if self.is_data() {
			to_elastic(INVALID_RLP_SWAPPER.get_invalid(self.as_raw()).unwrap_or(self.as_raw()))
		} else {
			map_rlp(self, |rlp| Some(rlp.simple_compress())).unwrap_or(to_elastic(self.as_raw()))
		}
	}

	fn simple_decompress(&self) -> ElasticArray1024<u8> {
		if self.is_data() {
			to_elastic(INVALID_RLP_SWAPPER.get_valid(self.as_raw()).unwrap_or(self.as_raw()))
		} else {
			map_rlp(self, |rlp| Some(rlp.simple_decompress())).unwrap_or(to_elastic(self.as_raw()))
		}
	}

	fn compress(&self) -> Option<ElasticArray1024<u8>> {
		let simple_swap = ||
			INVALID_RLP_SWAPPER.get_invalid(self.as_raw()).map(|b| to_elastic(&b));
		if self.is_data() {
			// Try to treat the inside as RLP.
			return match self.payload_info() {
				// Shortest decompressed account is 70, so simply try to swap the value.
				Ok(ref p) if p.value_len < 70 => simple_swap(),
				_ => {
					if let Ok(d) = self.data() {
						if let Some(new_d) = UntrustedRlp::new(&d).compress() {
							// If compressed put in a special list, with first element being invalid code.
							let mut rlp = RlpStream::new_list(2);
							rlp.append_raw(&[0x81, 0x7f], 1);
							rlp.append_raw(&new_d[..], 1);
							return Some(rlp.drain());
						}
					}
					simple_swap()
				},
			};
		}
		// Iterate through RLP while checking if it has been compressed.
		map_rlp(self, |rlp| rlp.compress())
	}

	fn decompress(&self) -> Option<ElasticArray1024<u8>> {
		let simple_swap = ||
			INVALID_RLP_SWAPPER.get_valid(self.as_raw()).map(|b| to_elastic(&b));
		// Simply decompress data.
		if self.is_data() { return simple_swap(); }
		match self.item_count() {
			// Look for special compressed list, which contains nested data.
			2 if self.at(0).map(|r| r.as_raw() == &[0x81, 0x7f]).unwrap_or(false) =>
				self.at(1).ok().map_or(simple_swap(),
				|r| r.decompress().map(|d| { let v = d.to_vec(); encode(&v) })),
			// Iterate through RLP while checking if it has been compressed.
			_ => map_rlp(self, |rlp| rlp.decompress()),
  	}
	}
}

#[cfg(test)]
mod tests {
	use rlp::{UntrustedRlp, Compressible, View};

	#[test]
	fn simple_compression() {
		let basic_account_rlp = vec![248, 68, 4, 2, 160, 86, 232, 31, 23, 27, 204, 85, 166, 255, 131, 69, 230, 146, 192, 248, 110, 91, 72, 224, 27, 153, 108, 173, 192, 1, 98, 47, 181, 227, 99, 180, 33, 160, 197, 210, 70, 1, 134, 247, 35, 60, 146, 126, 125, 178, 220, 199, 3, 192, 229, 0, 182, 83, 202, 130, 39, 59, 123, 250, 216, 4, 93, 133, 164, 112];
		let rlp = UntrustedRlp::new(&basic_account_rlp);
		let compressed = rlp.simple_compress().to_vec();
		assert_eq!(compressed, vec![198, 4, 2, 129, 0, 129, 1]);
		let compressed_rlp = UntrustedRlp::new(&compressed);
		assert_eq!(compressed_rlp.simple_decompress().to_vec(), basic_account_rlp);
	}

	#[test]
	fn data_compression() {
		let data_basic_account_rlp = vec![184, 70, 248, 68, 4, 2, 160, 86, 232, 31, 23, 27, 204, 85, 166, 255, 131, 69, 230, 146, 192, 248, 110, 91, 72, 224, 27, 153, 108, 173, 192, 1, 98, 47, 181, 227, 99, 180, 33, 160, 197, 210, 70, 1, 134, 247, 35, 60, 146, 126, 125, 178, 220, 199, 3, 192, 229, 0, 182, 83, 202, 130, 39, 59, 123, 250, 216, 4, 93, 133, 164, 112];
		let data_rlp = UntrustedRlp::new(&data_basic_account_rlp);
		let compressed = data_rlp.compress().unwrap().to_vec();
		assert_eq!(compressed, vec![201, 129, 127, 198, 4, 2, 129, 0, 129, 1]);
		let compressed_rlp = UntrustedRlp::new(&compressed);
		assert_eq!(compressed_rlp.decompress().unwrap().to_vec(), data_basic_account_rlp);
	}

	#[test]
	fn nested_list_rlp() {
		let nested_basic_account_rlp = vec![228, 4, 226, 2, 160, 86, 232, 31, 23, 27, 204, 85, 166, 255, 131, 69, 230, 146, 192, 248, 110, 91, 72, 224, 27, 153, 108, 173, 192, 1, 98, 47, 181, 227, 99, 180, 33];
		let nested_rlp = UntrustedRlp::new(&nested_basic_account_rlp);
		let compressed = nested_rlp.compress().unwrap().to_vec();
		assert_eq!(compressed, vec![197, 4, 195, 2, 129, 0]);
		let compressed_rlp = UntrustedRlp::new(&compressed);
		assert_eq!(compressed_rlp.decompress().unwrap().to_vec(), nested_basic_account_rlp);
	}

	#[test]
	fn malformed_rlp() {
		let malformed = vec![248, 81, 128, 128, 128, 128, 128, 160, 12, 51, 241, 93, 69, 218, 74, 138, 79, 115, 227, 44, 216, 81, 46, 132, 85, 235, 96, 45, 252, 48, 181, 29, 75, 141, 217, 215, 86, 160, 109, 130, 160, 140, 36, 93, 200, 109, 215, 100, 241, 246, 99, 135, 92, 168, 149, 170, 114, 9, 143, 4, 93, 25, 76, 54, 176, 119, 230, 170, 154, 105, 47, 121, 10, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128];
		let malformed_rlp = UntrustedRlp::new(&malformed);
		assert!(malformed_rlp.decompress().is_none());
	}

	#[test]
	#[ignore]
	fn test_compression() {
		use kvdb::*;
		let path = "db to test".to_string();
		let values: Vec<_> = Database::open_default(&path).unwrap().iter().map(|(_, v)| v).collect();
		let mut decomp_size = 0;
		let mut comp_size = 0;

		for v in values.iter() {
			let rlp = UntrustedRlp::new(&v);
			let compressed = rlp.compress().map(|b| b.to_vec()).unwrap_or(v.to_vec());
			comp_size += compressed.len();
			let decompressed = rlp.decompress().map(|b| b.to_vec()).unwrap_or(v.to_vec());
			decomp_size += decompressed.len();
		}
		println!("Decompressed bytes {:?}, compressed bytes: {:?}", decomp_size, comp_size);
		assert!(decomp_size > comp_size);
	}
}
