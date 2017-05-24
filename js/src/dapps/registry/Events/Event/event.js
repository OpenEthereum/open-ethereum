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

import moment from 'moment';
import { observer } from 'mobx-react';
import React, { Component, PropTypes } from 'react';

import Address from '../../ui/address';
import ApplicationStore from '../../Application/application.store';
import Hash from '../../ui/hash';
import LookupStore from '../../Lookup/lookup.store';

import styles from './event.css';

const { api } = ApplicationStore.get();

@observer
class Param extends Component {
  static propTypes = {
    data: PropTypes.object
  };

  lookupStore = LookupStore.get();

  render () {
    const { data } = this.props;

    if (!data) {
      return null;
    }

    const { value } = data;
    const { lookupValue } = this.lookupStore;
    const hash = value && typeof value.map === 'function'
      ? api.util.bytesToHex(value.slice())
      : value;

    const classes = [ styles.param ];

    if (lookupValue !== hash) {
      classes.push(styles.clickable);
    }

    const onClick = () => this.handleHashLookup(hash);

    return (
      <div
        className={ classes.join(' ') }
        onClick={ onClick }
      >
        <code>
          { hash }
        </code>
      </div>
    );
  }

  handleHashLookup = (hash) => {
    this.lookupStore.updateInput(hash);
  };
}

const Event = ({ event }) => {
  const { state, timestamp, transactionHash, type, parameters, from } = event;
  const isPending = state === 'pending';

  const { reverse, owner, name, plainKey } = parameters;
  const sender = (reverse && reverse.value) ||
    (owner && owner.value) ||
    from;

  const classes = [];

  if (isPending) {
    classes.push(styles.pending);
  }

  return (
    <div className={ classes.join(' ') }>
      <div className={ styles.date }>
        {
          isPending
          ? '(pending)'
          : moment(timestamp).fromNow()
        }
      </div>
      <div className={ styles.infoContainer }>
        <Address
          address={ sender }
          className={ styles.address }
        />
        <div className={ styles.transaction }>
          {
            plainKey
            ? (
              <span className={ styles.key }>
                <code>{ plainKey.value }</code>
              </span>
            )
            : null
          }
          <span className={ styles.event }>{ type }</span>
          <span className={ styles.arrow }>→</span>
          <Hash
            hash={ transactionHash }
            linked
          />
        </div>
        <div className={ styles.params }>
          <Param
            data={ name }
          />
        </div>
      </div>
    </div>
  );
};

Event.propTypes = {
  event: PropTypes.object
};

export default Event;
