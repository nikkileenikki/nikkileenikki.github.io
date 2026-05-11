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
      originalCanvasSizeOptions: null
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
      <div id="templateMetaText" class="text-sm text-gray-400"></div>
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

function createPlaceholderSvgDataUri(label, width = 300, height = 250, fill = '#374151', textColor = '#E5E7EB') {
  const safeLabel = String(label || '').replace(/[&<>]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${fill}"/><rect x="1" y="1" width="${width - 2}" height="${height - 2}" fill="none" stroke="#6B7280" stroke-dasharray="6 4"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="${textColor}">${safeLabel}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
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
  const sizeConfig = getTemplateSizeConfig(schema, instance.size) || {};
  const layout = getTemplateLayout(schema, instance.size) || {};
  const baseWidth = layout.slide_width || layout.width || sizeConfig.width || 300;
  const baseHeight = layout.slide_height || layout.height || sizeConfig.height || 250;

  (schema.variables || []).forEach(variable => {
    if (variable.type === 'repeater') {
      const min = Math.max(variable.min || 1, 1);
      if (!Array.isArray(preview.content[variable.key]) || preview.content[variable.key].length === 0) {
        preview.content[variable.key] = Array.from({ length: min }, (_, index) => {
          const item = {};
          (variable.fields || []).forEach(field => {
            if (field.type === 'image') {
              item[field.key] = createPlaceholderSvgDataUri(`Slide ${index + 1}`, baseWidth, baseHeight);
            } else if (field.type === 'text') {
              item[field.key] = field.key === 'heading' ? `Headline ${index + 1}` : `Body copy ${index + 1}`;
            } else if (field.type === 'url') {
              item[field.key] = 'https://example.com';
            } else if (field.type === 'number') {
              item[field.key] = index + 1;
            } else if (field.type === 'boolean') {
              item[field.key] = false;
            } else {
              item[field.key] = '';
            }
          });
          return item;
        });
      }
      return;
    }

    if (preview.content[variable.key] === '' || preview.content[variable.key] == null) {
      if (variable.type === 'image') {
        const label = variable.label || variable.key.replace(/_/g, ' ');
        const width = variable.key.includes('arrow') ? 48 : 120;
        const height = variable.key.includes('arrow') ? 48 : 36;
        preview.content[variable.key] = createPlaceholderSvgDataUri(label, width, height);
      } else if (variable.type === 'text') {
        preview.content[variable.key] = variable.label || variable.key;
      } else if (variable.type === 'number') {
        preview.content[variable.key] = variable.default ?? 1;
      } else if (variable.type === 'url') {
        preview.content[variable.key] = 'https://example.com';
      } else if (variable.type === 'boolean') {
        preview.content[variable.key] = Boolean(variable.default);
      }
    }
  });

  return preview;
}

function buildTemplatePreviewDocument(bundle) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: transparent;
}
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

  if (!state.originalCanvasSizeOptions) {
    state.originalCanvasSizeOptions = canvasSize.innerHTML;
  }

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
    try {
      template.schema = await engine.loadTemplateSchema(template);
    } catch (err) {
      console.error('Failed to load template schema', template.id, err);
    }
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

  $(canvasSize).trigger('change');
}

