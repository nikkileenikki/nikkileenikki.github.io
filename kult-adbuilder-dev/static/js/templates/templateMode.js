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

function injectTemplateToolbar() {
  if (document.getElementById('templateModeToolbar')) return;

  const bannerName = document.getElementById('bannerName');
  const canvasSize = document.getElementById('canvasSize');
  if (!bannerName || !canvasSize) return;

  const toolbarRow = canvasSize.closest('.flex');
  if (!toolbarRow || !toolbarRow.parentElement) return;

  const toolbarParent = toolbarRow.parentElement;
  toolbarParent.classList.add('flex', 'flex-wrap');
  toolbarRow.classList.add('w-full', 'basis-full');

  const topRow = document.createElement('div');
  topRow.id = 'templateModeToolbar';
  topRow.className = 'w-full basis-full flex items-center gap-3 mb-2 overflow-x-auto whitespace-nowrap';
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

  toolbarParent.insertBefore(topRow, toolbarRow);
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
  return template?.schema?.sizes || template?.sizes || ['300x250'];
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
      const definition = await engine.loadTemplateDefinition(template);
      template.schema = definition.schema;
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
    } else {
      content[variable.key] = '';
    }
  });
  return content;
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
  (state.activeDefinition.schema.variables || []).forEach(variable => {
    const fieldWrap = document.createElement('div');
    fieldWrap.className = 'space-y-1';

    if (variable.type === 'repeater') {
      const textareaValue = JSON.stringify(state.activeTemplate.content[variable.key] || [], null, 2);
      fieldWrap.innerHTML = `
        <label class="text-sm text-gray-300 block">${variable.key}</label>
        <p class="text-xs text-gray-500">Enter JSON array for repeater content.</p>
        <textarea data-template-key="${variable.key}" data-template-type="repeater" class="template-field-input w-full bg-gray-800 rounded px-3 py-2 text-sm min-h-[160px]">${textareaValue}</textarea>
      `;
    } else {
      const inputType = variable.type === 'number' ? 'number' : 'text';
      const value = state.activeTemplate.content[variable.key] || state.activeTemplate.settings?.[variable.key] || '';
      fieldWrap.innerHTML = `
        <label class="text-sm text-gray-300 block">${variable.key}</label>
        <input data-template-key="${variable.key}" data-template-type="${variable.type}" type="${inputType}" class="template-field-input w-full bg-gray-800 rounded px-3 py-2 text-sm" value="${String(value).replace(/"/g, '&quot;')}">
      `;
    }

    wrap.appendChild(fieldWrap);
  });
}

function syncTemplateField(key, type, rawValue) {
  const state = getTemplateModeState();
  if (!state.activeTemplate) return;

  if (type === 'repeater') {
    try {
      state.activeTemplate.content[key] = JSON.parse(rawValue || '[]');
    } catch (err) {
      console.warn('Invalid repeater JSON for', key, err);
    }
    return;
  }

  if (state.activeTemplate.content.hasOwnProperty(key)) {
    state.activeTemplate.content[key] = rawValue;
    return;
  }

  state.activeTemplate.settings[key] = type === 'number' ? Number(rawValue) : rawValue;
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
  }

  renderTemplateFields();
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

  const definition = await engine.loadTemplateDefinition(templateMeta);
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
    if (typeof value === 'string' && value.trim()) assetCandidates.push(value.trim());
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
  zip.file('README-template-assets.txt', `Add your template asset files next to index.html before trafficking.${instructions}`);

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
        renderTemplateFields();
      }
      return;
    }

    if (e.target && e.target.classList.contains('template-field-input')) {
      syncTemplateField(e.target.dataset.templateKey, e.target.dataset.templateType, e.target.value);
    }
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
