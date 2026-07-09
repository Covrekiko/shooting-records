import { offlineDB } from './offlineDB';
import { base44 } from '@/api/base44Client';

const STORE = 'queued_photos';
const PREFIX = 'offline-photo:';

function makeId() {
  return `photo_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function isOfflinePhotoRef(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

export function makeOfflinePhotoRef(id) {
  return `${PREFIX}${id}`;
}

export function getOfflinePhotoId(ref) {
  return isOfflinePhotoRef(ref) ? ref.slice(PREFIX.length) : null;
}

export function collectOfflinePhotoRefs(value, refs = new Set()) {
  if (isOfflinePhotoRef(value)) refs.add(value);
  else if (Array.isArray(value)) value.forEach((item) => collectOfflinePhotoRefs(item, refs));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => collectOfflinePhotoRefs(item, refs));
  return [...refs];
}

export async function saveOfflinePhoto(blob, name = 'offline-photo.jpg') {
  const id = makeId();
  const record = {
    id,
    name,
    type: blob?.type || 'image/jpeg',
    blob,
    status: 'pending_upload',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await offlineDB.put(STORE, record);
  return makeOfflinePhotoRef(id);
}

export async function getOfflinePhotoObjectUrl(ref) {
  const id = getOfflinePhotoId(ref);
  if (!id) return ref;
  const record = await offlineDB.getById(STORE, id);
  if (!record?.blob) return '';
  return URL.createObjectURL(record.blob);
}

async function uploadOfflinePhotoRef(ref) {
  const id = getOfflinePhotoId(ref);
  if (!id) return ref;
  const record = await offlineDB.getById(STORE, id);
  if (!record?.blob) return ref;
  if (record.remoteUrl) return record.remoteUrl;

  await offlineDB.put(STORE, { ...record, status: 'uploading', attempts: Number(record.attempts || 0) + 1, updatedAt: Date.now() });
  const file = new File([record.blob], record.name || `${id}.jpg`, { type: record.type || record.blob.type || 'image/jpeg' });
  let response;
  try {
    response = await base44.integrations.Core.UploadFile({ file });
  } catch (error) {
    await offlineDB.put(STORE, { ...record, status: 'pending_upload', attempts: Number(record.attempts || 0) + 1, lastError: error?.message || String(error), updatedAt: Date.now() });
    throw error;
  }
  const remoteUrl = response.file_url || response.url;
  if (!remoteUrl) throw new Error('Offline photo upload did not return a URL.');

  await offlineDB.put(STORE, {
    ...record,
    remoteUrl,
    status: 'uploaded',
    updatedAt: Date.now(),
  });
  return remoteUrl;
}

export async function resolveOfflinePhotoRefs(value) {
  if (isOfflinePhotoRef(value)) return uploadOfflinePhotoRef(value);
  if (Array.isArray(value)) {
    const resolved = [];
    for (const item of value) resolved.push(await resolveOfflinePhotoRefs(item));
    return resolved;
  }
  if (value && typeof value === 'object') {
    const entries = await Promise.all(Object.entries(value).map(async ([key, item]) => [key, await resolveOfflinePhotoRefs(item)]));
    return Object.fromEntries(entries);
  }
  return value;
}

export async function cleanupUploadedOfflinePhotoRefs(refs = []) {
  for (const ref of refs) {
    const id = getOfflinePhotoId(ref);
    if (!id) continue;
    const record = await offlineDB.getById(STORE, id);
    if (record?.remoteUrl) await offlineDB.remove(STORE, id);
  }
}

export async function discardOfflinePhotoRefs(refs = []) {
  for (const ref of refs) {
    const id = getOfflinePhotoId(ref);
    if (id) await offlineDB.remove(STORE, id);
  }
}

export async function listQueuedOfflinePhotos() {
  return offlineDB.getAll(STORE);
}