function buildDefaultContent(schema) {
  const content = {};
  (schema.variables || []).forEach(variable => {
    if (variable.type === 'repeater') {
      content[variable.key] = [];
    } else if (variable.type === 'boolean') {
      content[variable.key] = Boolean(variable.default);
    } else if (variable.default != null) {
      content[variable.key] = variable.default;
    } else {
      content[variable.key] = '';
    }
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

function renderTemplateImageField(variable, currentValue) {
  const label = variable.label || variable.key;
  const hasImage = typeof currentValue === 'string' && currentValue.trim() !== '';
  const previewMarkup = hasImage
    ? `<img src="${String(currentValue).replace(/"/g, '&quot;')}" alt="${label}" class="mt-2 w-full h-28 object-contain bg-gray-950 rounded border border-gray-700">`
    : '<div class="mt-2 h-28 rounded border border-dashed border-gray-700 bg-gray-950 flex items-center justify-center text-xs text-gray-500">No image uploaded</div>';

  return `
    <label class="text-sm text-gray-300 block">${label}</label>
    <div class="template-image-dropzone border border-dashed border-gray-600 rounded-lg px-3 py-4 text-center bg-gray-800/70 hover:bg-gray-800 transition-colors cursor-pointer" data-template-key="${variable.key}" data-template-type="image" tabindex="0" role="button">
      <div class="text-sm text-gray-200">Drop image here</div>
      <div class="text-xs text-gray-500 mt-1">or click to upload</div>
      <input data-template-key="${variable.key}" data-template-type="image" type="file" accept="image/*" class="template-image-input hidden">
      ${previewMarkup}
    </div>
  `;
}

function renderTemplateVariableField(variable, currentValue) {
  const label = variable.label || variable.key;

  if (variable.type === 'repeater') {
    const textareaValue = JSON.stringify(currentValue || [], null, 2);
    return `
      <label class="text-sm text-gray-300 block">${label}</label>
      <p class="text-xs text-gray-500">Enter JSON array for repeater content.</p>
      <textarea data-template-key="${variable.key}" data-template-type="repeater" class="template-field-input w-full bg-gray-800 rounded px-3 py-2 text-sm min-h-[160px]">${textareaValue}</textarea>
    `;
  }

  if (variable.type === 'image') {
    return renderTemplateImageField(variable, currentValue);
  }

  if (variable.type === 'boolean') {
    return `
      <label class="flex items-center gap-2 text-sm text-gray-300">
        <input data-template-key="${variable.key}" data-template-type="boolean" type="checkbox" class="template-field-input" ${currentValue ? 'checked' : ''}>
        <span>${label}</span>
      </label>
    `;
  }

  const inputType = variable.type === 'number' ? 'number' : 'text';
  const safeValue = currentValue == null ? '' : String(currentValue).replace(/"/g, '&quot;');
  const helper = variable.inferred ? '<p class="text-xs text-gray-500">Auto-added from template defaults.</p>' : '';

  return `
    <label class="text-sm text-gray-300 block">${label}</label>
    ${helper}
    <input data-template-key="${variable.key}" data-template-type="${variable.type}" type="${inputType}" class="template-field-input w-full bg-gray-800 rounded px-3 py-2 text-sm" value="${safeValue}">
  `;
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
    const currentValue = state.activeTemplate.content.hasOwnProperty(variable.key)
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
    try {
      nextValue = JSON.parse(rawValue || '[]');
    } catch (err) {
      console.warn('Invalid repeater JSON for', key, err);
      return;
    }
  } else if (type === 'number') {
    nextValue = rawValue === '' ? '' : Number(rawValue);
  } else if (type === 'boolean') {
    nextValue = Boolean(checkedValue);
  }

  if (state.activeTemplate.content.hasOwnProperty(key)) {
    state.activeTemplate.content[key] = nextValue;
  } else {
    state.activeTemplate.settings[key] = nextValue;
  }

  renderTemplateFields();
  renderTemplatePreview();
}

function handleTemplateImageFile(key, file) {
  if (!file || !file.type || !file.type.startsWith('image/')) return;

  const reader = new FileReader();
  reader.onload = function() {
    syncTemplateField(key, 'image', String(reader.result || ''), false);
  };
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
  state.activeTemplate = {
    mode: 'template',
    templateId: templateMeta.id,
    size,
    content: buildDefaultContent(definition.schema),
    settings: { ...(definition.schema.defaults || {}) }
  };

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

async function exportActiveTemplate() {
  const state = getTemplateModeState();
  const engine = getTemplateEngine();
  if (!state.activeTemplate || !engine) return;

  const bundle = await engine.renderTemplateBundle(state.activeTemplate);
  const html = buildTemplateExportHtml(bundle, state.activeTemplate.size);
  const zip = new JSZip();
  zip.file('index.html', html);

  const assetCandidates = [];
  Object.values(state.activeTemplate.content).forEach(value => {
    if (typeof value === 'string' && value.trim() && !value.startsWith('data:')) assetCandidates.push(value.trim());
    if (Array.isArray(value)) {
      value.forEach(item => {
        Object.values(item || {}).forEach(inner => {
          if (typeof inner === 'string' && /\.(png|jpe?g|gif|svg|webp|mp4)$/i.test(inner.trim())) {
            assetCandidates.push(inner.trim());
          }
        });
      });
    }
  });

  const instructions = assetCandidates.length
    ? `\n\nTemplate assets referenced but not bundled automatically:\n${assetCandidates.join('\n')}`
    : '';
  zip.file('README-template-assets.txt', `Uploaded image fields are embedded as data URLs for preview right now. External template asset files still need bundling before final trafficking.${instructions}`);

  const blob = await zip.generateAsync({ type: 'blob' });
  const bannerName = document.getElementById('bannerName')?.value || state.activeTemplate.templateId;
  saveAs(blob, `${bannerName}.zip`);
}

function bindTemplateModeEvents() {
  document.addEventListener('change', function(e) {
    if (e.target && e.target.id === 'editorModeSelect') {
      const state = getTemplateModeState();
      state.editorMode = e.target.value;
      updateTemplateModeUI();
      if (state.editorMode === 'template') {
        createActiveTemplate();
      }
      return;
    }

    if (e.target && e.target.id === 'templateSelect') {
      createActiveTemplate();
      return;
    }

    if (e.target && e.target.id === 'canvasSize') {
      const state = getTemplateModeState();
      if (state.editorMode === 'template' && state.activeTemplate) {
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
      syncTemplateField(
        e.target.dataset.templateKey,
        e.target.dataset.templateType,
        e.target.value,
        e.target.checked
      );
    }
  });

  document.addEventListener('click', function(e) {
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
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    handleTemplateImageFile(dropzone.dataset.templateKey, file);
  });

  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', async function(e) {
      const state = getTemplateModeState();
      if (state.editorMode !== 'template' || !state.activeTemplate) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      try {
        await exportActiveTemplate();
      } catch (err) {
        console.error('Template export failed', err);
        alert('Template export failed. Check console for details.');
      }
    }, true);
  }
}

async function initTemplateMode() {
  injectTemplateToolbar();
  injectTemplatePanel();
  await hydrateRegistrySchemas();
  populateTemplatePicker();
  updateTemplateModeUI();
  bindTemplateModeEvents();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTemplateMode);
} else {
  initTemplateMode();
}
