export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function isNumber(value) {
  return typeof value === 'number' && !Number.isNaN(value);
}

export function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
