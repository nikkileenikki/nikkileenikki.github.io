async function hydrateTemplateRegistrySchemas() {
  const registry = window.adBuilderTemplateRegistry || window.adBuilderTemplates?.registry || [];
  const engine = window.adBuilderTemplateEngine || window.adBuilderTemplates?.engine;

  if (!engine?.loadTemplateSchema || !Array.isArray(registry) || registry.length === 0) return;

  await Promise.all(registry.map(async template => {
    if (template.schema) return;
    try {
      template.schema = await engine.loadTemplateSchema(template);
    } catch (err) {
      console.error('[AdBuilder] Failed to hydrate template schema:', template.id, err);
    }
  }));

  if (window.adBuilderTemplates) {
    window.adBuilderTemplates.registry = registry;
    window.adBuilderTemplates.engine = engine;
  }

  const templateSelect = document.getElementById('templateSelect');
  const currentTemplateId = templateSelect?.value;
  const selectedTemplate = registry.find(template => template.id === currentTemplateId);
  const canvasSize = document.getElementById('canvasSize');

  if (selectedTemplate?.schema?.sizes && canvasSize) {
    const sizes = Array.isArray(selectedTemplate.schema.sizes)
      ? selectedTemplate.schema.sizes
      : Object.keys(selectedTemplate.schema.sizes);

    if (sizes.length && !sizes.includes(canvasSize.value)) {
      canvasSize.innerHTML = sizes.map(size => `<option value="${size}">${size}</option>`).join('');
      canvasSize.value = sizes[0];
    }
  }
}

function installTemplateSchemaHydrationPatch() {
  if (window.__adBuilderTemplateSchemaHydrationPatchInstalled) return;
  window.__adBuilderTemplateSchemaHydrationPatchInstalled = true;

  hydrateTemplateRegistrySchemas();

  document.addEventListener('change', event => {
    if (event.target?.id === 'editorModeSelect' || event.target?.id === 'templateSelect') {
      hydrateTemplateRegistrySchemas();
    }
  }, true);

  window.setTimeout(hydrateTemplateRegistrySchemas, 0);
  window.setTimeout(hydrateTemplateRegistrySchemas, 250);
  window.setTimeout(hydrateTemplateRegistrySchemas, 1000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installTemplateSchemaHydrationPatch);
} else {
  installTemplateSchemaHydrationPatch();
}

window.adBuilderTemplateSchemaHydrationPatch = {
  hydrateTemplateRegistrySchemas
};
