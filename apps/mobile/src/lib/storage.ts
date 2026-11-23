import * as SQLite from 'expo-sqlite';

export type Note = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  revision: number | null;
  scope: string;
  editedSeq: number;
  isDirty: number;
  hasBody: number;
  summaryTitle?: string | null;
};

export type CloudNote = { id: string; content: string; createdAt: number; updatedAt: number; revision: number };
export type ImportAttempt = { sourceId: string; destinationUserId: string; destinationNoteId: string; sourceSequence: number };
let initialized: Promise<SQLite.SQLiteDatabase> | undefined;

export function openDb() {
  if (!initialized) {
    initialized = SQLite.openDatabaseAsync('quicknotes.db').then(async (db) => {
      await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
      await db.withTransactionAsync(async () => {
        await db.execAsync(`CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY NOT NULL);
          CREATE TABLE IF NOT EXISTS notes (
            id TEXT NOT NULL,
            scope TEXT NOT NULL,
            content TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            revision INTEGER,
            edited_seq INTEGER NOT NULL DEFAULT 0,
            is_dirty INTEGER NOT NULL DEFAULT 1,
            has_body INTEGER NOT NULL DEFAULT 1,
            cloud_content TEXT,
            PRIMARY KEY (scope, id)
          );
          CREATE INDEX IF NOT EXISTS notes_recent_idx ON notes(scope, updated_at DESC, id ASC);
          CREATE TABLE IF NOT EXISTS preferences (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS guest_imports (
            source_id TEXT PRIMARY KEY NOT NULL,
            destination_user_id TEXT NOT NULL,
            destination_note_id TEXT NOT NULL,
            source_sequence INTEGER NOT NULL,
            updated_at TEXT NOT NULL
          );
          INSERT OR IGNORE INTO migrations(version) VALUES (1);
          INSERT OR IGNORE INTO migrations(version) VALUES (2);`);
        const schema = await db.getFirstAsync<{ version: number }>('SELECT max(version) AS version FROM migrations');
        if ((schema?.version ?? 0) < 3) {
          await db.execAsync('ALTER TABLE notes ADD COLUMN summary_title TEXT; INSERT INTO migrations(version) VALUES (3);');
        }
      });
      return db;
    }).catch((error) => {
      initialized = undefined;
      throw error;
    });
  }
  return initialized;
}

