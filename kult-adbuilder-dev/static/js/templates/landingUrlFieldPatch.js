function isLandingUrlFieldType(type = '') {
  return ['landing_url', 'landingurl', 'landing-url'].includes(String(type || '').toLowerCase());
}

function patchLandingUrlFieldInputs() {
  document.querySelectorAll('[data-template-type="landing_url"], [data-template-type="landingurl"], [data-template-type="landing-url"]').forEach(input => {
    if (input.dataset.landingUrlFieldPatched === '1') return;

    input.dataset.landingUrlFieldPatched = '1';
    input.type = 'url';
    input.inputMode = 'url';
    input.autocomplete = 'url';
    input.placeholder = input.placeholder || 'https://example.com';
  });
}

function installLandingUrlFieldPatch() {
  if (window.__adBuilderLandingUrlFieldPatchInstalled) return;
  window.__adBuilderLandingUrlFieldPatchInstalled = true;

  patchLandingUrlFieldInputs();

  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(patchLandingUrlFieldInputs);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  document.addEventListener('input', event => {
    if (event.target && isLandingUrlFieldType(event.target.dataset?.templateType)) {
      window.setTimeout(() => window.adBuilderTemplateMode?.renderTemplatePreview?.(), 0);
    }
  }, true);

  document.addEventListener('change', event => {
    if (event.target && isLandingUrlFieldType(event.target.dataset?.templateType)) {
      window.setTimeout(() => window.adBuilderTemplateMode?.renderTemplatePreview?.(), 0);
    }
  }, true);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installLandingUrlFieldPatch);
} else {
  installLandingUrlFieldPatch();
}

window.adBuilderLandingUrlFieldPatch = {
  isLandingUrlFieldType,
  patchLandingUrlFieldInputs
};
