function normalizeTemplateVideoUrl(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^(https?:|blob:|data:)/i.test(raw)) return raw;

  const cleanPath = raw
    .replace(/^\/+/, '')
    .replace(/\.mp4(?:[?#].*)?$/i, '');

  return `https://cdn.flashtalking.com/${cleanPath}.mp4`;
}

function isVideoFieldType(type = '') {
  return ['video', 'video_url', 'videourl'].includes(String(type || '').toLowerCase());
}

function patchVideoFieldInputs() {
  document.querySelectorAll('[data-template-type="video"], [data-template-type="video_url"], [data-template-type="videourl"]').forEach(input => {
    if (input.dataset.videoFieldPatched === '1') return;
    input.dataset.videoFieldPatched = '1';
    input.type = 'text';
    input.placeholder = input.placeholder || 'Example: 220952/video';
  });
}

function replaceFtVideosInPreviewIframe(iframe) {
  if (!iframe?.contentDocument) return;

  const state = window.adBuilderTemplateModeState;
  const content = state?.activeTemplate?.content || {};
  const doc = iframe.contentDocument;

  doc.querySelectorAll('ft-video').forEach(ftVideo => {
    if (ftVideo.dataset.previewVideoPatched === '1') return;

    const videoName = ftVideo.getAttribute('name') || ftVideo.getAttribute('id') || 'video1';
    const keyCandidates = [
      ftVideo.getAttribute('data-template-key'),
      `${videoName}_url`,
      `${videoName}_video_url`,
      'video_url',
      'video'
    ].filter(Boolean);

    const rawUrl = keyCandidates.map(key => content[key]).find(Boolean) || '';
    const previewUrl = normalizeTemplateVideoUrl(rawUrl);
    if (!previewUrl) return;

    const video = doc.createElement('video');
    video.className = 'template-ft-video-preview';
    video.src = previewUrl;
    video.controls = true;
    video.muted = ftVideo.hasAttribute('muted');
    video.autoplay = ftVideo.hasAttribute('autoplay');
    video.loop = ftVideo.hasAttribute('loop');
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.style.position = 'absolute';
    video.style.left = '0';
    video.style.top = '0';
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    video.style.background = '#000';

    ftVideo.dataset.previewVideoPatched = '1';
    ftVideo.replaceWith(video);
  });
}

function patchTemplateVideoPreview() {
  patchVideoFieldInputs();
  document.querySelectorAll('#templatePreviewLayer iframe').forEach(iframe => {
    const run = () => {
      try {
        replaceFtVideosInPreviewIframe(iframe);
      } catch (err) {
        console.warn('[AdBuilder] Could not patch template video preview:', err);
      }
    };
    iframe.addEventListener('load', run, { once: true });
    window.setTimeout(run, 0);
    window.setTimeout(run, 80);
  });
}

function installTemplateVideoFieldPatch() {
  if (window.__adBuilderTemplateVideoFieldPatchInstalled) return;
  window.__adBuilderTemplateVideoFieldPatchInstalled = true;

  patchTemplateVideoPreview();

  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(patchTemplateVideoPreview);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  document.addEventListener('input', event => {
    if (event.target && isVideoFieldType(event.target.dataset?.templateType)) {
      window.setTimeout(patchTemplateVideoPreview, 0);
      window.setTimeout(patchTemplateVideoPreview, 120);
    }
  }, true);

  document.addEventListener('change', event => {
    if (event.target && isVideoFieldType(event.target.dataset?.templateType)) {
      window.setTimeout(patchTemplateVideoPreview, 0);
      window.setTimeout(patchTemplateVideoPreview, 120);
    }
  }, true);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installTemplateVideoFieldPatch);
} else {
  installTemplateVideoFieldPatch();
}

window.adBuilderTemplateVideoFieldPatch = {
  normalizeTemplateVideoUrl,
  patchTemplateVideoPreview
};
