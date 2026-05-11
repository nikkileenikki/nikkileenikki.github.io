function getTemplateRegistry() {
  return (window.adBuilderTemplates && window.adBuilderTemplates.registry) || [];
}

function getTemplateEngine() {
  return window.adBuilderTemplates && window.adBuilderTemplates.engine;
}

function getTemplateModeState() {
  if (!window.adBuilderTemplateModeState) {
    window.adBuilderTemplateModeState = {
      editorMode: 'freeform',
      activeTemplate: null,
      activeDefinition: null,
      originalCanvasSizeOptions: null,
      templateAssets: {}
    };
  }
  return window.adBuilderTemplateModeState;
}

function pinToolbarActionsToTop(toolbarParent) {
  const candidateIds = ['clearBtn', 'importExportDropdownWrapper', 'importExportBtn'];

  candidateIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    let node = el;
    while (node && node.parentElement && node.parentElement !== toolbarParent) {
      node = node.parentElement;
    }

    if (node && node !== toolbarParent) {
      node.classList.add('self-start');
      node.style.alignSelf = 'flex-start';
      node.style.marginTop = '0';
    }
  });
}

function injectTemplateToolbar() {
  if (document.getElementById('templateModeToolbar')) return;

  const bannerName = document.getElementById('bannerName');
  const canvasSize = document.getElementById('canvasSize');
  if (!bannerName || !canvasSize) return;

  const toolbarRow = canvasSize.closest('.flex');
  if (!toolbarRow || !toolbarRow.parentElement) return;

  const toolbarParent = toolbarRow.parentElement;
  toolbarParent.classList.add('items-start');

  const leftStack = document.createElement('div');
  leftStack.id = 'templateToolbarStack';
  leftStack.className = 'flex flex-col flex-1 min-w-0';

  const topRow = document.createElement('div');
  topRow.id = 'templateModeToolbar';
  topRow.className = 'flex items-center gap-3 mb-2 overflow-x-auto whitespace-nowrap';
  topRow.innerHTML = `
    <label class="text-sm text-gray-400 whitespace-nowrap">Mode:</label>
    <select id="editorModeSelect" class="bg-gray-700 rounded px-3 py-1 text-sm text-white shrink-0">
      <option value="freeform">Free-form</option>
      <option value="template">Template</option>
    </select>
    <div id="templatePickerWrap" class="hidden items-center gap-2 shrink-0">
      <label class="text-sm text-gray-400 whitespace-nowrap">Template:</label>
      <select id="templateSelect" class="bg-gray-700 rounded px-3 py-1 text-sm text-white w-48 shrink-0"></select>
    </div>
  `;

  toolbarParent.insertBefore(leftStack, toolbarRow);
  leftStack.appendChild(topRow);
  leftStack.appendChild(toolbarRow);

  toolbarRow.classList.add('min-w-0');
  pinToolbarActionsToTop(toolbarParent);
}

function injectTemplatePanel() {
  if (document.getElementById('templateContentPanel')) return;

  const leftCol = document.querySelector('.w-80.bg-gray-800 .p-3.flex-1.overflow-y-auto');
  if (!leftCol) return;

  const panel = document.createElement('div');
  panel.id = 'templateContentPanel';
  panel.className = 'mb-2 hidden';
  panel.innerHTML = `
    <h2 class="text-lg font-semibold mb-3">Template Content</h2>
    <div class="space-y-3 bg-gray-900 rounded-lg p-3">
      <div id="templateMetaText" class="text-sm text-gray-400 min-w-0"></div>
      <div id="templateFieldsWrap" class="space-y-3"></div>
    </div>
  `;

  leftCol.appendChild(panel);
}

function ensureTemplatePreviewLayer() {
  const canvas = document.getElementById('canvas');
  if (!canvas) return null;

  let layer = document.getElementById('templatePreviewLayer');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'templatePreviewLayer';
    layer.style.position = 'absolute';
    layer.style.left = '0';
    layer.style.top = '0';
    layer.style.width = '100%';
    layer.style.height = '100%';
    layer.style.zIndex = '0';
    layer.style.pointerEvents = 'none';
    layer.style.overflow = 'hidden';
    canvas.appendChild(layer);
  }

  return layer;
}

