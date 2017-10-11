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

import { action, observable } from 'mobx';
import { uniq } from 'lodash';

import Contracts from '~/contracts';
import { vouchfor as vouchForAbi } from '~/contracts/abi';

export default class Store {
  @observable vouchers = [];

  constructor (api, app) {
    this._api = api;
    this._app = app;

    Contracts
      .get().registry
      .lookupAddress('vouchfor')
      .then((address) => {
        if (!address || /^0x0*$/.test(address)) {
          return null;
        }

        return api.newContract(vouchForAbi, address);
      })
      .then(async (contract) => {
        const { contentHash, id } = app;

        if (!contentHash) {
          return;
        }

        let lastItem = false;

        for (let index = 0; !lastItem; index++) {
          const voucher = await contract.instance.vouched.call({}, [`0x${contentHash}`, index]);

          if (/^0x0*$/.test(voucher)) {
            lastItem = true;
          } else {
            this.addVoucher(id, voucher);
          }
        }
      })
      .catch((error) => {
        console.error('vouchFor', error);

        return null;
      });
  }

  @action addVoucher = (voucher) => {
    this.vouchers = uniq([].concat(this.vouchers.peek(), [voucher]));
  }
}
