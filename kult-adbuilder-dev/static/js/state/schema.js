import { CURRENT_BANNER_VERSION, DEFAULT_BANNER_SIZE, DEFAULT_TIMELINE } from '../core/constants.js';

export function createBannerState() {
  return {
    version: CURRENT_BANNER_VERSION,

    meta: {
      name: '',
      width: DEFAULT_BANNER_SIZE.width,
      height: DEFAULT_BANNER_SIZE.height,
      backgroundColor: '#ffffff'
    },

    settings: {
      politeLoad: false,
      bannerBorder: false,
      bannerBorderColor: '#000000',
      bannerBorderWidth: 1,
      loopAnimations: DEFAULT_TIMELINE.loop
    },

    elements: [],

    timeline: {
      totalDuration: DEFAULT_TIMELINE.totalDuration
    },

    selection: {
      selectedElementId: null
    },

    ui: {
      zoom: 1
    }
  };
}

export function normalizeBannerState(data = {}) {
  const base = createBannerState();

  return {
    ...base,
    ...data,
    meta: {
      ...base.meta,
      ...(data.meta || {})
    },
    settings: {
      ...base.settings,
      ...(data.settings || {})
    },
    timeline: {
      ...base.timeline,
      ...(data.timeline || {})
    },
    selection: {
      ...base.selection,
      ...(data.selection || {})
    },
    ui: {
      ...base.ui,
      ...(data.ui || {})
    },
    elements: Array.isArray(data.elements) ? data.elements : []
  };
}
