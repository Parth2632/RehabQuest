// Simple offline store using localStorage. No external services required.
// Data is stored per-user-key (uid or 'guest').

const KEY_PREFIX = 'rehabquest:';

function userKey(uid) {
  return uid || 'guest';
}

function readArray(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeArray(storageKey, arr) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(arr));
  } catch {}
}

// Moods
export function listMoods(uid) {
  const k = KEY_PREFIX + userKey(uid) + ':moods';
  return readArray(k).sort((a,b) => (a.createdAt || 0) - (b.createdAt || 0));
}

export function addMood(uid, score) {
  const k = KEY_PREFIX + userKey(uid) + ':moods';
  const arr = readArray(k);
  arr.push({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), score: Number(score), createdAt: Date.now() });
  writeArray(k, arr);
  return arr;
}

// Gratitude (auto-delete older than 24h via purge)
export function listGratitudes(uid) {
  const k = KEY_PREFIX + userKey(uid) + ':gratitude';
  const arr = purgeOld(readArray(k));
  writeArray(k, arr);
  return arr.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export function addGratitude(uid, text) {
  const k = KEY_PREFIX + userKey(uid) + ':gratitude';
  const arr = purgeOld(readArray(k));
  arr.push({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), text: String(text), createdAt: Date.now() });
  writeArray(k, arr);
  return arr;
}

export function removeGratitude(uid, id) {
  const k = KEY_PREFIX + userKey(uid) + ':gratitude';
  const arr = purgeOld(readArray(k));
  const next = arr.filter(i => i.id !== id);
  writeArray(k, next);
  return next;
}

function purgeOld(arr) {
  const cutoff = Date.now() - 24*60*60*1000;
  return arr.filter(i => (i.createdAt || 0) >= cutoff);
}

