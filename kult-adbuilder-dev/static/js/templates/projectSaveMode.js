function getCurrentEditorMode() {
  const state = window.adBuilderTemplateModeState;
  if (state?.editorMode === 'template' && state.activeTemplate) return 'template';
  return 'freeform';
}

function getModeAwareJsonPayload(originalPayload = null) {
  const mode = getCurrentEditorMode();

  if (mode === 'template') {
    const templateState = window.adBuilderTemplateMode?.getTemplateSaveState?.();
    if (templateState) return templateState;
  }

  const payload = originalPayload && typeof originalPayload === 'object' && !Array.isArray(originalPayload)
    ? { ...originalPayload }
    : {};

  payload.mode = payload.mode || 'freeform';
  payload.editorMode = payload.editorMode || payload.mode || 'freeform';

  return payload;
}

function sanitizeProjectFilename(name = '') {
  return String(name || 'template-banner')
    .trim()
    .replace(/\.json$/i, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'template-banner';
}

function getProjectJsonFilename() {
  const bannerName = document.getElementById('bannerName')?.value || window.adBuilderTemplateModeState?.activeTemplate?.templateId || 'template-banner';
  return `${sanitizeProjectFilename(bannerName)}.json`;
}

function saveTemplateProjectJson() {
  const payload = window.adBuilderTemplateMode?.getTemplateSaveState?.();
  if (!payload) return false;

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });

  if (typeof window.saveAs === 'function') {
    window.saveAs(blob, getProjectJsonFilename());
  } else {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getProjectJsonFilename();
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return true;
}

function isTemplateProjectSaveTrigger(target) {
  const trigger = target?.closest?.('button, a, [role="button"], [data-action], [data-export]');
  if (!trigger) return false;

  const id = String(trigger.id || '').toLowerCase();
  const action = String(trigger.dataset?.action || '').toLowerCase();
  const exportType = String(trigger.dataset?.export || '').toLowerCase();
  const text = String(trigger.textContent || trigger.getAttribute('aria-label') || trigger.title || '').toLowerCase();

  if (id.includes('zip') || action.includes('zip') || exportType.includes('zip') || text.includes('zip')) return false;
  if (id.includes('html') || action.includes('html') || exportType.includes('html') || text.includes('html')) return false;

  return (
    id.includes('save') ||
    id.includes('project') ||
    id.includes('json') ||
    action.includes('save') ||
    action.includes('project') ||
    action.includes('json') ||
    exportType.includes('json') ||
    text.includes('save project') ||
    text.includes('save json') ||
    text.includes('export json') ||
    text.includes('project json')
  );
}

function installTemplateProjectSaveClickBypass() {
  if (window.__adBuilderTemplateProjectSaveClickBypassInstalled) return;
  window.__adBuilderTemplateProjectSaveClickBypassInstalled = true;

  document.addEventListener('click', event => {
    if (getCurrentEditorMode() !== 'template') return;
    if (!isTemplateProjectSaveTrigger(event.target)) return;

    const saved = saveTemplateProjectJson();
    if (!saved) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }, true);
}

async function blobToJsonPayload(blob) {
  if (!blob || typeof blob.text !== 'function') return null;
  try {
    const text = await blob.text();
    return text ? JSON.parse(text) : null;
  } catch (err) {
    return null;
  }
}

function shouldHandleJsonSave(blob, filename) {
  const name = String(filename || '').toLowerCase();
  const type = String(blob?.type || '').toLowerCase();
  return name.endsWith('.json') || type.includes('application/json');
}

function installModeAwareJsonSave() {
  if (window.__adBuilderModeAwareJsonSaveInstalled) return;

  const originalSaveAs = window.saveAs;
  if (typeof originalSaveAs !== 'function') {
    window.setTimeout(installModeAwareJsonSave, 50);
    return;
  }

  window.saveAs = function(blob, filename, ...rest) {
    if (!shouldHandleJsonSave(blob, filename)) {
      return originalSaveAs.call(this, blob, filename, ...rest);
    }

    Promise.resolve(blobToJsonPayload(blob)).then(originalPayload => {
      const payload = getModeAwareJsonPayload(originalPayload);
      const json = JSON.stringify(payload, null, 2);
      const nextBlob = new Blob([json], { type: 'application/json' });
      originalSaveAs.call(this, nextBlob, filename || getProjectJsonFilename(), ...rest);
    }).catch(err => {
      console.warn('[AdBuilder] Could not add mode to JSON save:', err);
      originalSaveAs.call(this, blob, filename, ...rest);
    });

    return undefined;
  };

  window.__adBuilderModeAwareJsonSaveInstalled = true;
}

