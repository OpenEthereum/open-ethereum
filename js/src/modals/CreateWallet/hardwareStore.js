// Copyright 2015-2017 Parity Technologies (UK) Ltd.
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

import { action, observable, transaction } from 'mobx';

import Ledger from '~/3rdparty/ledger';

export default class HardwareStore {
  @observable isScanning = false;
  @observable wallet = null;

  constructor (api) {
    this._api = api;
    this._ledger = Ledger.create();
  }

  @action setScanning = (isScanning) => {
    this.isScanning = isScanning;
  }

  @action setWallet = (wallet) => {
    this.wallet = wallet;
  }

  scan () {
    this.setScanning(true);

    return this._ledger
      .scan()
      .then((wallet) => {
        console.log('HardwareStore::scan', wallet);

        transaction(() => {
          this.setWallet(wallet);
          this.setScanning(false);
        });
      })
      .catch((error) => {
        console.wran('HardwareStore::scan', error);

        this.setScanning(false);
      });
  }

  createEntry (address, name, description, type) {
    return Promise
      .all([
        this._api.setAccountName(address, name),
        this._api.setAccountMeta(address, {
          deleted: false,
          description,
          hardware: { type },
          name,
          tags: ['hardware'],
          timestamp: Date.now(),
          wallet: true
        })
      ])
      .catch((error) => {
        console.warn('HardwareStore::createEntry', error);
        throw error;
      });
  }
}
