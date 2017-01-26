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

import { omitBy } from 'lodash';
import { Checkbox } from 'material-ui';
import { observer } from 'mobx-react';
import React, { Component, PropTypes } from 'react';
import { FormattedMessage } from 'react-intl';
import { connect } from 'react-redux';

import { AddDapps, DappPermissions } from '~/modals';
import PermissionStore from '~/modals/DappPermissions/store';
import { Actionbar, Button, Page, SectionList } from '~/ui';
import { LockedIcon, VisibleIcon } from '~/ui/Icons';

import UrlButton from './UrlButton';
import DappsStore from './dappsStore';
import Summary from './Summary';

import styles from './dapps.css';

@observer
class Dapps extends Component {
  static contextTypes = {
    api: PropTypes.object.isRequired
  }

  static propTypes = {
    accounts: PropTypes.object.isRequired
  };

  store = DappsStore.get(this.context.api);
  permissionStore = new PermissionStore(this.context.api);

  componentWillMount () {
    this.store.loadAllApps();
  }

  render () {
    let externalOverlay = null;

    if (this.store.externalOverlayVisible) {
      externalOverlay = (
        <div className={ styles.overlay }>
          <div className={ styles.body }>
            <div>
              <FormattedMessage
                id='dapps.external.warning'
                defaultMessage='Applications made available on the network by 3rd-party authors are not affiliated with Parity nor are they published by Parity. Each remain under the control of their respective authors. Please ensure that you understand the goals for each before interacting.'
              />
            </div>
            <div>
              <Checkbox
                className={ styles.accept }
                label={
                  <FormattedMessage
                    id='dapps.external.accept'
                    defaultMessage='I understand that these applications are not affiliated with Parity'
                  />
                }
                checked={ false }
                onCheck={ this.onClickAcceptExternal }
              />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div>
        <AddDapps store={ this.store } />
        <DappPermissions store={ this.permissionStore } />
        <Actionbar
          className={ styles.toolbar }
          title={
            <FormattedMessage
              id='dapps.label'
              defaultMessage='Decentralized Applications'
            />
          }
          buttons={ [
            <UrlButton key='url' />,
            <Button
              icon={ <VisibleIcon /> }
              key='edit'
              label={
                <FormattedMessage
                  id='dapps.button.edit'
                  defaultMessage='edit'
                />
              }
              onClick={ this.store.openModal }
            />,
            <Button
              icon={ <LockedIcon /> }
              key='permissions'
              label={
                <FormattedMessage
                  id='dapps.button.permissions'
                  defaultMessage='permissions'
                />
              }
              onClick={ this.openPermissionsModal }
            />
          ] }
        />
        <Page>
          <SectionList
            items={ this.store.visibleLocal }
            renderItem={ this.renderApp }
          />
          <SectionList
            items={ this.store.visibleBuiltin }
            renderItem={ this.renderApp }
          />
          <SectionList
            items={ this.store.visibleNetwork }
            renderItem={ this.renderApp }
            overlay={ externalOverlay }
          />
        </Page>
      </div>
    );
  }

  renderApp = (app) => {
    return (
      <Summary app={ app } />
    );
  }

  onClickAcceptExternal = () => {
    this.store.closeExternalOverlay();
  }

  openPermissionsModal = () => {
    const { accounts } = this.props;

    this.permissionStore.openModal(accounts);
  }
}

function mapStateToProps (state) {
  const { accounts } = state.personal;

  /**
   * Do not show the Wallet Accounts in the Dapps
   * Permissions Modal. This will come in v1.6, but
   * for now it would break dApps using Web3...
   */
  const _accounts = omitBy(accounts, (account) => account.wallet);

  return {
    accounts: _accounts
  };
}

export default connect(
  mapStateToProps,
  null
)(Dapps);
