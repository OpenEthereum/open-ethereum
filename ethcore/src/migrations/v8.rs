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


//! This migration consolidates all databases into single one using Column Families.

use util::kvdb::Database;
use util::migration::{Batch, Config, Error, Migration, Progress};

/// Consolidation of extras/block/state databases into single one.
pub struct ToV8 {
	progress: Progress,
	column_family: String,
}

impl ToV8 {
	/// Creates new V8 migration and assigns all `(key,value)` pairs from `source` DB to given Column Family
	pub fn new(column_family: String) -> Self {
		ToV8 {
			progress: Progress::default(),
			column_family: column_family,
		}
	}
}

impl Migration for ToV8 {

	fn version(&self) -> u32 {
		8
	}

	fn migrate(&mut self, source: &Database, config: &Config, dest: &mut Database) -> Result<(), Error> {
		let mut batch = Batch::new(config);

		for (key, value) in source.iter() {
			self.progress.tick();
			// TODO Add column family here!
			try!(batch.insert(key.to_vec(), value.to_vec(), dest));
		}

		batch.commit(dest)
	}
}
