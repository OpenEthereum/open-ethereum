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

import React, { Component } from 'react';

import { api } from '../parity';
import { attachInterface } from '../services';
import Button from '../Button';
import IdentityIcon from '../IdentityIcon';
import Loading from '../Loading';

import styles from './application.css';

const INVALID_URL_HASH = '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export default class Application extends Component {
  state = {
    fromAddress: null,
    loading: true,
    url: '',
    urlError: null,
    commit: '',
    commitError: null,
    contentHash: '',
    contentHashError: null,
    contentHashOwner: null,
    registerBusy: false,
    registerError: null,
    registerState: '',
    registerType: 'file'
  }

  componentDidMount () {
    attachInterface()
      .then((state) => {
        this.setState(state, () => {
          this.setState({ loading: false });
        });
      });
  }

  render () {
    const { loading } = this.state;

    return loading
      ? this.renderLoading()
      : this.renderPage();
  }

  renderLoading () {
    return (
      <Loading />
    );
  }

  renderPage () {
    const { fromAddress, registerBusy, url, urlError, contentHash, contentHashError, contentHashOwner, commit, commitError, registerType, repo, repoError } = this.state;

    let hashClass = null;
    if (contentHashError) {
      hashClass = contentHashOwner !== fromAddress ? styles.hashError : styles.hashWarning;
    } else {
      hashClass = styles.hashOk;
    }

    let valueInputs = null;
    if (registerType === 'content') {
      valueInputs = [
        <div className={ styles.capture } key='repo'>
          <input
            type='text'
            placeholder='owner/repo'
            disabled={ registerBusy }
            value={ repo }
            className={ repoError ? styles.error : null }
            onChange={ this.onChangeRepo } />
        </div>,
        <div className={ styles.capture } key='hash'>
          <input
            type='text'
            placeholder='commit hash sha3'
            disabled={ registerBusy }
            value={ commit }
            className={ commitError ? styles.error : null }
            onChange={ this.onChangeCommit } />
        </div>
      ];
    } else {
      valueInputs = (
        <div className={ styles.capture } key='url'>
          <input
            type='text'
            placeholder='http://domain/filename'
            disabled={ registerBusy }
            value={ url }
            className={ urlError ? styles.error : null }
            onChange={ this.onChangeUrl } />
        </div>
      );
    }

    return (
      <div className={ styles.container }>
        <div className={ styles.form }>
          <div className={ styles.typeButtons }>
            <Button
              disabled={ registerBusy }
              invert={ registerType !== 'file' }
              onClick={ this.onClickTypeNormal }>File Link</Button>
            <Button
              disabled={ registerBusy }
              invert={ registerType !== 'content' }
              onClick={ this.onClickTypeContent }>Content Bundle</Button>
          </div>
          <div className={ styles.box }>
            <div className={ styles.description }>
              Provide a valid URL to register. The content information can be used in other contracts that allows for reverse lookups, e.g. image registries, dapp registries, etc.
            </div>
            { valueInputs }
            <div className={ hashClass }>
              { contentHashError || contentHash }
            </div>
            { registerBusy ? this.renderProgress() : this.renderButtons() }
          </div>
        </div>
      </div>
    );
  }

  renderButtons () {
    const { accounts, fromAddress, urlError, repoError, commitError, contentHashError, contentHashOwner } = this.state;
    const account = accounts[fromAddress];

    return (
      <div className={ styles.buttons }>
        <div className={ styles.addressSelect }>
          <Button invert onClick={ this.onSelectFromAddress }>
            <IdentityIcon address={ account.address } />
            <div>{ account.name || account.address }</div>
          </Button>
        </div>
        <Button
          onClick={ this.onClickRegister }
          disabled={ (contentHashError && contentHashOwner !== fromAddress) || urlError || repoError || commitError }>register url</Button>
      </div>
    );
  }

  renderProgress () {
    const { registerError, registerState } = this.state;

    if (registerError) {
      return (
        <div className={ styles.progress }>
          <div className={ styles.statusHeader }>
            Your registration has encountered an error
          </div>
          <div className={ styles.statusError }>
            { registerError }
          </div>
        </div>
      );
    }

    return (
      <div className={ styles.progress }>
        <div className={ styles.statusHeader }>
          Your URL is being registered
        </div>
        <div className={ styles.statusState }>
          { registerState }
        </div>
      </div>
    );
  }

  onClickTypeNormal = () => {
    const { url } = this.state;

    this.setState({ registerType: 'file', commitError: null, repoError: null }, () => {
      this.onChangeUrl({ target: { value: url } });
    });
  }

  onClickTypeContent = () => {
    const { repo, commit } = this.state;

    this.setState({ registerType: 'content', urlError: null }, () => {
      this.onChangeRepo({ target: { value: repo } });
      this.onChangeCommit({ target: { value: commit } });
    });
  }

  onChangeCommit = (event) => {
    const commit = event.target.value;
    const commitError = null;

    // TODO: field validation

    this.setState({ commit, commitError, contentHashError: 'hash lookup in progress' }, () => {
      const { repo } = this.state;
      this.lookupHash(`https://codeload.github.com/${repo}/zip/${commit}`);
    });
  }

  onChangeRepo = (event) => {
    let repo = event.target.value;
    const repoError = null;

    // TODO: field validation
    if (!repoError) {
      repo = repo.replace('https://github.com/', '');
    }

    this.setState({ repo, repoError, contentHashError: 'hash lookup in progress' }, () => {
      const { commit } = this.state;
      this.lookupHash(`https://codeload.github.com/${repo}/zip/${commit}`);
    });
  }

  onChangeUrl = (event) => {
    let url = event.target.value;
    const urlError = null;

    // TODO: field validation
    if (!urlError) {
      const parts = url.split('/');

      if (parts[2] === 'github.com' || parts[2] === 'raw.githubusercontent.com') {
        url = `https://raw.githubusercontent.com/${parts.slice(3).join('/')}`.replace('/blob/', '/');
      }
    }

    this.setState({ url, urlError, contentHashError: 'hash lookup in progress' }, () => {
      this.lookupHash(url);
    });
  }

  onClickRegister = () => {
    const { commit, commitError, contentHashError, contentHashOwner, fromAddress, url, urlError, registerType, repo, repoError } = this.state;

    // TODO: No errors are currently set, validation to be expanded and added for each
    // field (query is fast to pick up the issues, so not burning atm)
    if ((contentHashError && contentHashOwner !== fromAddress) || repoError || urlError || commitError) {
      return;
    }

    if (registerType === 'file') {
      this.registerUrl(url);
    } else {
      this.registerContent(repo, commit);
    }
  }

  trackRequest (promise) {
    return promise
      .then((signerRequestId) => {
        this.setState({ signerRequestId, registerState: 'Transaction posted, Waiting for transaction authorization' });

        return api.pollMethod('eth_checkRequest', signerRequestId);
      })
      .then((txHash) => {
        this.setState({ txHash, registerState: 'Transaction authorized, Waiting for network confirmations' });

        return api.pollMethod('eth_getTransactionReceipt', txHash, (receipt) => {
          if (!receipt || !receipt.blockNumber || receipt.blockNumber.eq(0)) {
            return false;
          }

          return true;
        });
      })
      .then((txReceipt) => {
        this.setState({ txReceipt, registerBusy: false, registerState: 'Network confirmed, Received transaction receipt', url: '', commit: '', commitError: null, contentHash: '', contentHashOwner: null, contentHashError: null });
      })
      .catch((error) => {
        console.error('onSend', error);
        this.setState({ registerError: error.message });
      });
  }

  registerContent (repo, commit) {
    const { contentHash, fromAddress, instance } = this.state;

    this.setState({ registerBusy: true, registerState: 'Estimating gas for the transaction' });

    const values = [contentHash, repo, commit];
    const options = { from: fromAddress };

    this.trackRequest(
      instance
        .hint.estimateGas(options, values)
        .then((gas) => {
          this.setState({ registerState: 'Gas estimated, Posting transaction to the network' });

          const gasPassed = gas.mul(1.2);
          options.gas = gasPassed.toFixed(0);
          console.log(`gas estimated at ${gas.toFormat(0)}, passing ${gasPassed.toFormat(0)}`);

          return instance.hint.postTransaction(options, values);
        })
    );
  }

  registerUrl (url) {
    const { contentHash, fromAddress, instance } = this.state;

    this.setState({ registerBusy: true, registerState: 'Estimating gas for the transaction' });

    const values = [contentHash, url];
    const options = { from: fromAddress };

    this.trackRequest(
      instance
        .hintURL.estimateGas(options, values)
        .then((gas) => {
          this.setState({ registerState: 'Gas estimated, Posting transaction to the network' });

          const gasPassed = gas.mul(1.2);
          options.gas = gasPassed.toFixed(0);
          console.log(`gas estimated at ${gas.toFormat(0)}, passing ${gasPassed.toFormat(0)}`);

          return instance.hintURL.postTransaction(options, values);
        })
    );
  }

  onSelectFromAddress = () => {
    const { accounts, fromAddress } = this.state;
    const addresses = Object.keys(accounts);
    let index = 0;

    addresses.forEach((address, _index) => {
      if (address === fromAddress) {
        index = _index;
      }
    });

    index++;
    if (index >= addresses.length) {
      index = 0;
    }

    this.setState({ fromAddress: addresses[index] });
  }

  lookupHash (url) {
    const { instance } = this.state;

    if (!url || !url.length) {
      return;
    }

    console.log(`lookupHash ${url}`);

    api.parity
      .hashContent(url)
      .then((contentHash) => {
        console.log('lookupHash', contentHash);
        if (contentHash === INVALID_URL_HASH) {
          this.setState({ contentHashError: 'invalid url endpoint', contentHash: null });
          return;
        }

        instance.entries
          .call({}, [contentHash])
          .then(([accountSlashRepo, commit, contentHashOwner]) => {
            console.log('lookupHash', accountSlashRepo, api.util.bytesToHex(commit), contentHashOwner);

            if (contentHashOwner !== ZERO_ADDRESS) {
              this.setState({
                contentHashError: contentHash,
                contentHashOwner,
                contentHash
              });
            } else {
              this.setState({ contentHashError: null, contentHashOwner, contentHash });
            }
          });
      })
      .catch((error) => {
        console.error('lookupHash', error);
        this.setState({ contentHashError: error.message, contentHash: null });
      });
  }
}
