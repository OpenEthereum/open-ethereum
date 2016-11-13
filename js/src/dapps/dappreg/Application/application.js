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
import { observer } from 'mobx-react';

import DappsStore from '../dappsStore';

import Dapps from '../Dapps';
import Footer from '../Footer';
import Header from '../Header';
import Loading from '../Loading';
import ModalDelete from '../ModalDelete';
import Warning from '../Warning';
import styles from './application.css';

import background from '../../../../assets/images/dapps/puzzle-960.jpg';

const bodyStyle = {
  background: `url(${background}) no-repeat center center fixed`,
  '-webkit-background-size': 'cover',
  '-moz-background-size': 'cover',
  '-o-background-size': 'cover',
  'background-size': 'cover'
};

@observer
export default class Application extends Component {
  dappsStore = DappsStore.instance();

  render () {
    if (this.dappsStore.isLoading) {
      return (
        <Loading />
      );
    }

    return (
      <div
        className={ styles.body }
        style={ bodyStyle }>
        <Dapps />
        <Footer />
        <Header />
        <Warning />
        <ModalDelete />
      </div>
    );
  }
}
