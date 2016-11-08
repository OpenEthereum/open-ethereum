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

import { action, observable } from 'mobx';
import store from 'store';

import CompilerWorker from 'worker-loader!./compilerWorker.js';

const WRITE_CONTRACT_SAVED_KEY = 'WRITE_CONTRACT_SAVED';

export default class WriteContractStore {

  @observable sourcecode = '';

  @observable compiled = false;
  @observable compiling = false;

  @observable contractIndex = -1;
  @observable contract = null;
  @observable contracts = {};

  @observable errors = [];
  @observable annotations = [];

  @observable showDeployModal = false;

  constructor () {
    const compiler = new CompilerWorker();
    this.compiler = compiler;

    this.compiler.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.event) {
        case 'compiled':
          this.parseCompiled(message.data);
          break;
      }
    };

    const saveSourcecode = store.get(WRITE_CONTRACT_SAVED_KEY);
    this.sourcecode = saveSourcecode || '';
  }

  @action handleOpenDeployModal = () => {
    this.showDeployModal = true;
  }

  @action handleCloseDeployModal = () => {
    this.showDeployModal = false;
  }

  @action handleSelectContract = (_, index, value) => {
    this.contractIndex = value;
    this.contract = this.contracts[Object.keys(this.contracts)[value]];
  }

  @action handleCompile = () => {
    this.compiled = false;
    this.compiling = true;

    this.compiler.postMessage(JSON.stringify({
      action: 'compile',
      data: this.sourcecode
    }));
  }

  @action parseCompiled = (data) => {
    this.compiled = true;
    this.compiling = false;

    const { contracts, errors } = data;
    const regex = /^:(\d+):(\d+):\s*([a-z]+):\s*((.|[\r\n])+)$/i;

    const annotations = errors
      .map((error, index) => {
        const match = regex.exec(error);

        const row = parseInt(match[1]) - 1;
        const column = parseInt(match[2]);

        const type = match[3].toLowerCase();
        const text = match[4];

        return {
          row, column,
          type, text
        };
      });

    const contractKeys = Object.keys(contracts || {});

    this.contract = contractKeys.length ? contracts[contractKeys[0]] : null;
    this.contractIndex = contractKeys.length ? 0 : -1;

    this.contracts = contracts;
    this.errors = errors;
    this.annotations = annotations;
  }

  @action handleEditSourcecode = (value) => {
    this.sourcecode = value;
    store.set(WRITE_CONTRACT_SAVED_KEY, value);
  }

}
