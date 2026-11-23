import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteNote, restoreNote, saveNote, NotesApiError } from '../src/lib/sync/client.ts';

const id = '4d95f97c-a6e0-42d0-8bb0-4fa5ca2c77c1';
const note = { id, content: 'hello', createdAt: 1, updatedAt: 2, revision: 3 };

function mockFetch(handler) {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => handler(String(url), init);
  return () => { globalThis.fetch = original; };
}

test('save sends the revision precondition and accepts the server snapshot', async () => {
  let request;
  const restore = mockFetch(async (_url, init) => {
    request = JSON.parse(init.body);
    return Response.json(note);
  });
  try {
    const saved = await saveNote({ id, content: 'hello', baseRevision: 2 });
    assert.deepEqual(request, { content: 'hello', baseRevision: 2 });
    assert.equal(saved.revision, 3);
  } finally { restore(); }
});

test('create uses a null baseline and a stale revision exposes the owned current snapshot', async () => {
  let request;
  const restore = mockFetch(async (_url, init) => {
    request = JSON.parse(init.body);
    return Response.json({ error: 'Note changed', code: 'note_conflict', current: note }, { status: 409 });
  });
  try {
    await assert.rejects(saveNote({ id, content: 'hello', baseRevision: null }), (error) => {
      assert.ok(error instanceof NotesApiError);
      assert.equal(error.kind, 'conflict');
      assert.deepEqual(error.current, note);
      return true;
    });
    assert.deepEqual(request, { content: 'hello', baseRevision: null });
  } finally { restore(); }
});

test('delete carries its expected revision and returns the committed tombstone revision', async () => {
  let requestUrl;
  const restore = mockFetch(async (url) => {
    requestUrl = url;
    return Response.json({ revision: 4 });
  });
  try {
    assert.equal(await deleteNote(id, 3), 4);
    assert.equal(requestUrl, `/api/notes/${id}?baseRevision=3`);
  } finally { restore(); }
});

test('restore uses the received delete revision and preserves an explicit draft', async () => {
  let request;
  const restoreFetch = mockFetch(async (_url, init) => {
    request = JSON.parse(init.body);
    return Response.json({ ...note, revision: 5 });
  });
  try {
    const restored = await restoreNote(id, 4, 'kept draft');
    assert.deepEqual(request, { baseRevision: 4, content: 'kept draft' });
    assert.equal(restored.revision, 5);
  } finally { restoreFetch(); }
});
