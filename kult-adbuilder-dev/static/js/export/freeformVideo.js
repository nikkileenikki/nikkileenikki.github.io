function getStoreState() {
  return window.adBuilderStore?.getState ? window.adBuilderStore.getState() : null;
}

function isTemplateModeActive() {
  return window.adBuilderTemplateModeState?.editorMode === 'template';
}

function sanitizeVideoName(name, fallback) {
  const raw = String(name || fallback || 'video1').trim();
  return raw.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'video1';
}

function getFreeformVideos() {
  if (isTemplateModeActive()) return [];

  const state = getStoreState();
  const elements = Array.isArray(state?.elements) ? state.elements : [];

  return elements
    .filter(element => element?.type === 'video' && String(element.videoUrl || '').trim())
    .slice(0, 8)
    .map((element, index) => ({
      elementId: element.id,
      name: sanitizeVideoName(element.videoName, `video${index + 1}`),
      ref: String(element.videoUrl || '').trim(),
      autoplay: element.playTrigger === 'autoplay',
      controls: Boolean(element.controls),
      muted: element.muted !== false,
      width: Math.max(1, Math.round(Number(element.width) || 300)),
      height: Math.max(1, Math.round(Number(element.height) || 250))
    }));
}

function manifestObjectToText(manifest) {
  return `FT.manifest(${JSON.stringify(manifest, null, 2)});\n`;
}

function buildDefaultManifest(videos) {
  const state = getStoreState();
  return {
    filename: 'index.html',
    width: Math.round(Number(state?.meta?.width) || 300),
    height: Math.round(Number(state?.meta?.height) || 250),
    clickTagCount: Math.max(1, countClickTags(state)),
    videos: videos.map(video => ({ name: video.name, ref: video.ref }))
  };
}

function countClickTags(state) {
  const elements = Array.isArray(state?.elements) ? state.elements : [];
  const indexes = elements
    .filter(element => element?.type === 'clickthrough')
    .map(element => Number(element.clickIndex || element.clickTag || element.index || 1))
    .filter(Number.isFinite);
  return indexes.length ? Math.max(...indexes, 1) : 1;
}

function mergeVideosIntoManifest(content, videos) {
  if (!videos.length) return content;

  const fallback = manifestObjectToText(buildDefaultManifest(videos));
  const text = String(content || '').trim();
  const match = text.match(/FT\.manifest\s*\(\s*([\s\S]*?)\s*\)\s*;?\s*$/);

  if (!match) return fallback;

  try {
    const manifest = Function(`"use strict"; return (${match[1]});`)();
    const existing = Array.isArray(manifest.videos) ? manifest.videos : [];
    const byName = new Map(existing.map(video => [String(video.name || ''), video]));

    videos.forEach(video => {
      byName.set(video.name, { name: video.name, ref: video.ref });
    });

    manifest.videos = Array.from(byName.values()).slice(0, 8);
    return manifestObjectToText(manifest);
  } catch (err) {
    console.warn('[AdBuilder] Could not parse manifest.js; writing free-form video manifest fallback.', err);
    return fallback;
  }
}

function buildVideoRuntimeScript(videos) {
  if (!videos.length) return '';

  return `
<script>
(function() {
  var videos = ${JSON.stringify(videos)};

  function renderVideos() {
    if (!window.myFT || typeof window.myFT.insertVideo !== 'function') {
      window.setTimeout(renderVideos, 50);
      return;
    }

    videos.forEach(function(video) {
      var parent = document.getElementById(video.elementId) || document.getElementById(video.name);
      if (!parent || parent.getAttribute('data-ft-video-rendered') === '1') return;

      parent.setAttribute('data-ft-video-rendered', '1');
      parent.innerHTML = '';
      parent.style.background = 'transparent';
      parent.style.border = '0';
      parent.style.overflow = 'hidden';

      var holder = document.createElement('div');
      holder.id = video.name + '_holder';
      holder.style.position = 'absolute';
      holder.style.left = '0';
      holder.style.top = '0';
      holder.style.width = '100%';
      holder.style.height = '100%';
      parent.appendChild(holder);

      window.myFT.insertVideo({
        video: video.name,
        parent: holder,
        autoplay: !!video.autoplay,
        controls: !!video.controls,
        muted: video.muted !== false,
        width: video.width,
        height: video.height
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderVideos);
  } else {
    renderVideos();
  }
}());
</script>`;
}

function injectVideoRuntimeIntoHtml(html, videos) {
  if (!videos.length || typeof html !== 'string') return html;
  if (html.includes('data-adbuilder-freeform-video-runtime')) return html;

  const runtime = buildVideoRuntimeScript(videos).replace('<script>', '<script data-adbuilder-freeform-video-runtime>');

  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${runtime}\n</body>`);
  }

  return `${html}\n${runtime}`;
}

function installFreeformVideoExportSupport() {
  if (!window.JSZip || window.JSZip.__adBuilderFreeformVideoSupport) return;

  const originalFile = window.JSZip.prototype.file;
  const originalGenerateAsync = window.JSZip.prototype.generateAsync;

  window.JSZip.prototype.file = function(name, data, options) {
    const filename = String(name || '');
    const videos = getFreeformVideos();

    if (videos.length && arguments.length > 1 && filename === 'index.html' && typeof data === 'string') {
      data = injectVideoRuntimeIntoHtml(data, videos);
    }

    if (videos.length && arguments.length > 1 && filename === 'manifest.js') {
      data = mergeVideosIntoManifest(data, videos);
      this.__adBuilderFreeformVideoManifestWritten = true;
    }

    return originalFile.call(this, name, data, options);
  };

  window.JSZip.prototype.generateAsync = function(options, onUpdate) {
    const videos = getFreeformVideos();

    if (videos.length && !this.__adBuilderFreeformVideoManifestWritten && !this.file('manifest.js')) {
      originalFile.call(this, 'manifest.js', manifestObjectToText(buildDefaultManifest(videos)));
      this.__adBuilderFreeformVideoManifestWritten = true;
    }

    return originalGenerateAsync.call(this, options, onUpdate);
  };

  window.JSZip.__adBuilderFreeformVideoSupport = true;
}

installFreeformVideoExportSupport();

window.adBuilderFreeformVideo = {
  getFreeformVideos,
  mergeVideosIntoManifest,
  injectVideoRuntimeIntoHtml
};
