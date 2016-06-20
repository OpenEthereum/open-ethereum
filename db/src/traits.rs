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

//! Ethcore database trait

use types::*;

pub trait DatabaseService : Sized {
	/// Opens database in the specified path
	fn open(&self, config: DatabaseConfig, path: String) -> Result<(), Error>;

	/// Opens database in the specified path with the default config
	fn open_default(&self, path: String) -> Result<(), Error>;

	/// Closes database
	fn close(&self) -> Result<(), Error>;

	/// Insert a key-value pair in the transaction. Any existing value value will be overwritten.
	fn put(&self, key: &[u8], value: &[u8]) -> Result<(), Error>;

	/// Delete value by key.
	fn delete(&self, key: &[u8]) -> Result<(), Error>;

	/// Get value by key.
	fn get(&self, key: &[u8]) -> Result<Option<Vec<u8>>, Error>;

	/// Get value by partial key. Prefix size should match configured prefix size.
	fn get_by_prefix(&self, prefix: &[u8]) -> Result<Option<Vec<u8>>, Error>;

	/// Check if there is anything in the database.
	fn is_empty(&self) -> Result<bool, Error>;

	/// Get handle to iterate through keys
	fn iter(&self) -> Result<IteratorHandle, Error>;

	/// Next key-value for the the given iterator
	fn iter_next(&self, iterator: IteratorHandle) -> Option<KeyValue>;

	/// Dispose iteration that is no longer needed
	fn dispose_iter(&self, handle: IteratorHandle) -> Result<(), Error>;

	/// Write client transaction
	fn write(&self, transaction: DBTransaction) -> Result<(), Error>;
}