export function makeId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export function noteTitle(content: string) {
  return content.split(/\r?\n/, 1)[0]?.trim().replace(/^#+\s*/, '') || 'Untitled';
}

export async function listNotes(scope: string) {
  const db = await openDb();
  return db.getAllAsync<Note>(`SELECT id, content, created_at AS createdAt, updated_at AS updatedAt,
    revision, scope, edited_seq AS editedSeq, is_dirty AS isDirty, has_body AS hasBody, summary_title AS summaryTitle
    FROM notes WHERE scope = ? ORDER BY updated_at DESC, id ASC`, scope);
}

type NoteTitleRow = Pick<Note, 'id' | 'scope' | 'isDirty'> & { title: string };

export async function listNoteTitles(scope: string) {
  const db = await openDb();
  const rows = await db.getAllAsync<NoteTitleRow>(`SELECT id, scope, is_dirty AS isDirty,
    CASE WHEN has_body = 0 THEN COALESCE(summary_title, '')
      WHEN instr(content, char(10)) = 0 THEN content
      ELSE substr(content, 1, instr(content, char(10)) - 1)
    END AS title
    FROM notes WHERE scope = ? ORDER BY updated_at DESC, id ASC`, scope);
  return rows.map((row) => ({ ...row, title: noteTitle(row.title) }));
}

export async function getNote(scope: string, id: string) {
  const db = await openDb();
  return db.getFirstAsync<Note>(`SELECT id, content, created_at AS createdAt, updated_at AS updatedAt,
    revision, scope, edited_seq AS editedSeq, is_dirty AS isDirty, has_body AS hasBody, summary_title AS summaryTitle
    FROM notes WHERE scope = ? AND id = ?`, scope, id);
}

export async function saveDraft(scope: string, id: string, content: string, baseRevision: number | null, sequence: number) {
  const db = await openDb();
  const now = new Date().toISOString();
  await db.runAsync(`INSERT INTO notes(id,scope,content,created_at,updated_at,revision,edited_seq,is_dirty,has_body)
    VALUES(?,?,?,?,?,?,?,1,1)
    ON CONFLICT(scope,id) DO UPDATE SET content=excluded.content, updated_at=excluded.updated_at,
      revision=excluded.revision, edited_seq=excluded.edited_seq, is_dirty=1, has_body=1
    WHERE excluded.edited_seq > notes.edited_seq`, id, scope, content, now, now, baseRevision, sequence);
}

export async function addLocalNote(scope: string, id = makeId(), content = '') {
  const db = await openDb();
  const now = new Date().toISOString();
  await db.runAsync(`INSERT INTO notes(id,scope,content,created_at,updated_at,revision,edited_seq,is_dirty,has_body)
    VALUES(?,?,?,?,?,NULL,1,1,1)`, id, scope, content, now, now);
  return id;
}

export async function acceptCloudNote(
  scope: string,
  note: CloudNote,
  options?: { sequence: number; replaceDraft?: boolean },
) {
  const db = await openDb();
  const sequence = options?.sequence ?? null;
  const replaceDraft = options?.replaceDraft ? 1 : 0;
  const result = await db.runAsync(`INSERT INTO notes(id,scope,content,created_at,updated_at,revision,edited_seq,is_dirty,has_body,cloud_content)
    VALUES(?,?,?,?,?,?,0,0,1,?) ON CONFLICT(scope,id) DO UPDATE SET
      content=CASE WHEN notes.is_dirty=1 AND notes.edited_seq IS NOT ? THEN notes.content ELSE excluded.content END,
      is_dirty=CASE WHEN notes.is_dirty=1 AND notes.edited_seq IS NOT ? THEN 1 ELSE 0 END,
      created_at=excluded.created_at, updated_at=excluded.updated_at,
      revision=excluded.revision, has_body=1, cloud_content=excluded.cloud_content
    WHERE (notes.revision IS NULL OR notes.revision <= excluded.revision)
      AND (notes.is_dirty=0 OR (? IS NOT NULL AND (? = 0 OR notes.edited_seq = ?)))`,
  note.id, scope, note.content, new Date(note.createdAt).toISOString(), new Date(note.updatedAt).toISOString(),
  note.revision, note.content, sequence, sequence, sequence, replaceDraft, sequence);
  return result.changes > 0;
}

export async function acceptSummary(scope: string, item: Pick<CloudNote, 'id' | 'updatedAt' | 'revision'> & { title: string }) {
  const db = await openDb();
  const date = new Date(item.updatedAt).toISOString();
  await db.runAsync(`INSERT INTO notes(id,scope,content,created_at,updated_at,revision,edited_seq,is_dirty,has_body,summary_title)
    VALUES(?,?,'',?,?,?,0,0,0,?) ON CONFLICT(scope,id) DO UPDATE SET
      updated_at=excluded.updated_at, has_body=CASE WHEN notes.revision <> excluded.revision THEN 0 ELSE notes.has_body END,
      revision=excluded.revision, summary_title=excluded.summary_title
      WHERE notes.is_dirty=0 AND notes.revision <= excluded.revision`, item.id, scope, date, date, item.revision, item.title);
}

export async function reconcileSummaryIds(scope: string, ids: string[]) {
  const db = await openDb();
  await db.withTransactionAsync(async () => {
    const local = await db.getAllAsync<{ id: string; is_dirty: number }>('SELECT id,is_dirty FROM notes WHERE scope=?', scope);
    const remoteIds = new Set(ids);
    for (const item of local) {
      if (remoteIds.has(item.id) || item.is_dirty) continue;
      await db.runAsync('DELETE FROM notes WHERE scope=? AND id=? AND is_dirty=0', scope, item.id);
    }
  });
}

export async function setPreference(key: string, value: string) {
  const db = await openDb();
  await db.runAsync('INSERT INTO preferences(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', key, value);
}

export async function getPreference(key: string) {
  const db = await openDb();
  const result = await db.getFirstAsync<{ value: string }>('SELECT value FROM preferences WHERE key=?', key);
  return result?.value ?? null;
}

export async function removeNote(scope: string, id: string) {
  const db = await openDb();
  await db.runAsync('DELETE FROM notes WHERE scope=? AND id=?', scope, id);
}

export async function removeDraftAtSequence(scope: string, id: string, sequence: number) {
  const db = await openDb();
  const result = await db.runAsync('DELETE FROM notes WHERE scope=? AND id=? AND edited_seq=?', scope, id, sequence);
  return result.changes > 0;
}

export async function getImportAttempt(sourceId: string) {
  const db = await openDb();
  return db.getFirstAsync<ImportAttempt>(`SELECT source_id AS sourceId, destination_user_id AS destinationUserId,
    destination_note_id AS destinationNoteId, source_sequence AS sourceSequence
    FROM guest_imports WHERE source_id=?`, sourceId);
}

export async function setImportAttempt(attempt: ImportAttempt) {
  const db = await openDb();
  await db.runAsync(`INSERT INTO guest_imports(source_id,destination_user_id,destination_note_id,source_sequence,updated_at)
    VALUES(?,?,?,?,?) ON CONFLICT(source_id) DO UPDATE SET destination_user_id=excluded.destination_user_id,
    destination_note_id=excluded.destination_note_id, source_sequence=excluded.source_sequence, updated_at=excluded.updated_at`,
  attempt.sourceId, attempt.destinationUserId, attempt.destinationNoteId, attempt.sourceSequence, new Date().toISOString());
}

export async function finishGuestImport(attempt: ImportAttempt, content: string) {
  const db = await openDb();
  let removed = false;
  await db.withExclusiveTransactionAsync(async (transaction) => {
    const result = await transaction.runAsync(
      `DELETE FROM notes WHERE scope='guest' AND id=? AND edited_seq=? AND content=?
       AND EXISTS (SELECT 1 FROM guest_imports WHERE source_id=? AND destination_user_id=? AND destination_note_id=? AND source_sequence=?)`,
      attempt.sourceId, attempt.sourceSequence, content, attempt.sourceId, attempt.destinationUserId,
      attempt.destinationNoteId, attempt.sourceSequence,
    );
    removed = result.changes > 0;
    if (removed) await transaction.runAsync('DELETE FROM guest_imports WHERE source_id=?', attempt.sourceId);
  });
  return removed;
}

export async function cloneNote(scope: string, source: Note) {
  return addLocalNote(scope, makeId(), source.content);
}
