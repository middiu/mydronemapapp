// Persist last known geolocation fix + last map view across launches,
// so the PWA can rehydrate a useful offline state when the user opens
// it somewhere with no signal.

const STORAGE_KEY = 'mydronemap:lastPosition:v1';
const SAVE_THROTTLE_MS = 1000;

let lastSavedAt = 0;
let pendingTimer = null;
let pendingPayload = null;

function safeLocalStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isValidPayload(p) {
  if (!p || typeof p !== 'object') return false;
  const { lat, lon } = p;
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

export function load() {
  const ls = safeLocalStorage();
  if (!ls) return null;
  try {
    const raw = ls.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isValidPayload(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clear() {
  const ls = safeLocalStorage();
  if (!ls) return;
  try {
    ls.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Save last position + map view. Throttled to once per second across
 * rapid moveend storms. Writes are coalesced — the most recent call wins.
 *
 * @param {{lat:number, lon:number, accuracy?:number, center?:[number,number], zoom?:number}} payload
 */
export function save(payload) {
  if (!isValidPayload(payload)) return;
  pendingPayload = {
    ...payload,
    ts: Date.now(),
  };

  const ls = safeLocalStorage();
  if (!ls) return;

  const elapsed = Date.now() - lastSavedAt;
  if (elapsed >= SAVE_THROTTLE_MS) {
    flush();
    return;
  }

  if (pendingTimer) return;
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    flush();
  }, SAVE_THROTTLE_MS - elapsed);
}

function flush() {
  const ls = safeLocalStorage();
  if (!ls || !pendingPayload) return;
  try {
    ls.setItem(STORAGE_KEY, JSON.stringify(pendingPayload));
    lastSavedAt = Date.now();
  } catch {
    /* quota exceeded or storage disabled — silently drop */
  }
}