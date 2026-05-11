function isTemplateModeActive() {
  return window.adBuilderTemplateModeState?.editorMode === 'template';
}

function isTemplateAssetUrl(url) {
  const value = String(url || '').trim();
  if (!value) return false;

  try {
    const parsed = new URL(value, window.location.href);
    return parsed.href.includes('/kult-adbuilder-dev/static/js/template-library/');
  } catch (err) {
    return false;
  }
}

function getFilenameFromAssetUrl(url) {
  try {
    const parsed = new URL(url, window.location.href);
    const rawName = parsed.pathname.split('/').filter(Boolean).pop() || 'asset';
    return rawName.replace(/[^a-zA-Z0-9._-]+/g, '-');
  } catch (err) {
    return 'asset';
  }
}

function ensureUniqueFilename(filename, used) {
  if (!used.has(filename)) {
    used.add(filename);
    return filename;
  }

  const dot = filename.lastIndexOf('.');
  const base = dot >= 0 ? filename.slice(0, dot) : filename;
  const ext = dot >= 0 ? filename.slice(dot) : '';
  let index = 2;
  let candidate = `${base}-${index}${ext}`;

  while (used.has(candidate)) {
    index += 1;
    candidate = `${base}-${index}${ext}`;
  }

  used.add(candidate);
  return candidate;
}

function collectAssetUrlsFromText(text) {
  const source = String(text || '');
  const urls = new Set();

  const attrRegex = /\b(?:src|href|poster)=(['"])([^'"]+)\1/gi;
  let match;
  while ((match = attrRegex.exec(source))) {
    if (isTemplateAssetUrl(match[2])) urls.add(new URL(match[2], window.location.href).href);
  }

  const srcsetRegex = /\bsrcset=(['"])([^'"]+)\1/gi;
  while ((match = srcsetRegex.exec(source))) {
    String(match[2]).split(',').forEach(part => {
      const candidate = part.trim().split(/\s+/)[0];
      if (isTemplateAssetUrl(candidate)) urls.add(new URL(candidate, window.location.href).href);
    });
  }

  const cssUrlRegex = /url\((['"]?)([^)'"]+)\1\)/gi;
  while ((match = cssUrlRegex.exec(source))) {
    if (isTemplateAssetUrl(match[2])) urls.add(new URL(match[2], window.location.href).href);
  }

  return Array.from(urls);
}

function collectTemplateAssetUrlsFromZip(zip) {
  const urls = new Set();
  const files = zip?.files || {};

  Object.keys(files).forEach(filename => {
    const file = files[filename];
    if (!file || file.dir || typeof file.async !== 'function') return;
    if (!/\.(html|css|js)$/i.test(filename)) return;

    if (!zip.__adBuilderTemplateAssetScanPromises) zip.__adBuilderTemplateAssetScanPromises = [];
    zip.__adBuilderTemplateAssetScanPromises.push(
      file.async('string').then(text => {
        collectAssetUrlsFromText(text).forEach(url => urls.add(url));
      }).catch(err => {
        console.warn('[AdBuilder] Could not scan export file for template assets:', filename, err);
      })
    );
  });

  return { urls, promises: zip.__adBuilderTemplateAssetScanPromises || [] };
}

async function fetchAssetAsArrayBuffer(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Failed to fetch template export asset: ${url}`);
  return response.arrayBuffer();
}

async function bundleTemplateAssets(zip) {
  if (!isTemplateModeActive()) return;
  if (zip.__adBuilderTemplateAssetsBundled) return;
  zip.__adBuilderTemplateAssetsBundled = true;

  const usedFilenames = new Set(Object.keys(zip.files || {}));
  const scan = collectTemplateAssetUrlsFromZip(zip);
  await Promise.all(scan.promises);

  const urls = Array.from(scan.urls);
  if (!urls.length) return;

  await Promise.all(urls.map(async url => {
    try {
      const filename = ensureUniqueFilename(getFilenameFromAssetUrl(url), usedFilenames);
      const buffer = await fetchAssetAsArrayBuffer(url);
      zip.file(filename, buffer, { binary: true });
    } catch (err) {
      console.warn('[AdBuilder] Could not bundle template export asset:', url, err);
    }
  }));
}

function installTemplateExportAssetBundlePatch() {
  if (window.__adBuilderTemplateExportAssetBundlePatchInstalled) return;
  if (!window.JSZip?.prototype?.generateAsync) {
    window.setTimeout(installTemplateExportAssetBundlePatch, 50);
    return;
  }

  const originalGenerateAsync = window.JSZip.prototype.generateAsync;

  window.JSZip.prototype.generateAsync = async function(options, onUpdate) {
    await bundleTemplateAssets(this);
    return originalGenerateAsync.call(this, options, onUpdate);
  };

  window.__adBuilderTemplateExportAssetBundlePatchInstalled = true;
}

installTemplateExportAssetBundlePatch();

window.adBuilderTemplateExportAssetBundlePatch = {
  collectAssetUrlsFromText,
  bundleTemplateAssets
};
