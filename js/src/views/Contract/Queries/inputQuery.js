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

import BigNumber from 'bignumber.js';
import React, { Component, PropTypes } from 'react';
import LinearProgress from 'material-ui/LinearProgress';
import { Card, CardActions, CardTitle, CardText } from 'material-ui/Card';

import { Button, TypedInput } from '~/ui';
import { arrayOrObjectProptype } from '~/util/proptypes';

import styles from './queries.css';

export default class InputQuery extends Component {
  static contextTypes = {
    api: PropTypes.object
  };

  static propTypes = {
    accountsInfo: PropTypes.object.isRequired,
    contract: PropTypes.object.isRequired,
    inputs: arrayOrObjectProptype().isRequired,
    outputs: arrayOrObjectProptype().isRequired,
    name: PropTypes.string.isRequired,
    signature: PropTypes.string.isRequired,
    className: PropTypes.string
  };

  state = {
    error: null,
    isValid: true,
    results: [],
    values: {}
  };

  render () {
    const { name, className } = this.props;

    return (
      <Card className={ className }>
        <CardTitle
          className={ styles.methodTitle }
          title={ name }
        />
        { this.renderError() }
        { this.renderContent() }
      </Card>
    );
  }

  renderError () {
    const { error } = this.state;

    if (!error) {
      return null;
    }

    return (
      <p className={ styles.error }>
        { error.message }
      </p>
    );
  }

  renderContent () {
    const { inputs } = this.props;

    const { isValid } = this.state;

    const inputsFields = inputs
      .map((input, index) => this.renderInput(input, index));

    return (
      <div>
        <CardText className={ styles.methodContent }>
          <div className={ styles.methodResults }>
            { this.renderResults() }
          </div>
          { inputsFields }
        </CardText>
        <CardActions>
          <Button
            label='Query'
            disabled={ !isValid }
            onClick={ this.onClick }
          />
        </CardActions>
      </div>
    );
  }

  renderResults () {
    const { results, isLoading } = this.state;
    const { accountsInfo, outputs } = this.props;

    if (isLoading) {
      return (<LinearProgress mode='indeterminate' />);
    }

    if (!results || results.length < 1) {
      return null;
    }

    return outputs
      .map((out, index) => ({
        name: out.name,
        type: out.type,
        value: results[index],
        display: this.renderValue(results[index])
      }))
      .sort((outA, outB) => outA.display.length - outB.display.length)
      .map((out, index) => {
        const input = (
          <TypedInput
            accounts={ accountsInfo }
            allowCopy
            isEth={ false }
            param={ out.type }
            readOnly
            value={ out.display }
          />
        );

        return (
          <div key={ `${out.name}_${out.type}_${index}` }>
            <div className={ styles.queryResultName }>
              { out.name }
            </div>
            { input }
          </div>
        );
      });
  }

  renderInput (input, index) {
    const { values } = this.state;
    const { name, type } = input;
    const label = `${name ? `${name}: ` : ''}${type}`;

    const onChange = (value) => {
      const { values } = this.state;

      this.setState({
        values: {
          ...values,
          [ index ]: value
        }
      });
    };

    return (
      <div key={ `${name}_${type}_${index}` }>
        <TypedInput
          hint={ type }
          label={ label }
          isEth={ false }
          onChange={ onChange }
          param={ type }
          value={ values[index] }
        />
      </div>
    );
  }

  renderValue (token) {
    const { api } = this.context;
    const { type, value } = token;

    if (value === null || value === undefined) {
      return 'no data';
    }

    if (type === 'array' || type === 'fixedArray') {
      return value.map((tok) => this.renderValue(tok));
    }

    if (Array.isArray(value)) {
      return api.util.bytesToHex(value);
    }

    return value;
  }

  onClick = () => {
    const { values } = this.state;
    const { inputs, contract, name, outputs, signature } = this.props;

    this.setState({
      isLoading: true,
      results: []
    });

    const inputValues = inputs.map((input, index) => values[index] || '');

    contract
      .instance[signature]
      .call({ rawTokens: true }, inputValues)
      .then(results => {
        if (outputs.length === 1) {
          results = [ results ];
        }

        this.setState({
          error: null,
          isLoading: false,
          results
        });
      })
      .catch((error) => {
        console.error(`sending ${name} with params`, inputValues, error.message);

        this.setState({
          isLoading: false,
          error
        });
      });
  };
}
