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

  const file = new File([record.blob], record.name || `${id}.jpg`, { type: record.type || record.blob.type || 'image/jpeg' });
  const response = await base44.integrations.Core.UploadFile({ file });
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