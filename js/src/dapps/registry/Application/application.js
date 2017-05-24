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
import { observer } from 'mobx-react';
import React, { Component, PropTypes } from 'react';

import getMuiTheme from 'material-ui/styles/getMuiTheme';
import lightBaseTheme from 'material-ui/styles/baseThemes/lightBaseTheme';

import CircularProgress from 'material-ui/CircularProgress';

import ApplicationStore from './application.store';
import Events from '../Events';
import Lookup from '../Lookup';
import Prompt from '../Prompt';

import styles from './application.css';

const muiTheme = getMuiTheme(lightBaseTheme);

@observer
export default class Application extends Component {
  static childContextTypes = {
    muiTheme: PropTypes.object.isRequired
  };

  getChildContext () {
    return { muiTheme };
  }

  state = {
    showWarning: true
  };

  applicationStore = ApplicationStore.get();

  render () {
    const { loading } = this.applicationStore;

    if (loading) {
      return (
        <div className={ styles.container }>
          <CircularProgress size={ 120 } />
        </div>
      );
    }

    return (
      <div>
        <Prompt />
        <div className={ styles.header }>
          <h1>RΞgistry</h1>
        </div>
        <div>
          <Lookup />
          <Events />
          { this.renderWarning() }
        </div>
      </div>
    );
  }

  renderWarning () {
    const { api, fee } = this.applicationStore;
    const { showWarning } = this.state;

    if (!showWarning) {
      return null;
    }

    return (
      <div
        className={ styles.warning }
        onClick={ this.handleHideWarning }
      >
        <span>
          WARNING: The name registry is experimental. Please ensure that you understand the risks,
          benefits & consequences of registering a name before doing so.
        </span>
        {
          fee && api.util.fromWei(fee).gt(0)
          ? (
            <span>
                &nbsp;A non-refundable fee of { api.util.fromWei(fee).toFormat(3) } <small>ETH</small>
              &nbsp;is required for all registrations.
            </span>
          )
          : null
        }
      </div>
    );
  }

  handleHideWarning = () => {
    this.setState({ showWarning: false });
  }
}
