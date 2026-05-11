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

function getCandidateStateArrays() {
  return [
    window.adBuilderStore?.getState?.()?.elements,
    window.elements,
    window.adBuilderElements,
    window.currentElements,
    window.bannerElements,
    window.adBuilderState?.elements,
    window.state?.elements
  ].filter(Array.isArray);
}

function findVideoElementData(elementId) {
  for (const elements of getCandidateStateArrays()) {
    const match = elements.find(item => item?.id === elementId && item.type === 'video');
    if (match) return match;
  }
  return null;
}

function getSelectedVideoElementData() {
  const selected = document.querySelector('.canvas-element.video-element.selected, .video-element.selected, [data-type="video"].selected, [data-element-type="video"].selected');
  return selected ? findVideoElementData(selected.id) : null;
}

function readVideoUrlFromDom(element) {
  if (!element) return '';

  const dataUrl = element.getAttribute('data-video-url') || element.dataset?.videoUrl;
  if (dataUrl) return dataUrl;

  const directVideo = element.querySelector('video[src], source[src]');
  if (directVideo?.getAttribute('src')) return directVideo.getAttribute('src');

  const text = String(element.textContent || '').trim();
  const httpMatch = text.match(/https?:\/\/[^\s<>"']+/i);
  if (httpMatch) return httpMatch[0];

  const ftAssetMatch = text.match(/\b\d{3,}\/[-_a-zA-Z0-9/]+\b/);
  if (ftAssetMatch) return ftAssetMatch[0];

  const selectedInput = document.getElementById('propVideoUrl');
  if (selectedInput && document.getElementById(element.id)?.classList.contains('selected')) {
    return selectedInput.value || '';
  }

  return '';
}

function normalizeVideoData(element, fromState) {
  const url = fromState?.videoUrl || readVideoUrlFromDom(element);
  if (!url) return null;

  return {
    id: element.id,
    videoUrl: url,
    videoName: fromState?.videoName || element.querySelector('.video-name')?.textContent || 'video1',
    muted: fromState?.muted !== false,
    controls: fromState?.controls !== false,
    playTrigger: fromState?.playTrigger || 'click'
  };
}

function getVideoDataForElement(element) {
  return normalizeVideoData(element, findVideoElementData(element.id));
}

function setSelectedVideoStateFromInputs() {
  const selectedData = getSelectedVideoElementData();
  if (!selectedData) return;

  const mutedInput = document.getElementById('propVideoMuted');
  const controlsInput = document.getElementById('propVideoControls');

  if (mutedInput) selectedData.muted = Boolean(mutedInput.checked);
  if (controlsInput) selectedData.controls = Boolean(controlsInput.checked);
}

function syncVideoCheckboxDefaults() {
  const selectedData = getSelectedVideoElementData();
  const controlsInput = document.getElementById('propVideoControls');
  const mutedInput = document.getElementById('propVideoMuted');

  if (selectedData && controlsInput && selectedData.controls == null) {
    selectedData.controls = true;
  }

  if (selectedData && controlsInput) {
    controlsInput.checked = selectedData.controls !== false;
  } else if (controlsInput && !controlsInput.dataset.videoDefaultApplied) {
    controlsInput.checked = true;
    controlsInput.dataset.videoDefaultApplied = '1';
  }

  if (selectedData && mutedInput) {
    mutedInput.checked = selectedData.muted !== false;
  }
}

function buildVideoPreview(videoData) {
  const rawUrl = videoData?.videoUrl || '';
  const previewUrl = normalizeFtVideoPreviewUrl(rawUrl);
  if (!previewUrl) return '';

  const muted = videoData.muted !== false ? 'muted' : '';
  const controls = videoData.controls !== false ? 'controls' : '';
  const autoplay = videoData.playTrigger === 'autoplay' ? 'autoplay playsinline loop' : 'playsinline';

  return `
    <video class="freeform-video-preview" src="${escapeAttr(previewUrl)}" ${controls} ${muted} ${autoplay} preload="metadata" draggable="false" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#000;display:block;pointer-events:none;z-index:1;"></video>
  `;
}

function patchVideoElement(element, force = false) {
  if (!element) return;

  const videoData = getVideoDataForElement(element);
  if (!videoData?.videoUrl) return;

  const previewUrl = normalizeFtVideoPreviewUrl(videoData.videoUrl);
  if (!previewUrl) return;

  const signature = JSON.stringify({
    src: previewUrl,
    muted: videoData.muted !== false,
    controls: videoData.controls !== false,
    playTrigger: videoData.playTrigger || 'click'
  });

  if (!force && element.dataset.videoPreviewSignature === signature && element.querySelector('video.freeform-video-preview')) return;

  const previewMarkup = buildVideoPreview(videoData);
  if (!previewMarkup) return;

  element.dataset.videoPreviewPatched = '1';
  element.dataset.videoPreviewUrl = videoData.videoUrl;
  element.dataset.videoPreviewSignature = signature;
  element.classList.add('has-video-preview');
  element.style.backgroundColor = '#000';
  element.style.overflow = 'hidden';
  element.style.position = element.style.position || 'absolute';

  const handles = Array.from(element.querySelectorAll('.resize-handle'));
  element.innerHTML = previewMarkup;
  handles.forEach(handle => {
    handle.style.zIndex = '2';
    element.appendChild(handle);
  });

  const video = element.querySelector('video.freeform-video-preview');
  if (video) {
    video.addEventListener('error', () => {
      element.dataset.videoPreviewPatched = '0';
      console.warn('[AdBuilder] Could not load video preview:', previewUrl);
    });
  }
}

function patchCanvasVideoPreviews(force = false) {
  document.querySelectorAll('.canvas-element.video-element, .video-element, [data-type="video"], [data-element-type="video"]').forEach(element => patchVideoElement(element, force));
  syncVideoCheckboxDefaults();
}

function forceSelectedVideoPreviewRefresh() {
  setSelectedVideoStateFromInputs();
  const selected = document.querySelector('.canvas-element.video-element.selected, .video-element.selected, [data-type="video"].selected, [data-element-type="video"].selected');
  if (selected) patchVideoElement(selected, true);
  patchCanvasVideoPreviews(true);
}

function installVideoPreviewObserver() {
  if (window.__adBuilderVideoPreviewPatchInstalled) return;
  window.__adBuilderVideoPreviewPatchInstalled = true;

  patchCanvasVideoPreviews();

  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(() => patchCanvasVideoPreviews());
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  document.addEventListener('change', event => {
    if (event.target && (event.target.id === 'propVideoControls' || event.target.id === 'propVideoMuted')) {
      forceSelectedVideoPreviewRefresh();
    }
  }, true);

  document.addEventListener('input', event => {
    if (event.target && (event.target.id === 'propVideoControls' || event.target.id === 'propVideoMuted')) {
      forceSelectedVideoPreviewRefresh();
    }
  }, true);

  document.addEventListener('click', () => {
    window.setTimeout(() => patchCanvasVideoPreviews(), 0);
    window.setTimeout(() => syncVideoCheckboxDefaults(), 50);
  }, true);

  window.setInterval(patchCanvasVideoPreviews, 1000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installVideoPreviewObserver);
} else {
  installVideoPreviewObserver();
}

window.adBuilderVideoPreviewPatch = {
  normalizeFtVideoPreviewUrl,
  patchCanvasVideoPreviews,
  forceSelectedVideoPreviewRefresh
};
