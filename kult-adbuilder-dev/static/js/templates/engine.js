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

async function loadTemplateSchema(templateMeta) {
  if (!templateMeta || !templateMeta.basePath) {
    throw new Error('Invalid template metadata');
  }

  const schemaText = await fetchText(`${templateMeta.basePath}/template.json`);
  return JSON.parse(schemaText);
}

function getTemplateSizeKeys(schema) {
  if (Array.isArray(schema?.sizes)) {
    return schema.sizes;
  }
  if (schema?.sizes && typeof schema.sizes === 'object') {
    return Object.keys(schema.sizes);
  }
  if (schema?.layouts && typeof schema.layouts === 'object') {
    return Object.keys(schema.layouts);
  }
  return [];
}

function getTemplateSizeConfig(schema, size) {
  if (schema?.sizes && !Array.isArray(schema.sizes) && typeof schema.sizes === 'object') {
    return schema.sizes[size] || null;
  }
  return null;
}

function getTemplateLayout(schema, size) {
  const sizeConfig = getTemplateSizeConfig(schema, size);
  if (sizeConfig) {
    return {
      ...(sizeConfig.layout || {}),
      width: sizeConfig.width ?? sizeConfig.layout?.width,
      height: sizeConfig.height ?? sizeConfig.layout?.height,
      slide_width: sizeConfig.slide_width ?? sizeConfig.layout?.slide_width,
      slide_height: sizeConfig.slide_height ?? sizeConfig.layout?.slide_height
    };
  }
  return schema?.layouts?.[size] || {};
}

function getTemplateFilesForSize(schema, size) {
  const sizeConfig = getTemplateSizeConfig(schema, size);
  if (sizeConfig && sizeConfig.html && sizeConfig.css && sizeConfig.js) {
    return {
      html: sizeConfig.html,
      css: sizeConfig.css,
      js: sizeConfig.js
    };
  }

  return {
    html: 'template.html',
    css: 'template.css',
    js: 'template.js'
  };
}

async function loadTemplateDefinition(templateMeta, selectedSize) {
  const schema = await loadTemplateSchema(templateMeta);
  const sizeKeys = getTemplateSizeKeys(schema);
  const resolvedSize = selectedSize || sizeKeys[0];
  const files = getTemplateFilesForSize(schema, resolvedSize);

  const [htmlText, cssText, jsText] = await Promise.all([
    fetchText(`${templateMeta.basePath}/${files.html}`),
    fetchText(`${templateMeta.basePath}/${files.css}`),
    fetchText(`${templateMeta.basePath}/${files.js}`)
  ]);

  return {
    meta: templateMeta,
    schema,
    selectedSize: resolvedSize,
    files: {
      html: htmlText,
      css: cssText,
      js: jsText
    }
  };
}

function buildTemplateContext(instance, schema) {
  const layout = getTemplateLayout(schema, instance.size);
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

  const definition = await loadTemplateDefinition(templateMeta, instance.size);
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
  loadTemplateSchema,
  loadTemplateDefinition,
  getTemplateSizeKeys,
  getTemplateSizeConfig,
  getTemplateLayout,
  buildTemplateContext,
  renderTemplateBundle
};
