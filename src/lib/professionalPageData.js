import { base44 } from '@/api/base44Client';
import { getCachedUserProfile } from '@/lib/syncEngine';
import { getRepository } from '@/lib/offlineEntityRepository';

export async function getSafeCurrentUser() {
  try {
    const user = await base44.auth.me();
    if (user?.email) return user;
  } catch {}
  const cached = await getCachedUserProfile().catch(() => null);
  if (cached?.email) return cached;
  throw new Error('Go online once to sign in before using this page offline.');
}

export async function loadOwnedEntity(entityName, userEmail, sortField) {
  const repo = getRepository(entityName);
  return repo.filter({ created_by: userEmail }, sortField);
}

export function filterOwnedRows(rows, userEmail) {
  return (rows || []).filter((row) => !row?.created_by || row.created_by === userEmail);
}