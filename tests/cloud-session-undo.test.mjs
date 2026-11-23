import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    const resolved = specifier.startsWith("@/")
      ? new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href
      : specifier;
    return nextResolve(resolved, context);
  },
});

const { CloudSession } = await import("../src/lib/store/cloudSession.ts");
const id = "4d95f97c-a6e0-42d0-8bb0-4fa5ca2c77c1";

function createSession(baseRevision, offline) {
  let cache = {
    version: 2,
    activeId: id,
    notes: [{ id, content: "draft text", createdAt: 1, updatedAt: 2, baseRevision, dirty: true }],
  };
  const requests = [];
  const session = new CloudSession("user", {
    storage: {
      read: () => cache,
      write: (next) => {
        cache = next;
        return true;
      },
    },
    api: {
      deleteNote: async (...args) => {
        requests.push(["delete", ...args]);
        return 4;
      },
      restoreNote: async (...args) => {
        requests.push(["restore", ...args]);
        return { id, content: "draft text", createdAt: 1, updatedAt: 4, revision: 5 };
      },
    },
    isOffline: () => offline,
    now: () => 3,
  });
  return { session, requests, readCache: () => cache };
}

test("undo reopens a never-uploaded draft without a server request", () => {
  const { session, requests, readCache } = createSession(null, false);
  session.remove(id);
  assert.equal(session.getSnapshot().notes.length, 0);
  session.restore(id);
  assert.equal(session.getSnapshot().activeNote?.content, "draft text");
  assert.equal(readCache().notes[0].baseRevision, null);
  assert.deepEqual(requests, []);
});

test("undo cancels an offline delete and retains the draft's baseline", () => {
  const { session, requests, readCache } = createSession(3, true);
  session.remove(id);
  session.restore(id);
  session.retryDeletes();
  assert.equal(session.getSnapshot().activeNote?.content, "draft text");
  assert.equal(readCache().notes[0].baseRevision, 3);
  assert.equal(readCache().notes[0].deletedAt, undefined);
  assert.deepEqual(requests, []);
});

test("undo sends the revision returned by a successful cloud delete", async () => {
  const { session, requests } = createSession(3, false);
  session.remove(id);
  session.restore(id);
  await new Promise(setImmediate);
  assert.deepEqual(requests, [
    ["delete", id, 3],
    ["restore", id, 4, "draft text"],
  ]);
  assert.equal(session.getSnapshot().activeNote?.content, "draft text");
});
