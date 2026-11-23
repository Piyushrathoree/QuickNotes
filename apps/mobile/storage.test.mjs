import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

const sqliteShim = `
  import { DatabaseSync } from 'node:sqlite';
  const sqlite = new DatabaseSync(':memory:');
  const db = {
    execAsync: async (sql) => sqlite.exec(sql),
    getFirstAsync: async (sql, ...args) => sqlite.prepare(sql).get(...args),
    getAllAsync: async (sql, ...args) => sqlite.prepare(sql).all(...args),
    runAsync: async (sql, ...args) => sqlite.prepare(sql).run(...args),
    withTransactionAsync: async (fn) => {
      sqlite.exec('BEGIN');
      try { await fn(); sqlite.exec('COMMIT'); }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
    withExclusiveTransactionAsync: async (fn) => db.withTransactionAsync(() => fn(db)),
  };
  export const openDatabaseAsync = async () => db;
`;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'expo-sqlite') {
      return { url: 'data:text/javascript,' + encodeURIComponent(sqliteShim), shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const {
  acceptCloudNote, acceptSummary, addLocalNote, finishGuestImport, getNote, reconcileSummaryIds,
  saveDraft, setImportAttempt,
} = await import('./src/lib/storage.ts');

test('a cloud acknowledgement preserves newer local edits and advances their base revision', async () => {
  const scope = 'account:writer';
  const id = await addLocalNote(scope, undefined, 'submitted');
  await saveDraft(scope, id, 'newer text', null, 2);
  await acceptCloudNote(scope, { id, content: 'submitted', revision: 1, createdAt: 1, updatedAt: 2 }, { sequence: 1 });
  await saveDraft(scope, id, 'late duplicate', null, 2);

  const note = await getNote(scope, id);
  assert.equal(note.content, 'newer text');
  assert.equal(note.revision, 1);
  assert.equal(note.isDirty, 1);
  assert.equal(await getNote('account:other', id), undefined);
});

test('stale refresh data and reconciliation preserve pending drafts', async () => {
  const scope = 'account:refresher';
  const id = await addLocalNote(scope);
  await acceptCloudNote(scope, { id, content: 'saved', revision: 3, createdAt: 1, updatedAt: 2 }, { sequence: 1 });
  await acceptSummary(scope, { id, title: 'old', revision: 2, updatedAt: 1 });
  assert.equal((await getNote(scope, id)).revision, 3);
  await saveDraft(scope, id, 'draft', 3, 2);
  assert.equal(await acceptCloudNote(scope, { id, content: 'other device', revision: 4, createdAt: 1, updatedAt: 3 }), false);
  await reconcileSummaryIds(scope, []);
  assert.equal((await getNote(scope, id)).content, 'draft');
});

test('guest import only clears the acknowledged source sequence and account binding', async () => {
  const sourceId = await addLocalNote('guest', undefined, 'old guest note');
  const attempt = { sourceId, destinationUserId: 'owner', destinationNoteId: sourceId, sourceSequence: 1 };
  await setImportAttempt(attempt);
  assert.equal(await finishGuestImport({ ...attempt, destinationUserId: 'other' }, 'old guest note'), false);
  await saveDraft('guest', sourceId, 'edited guest note', null, 2);
  assert.equal(await finishGuestImport(attempt, 'old guest note'), false);
  const currentAttempt = { ...attempt, sourceSequence: 2 };
  await setImportAttempt(currentAttempt);
  assert.equal(await finishGuestImport(currentAttempt, 'edited guest note'), true);
  assert.equal(await getNote('guest', sourceId), undefined);
});
