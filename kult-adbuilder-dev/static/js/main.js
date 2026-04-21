import { createStore } from './state/store.js';
import { createBannerState } from './state/schema.js';
import { createHistory } from './state/history.js';
import { _log } from './core/debug.js';
import * as timelineRender from './render/timeline.js';
import * as canvasRender from './render/canvas.js';
import * as propertiesUI from './ui/properties.js';
import * as layersUI from './ui/layers.js';
import * as animationUI from './ui/animation.js';
import * as selectionUI from './canvas/selection.js';

const store = createStore(createBannerState());
const history = createHistory();

window.adBuilderStore = store;
window.adBuilderHistory = history;
window.adBuilderRender = {
  ...(window.adBuilderRender || {}),
  timelineRender,
  canvasRender,
  propertiesUI,
  layersUI,
  animationUI,
  selectionUI
};

_log('Ad Builder Phase 1 bootstrap loaded');
