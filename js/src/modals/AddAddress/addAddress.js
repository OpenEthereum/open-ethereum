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

import React, { Component, PropTypes } from 'react';
import { FlatButton } from 'material-ui';
import ContentAdd from 'material-ui/svg-icons/content/add';
import ContentClear from 'material-ui/svg-icons/content/clear';

import { Modal, Form, Input, InputAddress } from '../../ui';
import { ERRORS, validateAddress, validateName } from '../../util/validation';

import styles from './addAddress.css';

export default class AddAddress extends Component {
  static contextTypes = {
    contacts: PropTypes.array.isRequired
  };

  static propTypes = {
    onClose: PropTypes.func
  };

  state = {
    address: '',
    addressError: ERRORS.invalidAddress,
    name: '',
    nameError: ERRORS.invalidName,
    description: ''
  };

  render () {
    return (
      <Modal
        visible
        actions={ this.renderDialogActions() }>
        <div className={ styles.header }>
          <h3>add saved address</h3>
        </div>
        { this.renderFields() }
      </Modal>
    );
  }

  renderDialogActions () {
    const { addressError, nameError } = this.state;
    const hasError = !!(addressError || nameError);

    return ([
      <FlatButton
        icon={ <ContentClear /> }
        label='Cancel'
        primary
        onTouchTap={ this.onClose } />,
      <FlatButton
        icon={ <ContentAdd /> }
        label='Save Address'
        disabled={ hasError }
        primary
        onTouchTap={ this.onAdd } />
    ]);
  }

  renderFields () {
    const { address, addressError, description, name, nameError } = this.state;

    return (
      <Form>
        <InputAddress
          label='network address'
          hint='the network address for the entry'
          error={ addressError }
          value={ address }
          onChange={ this.onEditAddress } />
        <Input
          label='address name'
          hint='a descriptive name for the entry'
          error={ nameError }
          value={ name }
          onChange={ this.onEditName } />
        <Input
          multiLine
          rows={ 1 }
          label='(optional) address description'
          hint='an expanded description for the entry'
          value={ description }
          onChange={ this.onEditDescription } />
      </Form>
    );
  }

  onEditAddress = (event, _address) => {
    const { contacts } = this.context;
    let { address, addressError } = validateAddress(_address);

    if (!addressError) {
      const contact = contacts.find((contact) => contact.address === address);

      if (contact) {
        addressError = ERRORS.duplicateAddress;
      }
    }

    this.setState({
      address,
      addressError
    });
  }

  onEditDescription = (event, description) => {
    this.setState({
      description
    });
  }

  onEditName = (event, _name) => {
    const { name, nameError } = validateName(_name);

    this.setState({
      name,
      nameError
    });
  }

  onAdd = () => {
    const { address, name, description } = this.state;

    this.props.onClose(address, name, description);
  }

  onClose = () => {
    this.props.onClose();
  }
}
