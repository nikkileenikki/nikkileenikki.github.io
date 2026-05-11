function getByPath(source, path) {
  if (!path) return '';
  return path.split('.').reduce((acc, key) => (acc == null ? '' : acc[key]), source);
}

function renderManifestString(template, context) {
  return String(template || '').replace(/{{\s*([\w.]+)\s*}}/g, (_, keyPath) => {
    const value = getByPath(context, keyPath);
    return value == null ? '' : String(value);
  });
}

function getActiveTemplateManifestContext() {
  const state = window.adBuilderTemplateModeState;
  const activeTemplate = state?.activeTemplate;
  const activeDefinition = state?.activeDefinition;
  const schema = activeDefinition?.schema || {};

  if (!activeTemplate) return null;

  const engine = window.adBuilderTemplateEngine;
  const layout = engine?.getTemplateLayout
    ? engine.getTemplateLayout(schema, activeTemplate.size)
    : (schema.layouts?.[activeTemplate.size] || {});

  return {
    ...schema.defaults,
    ...activeTemplate.settings,
    ...activeTemplate.content,
    layout,
    size: activeTemplate.size,
    templateId: activeTemplate.templateId,
    slides: activeTemplate.content?.slides || []
  };
}

function shouldRenderTemplateManifest(url) {
  const href = String(url || '');
  return href.includes('/template-library/') && href.endsWith('/manifest.js');
}

function installTemplateManifestPatch() {
  if (window.__adBuilderTemplateManifestPatchInstalled) return;
  if (typeof window.fetch !== 'function' || typeof window.Response !== 'function') return;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async function(input, init) {
    const response = await originalFetch(input, init);
    const url = typeof input === 'string' ? input : input?.url;

    if (!shouldRenderTemplateManifest(url)) {
      return response;
    }

    const context = getActiveTemplateManifestContext();
    if (!context) return response;

    const rawText = await response.clone().text();
    const renderedText = renderManifestString(rawText, context);

    return new Response(renderedText, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  };

  window.__adBuilderTemplateManifestPatchInstalled = true;
}

installTemplateManifestPatch();

window.adBuilderTemplateManifestPatch = {
  renderManifestString,
  getActiveTemplateManifestContext
};
