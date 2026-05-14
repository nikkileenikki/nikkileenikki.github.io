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

function arrayBufferToDataUrl(buffer, mimeType = 'application/octet-stream') {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

function getMimeTypeFromFilename(filename = '') {
  const lower = String(filename || '').toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
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

  if (id.includes('loadprojectbtn') || id.includes('loadprojectinput')) return false;
  if (id.includes('load') || text.includes('load') || action.includes('load')) return false;
  if (id.includes('import') || text.includes('import') || action.includes('import')) return false;
  if (id.includes('exportbtn') || id.includes('zip') || action.includes('zip') || exportType.includes('zip') || text.includes('export zip')) return false;
  if (id.includes('html') || action.includes('html') || exportType.includes('html') || text.includes('html')) return false;

  return (
    id.includes('saveprojectbtn') ||
    id.includes('saveproject') ||
    id.includes('save') ||
    action.includes('save') ||
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

function switchEditorMode(mode) {
  const state = window.adBuilderTemplateModeState;
  if (state) state.editorMode = mode;

  const modeSelect = document.getElementById('editorModeSelect');
  if (modeSelect) {
    modeSelect.value = mode;
    modeSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

async function hydrateTemplateAssetsFromZip(projectData, zip) {
  const assets = projectData.assets || projectData.templateAssets || {};

  await Promise.all(Object.keys(assets).map(async key => {
    const asset = assets[key];
    if (!asset?.filename || asset.dataUrl) return;

    const file = zip.file(asset.filename);
    if (!file) return;

    const buffer = await file.async('arraybuffer');
    asset.dataUrl = arrayBufferToDataUrl(buffer, asset.mimeType || getMimeTypeFromFilename(asset.filename));
  }));

  projectData.assets = assets;
  return projectData;
}

async function loadTemplateProjectData(projectData) {
  switchEditorMode('template');

  const loaded = await window.adBuilderTemplateMode?.loadTemplateSaveState?.(projectData);
  if (!loaded) return false;

  const bannerName = document.getElementById('bannerName');
  if (bannerName && projectData.bannerName) bannerName.value = projectData.bannerName;

  return true;
}

async function loadTemplateProjectJsonFile(file) {
  const text = await file.text();
  const projectData = JSON.parse(text || '{}');
  const mode = window.adBuilderTemplateMode?.detectSavedEditorMode?.(projectData) || projectData.mode || projectData.editorMode || 'freeform';
  if (mode !== 'template') return false;
  return loadTemplateProjectData(projectData);
}

async function loadTemplateProjectZipFile(file) {
  if (typeof JSZip === 'undefined') return false;

  const zip = await JSZip.loadAsync(file);
  const projectFile = zip.file('project.json');
  if (!projectFile) return false;

  const projectData = JSON.parse(await projectFile.async('string'));
  const mode = window.adBuilderTemplateMode?.detectSavedEditorMode?.(projectData) || projectData.mode || projectData.editorMode || 'freeform';
  if (mode !== 'template') {
    switchEditorMode('freeform');
    return false;
  }

  await hydrateTemplateAssetsFromZip(projectData, zip);
  return loadTemplateProjectData(projectData);
}

async function handleProjectFileInput(input) {
  const file = input.files && input.files[0];
  if (!file) return false;

  const filename = String(file.name || '').toLowerCase();
  if (!filename.endsWith('.json') && !filename.endsWith('.zip')) return false;

  if (filename.endsWith('.zip')) return loadTemplateProjectZipFile(file);
  if (filename.endsWith('.json')) return loadTemplateProjectJsonFile(file);
  return false;
}

function installModeAwareProjectImport() {
  if (window.__adBuilderModeAwareProjectImportInstalled) return;
  window.__adBuilderModeAwareProjectImportInstalled = true;

  const input = document.getElementById('loadProjectInput');
  if (input && window.jQuery) {
    window.jQuery(input).off('change');
    window.jQuery(input).on('change', async function(event) {
      try {
        const loaded = await handleProjectFileInput(this);
        if (!loaded && typeof window.loadProject === 'function') {
          window.loadProject(event);
        }
      } catch (err) {
        console.warn('[AdBuilder] Could not auto-load project file:', err);
        alert('Error loading project. Please make sure the file is a valid project ZIP.');
      } finally {
        this.value = '';
      }
    });
    return;
  }

  document.addEventListener('change', async event => {
    const target = event.target;
    if (!target || target.id !== 'loadProjectInput') return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    try {
      const loaded = await handleProjectFileInput(target);
      if (!loaded) console.warn('[AdBuilder] Project file was not handled by mode-aware loader.');
    } catch (err) {
      console.warn('[AdBuilder] Could not auto-load project file:', err);
      alert('Error loading project. Please make sure the file is a valid project ZIP.');
    } finally {
      target.value = '';
    }
  }, true);
}

function installProjectSaveModeSupport() {
  installTemplateProjectSaveZip();
  installModeAwareProjectImport();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installProjectSaveModeSupport);
} else {
  installProjectSaveModeSupport();
}

window.adBuilderProjectSaveMode = {
  getCurrentEditorMode,
  saveTemplateProjectZip,
  loadTemplateProjectZipFile,
  loadTemplateProjectJsonFile
};
