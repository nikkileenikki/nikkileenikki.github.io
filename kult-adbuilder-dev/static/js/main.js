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
import * as pointerUI from './canvas/pointer.js';
import * as moveUI from './canvas/move.js';
import * as canvasMath from './canvas/math.js';
import * as deselectUI from './canvas/deselect.js';
import * as modalKeysUI from './ui/modalKeys.js';
import './templates/registry.js';
import './templates/engine.js';
import './templates/templateMode.js';
import './templates/manifestPatch.js';
import './templates/schemaHydrationPatch.js';
import './templates/previewAssetBasePatch.js';
import './canvas/videoPreviewPatch.js';

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
  selectionUI,
  pointerUI,
  moveUI,
  canvasMath,
  deselectUI,
  modalKeysUI
};

window.adBuilderTemplates = {
  registry: window.adBuilderTemplateRegistry || [],
  engine: window.adBuilderTemplateEngine || null
};

_log('Ad Builder Phase 1 bootstrap loaded');
