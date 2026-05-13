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

  if (!payload.mode) payload.mode = 'freeform';
  if (!payload.editorMode) payload.editorMode = 'freeform';

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
