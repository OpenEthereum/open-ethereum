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

import { handleActions } from 'redux-actions';

const initialState = {
  compatibilityMode: false,
  pending: [],
  finished: []
};

export default handleActions({

  // TODO [legacy;todr] Remove
  'update compatibilityMode' (state, action) {
    return {
      ...state,
      compatibilityMode: action.payload
    };
  },

  'update pendingRequests' (state, action) {
    return {
      ...state,
      pending: action.payload
    };
  },

  'start confirmRequest' (state, action) {
    return {
      ...state,
      pending: setIsSending(state.pending, action.payload.id, true)
    };
  },

  'success confirmRequest' (state, action) {
    const { id, txHash } = action.payload;
    const confirmed = Object.assign(
      state.pending.find(p => p.id === id),
      { result: txHash, status: 'confirmed' }
    );

    return {
      ...state,
      pending: removeWithId(state.pending, id),
      finished: [confirmed].concat(state.finished)
    };
  },

  'error confirmRequest' (state, action) {
    return {
      ...state,
      pending: setIsSending(state.pending, action.payload.id, false)
    };
  },

  'start rejectRequest' (state, action) {
    return {
      ...state,
      pending: setIsSending(state.pending, action.payload.id, true)
    };
  },

  'success rejectRequest' (state, action) {
    const { id } = action.payload;
    const rejected = Object.assign(
      state.pending.find(p => p.id === id),
      { status: 'rejected' }
    );
    return {
      ...state,
      pending: removeWithId(state.pending, id),
      finished: [rejected].concat(state.finished)
    };
  },

  'error rejectRequest' (state, action) {
    return {
      ...state,
      pending: setIsSending(state.pending, action.payload.id, false)
    };
  }

}, initialState);

function removeWithId (pending, id) {
  return pending.filter(tx => tx.id !== id).slice();
}

function setIsSending (pending, id, isSending) {
  return pending.map(p => {
    if (p.id === id) {
      p.isSending = isSending;
    }
    return p;
  }).slice();
}
