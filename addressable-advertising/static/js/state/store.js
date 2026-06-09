import { createBannerState, normalizeBannerState } from './schema.js';
import { deepClone } from '../core/utils.js';

export function createStore(initialState = createBannerState()) {
  let state = normalizeBannerState(initialState);
  const listeners = new Set();

  function getState() {
    return state;
  }

  function setState(nextState) {
    state = normalizeBannerState(nextState);
    listeners.forEach(listener => listener(state));
  }

  function update(updater) {
    const draft = deepClone(state);
    const result = updater(draft);
    setState(result || draft);
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return {
    getState,
    setState,
    update,
    subscribe
  };
}
