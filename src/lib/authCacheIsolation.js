const CURRENT_KEY = 'sr_cached_user_profile_current_key';
const LEGACY_KEYS = ['sr_cached_user_profile', 'cachedUserProfile'];
const PREFIX = 'sr_cached_user_profile:';

export function getUserIdentity(user = {}) {
  const id = user.id || user.user_id || '';
  const email = String(user.email || '').toLowerCase();
  if (!id && !email) return null;
  return { id, email, key: `${PREFIX}${id || email}` };
}

export function writeUserCache(storage, user, now = Date.now()) {
  const identity = getUserIdentity(user);
  if (!storage || !identity) return null;
  const record = { ...user, email: identity.email || user.email, cachedAt: now, cacheIdentity: { id: identity.id, email: identity.email } };
  storage.setItem(identity.key, JSON.stringify(record));
  storage.setItem(CURRENT_KEY, JSON.stringify({ ...identity, cachedAt: now }));
  LEGACY_KEYS.forEach((key) => storage.removeItem(key));
  return identity.key;
}

export function readCurrentUserCache(storage) {
  if (!storage) return null;
  const pointerRaw = storage.getItem(CURRENT_KEY);
  if (!pointerRaw) return null;
  const pointer = JSON.parse(pointerRaw);
  if (!pointer?.key || !pointer.key.startsWith(PREFIX)) return null;
  const raw = storage.getItem(pointer.key);
  if (!raw) return null;
  const cached = JSON.parse(raw);
  const cachedIdentity = getUserIdentity(cached);
  if (!cachedIdentity) return null;
  if (pointer.id && cachedIdentity.id && pointer.id !== cachedIdentity.id) return null;
  if (pointer.email && cachedIdentity.email && pointer.email !== cachedIdentity.email) return null;
  return cached;
}

export function clearUserCaches(storage) {
  if (!storage) return;
  const keys = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key?.startsWith(PREFIX) || key === CURRENT_KEY || LEGACY_KEYS.includes(key)) keys.push(key);
  }
  keys.forEach((key) => storage.removeItem(key));
}