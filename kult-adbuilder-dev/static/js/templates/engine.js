function getByPath(source, path) {
  if (!path) return '';
  return path.split('.').reduce((acc, key) => (acc == null ? '' : acc[key]), source);
}

function renderEachBlocks(template, context) {
  return template.replace(/{{#each\s+([\w.]+)}}([\s\S]*?){{\/each}}/g, (_, arrayPath, inner) => {
    const items = getByPath(context, arrayPath);
    if (!Array.isArray(items) || items.length === 0) return '';

    return items.map((item, index) => {
      const scoped = {
        ...context,
        ...item,
        this: item,
        index: index + 1,
        index0: index
      };
      return replaceSimpleMacros(inner, scoped);
    }).join('');
  });
}

function replaceSimpleMacros(template, context) {
  return template.replace(/{{\s*([\w.]+)\s*}}/g, (_, keyPath) => {
    const value = getByPath(context, keyPath);
    return value == null ? '' : String(value);
  });
}

function renderTemplateString(template, context) {
  const withEach = renderEachBlocks(template, context);
  return replaceSimpleMacros(withEach, context);
}

async function fetchText(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load template asset: ${path}`);
  }
  return response.text();
}

async function loadTemplateDefinition(templateMeta) {
  if (!templateMeta || !templateMeta.basePath) {
    throw new Error('Invalid template metadata');
  }

  const [schemaText, htmlText, cssText, jsText] = await Promise.all([
    fetchText(`${templateMeta.basePath}/template.json`),
    fetchText(`${templateMeta.basePath}/template.html`),
    fetchText(`${templateMeta.basePath}/template.css`),
    fetchText(`${templateMeta.basePath}/template.js`)
  ]);

  return {
    meta: templateMeta,
    schema: JSON.parse(schemaText),
    files: {
      html: htmlText,
      css: cssText,
      js: jsText
    }
  };
}

function buildTemplateContext(instance, schema) {
  const layout = schema.layouts?.[instance.size] || {};
  return {
    ...schema.defaults,
    ...instance.settings,
    ...instance.content,
    layout,
    size: instance.size,
    templateId: instance.templateId,
    slides: instance.content?.slides || []
  };
}

async function renderTemplateBundle(instance) {
  const registry = window.adBuilderTemplateRegistry || [];
  const templateMeta = registry.find(t => t.id === instance.templateId);
  if (!templateMeta) {
    throw new Error(`Template not found: ${instance.templateId}`);
  }

  const definition = await loadTemplateDefinition(templateMeta);
  const context = buildTemplateContext(instance, definition.schema);

  return {
    template: definition,
    context,
    html: renderTemplateString(definition.files.html, context),
    css: renderTemplateString(definition.files.css, context),
    js: renderTemplateString(definition.files.js, context)
  };
}

window.adBuilderTemplateEngine = {
  getByPath,
  renderTemplateString,
  loadTemplateDefinition,
  buildTemplateContext,
  renderTemplateBundle
};
