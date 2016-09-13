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

import { getBalances, getTokens } from './balancesActions';

import { eip20Abi, registryAbi, tokenRegAbi } from '../../util/abi';

import imagesEthereum32 from '../../images/contracts/ethereum-32.png';
import imagesEthereum56 from '../../images/contracts/ethereum-56.png';
import imagesGavcoin32 from '../../images/contracts/gavcoin-32.png';
import imagesGavcoin56 from '../../images/contracts/gavcoin-56.png';

// TODO: Images should not be imported like this, should be via the content from GitHubHint contract (here until it is ready)
const images = {
  ethereum: {
    small: imagesEthereum32,
    normal: imagesEthereum56
  },
  gavcoin: {
    small: imagesGavcoin32,
    normal: imagesGavcoin56
  }
};

const ETH = {
  name: 'Ethereum',
  tag: 'ΞTH',
  images: images.ethereum
};

export default class Balances {
  constructor (store, api) {
    this._api = api;
    this._store = store;
    this._accountsInfo = null;
  }

  start () {
    this._subscribeBlockNumber();
    this._subscribeAccountsInfo();
  }

  _subscribeAccountsInfo () {
    this._api.subscribe('personal_accountsInfo', (error, accountsInfo) => {
      if (error) {
        return;
      }

      this._accountsInfo = accountsInfo;
      this._retrieveBalances();
    });
  }

  _subscribeBlockNumber () {
    this._api.subscribe('eth_blockNumber', (error) => {
      if (error) {
        return;
      }

      this._retrieveTokens();
    });
  }

  _retrieveTokens () {
    this._api.ethcore
      .registryAddress()
      .then((registryAddress) => {
        const registry = this._api.newContract(registryAbi, registryAddress);

        return registry.instance.getAddress.call({}, [this._api.format.sha3('tokenreg'), 'A']);
      })
      .then((tokenregAddress) => {
        const tokenreg = this._api.newContract(tokenRegAbi, tokenregAddress);

        return tokenreg.instance.tokenCount
          .call()
          .then((numTokens) => {
            const promises = [];

            while (promises.length < numTokens.toNumber()) {
              promises.push(tokenreg.instance.token.call({}, [promises.length]));
            }

            return Promise.all(promises);
          });
      })
      .then((_tokens) => {
        const tokens = {};
        this._tokens = _tokens.map((_token) => {
          const [address, tag, format, name] = _token;

          const token = {
            address,
            name,
            tag,
            format: format.toString(),
            images: images[name.toLowerCase()],
            contract: this._api.newContract(eip20Abi, address)
          };
          tokens[address] = token;

          return token;
        });

        this._store.dispatch(getTokens(tokens));
        this._retrieveBalances();
      });
  }

  _retrieveBalances () {
    if (!this._accountsInfo || !this._tokens) {
      return;
    }

    const addresses = Object.keys(this._accountsInfo);
    this._balances = {};

    Promise
      .all(
        addresses.map((address) => Promise.all([
          this._api.eth.getBalance(address),
          this._api.eth.getTransactionCount(address)
        ]))
      )
      .then((balanceTxCount) => {
        return Promise.all(
          balanceTxCount.map(([value, txCount], idx) => {
            const address = addresses[idx];

            this._balances[address] = {
              txCount,
              tokens: [{
                token: ETH,
                value
              }]
            };

            return Promise.all(
              this._tokens.map((token) => {
                return token.contract.instance.balanceOf.call({}, [address]);
              })
            );
          })
        );
      })
      .then((tokenBalances) => {
        addresses.forEach((address, idx) => {
          const balanceOf = tokenBalances[idx];
          const balance = this._balances[address];

          this._tokens.forEach((token, tidx) => {
            balance.tokens.push({
              token,
              value: balanceOf[tidx].toString()
            });
          });
        });

        this._store.dispatch(getBalances(this._balances));
      });
  }
}
