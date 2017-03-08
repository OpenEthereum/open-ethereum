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

import React, { Component, PropTypes } from 'react';

import Button from '../Button';
import Modal from '../Modal';

import styles from '../Modal/modal.css';

export default class ModalDelete extends Component {
  static propTypes = {
    dappId: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired
  };

  render () {
    if (!this.modalStore.showingDelete) {
      return null;
    }

    return (
      <Modal
        buttons={ this.renderButtons() }
        header='Confirm Application Deletion'
      >
        { this.renderConfirm() }
      </Modal>
    );
  }

  renderButtons () {
    return [
      <Button
        key='cancel'
        label='No, Cancel'
        onClick={ this.handleClose }
      />,
      <Button
        key='delete'
        label='Yes, Delete'
        warning
        onClick={ this.handleDelete }
      />
    ];
  }

  renderConfirm () {
    const { dappId } = this.props;

    return (
      <div>
        <div className={ styles.section }>
          You are about to remove a distributed application from the registry,
          the details of this application is given below. Removal does not return any fees,
          however the application will not be available to users anymore.
        </div>
        <div className={ styles.section }>
          <div className={ styles.heading }>
            Application identifier
          </div>
          <div>
            { dappId }
          </div>
        </div>
      </div>
    );
  }

  handleClose = () => {
    this.props.onClose();
  }

  handleDelete = () => {
    const { dappId } = this.props;

    this.props.onDelete(dappId);
  }
}