function stampModeIntoJsonText(text) {
  try {
    const parsed = JSON.parse(String(text || '{}'));
    return JSON.stringify(getModeAwareJsonPayload(parsed), null, 2);
  } catch (err) {
    return text;
  }
}

function isJsonBlobParts(parts, options) {
  const type = String(options?.type || '').toLowerCase();
  if (type.includes('application/json')) return true;
  if (!Array.isArray(parts) || parts.length !== 1) return false;
  const only = parts[0];
  if (typeof only !== 'string') return false;
  const trimmed = only.trim();
  return trimmed.startsWith('{') && trimmed.endsWith('}') && trimmed.includes('"elements"');
}

function installJsonBlobModeStamp() {
  if (window.__adBuilderJsonBlobModeStampInstalled) return;
  const NativeBlob = window.Blob;
  if (typeof NativeBlob !== 'function') return;

  function ModeAwareBlob(parts = [], options = {}) {
    let nextParts = parts;
    if (isJsonBlobParts(parts, options)) {
      nextParts = [stampModeIntoJsonText(parts[0])];
      options = { ...options, type: 'application/json' };
    }
    return new NativeBlob(nextParts, options);
  }

  ModeAwareBlob.prototype = NativeBlob.prototype;
  Object.setPrototypeOf(ModeAwareBlob, NativeBlob);
  window.Blob = ModeAwareBlob;
  window.__adBuilderJsonBlobModeStampInstalled = true;
}

function decodeDataUriPayload(uri) {
  const value = String(uri || '');
  const commaIndex = value.indexOf(',');
  if (commaIndex < 0) return '';
  const meta = value.slice(0, commaIndex).toLowerCase();
  const payload = value.slice(commaIndex + 1);
  if (meta.includes(';base64')) {
    try { return atob(payload); }
    catch (err) { return ''; }
  }
  try { return decodeURIComponent(payload); }
  catch (err) { return payload; }
}

function encodeJsonDataUri(jsonText) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonText)}`;
}

function patchAnchorJsonDownload(anchor) {
  if (!anchor || anchor.dataset.adBuilderModeStamped === '1') return;
  const download = String(anchor.getAttribute('download') || '').toLowerCase();
  const href = String(anchor.getAttribute('href') || '');
  if (!download.endsWith('.json') && !href.startsWith('data:application/json')) return;
  if (!href.startsWith('data:')) return;

  const jsonText = decodeDataUriPayload(href);
  if (!jsonText) return;

  const stamped = stampModeIntoJsonText(jsonText);
  if (stamped === jsonText) return;

  anchor.href = encodeJsonDataUri(stamped);
  anchor.dataset.adBuilderModeStamped = '1';
}

function installAnchorJsonDownloadStamp() {
  if (window.__adBuilderAnchorJsonDownloadStampInstalled) return;
  const nativeClick = HTMLAnchorElement.prototype.click;

  HTMLAnchorElement.prototype.click = function(...args) {
    patchAnchorJsonDownload(this);
    return nativeClick.apply(this, args);
  };

  document.addEventListener('click', event => {
    const anchor = event.target?.closest?.('a[download]');
    if (anchor) patchAnchorJsonDownload(anchor);
  }, true);

  window.__adBuilderAnchorJsonDownloadStampInstalled = true;
}

function installModeAwareJsonImport() {
  if (window.__adBuilderModeAwareJsonImportInstalled) return;
  window.__adBuilderModeAwareJsonImportInstalled = true;

  document.addEventListener('change', event => {
    const input = event.target;
    if (!input || input.tagName !== 'INPUT' || input.type !== 'file') return;

    const file = input.files && input.files[0];
    if (!file || !String(file.name || '').toLowerCase().endsWith('.json')) return;

    const reader = new FileReader();
    reader.onload = async () => {
      let payload = null;
      try { payload = JSON.parse(String(reader.result || '{}')); }
      catch (err) { return; }

      const mode = window.adBuilderTemplateMode?.detectSavedEditorMode?.(payload) || payload.mode || payload.editorMode || 'freeform';
      if (mode !== 'template') return;

      const loaded = await window.adBuilderTemplateMode?.loadTemplateSaveState?.(payload);
      if (loaded) {
        event.preventDefault();
        event.stopImmediatePropagation();
        input.value = '';
      }
    };
    reader.readAsText(file);
  }, true);
}

function installProjectSaveModeSupport() {
  installJsonBlobModeStamp();
  installAnchorJsonDownloadStamp();
  installTemplateProjectSaveClickBypass();
  installModeAwareJsonSave();
  installModeAwareJsonImport();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installProjectSaveModeSupport);
} else {
  installProjectSaveModeSupport();
}

window.adBuilderProjectSaveMode = {
  getCurrentEditorMode,
  getModeAwareJsonPayload,
  saveTemplateProjectJson
};
