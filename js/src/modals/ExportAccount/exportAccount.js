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
import { FormattedMessage } from 'react-intl';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import { newError } from '~/redux/actions';
import { personalAccountsInfo } from '~/redux/providers/personalActions';
import { AccountCard, Button, Portal, SelectionList } from '~/ui';
import { Input } from '~/ui/Form';
import { CancelIcon, CheckIcon } from '~/ui/Icons';
import ExportStore from './exportStore';

import styles from './exportAccount.css';

@observer
class ExportAccount extends Component {
  static contextTypes = {
    api: PropTypes.object.isRequired
  };

  static propTypes = {
    accounts: PropTypes.object.isRequired,
    balances: PropTypes.object.isRequired,
    newError: PropTypes.func.isRequired,
    personalAccountsInfo: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired
  };

  componentWillMount () {
    const { accounts, newError } = this.props;

    this.exportStore = new ExportStore(this.context.api, accounts, newError, null);
  }

  render () {
    const { canExport } = this.exportStore;

    return (
      <Portal
        buttons={ [
          <Button
            icon={ <CancelIcon /> }
            key='cancel'
            label={
              <FormattedMessage
                id='export.accounts.button.cancel'
                defaultMessage='Cancel'
              />
            }
            onClick={ this.onClose }
          />,
          <Button
            disabled={ !canExport }
            icon={ <CheckIcon /> }
            key='execute'
            label={
              <FormattedMessage
                id='export.accounts.button.export'
                defaultMessage='Export'
              />
            }
            onClick={ this.onExport }
          />
        ] }
        onClose={ this.onClose }
        open
        title={
          <FormattedMessage
            id='export.accounts.title'
            defaultMessage='Export an Account'
          />
        }
      >
        { this.renderList() }
      </Portal>
    );
  }

  renderList () {
    let { accounts } = this.props;

    accounts = Object
      .keys(accounts)
      .map((address) => accounts[address]);

    return (
      <SelectionList
        isChecked={ this.isSelected }
        items={ accounts }
        noStretch
        renderItem={ this.renderAccount }
      />
    );
  }

  renderAccount = (account) => {
    const { balances } = this.props;
    const balance = balances[account.address];
    const { changePassword, getPassword } = this.exportStore;
    const inputValue = getPassword(account);

    return (
      <AccountCard
        account={ account }
        balance={ balance }
        onClick={ this.onClick }
        className={ styles.card }
      >
        <form id={ styles.checkbox }>
          <div className={ styles.slider }>
            <input
              type='checkbox'
              id={ `${account.address}-checkbox` }
              onChange={ () => this.onSelect(account) }
              value='None'
              name='check'
            />
            <label htmlFor={ `${account.address}-checkbox` } />
          </div>
        </form>
        <div>
          <Input
            type='password'
            label={
              <FormattedMessage
                id='export.setPassword.label'
                defaultMessage='Password'
              />
            }
            hint={
              <FormattedMessage
                id='export.setPassword.hint'
                defaultMessage='Enter Password Here'
              />
            }
            value={ inputValue }
            onChange={ changePassword }
          />
        </div>
      </AccountCard>
    );
  }

  isSelected = (account) => {
    const { selectedAccounts } = this.exportStore;

    return selectedAccounts[account.address];
  }

  onSelect = (account) => {
    this.exportStore.toggleSelectedAccount(account.address);
  }

  onClick = (account) => {
    this.exportStore.onClick(account);
  }

  onClose = () => {
    this.props.onClose();
  }

  onExport = () => {
    this.exportStore.onExport();
  }
}

function mapStateToProps (state) {
  const { balances } = state.balances;
  const { accounts } = state.personal;

  return {
    accounts,
    balances
  };
}

function mapDispatchToProps (dispatch) {
  return bindActionCreators({
    newError,
    personalAccountsInfo
  }, dispatch);
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ExportAccount);
