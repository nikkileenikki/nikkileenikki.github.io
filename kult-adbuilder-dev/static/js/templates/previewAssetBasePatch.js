function getActiveTemplateAssetBasePath() {
  const state = window.adBuilderTemplateModeState;
  const registry = window.adBuilderTemplateRegistry || window.adBuilderTemplates?.registry || [];
  const activeTemplate = state?.activeTemplate;
  const activeDefinition = state?.activeDefinition;

  if (!activeTemplate) return '';

  const meta = registry.find(template => template.id === activeTemplate.templateId) || activeDefinition?.meta;
  const basePath = meta?.basePath;
  const size = activeTemplate.size || activeDefinition?.selectedSize;

  if (!basePath) return '';

  const schema = activeDefinition?.schema || meta?.schema;
  const sizeConfig = schema?.sizes && !Array.isArray(schema.sizes) ? schema.sizes[size] : null;
  const htmlPath = sizeConfig?.html || (size ? `sizes/${size}/template.html` : 'template.html');
  const htmlDir = String(htmlPath).includes('/') ? String(htmlPath).replace(/\/[^/]*$/, '') : '';
  const path = htmlDir ? `${basePath}/${htmlDir}/` : `${basePath}/`;

  return new URL(path, window.location.href).href;
}

function injectBaseIntoTemplatePreviewIframe(iframe) {
  if (!iframe || iframe.dataset.templateAssetBasePatched === '1') return;

  const baseHref = getActiveTemplateAssetBasePath();
  if (!baseHref) return;

  const patch = () => {
    try {
      const doc = iframe.contentDocument;
      if (!doc) return;

      let base = doc.querySelector('base[data-adbuilder-template-base]');
      if (!base) {
        base = doc.createElement('base');
        base.setAttribute('data-adbuilder-template-base', '1');
        const head = doc.head || doc.documentElement;
        head.insertBefore(base, head.firstChild);
      }

      base.setAttribute('href', baseHref);
      iframe.dataset.templateAssetBasePatched = '1';
    } catch (err) {
      console.warn('[AdBuilder] Could not patch template preview asset base:', err);
    }
  };

  iframe.addEventListener('load', patch, { once: true });
  window.setTimeout(patch, 0);
  window.setTimeout(patch, 50);
}

function patchTemplatePreviewAssetBase() {
  document.querySelectorAll('#templatePreviewLayer iframe').forEach(injectBaseIntoTemplatePreviewIframe);
}

function installTemplatePreviewAssetBasePatch() {
  if (window.__adBuilderTemplatePreviewAssetBasePatchInstalled) return;
  window.__adBuilderTemplatePreviewAssetBasePatchInstalled = true;

  patchTemplatePreviewAssetBase();

  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(patchTemplatePreviewAssetBase);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  document.addEventListener('change', event => {
    if (event.target?.id === 'templateSelect' || event.target?.id === 'canvasSize') {
      window.setTimeout(patchTemplatePreviewAssetBase, 0);
      window.setTimeout(patchTemplatePreviewAssetBase, 100);
    }
  }, true);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installTemplatePreviewAssetBasePatch);
} else {
  installTemplatePreviewAssetBasePatch();
}

window.adBuilderTemplatePreviewAssetBasePatch = {
  getActiveTemplateAssetBasePath,
  patchTemplatePreviewAssetBase
};
