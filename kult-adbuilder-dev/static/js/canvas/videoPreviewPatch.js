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

function forEachVideoStateMatch(elementId, callback) {
  getCandidateStateArrays().forEach(elements => {
    const match = elements.find(item => item?.id === elementId && item.type === 'video');
    if (match) callback(match);
  });
}

function findVideoElementData(elementId) {
  for (const elements of getCandidateStateArrays()) {
    const match = elements.find(item => item?.id === elementId && item.type === 'video');
    if (match) return match;
  }
  return null;
}

function getSelectedVideoElement() {
  return document.querySelector('.canvas-element.video-element.selected, .video-element.selected, [data-type="video"].selected, [data-element-type="video"].selected');
}

function getSelectedVideoElementData() {
  const selected = getSelectedVideoElement();
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

function readControlsFlag(data) {
  if (!data) return true;
  if (data.controls != null) return data.controls !== false;
  if (data.videoControls != null) return data.videoControls !== false;
  if (data.showControls != null) return data.showControls !== false;
  return true;
}

function readMutedFlag(data) {
  if (!data) return true;
  if (data.muted != null) return data.muted !== false;
  if (data.videoMuted != null) return data.videoMuted !== false;
  return true;
}

function writeControlsFlag(data, value) {
  if (!data) return;
  data.controls = value;
  data.videoControls = value;
  data.showControls = value;
}

function writeMutedFlag(data, value) {
  if (!data) return;
  data.muted = value;
  data.videoMuted = value;
}

function normalizeVideoData(element, fromState) {
  const url = fromState?.videoUrl || readVideoUrlFromDom(element);
  if (!url) return null;

  return {
    id: element.id,
    videoUrl: url,
    videoName: fromState?.videoName || element.querySelector('.video-name')?.textContent || 'video1',
    muted: readMutedFlag(fromState),
    controls: readControlsFlag(fromState),
    playTrigger: fromState?.playTrigger || fromState?.videoPlayTrigger || 'click'
  };
}

function getVideoDataForElement(element) {
  return normalizeVideoData(element, findVideoElementData(element.id));
}

function setSelectedVideoStateFromInputs() {
  const selected = getSelectedVideoElement();
  if (!selected) return;

  const mutedInput = document.getElementById('propVideoMuted');
  const controlsInput = document.getElementById('propVideoControls');

  forEachVideoStateMatch(selected.id, data => {
    if (mutedInput) writeMutedFlag(data, Boolean(mutedInput.checked));
    if (controlsInput) writeControlsFlag(data, Boolean(controlsInput.checked));
  });
}

function getVideoControlsCheckboxes() {
  const boxes = new Set();
  document.querySelectorAll('#propVideoControls, input[type="checkbox"][id*="control" i], input[type="checkbox"][name*="control" i]').forEach(input => {
    const labelText = String(input.closest('label')?.textContent || input.parentElement?.textContent || '').toLowerCase();
    const idName = `${input.id || ''} ${input.name || ''}`.toLowerCase();
    if (idName.includes('control') || labelText.includes('control')) boxes.add(input);
  });
  return Array.from(boxes);
}

function setCheckboxChecked(input, checked) {
  if (!input) return;
  if (input.checked === checked) return;
  input.checked = checked;
  input.setAttribute('aria-checked', checked ? 'true' : 'false');
}

function defaultVideoControlCheckboxes() {
  const selectedData = getSelectedVideoElementData();
  getVideoControlsCheckboxes().forEach(input => {
    if (input.dataset.userChangedVideoControls === '1') return;

    if (input.id === 'propVideoControls' && selectedData) {
      if (selectedData.controls == null && selectedData.videoControls == null && selectedData.showControls == null) {
        writeControlsFlag(selectedData, true);
      }
      setCheckboxChecked(input, readControlsFlag(selectedData));
      return;
    }

    setCheckboxChecked(input, true);
  });
}

function syncVideoCheckboxDefaults() {
  const selected = getSelectedVideoElement();
  const selectedData = selected ? findVideoElementData(selected.id) : null;
  const controlsInput = document.getElementById('propVideoControls');
  const mutedInput = document.getElementById('propVideoMuted');

  if (selectedData && controlsInput && controlsInput.dataset.userChangedVideoControls !== '1') {
    if (selectedData.controls == null && selectedData.videoControls == null && selectedData.showControls == null) {
      writeControlsFlag(selectedData, true);
    }
    setCheckboxChecked(controlsInput, readControlsFlag(selectedData));
  } else if (controlsInput && controlsInput.dataset.userChangedVideoControls !== '1') {
    setCheckboxChecked(controlsInput, true);
  }

  if (selectedData && mutedInput) {
    mutedInput.checked = readMutedFlag(selectedData);
  }

  defaultVideoControlCheckboxes();
}

function buildVideoPreview(videoData) {
  const rawUrl = videoData?.videoUrl || '';
  const previewUrl = normalizeFtVideoPreviewUrl(rawUrl);
  if (!previewUrl) return '';

  const muted = videoData.muted ? 'muted' : '';
  const controls = videoData.controls ? 'controls' : '';
  const autoplay = videoData.playTrigger === 'autoplay' ? 'autoplay playsinline loop' : 'playsinline';

  return `
    <video class="freeform-video-preview" src="${escapeAttr(previewUrl)}" ${controls} ${muted} ${autoplay} preload="metadata" draggable="false" style="position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;background:#000;display:block;pointer-events:none;z-index:1;"></video>
  `;
}

function collectResizeHandles(element) {
  const existing = Array.from(element.querySelectorAll(':scope > .resize-handle'));
  if (existing.length) return existing;

  return ['nw', 'ne', 'sw', 'se'].map(position => {
    const handle = document.createElement('div');
    handle.className = `resize-handle ${position}`;
    return handle;
  });
}

function restoreResizeHandles(element, handles) {
  handles.forEach(handle => {
    handle.style.position = '';
    handle.style.zIndex = '20';
    handle.style.flex = 'none';
    element.appendChild(handle);
  });
}

function patchVideoElement(element, force = false) {
  if (!element) return;

  const videoData = getVideoDataForElement(element);
  if (!videoData?.videoUrl) return;

  const previewUrl = normalizeFtVideoPreviewUrl(videoData.videoUrl);
  if (!previewUrl) return;

  const signature = JSON.stringify({
    src: previewUrl,
    muted: Boolean(videoData.muted),
    controls: Boolean(videoData.controls),
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
  element.style.display = 'block';
  element.style.alignItems = '';
  element.style.justifyContent = '';

  const handles = collectResizeHandles(element);
  element.innerHTML = previewMarkup;
  restoreResizeHandles(element, handles);

  const video = element.querySelector('video.freeform-video-preview');
  if (video) {
    video.controls = Boolean(videoData.controls);
    video.muted = Boolean(videoData.muted);
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
  const selected = getSelectedVideoElement();
  if (selected) patchVideoElement(selected, true);
}

function deferSelectedVideoPreviewRefresh() {
  window.setTimeout(() => {
    setSelectedVideoStateFromInputs();
    forceSelectedVideoPreviewRefresh();
    syncVideoCheckboxDefaults();
  }, 0);
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
    if (event.target && getVideoControlsCheckboxes().includes(event.target)) {
      event.target.dataset.userChangedVideoControls = '1';
    }

    if (event.target && (event.target.id === 'propVideoControls' || event.target.id === 'propVideoMuted')) {
      deferSelectedVideoPreviewRefresh();
    }
  }, true);

  document.addEventListener('input', event => {
    if (event.target && (event.target.id === 'propVideoControls' || event.target.id === 'propVideoMuted')) {
      deferSelectedVideoPreviewRefresh();
    }
  }, true);

  document.addEventListener('click', () => {
    window.setTimeout(() => patchCanvasVideoPreviews(), 0);
    window.setTimeout(() => syncVideoCheckboxDefaults(), 50);
    window.setTimeout(() => defaultVideoControlCheckboxes(), 100);
  }, true);

  window.setInterval(() => patchCanvasVideoPreviews(), 1000);
  window.setInterval(() => defaultVideoControlCheckboxes(), 500);
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
