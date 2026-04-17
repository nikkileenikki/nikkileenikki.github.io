import { createStore } from './state/store.js';
import { createBannerState } from './state/schema.js';
import { createHistory } from './state/history.js';
import { _log } from './core/debug.js';

const store = createStore(createBannerState());
const history = createHistory();

window.adBuilderStore = store;
window.adBuilderHistory = history;

_log('Ad Builder Phase 1 bootstrap loaded');
