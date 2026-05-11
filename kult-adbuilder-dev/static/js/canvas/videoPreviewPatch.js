function normalizeFtVideoPreviewUrl(url = '') {
  const trimmed = String(url || '').trim();
  if (!trimmed) return '';
  if (/^(https?:|blob:|data:)/i.test(trimmed)) return trimmed;

  const cleanPath = trimmed
    .replace(/^\/+/, '')
    .replace(/\.mp4(?:[?#].*)?$/i, '');

  return `https://cdn.flashtalking.com/${cleanPath}.mp4`;
}

function escapeAttr(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function findVideoElementData(elementId) {
  const elements = window.adBuilderStore?.getState?.()?.elements || window.elements || [];
  return Array.isArray(elements) ? elements.find(item => item?.id === elementId && item.type === 'video') : null;
}

function buildVideoPreview(videoData) {
  const rawUrl = videoData?.videoUrl || '';
  const previewUrl = normalizeFtVideoPreviewUrl(rawUrl);
  if (!previewUrl) return '';

  const muted = videoData.muted !== false ? 'muted' : '';
  const autoplay = videoData.playTrigger === 'autoplay' ? 'autoplay playsinline loop' : 'playsinline';

  return `
    <video class="freeform-video-preview" src="${escapeAttr(previewUrl)}" controls ${muted} ${autoplay} preload="metadata" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#000;display:block;pointer-events:auto;"></video>
  `;
}

function patchVideoElement(element) {
  if (!element || element.dataset.videoPreviewPatched === '1') return;

  const videoData = findVideoElementData(element.id);
  if (!videoData?.videoUrl) return;

  const previewMarkup = buildVideoPreview(videoData);
  if (!previewMarkup) return;

  element.dataset.videoPreviewPatched = '1';
  element.dataset.videoPreviewUrl = videoData.videoUrl;
  element.classList.add('has-video-preview');
  element.style.backgroundColor = '#000';
  element.style.border = element.style.border || '2px solid #e53e3e';
  element.style.overflow = 'hidden';

  const handles = Array.from(element.querySelectorAll('.resize-handle'));
  element.innerHTML = previewMarkup;
  handles.forEach(handle => element.appendChild(handle));

  const video = element.querySelector('video.freeform-video-preview');
  if (video) {
    video.addEventListener('error', () => {
      element.dataset.videoPreviewPatched = '0';
    });
  }
}

function patchCanvasVideoPreviews() {
  document.querySelectorAll('.canvas-element.video-element').forEach(patchVideoElement);
}

function installVideoPreviewObserver() {
  if (window.__adBuilderVideoPreviewPatchInstalled) return;
  window.__adBuilderVideoPreviewPatchInstalled = true;

  patchCanvasVideoPreviews();

  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(patchCanvasVideoPreviews);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  const store = window.adBuilderStore;
  if (store?.subscribe) {
    store.subscribe(() => window.requestAnimationFrame(patchCanvasVideoPreviews));
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installVideoPreviewObserver);
} else {
  installVideoPreviewObserver();
}

window.adBuilderVideoPreviewPatch = {
  normalizeFtVideoPreviewUrl,
  patchCanvasVideoPreviews
};
