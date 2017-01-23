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

import { shallow } from 'enzyme';
import React from 'react';

import defaults, { MODES } from './defaults';

import Features from './';

let component;
let instance;

function render (props = { visible: true }) {
  component = shallow(
    <Features { ...props } />
  );
  instance = component.instance();

  return component;
}

describe('views/Settings/Features', () => {
  beforeEach(() => {
    render();
  });

  it('renders defaults', () => {
    expect(component).to.be.ok;
  });

  describe('visibility', () => {
    it('renders null when props.visible === false', () => {
      render({ visible: false });
      expect(instance.render()).to.be.null;
    });

    it('renders component when props.visible === true', () => {
      expect(instance.render()).not.to.be.null;
    });
  });

  describe('instance methods', () => {
    describe('renderItem', () => {
      const keys = Object.keys(defaults).filter((key) => defaults[key].mode !== MODES.PRODUCTION);
      const key = keys[0];

      let item;

      beforeEach(() => {
        item = instance.renderItem(key);
        console.log(item);
      });

      it('renders an item', () => {
        expect(item).to.not.be.null;
      });

      it('displays the correct name', () => {
        expect(item.props.primaryText).to.equal(defaults[key].name);
      });
    });
  });
});
