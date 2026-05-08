export function _log(...a) {
  if (window.AD_BUILDER_DEBUG) console.log(...a);
}

export function _err(...a) {
  if (window.AD_BUILDER_DEBUG) console.error(...a);
}

export function _warn(...a) {
  if (window.AD_BUILDER_DEBUG) console.warn(...a);
}
