function isRelativeAssetPath(value = '') {
  const trimmed = String(value || '').trim();
  if (!trimmed) return false;
  if (/^(?:[a-z][a-z0-9+.-]*:|\/|#|\{|data:|blob:)/i.test(trimmed)) return false;
  if (/^{{.*}}$/.test(trimmed)) return false;
  return true;
}

function getTemplateFileDir(bundle) {
  const template = bundle?.template;
  const schema = template?.schema || {};
  const size = template?.selectedSize;
  const sizeConfig = schema?.sizes && !Array.isArray(schema.sizes) ? schema.sizes[size] : null;
  const htmlPath = sizeConfig?.html || (size ? `sizes/${size}/template.html` : 'template.html');
  const htmlDir = String(htmlPath).includes('/') ? String(htmlPath).replace(/\/[^/]*$/, '') : '';
  const basePath = template?.meta?.basePath || '';
  const path = htmlDir ? `${basePath}/${htmlDir}/` : `${basePath}/`;
  return new URL(path, window.location.href).href;
}

function resolveTemplateAssetPath(path, baseHref) {
  if (!isRelativeAssetPath(path)) return path;
  return new URL(path, baseHref).href;
}

function rewriteHtmlAssetPaths(html, baseHref) {
  return String(html || '')
    .replace(/\b(src|href|poster)=(['"])([^'"]+)\2/gi, (match, attr, quote, value) => {
      return `${attr}=${quote}${resolveTemplateAssetPath(value, baseHref)}${quote}`;
    })
    .replace(/\bsrcset=(['"])([^'"]+)\1/gi, (match, quote, value) => {
      const rewritten = String(value).split(',').map(part => {
        const bits = part.trim().split(/\s+/);
        if (!bits[0]) return part;
        bits[0] = resolveTemplateAssetPath(bits[0], baseHref);
        return bits.join(' ');
      }).join(', ');
      return `srcset=${quote}${rewritten}${quote}`;
    });
}

function rewriteCssAssetPaths(css, baseHref) {
  return String(css || '').replace(/url\((['"]?)([^)'"]+)\1\)/gi, (match, quote, value) => {
    const trimmed = String(value || '').trim();
    return `url(${quote || ''}${resolveTemplateAssetPath(trimmed, baseHref)}${quote || ''})`;
  });
}

function rewriteBundleAssetPaths(bundle) {
  if (!bundle?.template?.meta?.basePath) return bundle;
  const baseHref = getTemplateFileDir(bundle);
  return {
    ...bundle,
    html: rewriteHtmlAssetPaths(bundle.html, baseHref),
    css: rewriteCssAssetPaths(bundle.css, baseHref)
  };
}

function installTemplateAssetPathRewritePatch() {
  if (window.__adBuilderTemplateAssetPathRewritePatchInstalled) return;

  const engine = window.adBuilderTemplateEngine;
  if (!engine?.renderTemplateBundle) {
    window.setTimeout(installTemplateAssetPathRewritePatch, 50);
    return;
  }

  const originalRenderTemplateBundle = engine.renderTemplateBundle.bind(engine);
  engine.renderTemplateBundle = async function(instance) {
    const bundle = await originalRenderTemplateBundle(instance);
    return rewriteBundleAssetPaths(bundle);
  };

  window.__adBuilderTemplateAssetPathRewritePatchInstalled = true;
}

installTemplateAssetPathRewritePatch();

window.adBuilderTemplateAssetPathRewritePatch = {
  rewriteBundleAssetPaths,
  rewriteHtmlAssetPaths,
  rewriteCssAssetPaths,
  getTemplateFileDir
};