function clearTemplatePreview() {
  const layer = document.getElementById('templatePreviewLayer');
  if (layer) {
    layer.innerHTML = '';
    layer.style.display = 'none';
  }
}

function emptyImageDataUri() {
  return 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%221%22%20height%3D%221%22%3E%3C%2Fsvg%3E';
}

function sanitizeTemplateAssetFilename(name) {
  const parts = String(name || 'asset').split('.');
  const ext = parts.length > 1 ? '.' + parts.pop().toLowerCase() : '';
  const base = parts.join('.') || 'asset';
  return `${base.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'asset'}${ext}`;
}

function ensureUniqueTemplateAssetFilename(key, originalName) {
  const state = getTemplateModeState();
  const desired = sanitizeTemplateAssetFilename(originalName || `${key}.png`);
  const used = new Set(
    Object.entries(state.templateAssets || {})
      .filter(([assetKey]) => assetKey !== key)
      .map(([, asset]) => asset.filename)
      .filter(Boolean)
  );

  if (!used.has(desired)) return desired;

  const dot = desired.lastIndexOf('.');
  const base = dot >= 0 ? desired.slice(0, dot) : desired;
  const ext = dot >= 0 ? desired.slice(dot) : '';
  let counter = 2;
  let candidate = `${base}-${counter}${ext}`;
  while (used.has(candidate)) {
    counter += 1;
    candidate = `${base}-${counter}${ext}`;
  }
  return candidate;
}

function getTemplateAsset(key) {
  const state = getTemplateModeState();
  return state.templateAssets?.[key] || null;
}

function getTemplateAssetPreviewSrc(key) {
  const asset = getTemplateAsset(key);
  return asset?.dataUrl || '';
}

function resolveTemplateImagePreviewSrc(key, currentValue) {
  const uploadedSrc = getTemplateAssetPreviewSrc(key);
  if (uploadedSrc) return uploadedSrc;
  if (typeof currentValue === 'string' && currentValue.startsWith('data:') && !currentValue.includes('image/svg+xml')) return currentValue;
  if (typeof currentValue === 'string' && currentValue.startsWith('blob:')) return currentValue;
  return emptyImageDataUri();
}

