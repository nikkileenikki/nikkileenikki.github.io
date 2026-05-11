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

function installTemplateExportPatch() {
  if (!window.JSZip || window.JSZip.__adBuilderTemplateExportPatch) return;

  const originalZipFile = window.JSZip.prototype.file;
  const originalGenerateAsync = window.JSZip.prototype.generateAsync;

  window.JSZip.prototype.file = function(name, data, options) {
    const filename = String(name || '');

    if (arguments.length > 1 && filename === 'README-template-assets.txt') {
      return this;
    }

    if (arguments.length > 1 && filename === 'manifest.js') {
      return this;
    }

    if (arguments.length > 1 && filename === 'index.html' && typeof data === 'string') {
      data = data.replace(/\s*<script\s+src=["']manifest\.js["']><\/script>\s*/i, '\n');
    }

    return originalZipFile.call(this, name, data, options);
  };

  window.JSZip.prototype.generateAsync = async function(options, onUpdate) {
    const state = window.adBuilderTemplateModeState;
    const activeTemplate = state?.activeTemplate;
    const registry = window.adBuilderTemplateRegistry || [];
    const templateMeta = registry.find(template => template.id === activeTemplate?.templateId);
    const size = activeTemplate?.size;

    if (templateMeta?.basePath && size && !this.file('manifest.js')) {
      const manifestPath = `${templateMeta.basePath}/sizes/${size}/manifest.js`;
      try {
        const response = await fetch(manifestPath, { cache: 'no-store' });
        if (response.ok) {
          originalZipFile.call(this, 'manifest.js', await response.text());
        }
      } catch (err) {
        console.warn('[AdBuilder] Template manifest.js not found:', manifestPath, err);
      }
    }

    return originalGenerateAsync.call(this, options, onUpdate);
  };

  window.JSZip.__adBuilderTemplateExportPatch = true;
}

function installTemplateImageFieldStylePatch() {
  if (document.getElementById('templateImageFieldStylePatch')) return;

  const style = document.createElement('style');
  style.id = 'templateImageFieldStylePatch';
  style.textContent = `
    .template-image-dropzone {
      border-style: solid !important;
    }
    .template-image-dropzone .mt-2.h-20 {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
}

installTemplateExportPatch();
installTemplateImageFieldStylePatch();

_log('Ad Builder Phase 1 bootstrap loaded');
