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

import { personalAccountsInfo } from './personalActions';
import { statusNewTransactions } from './statusActions';
import { isEqual } from 'lodash';

export default class Personal {
  constructor (store, api) {
    this._api = api;
    this._store = store;
  }

  start () {
    this._subscribeAccountsInfo();

    // window.setInterval(() => {
    //   const s = 'abcdefgABCDEFG0123456789';
    //   const h = Array(40).join().split(',').map(() => s.charAt(Math.floor(Math.random() * s.length))).join('');
    //   const tx = {
    //     from: '0x639ba260535Db072A41115c472830846E4e9AD0F',
    //     hash: '0x' + h,
    //     to: '0xEa534800E457da57Af9C5666e735426E580C1B48'
    //   };

    //   const transactions = [ tx ];

    //   this._store.dispatch(statusNewTransactions(transactions));
    // }, 10000);

    this._api
      .subscribe('eth_blockNumber', () => {
        const { accounts } = this._store.getState().personal;
        const addresses = Object.keys(accounts);

        if (!addresses || addresses.length === 0) {
          return;
        }

        Promise
          .all([
            this._api.trace.filter({
              fromAddress: addresses,
              toBlock: 'pending'
            }),
            this._api.trace.filter({
              toAddress: addresses,
              toBlock: 'pending'
            })
          ])
          .then(([ fromTraces, toTraces ]) => {
            const traces = Object.values([]
              .concat(fromTraces, toTraces)
              .reduce((txs, trace) => {
                txs[trace.transactionHash] = trace;
                return txs;
              }, {}));

            if (traces.length === 0) {
              return;
            }

            const transactions = traces.map(transaction => ({
              from: transaction.action.from,
              to: transaction.action.to,
              blockNumber: transaction.blockNumber,
              hash: transaction.transactionHash
            }));

            this._store.dispatch(statusNewTransactions(transactions));
          })
          .catch(e => {
            console.error('personal::trace_filter', e);
          });
      });
  }

  _subscribeAccountsInfo () {
    this._api
      .subscribe('personal_accountsInfo', (error, accountsInfo) => {
        if (error) {
          console.error('personal_accountsInfo', error);
          return;
        }

        this._store.dispatch(personalAccountsInfo(accountsInfo));
      })
      .then((subscriptionId) => {
        console.log('personal._subscribeAccountsInfo', 'subscriptionId', subscriptionId);
      });
  }
}