function dataUrlToUint8Array(dataUrl) {
  const parts = String(dataUrl || '').split(',');
  const base64 = parts[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function getTemplateSizeKeys(schema) {
  const engine = getTemplateEngine();
  return engine?.getTemplateSizeKeys ? engine.getTemplateSizeKeys(schema) : [];
}

function getTemplateSizeConfig(schema, size) {
  const engine = getTemplateEngine();
  return engine?.getTemplateSizeConfig ? engine.getTemplateSizeConfig(schema, size) : null;
}

function getTemplateLayout(schema, size) {
  const engine = getTemplateEngine();
  return engine?.getTemplateLayout ? engine.getTemplateLayout(schema, size) : (schema?.layouts?.[size] || {});
}

function buildPreviewTemplateInstance(instance, definition) {
  const preview = JSON.parse(JSON.stringify(instance));
  const schema = definition.schema || {};

  (schema.variables || []).forEach(variable => {
    if (variable.type === 'repeater') {
      const min = Math.max(variable.min || 1, 1);
      if (!Array.isArray(preview.content[variable.key]) || preview.content[variable.key].length === 0) {
        preview.content[variable.key] = Array.from({ length: min }, (_, index) => {
          const item = {};
          (variable.fields || []).forEach(field => {
            if (field.type === 'image') item[field.key] = resolveTemplateImagePreviewSrc(`${variable.key}.${index}.${field.key}`, '');
            else if (field.type === 'text') item[field.key] = field.key === 'heading' ? `Headline ${index + 1}` : `Body copy ${index + 1}`;
            else if (field.type === 'url') item[field.key] = 'https://example.com';
            else if (field.type === 'number') item[field.key] = index + 1;
            else if (field.type === 'boolean') item[field.key] = false;
            else item[field.key] = '';
          });
          return item;
        });
      } else {
        preview.content[variable.key] = preview.content[variable.key].map((item, index) => {
          const next = { ...(item || {}) };
          (variable.fields || []).forEach(field => {
            if (field.type === 'image') next[field.key] = resolveTemplateImagePreviewSrc(`${variable.key}.${index}.${field.key}`, next[field.key]);
          });
          return next;
        });
      }
      return;
    }

    if (variable.type === 'image') {
      preview.content[variable.key] = resolveTemplateImagePreviewSrc(variable.key, preview.content[variable.key]);
      return;
    }

    if (preview.content[variable.key] === '' || preview.content[variable.key] == null) {
      if (variable.type === 'text') preview.content[variable.key] = variable.label || variable.key;
      else if (variable.type === 'number') preview.content[variable.key] = variable.default ?? 1;
      else if (variable.type === 'url') preview.content[variable.key] = 'https://example.com';
      else if (variable.type === 'boolean') preview.content[variable.key] = Boolean(variable.default);
    }
  });

  preview.content.__missing_images_list = '';
  return preview;
}

function buildTemplatePreviewDocument(bundle) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
html, body { margin:0; padding:0; width:100%; height:100%; overflow:hidden; background:transparent; }
img[src^="data:image/svg+xml"] { opacity: 0 !important; visibility: hidden !important; }
${bundle.css}
</style>
</head>
<body>
${bundle.html}
</body>
</html>`;
}

async function renderTemplatePreview() {
  const state = getTemplateModeState();
  const engine = getTemplateEngine();
  const layer = ensureTemplatePreviewLayer();
  if (!layer) return;

  if (state.editorMode !== 'template' || !state.activeTemplate || !state.activeDefinition || !engine) {
    clearTemplatePreview();
    return;
  }

  try {
    const previewInstance = buildPreviewTemplateInstance(state.activeTemplate, state.activeDefinition);
    const bundle = await engine.renderTemplateBundle(previewInstance);
    const previewDoc = buildTemplatePreviewDocument(bundle);

    layer.style.display = 'block';
    layer.innerHTML = '';

    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', 'Template Preview');
    iframe.setAttribute('scrolling', 'no');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    iframe.style.background = 'transparent';
    iframe.style.pointerEvents = 'none';
    iframe.srcdoc = previewDoc;

    layer.appendChild(iframe);
  } catch (err) {
    console.error('Failed to render template preview', err);
    layer.style.display = 'block';
    layer.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(17,24,39,0.65);color:#e5e7eb;font:14px Arial,sans-serif;">Template preview unavailable</div>';
  }
}

function populateTemplatePicker() {
  const registry = getTemplateRegistry();
  const select = document.getElementById('templateSelect');
  if (!select) return;

  select.innerHTML = '';
  registry.forEach(template => {
    const option = document.createElement('option');
    option.value = template.id;
    option.textContent = template.name;
    select.appendChild(option);
  });
}

function getAllowedSizesForTemplate(templateId) {
  const registry = getTemplateRegistry();
  const template = registry.find(item => item.id === templateId);
  const schema = template?.schema || null;
  const sizes = getTemplateSizeKeys(schema);
  return sizes.length ? sizes : (template?.sizes || ['300x250']);
}

function applyTemplateCanvasSizeOptions(templateId) {
  const state = getTemplateModeState();
  const canvasSize = document.getElementById('canvasSize');
  if (!canvasSize) return;

  if (!state.originalCanvasSizeOptions) state.originalCanvasSizeOptions = canvasSize.innerHTML;

  const sizes = getAllowedSizesForTemplate(templateId);
  canvasSize.innerHTML = sizes.map(size => `<option value="${size}">${size}</option>`).join('');
}

function restoreFreeformCanvasSizeOptions() {
  const state = getTemplateModeState();
  const canvasSize = document.getElementById('canvasSize');
  if (!canvasSize || !state.originalCanvasSizeOptions) return;
  canvasSize.innerHTML = state.originalCanvasSizeOptions;
}

async function hydrateRegistrySchemas() {
  const engine = getTemplateEngine();
  const registry = getTemplateRegistry();
  if (!engine) return;

  await Promise.all(registry.map(async template => {
    if (template.schema) return;
    try { template.schema = await engine.loadTemplateSchema(template); }
    catch (err) { console.error('Failed to load template schema', template.id, err); }
  }));
}

function setTemplateCanvasSize(size) {
  const [width, height] = String(size).split('x').map(Number);
  const canvasSize = document.getElementById('canvasSize');
  const customWidth = document.getElementById('customWidth');
  const customHeight = document.getElementById('customHeight');
  if (!canvasSize || !customWidth || !customHeight) return;
  canvasSize.value = size;
  customWidth.value = width;
  customHeight.value = height;
  if (window.$) $(canvasSize).trigger('change');
  else canvasSize.dispatchEvent(new Event('change', { bubbles: true }));
}

function buildDefaultContent(schema) {
  const content = {};
  (schema.variables || []).forEach(variable => {
    if (variable.type === 'repeater') content[variable.key] = [];
    else if (variable.type === 'boolean') content[variable.key] = Boolean(variable.default);
    else if (variable.default != null) content[variable.key] = variable.default;
    else content[variable.key] = '';
  });
  return content;
}

function getRenderableTemplateFields(schema) {
  const variables = Array.isArray(schema?.variables) ? schema.variables : [];
  const defaults = schema?.defaults || {};
  const existingKeys = new Set(variables.map(variable => variable.key));
  const inferred = Object.keys(defaults)
    .filter(key => !existingKeys.has(key))
    .map(key => ({
      key,
      type: typeof defaults[key] === 'boolean' ? 'boolean' : (typeof defaults[key] === 'number' ? 'number' : 'text'),
      default: defaults[key],
      inferred: true
    }));
  return [...variables, ...inferred];
}

function renderTemplateImageField(variable) {
  const label = variable.label || variable.key;
  const asset = getTemplateAsset(variable.key);
  const hasImage = !!asset?.dataUrl;

  if (hasImage) {
    return `
      <label class="text-sm text-gray-300 block">${label}</label>
      <div class="template-image-dropzone flex items-center gap-3 border border-gray-700 rounded-lg px-3 py-2 bg-gray-800/70 cursor-pointer" data-template-key="${variable.key}" data-template-type="image" tabindex="0" role="button">
        <input data-template-key="${variable.key}" data-template-type="image" type="file" accept="image/*" class="template-image-input hidden">
        <img src="${String(asset.dataUrl).replace(/"/g, '&quot;')}" alt="${label}" class="w-12 h-12 object-contain bg-gray-950 rounded border border-gray-700 shrink-0">
        <div class="min-w-0 flex-1 text-left">
          <div class="text-sm text-gray-200 truncate">${asset.filename}</div>
          <div class="text-xs text-gray-500">Click or drop to replace</div>
        </div>
        <button type="button" class="template-image-delete shrink-0 px-2 py-1 text-xs rounded bg-red-600 hover:bg-red-700 text-white" data-template-key="${variable.key}">Delete</button>
      </div>`;
  }

  return `
    <label class="text-sm text-gray-300 block">${label}</label>
    <div class="template-image-dropzone border border-gray-700 rounded-lg px-3 py-4 text-center bg-gray-800/70 hover:bg-gray-800 transition-colors cursor-pointer" data-template-key="${variable.key}" data-template-type="image" tabindex="0" role="button">
      <div class="text-sm text-gray-200">Drop image here</div>
      <div class="text-xs text-gray-500 mt-1">or click to upload</div>
      <input data-template-key="${variable.key}" data-template-type="image" type="file" accept="image/*" class="template-image-input hidden">
    </div>`;
}

function renderTemplateVariableField(variable, currentValue) {
  const label = variable.label || variable.key;
  if (variable.type === 'repeater') {
    const textareaValue = JSON.stringify(currentValue || [], null, 2);
    return `<label class="text-sm text-gray-300 block">${label}</label><p class="text-xs text-gray-500">Enter JSON array for repeater content.</p><textarea data-template-key="${variable.key}" data-template-type="repeater" class="template-field-input w-full bg-gray-800 rounded px-3 py-2 text-sm min-h-[160px]">${textareaValue}</textarea>`;
  }
  if (variable.type === 'image') return renderTemplateImageField(variable);
  if (variable.type === 'boolean') return `<label class="flex items-center gap-2 text-sm text-gray-300"><input data-template-key="${variable.key}" data-template-type="boolean" type="checkbox" class="template-field-input" ${currentValue ? 'checked' : ''}><span>${label}</span></label>`;
  const inputType = variable.type === 'number' ? 'number' : 'text';
  const safeValue = currentValue == null ? '' : String(currentValue).replace(/"/g, '&quot;');
  const helper = variable.inferred ? '<p class="text-xs text-gray-500">Auto-added from template defaults.</p>' : '';
  return `<label class="text-sm text-gray-300 block">${label}</label>${helper}<input data-template-key="${variable.key}" data-template-type="${variable.type}" type="${inputType}" class="template-field-input w-full bg-gray-800 rounded px-3 py-2 text-sm" value="${safeValue}">`;
}

function renderTemplateFields() {
  const state = getTemplateModeState();
  const panel = document.getElementById('templateContentPanel');
  const meta = document.getElementById('templateMetaText');
  const wrap = document.getElementById('templateFieldsWrap');
  if (!panel || !meta || !wrap) return;

  if (state.editorMode !== 'template' || !state.activeDefinition || !state.activeTemplate) {
    panel.classList.add('hidden');
    return;
  }

  panel.classList.remove('hidden');
  meta.textContent = `${state.activeDefinition.schema.name} • ${state.activeTemplate.size}`;

  wrap.innerHTML = '';
  const fields = getRenderableTemplateFields(state.activeDefinition.schema);
  fields.forEach(variable => {
    const fieldWrap = document.createElement('div');
    fieldWrap.className = 'space-y-1';
    const currentValue = Object.prototype.hasOwnProperty.call(state.activeTemplate.content, variable.key)
      ? state.activeTemplate.content[variable.key]
      : state.activeTemplate.settings?.[variable.key];
    fieldWrap.innerHTML = renderTemplateVariableField(variable, currentValue);
    wrap.appendChild(fieldWrap);
  });
}

function syncTemplateField(key, type, rawValue, checkedValue) {
  const state = getTemplateModeState();
  if (!state.activeTemplate) return;
  let nextValue = rawValue;
  if (type === 'repeater') {
    try { nextValue = JSON.parse(rawValue || '[]'); }
    catch (err) { console.warn('Invalid repeater JSON for', key, err); return; }
  } else if (type === 'number') nextValue = rawValue === '' ? '' : Number(rawValue);
  else if (type === 'boolean') nextValue = Boolean(checkedValue);

  if (Object.prototype.hasOwnProperty.call(state.activeTemplate.content, key)) state.activeTemplate.content[key] = nextValue;
  else state.activeTemplate.settings[key] = nextValue;

  renderTemplateFields();
  renderTemplatePreview();
}

function setTemplateImageAsset(key, file, dataUrl) {
  const state = getTemplateModeState();
  const filename = ensureUniqueTemplateAssetFilename(key, file?.name || `${key}.png`);
  state.templateAssets[key] = { filename, originalName: file?.name || filename, mimeType: file?.type || 'image/png', dataUrl: String(dataUrl || '') };
  syncTemplateField(key, 'image', filename, false);
}

function deleteTemplateImageAsset(key) {
  const state = getTemplateModeState();
  if (state.templateAssets[key]) delete state.templateAssets[key];
  syncTemplateField(key, 'image', '', false);
}

function handleTemplateImageFile(key, file) {
  if (!file || !file.type || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = function() { setTemplateImageAsset(key, file, reader.result); };
  reader.readAsDataURL(file);
}

function updateTemplateModeUI() {
  const state = getTemplateModeState();
  const picker = document.getElementById('templatePickerWrap');
  if (picker) {
    picker.classList.toggle('hidden', state.editorMode !== 'template');
    picker.classList.toggle('flex', state.editorMode === 'template');
  }
  if (state.editorMode !== 'template') {
    restoreFreeformCanvasSizeOptions();
    state.activeTemplate = null;
    state.activeDefinition = null;
    state.templateAssets = {};
    clearTemplatePreview();
  }
  renderTemplateFields();
  renderTemplatePreview();
}

async function createActiveTemplate() {
  const state = getTemplateModeState();
  const engine = getTemplateEngine();
  const templateId = document.getElementById('templateSelect')?.value;
  const canvasSize = document.getElementById('canvasSize');
  const registry = getTemplateRegistry();
  const templateMeta = registry.find(item => item.id === templateId);
  if (!templateMeta || !engine || !canvasSize) return;

  applyTemplateCanvasSizeOptions(templateId);
  const allowedSizes = getAllowedSizesForTemplate(templateId);
  const size = allowedSizes.includes(canvasSize.value) ? canvasSize.value : allowedSizes[0];
  const definition = await engine.loadTemplateDefinition(templateMeta, size);
  state.activeDefinition = definition;
  state.activeTemplate = { mode: 'template', templateId: templateMeta.id, size, content: buildDefaultContent(definition.schema), settings: { ...(definition.schema.defaults || {}) } };
  state.templateAssets = {};
  setTemplateCanvasSize(size);
  renderTemplateFields();
  renderTemplatePreview();
}

function buildTemplateExportHtml(bundle, size) {
  const [width, height] = String(size).split('x').map(Number);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="ad.size" content="width=${width},height=${height}">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${bundle.template.schema.name}</title>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<style>${bundle.css}</style>
</head>
<body>
<script src="https://cdn.flashtalking.com/frameworks/js/api/2/10/html5API.js"></script>
${bundle.html}
<script>${bundle.js}</script>
</body>
</html>`;
}

