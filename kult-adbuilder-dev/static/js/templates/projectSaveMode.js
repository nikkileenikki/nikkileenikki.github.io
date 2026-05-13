function getCurrentEditorMode() {
  const state = window.adBuilderTemplateModeState;
  if (state?.editorMode === 'template' && state.activeTemplate) return 'template';
  return 'freeform';
}

function sanitizeProjectFilename(name = '') {
  return String(name || 'template-banner')
    .trim()
    .replace(/\.(json|zip)$/i, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'template-banner';
}

function getProjectZipFilename() {
  const bannerName = document.getElementById('bannerName')?.value || window.adBuilderTemplateModeState?.activeTemplate?.templateId || 'template-banner';
  const timestamp = new Date().toISOString().slice(0, 10);
  return `${sanitizeProjectFilename(bannerName)}-${timestamp}.zip`;
}

function dataUrlToBase64(dataUrl = '') {
  return String(dataUrl || '').split(',')[1] || '';
}

async function saveTemplateProjectZip() {
  const payload = window.adBuilderTemplateMode?.getTemplateSaveState?.();
  if (!payload || typeof JSZip === 'undefined') return false;

  const projectData = {
    ...payload,
    mode: 'template',
    editorMode: 'template',
    timestamp: new Date().toISOString(),
    bannerName: document.getElementById('bannerName')?.value || payload.templateId || 'template-banner'
  };

  const zip = new JSZip();
  zip.file('project.json', JSON.stringify(projectData, null, 2));

  Object.values(projectData.assets || {}).forEach(asset => {
    if (!asset?.filename || !asset?.dataUrl) return;
    const base64Data = dataUrlToBase64(asset.dataUrl);
    if (!base64Data) return;
    zip.file(asset.filename, base64Data, { base64: true });
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const filename = getProjectZipFilename();

  if (typeof window.saveAs === 'function') {
    window.saveAs(blob, filename);
  } else {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
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

  if (id.includes('exportbtn') || id.includes('zip') || action.includes('zip') || exportType.includes('zip') || text.includes('export zip')) return false;
  if (id.includes('html') || action.includes('html') || exportType.includes('html') || text.includes('html')) return false;

  return (
    id.includes('saveproject') ||
    id.includes('save') ||
    id.includes('project') ||
    action.includes('save') ||
    action.includes('project') ||
    text.includes('save project') ||
    text.includes('save banner')
  );
}

function installTemplateProjectSaveZip() {
  if (window.__adBuilderTemplateProjectSaveZipInstalled) return;
  window.__adBuilderTemplateProjectSaveZipInstalled = true;

  document.addEventListener('click', async event => {
    if (getCurrentEditorMode() !== 'template') return;
    if (!isTemplateProjectSaveTrigger(event.target)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const saved = await saveTemplateProjectZip();
    if (!saved) alert('Nothing to save! Please select a template first.');
  }, true);
}

function installModeAwareTemplateImport() {
  if (window.__adBuilderTemplateProjectImportInstalled) return;
  window.__adBuilderTemplateProjectImportInstalled = true;

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
  installTemplateProjectSaveZip();
  installModeAwareTemplateImport();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installProjectSaveModeSupport);
} else {
  installProjectSaveModeSupport();
}

window.adBuilderProjectSaveMode = {
  getCurrentEditorMode,
  saveTemplateProjectZip
};
