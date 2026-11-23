import { authenticatedFetch } from './auth';
import type { CloudNote } from './storage';

export type NoteSummary = { id: string; title: string; updatedAt: number; revision: number };
export type Conflict = { error: string; code: 'note_conflict'; current: CloudNote | null };

async function readJson<T>(response: Response): Promise<T> {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || `Request failed (${response.status})`) as Error & { status?: number; code?: string; current?: CloudNote | null };
    error.status = response.status;
    error.code = result.code;
    error.current = result.current;
    throw error;
  }
  return result as T;
}

function assertPositiveRevision<T extends { revision: number }>(snapshot: T): T {
  if (!Number.isSafeInteger(snapshot.revision) || snapshot.revision < 1) throw new Error('The server returned an invalid note revision. Refresh before trying again.');
  return snapshot;
}

export function isTransportError(error: unknown) {
  return /network|fetch|timeout|connection|offline/i.test((error as Error)?.message ?? '');
}

function accountHeaders(userId: string) {
  return { 'X-QuickNotes-Account': userId };
}

export async function fetchSummaries(userId: string) {
  return readJson<NoteSummary[]>(await authenticatedFetch('/api/notes', { headers: accountHeaders(userId) }));
}
export async function fetchNote(userId: string, id: string) {
  return assertPositiveRevision(await readJson<CloudNote>(await authenticatedFetch(`/api/notes/${encodeURIComponent(id)}`, { headers: accountHeaders(userId) })));
}
export async function saveCloudNote(userId: string, id: string, content: string, baseRevision: number | null) {
  let utf8Bytes = 0;
  for (const character of content) {
    const point = character.codePointAt(0) ?? 0;
    utf8Bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
  }
  if (utf8Bytes > 1024 * 1024) throw new Error('Notes can be up to 1 MiB in UTF-8. Export this text or shorten it before saving.');
  return assertPositiveRevision(await readJson<CloudNote>(await authenticatedFetch(`/api/notes/${encodeURIComponent(id)}`, {
    method: 'PUT', headers: accountHeaders(userId), body: JSON.stringify({ content, baseRevision }),
  })));
}
export async function deleteCloudNote(userId: string, id: string, revision: number) {
  const result = await readJson<{ revision: number }>(await authenticatedFetch(`/api/notes/${encodeURIComponent(id)}?baseRevision=${revision}`, { method: 'DELETE', headers: accountHeaders(userId) }));
  if (!Number.isSafeInteger(result.revision) || result.revision < 1) throw new Error('The server returned an invalid deletion revision. Refresh before trying again.');
  return result;
}