async function loadTemplateManifestFile(bundle, size) {
  const templateMeta = bundle?.template?.meta;
  if (!templateMeta?.basePath || !size) return '';
  const manifestPath = `${templateMeta.basePath}/sizes/${size}/manifest.js`;
  try {
    const response = await fetch(manifestPath, { cache: 'no-store' });
    if (!response.ok) return '';
    return response.text();
  } catch (err) {
    console.warn('[AdBuilder] Template manifest.js not found:', manifestPath, err);
    return '';
  }
}

async function exportActiveTemplate() {
  const state = getTemplateModeState();
  const engine = getTemplateEngine();
  if (!state.activeTemplate || !engine) return;
  const bundle = await engine.renderTemplateBundle(state.activeTemplate);
  const html = buildTemplateExportHtml(bundle, state.activeTemplate.size);
  const zip = new JSZip();
  zip.file('index.html', html);
  Object.entries(state.templateAssets || {}).forEach(([, asset]) => {
    if (!asset?.filename || !asset?.dataUrl) return;
    zip.file(asset.filename, dataUrlToUint8Array(asset.dataUrl), { binary: true });
  });
  const templateManifest = await loadTemplateManifestFile(bundle, state.activeTemplate.size);
  if (templateManifest) zip.file('manifest.js', templateManifest);
  const blob = await zip.generateAsync({ type: 'blob' });
  const bannerName = document.getElementById('bannerName')?.value || state.activeTemplate.templateId;
  saveAs(blob, `${bannerName}.zip`);
}

