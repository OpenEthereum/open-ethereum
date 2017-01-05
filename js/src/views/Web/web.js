// Copyright 2015, 2016 Parity Technologies (UK) Ltd.
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
import store from 'store';
import { parse as parseUrl, format as formatUrl } from 'url';
import { parse as parseQuery } from 'querystring';
import { sep as pathSep } from 'path';

import AddressBar from './AddressBar';

import styles from './web.css';

const LS_LAST_ADDRESS = '_parity::webLastAddress';

export default class Web extends Component {
  static contextTypes = {
    api: PropTypes.object.isRequired
  }

  static propTypes = {
    params: PropTypes.object.isRequired
  }

  state = {
    displayedUrl: null,
    isLoading: true,
    token: null,
    url: null
  };

  componentDidMount () {
    const url = this.props.params.url || store.get(LS_LAST_ADDRESS) || 'https://mkr.market';
    this.setState({ url, displayedUrl: url });

    this.context.api.signer.generateWebProxyAccessToken().then(token => {
      this.setState({ token });
    });
  }

  render () {
    const { displayedUrl, isLoading, token } = this.state;

    if (!token) {
      return (
        <div className={ styles.wrapper }>
          <h1 className={ styles.loading }>
            Requesting access token...
          </h1>
        </div>
      );
    }

    const { dappsUrl } = this.context.api;
    const { url } = this.state;
    if (!url || !token) {
      return null;
    }

    const parsed = parseUrl(url);
    let host = parsed.host;
    let path = parsed.path;
    if (!host) {
      host = parsed.path.split(pathSep).slice(0, 1)
      path = parsed.path.split(pathSep).slice(1).join(pathSep)
    }
    const protocol = parsed.protocol ? parsed.protocol.slice(0, -1) : 'https';
    const address = `${dappsUrl}/web/${token}/${protocol}/${host}${path}`;
    console.error('address', address);

    return (
      <div className={ styles.wrapper }>
        <AddressBar
          className={ styles.url }
          isLoading={ isLoading }
          onChange={ this.onUrlChange }
          onRefresh={ this.onRefresh }
          url={ displayedUrl }
        />
        <iframe
          className={ styles.frame }
          frameBorder={ 0 }
          name={ name }
          onLoad={ this.iframeOnLoad }
          sandbox='allow-forms allow-same-origin allow-scripts'
          scrolling='auto'
          src={ address } />
      </div>
    );
  }

  onUrlChange = (url) => {
    store.set(LS_LAST_ADDRESS, url);

    this.setState({
      isLoading: true,
      displayedUrl: url,
      url: url
    });
  };

  onRefresh = () => {
    const { displayedUrl } = this.state;

    // Insert timestamp
    // This is a hack to prevent caching.
    const parsed = parseUrl(displayedUrl);
    parsed.query = parseQuery(parsed.query);
    parsed.query.t = Date.now().toString();
    delete parsed.search;

    this.setState({
      isLoading: true,
      url: formatUrl(parsed)
    });
  };

  iframeOnLoad = () => {
    this.setState({
      isLoading: false
    });
  };
}