function isTemplateExportControl(target) {
  const el = target && target.closest ? target.closest('#exportBtn, #exportZipBtn, #downloadZipBtn, [data-action="export"], [data-export="zip"]') : null;
  return !!el;
}

function bindTemplateModeEvents() {
  if (window.__adBuilderTemplateModeEventsBound) return;
  window.__adBuilderTemplateModeEventsBound = true;

  document.addEventListener('click', function(e) {
    const state = getTemplateModeState();
    if (state.editorMode === 'template' && state.activeTemplate && isTemplateExportControl(e.target)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      void exportActiveTemplate();
    }
  }, true);

  document.addEventListener('change', function(e) {
    if (e.target && e.target.id === 'editorModeSelect') {
      const state = getTemplateModeState();
      state.editorMode = e.target.value;
      updateTemplateModeUI();
      if (state.editorMode === 'template') createActiveTemplate();
      return;
    }
    if (e.target && e.target.id === 'templateSelect') { createActiveTemplate(); return; }
    if (e.target && e.target.id === 'canvasSize') {
      const state = getTemplateModeState();
      if (state.editorMode === 'template' && state.activeTemplate && e.target.value !== state.activeTemplate.size) {
        state.activeTemplate.size = e.target.value;
        createActiveTemplate();
      }
      return;
    }
    if (e.target && e.target.classList.contains('template-image-input')) {
      const file = e.target.files && e.target.files[0];
      handleTemplateImageFile(e.target.dataset.templateKey, file);
      e.target.value = '';
      return;
    }
    if (e.target && e.target.classList.contains('template-field-input')) {
      syncTemplateField(e.target.dataset.templateKey, e.target.dataset.templateType, e.target.value, e.target.checked);
    }
  });

  document.addEventListener('click', function(e) {
    const deleteBtn = e.target && e.target.closest ? e.target.closest('.template-image-delete') : null;
    if (deleteBtn) { e.preventDefault(); e.stopPropagation(); deleteTemplateImageAsset(deleteBtn.dataset.templateKey); return; }
    const dropzone = e.target && e.target.closest ? e.target.closest('.template-image-dropzone') : null;
    if (!dropzone) return;
    const input = dropzone.querySelector('.template-image-input');
    if (input) input.click();
  });

  document.addEventListener('dragover', function(e) {
    const dropzone = e.target && e.target.closest ? e.target.closest('.template-image-dropzone') : null;
    if (!dropzone) return;
    e.preventDefault();
    dropzone.classList.add('border-indigo-400');
  });

  document.addEventListener('dragleave', function(e) {
    const dropzone = e.target && e.target.closest ? e.target.closest('.template-image-dropzone') : null;
    if (!dropzone) return;
    dropzone.classList.remove('border-indigo-400');
  });

  document.addEventListener('drop', function(e) {
    const dropzone = e.target && e.target.closest ? e.target.closest('.template-image-dropzone') : null;
    if (!dropzone) return;
    e.preventDefault();
    dropzone.classList.remove('border-indigo-400');
    const file = e.dataTransfer?.files?.[0];
    handleTemplateImageFile(dropzone.dataset.templateKey, file);
  });
}

async function initTemplateMode() {
  injectTemplateToolbar();
  injectTemplatePanel();
  bindTemplateModeEvents();
  await hydrateRegistrySchemas();
  populateTemplatePicker();
  const state = getTemplateModeState();
  const modeSelect = document.getElementById('editorModeSelect');
  if (modeSelect) modeSelect.value = state.editorMode;
  const templateSelect = document.getElementById('templateSelect');
  if (templateSelect && !templateSelect.value && templateSelect.options.length) templateSelect.value = templateSelect.options[0].value;
  updateTemplateModeUI();
}

window.adBuilderTemplateMode = { init: initTemplateMode, exportActiveTemplate, renderTemplatePreview, createActiveTemplate };

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initTemplateMode);
else initTemplateMode();