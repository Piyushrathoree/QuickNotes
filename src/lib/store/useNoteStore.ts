"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Note, NoteStore, NoteSummary, SaveState } from "@/lib/types";
import { useSession } from "@/lib/auth-client";
import { deleteNote, fetchNote, fetchNotes, saveNote } from "@/lib/sync/client";
import { migrateGuestOnce, resetGuestMigration } from "@/lib/sync/migrateGuest";
import {
  GUEST_LEGACY_STORAGE_KEY,
  GUEST_STORAGE_KEY,
  readGuestState,
  writeGuestState,
} from "@/lib/store/guest";
import {
  EMPTY_GUEST_STATE,
  activeGuestNote,
  changedNoteIds,
  createBlankNote,
  mergeGuestState,
  normalizeGuestState,
  removeNote,
  restoreNote,
  selectNote,
  updateActiveContent,
  visibleGuestNotes,
  type GuestState,
} from "@/lib/store/guestState";
import { createClientId, nextUpdatedAt, sortNoteSummaries, summarizeNote } from "@/lib/store/logic";

const LAST_OPENED_STORAGE_KEY = "notes:last:v1";
const GUEST_SAVE_DELAY = 300;
const ACCOUNT_SAVE_DELAY = 800;

interface DeletedNoteRecord {
  summary: NoteSummary;
  note: Note | null;
}

interface AccountModel {
  notes: NoteSummary[];
  activeNote: Note | null;
  saveState: SaveState;
  deleted: Record<string, DeletedNoteRecord>;
}

const emptyAccountModel: AccountModel = {
  notes: [],
  activeNote: null,
  saveState: "idle",
  deleted: {},
};

interface GuestModel {
  state: GuestState;
  saveState: SaveState;
}

const initialGuestModel: GuestModel = { state: EMPTY_GUEST_STATE, saveState: "idle" };

function readLastOpenedNoteId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LAST_OPENED_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeLastOpenedNoteId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_OPENED_STORAGE_KEY, id);
  } catch {
    // Remembering the selected note is best-effort when storage is unavailable.
  }
}

function isBrowserOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function getFailureState(error: unknown): "offline" | "error" {
  if (isBrowserOffline() || error instanceof TypeError) return "offline";
  return "error";
}

function mergeSummary(notes: NoteSummary[], summary: NoteSummary): NoteSummary[] {
  return sortNoteSummaries([
    ...notes.filter((candidate) => candidate.id !== summary.id),
    summary,
  ]);
}

export function useNoteStore(): NoteStore {
  const { data: session, isPending } = useSession();
  const accountUserId = session?.user?.id ?? null;
  const accountMode = Boolean(accountUserId);
  // better-auth sets isPending again on every refetch while signed out, so latch the first
  // settled session. Otherwise `ready` would drop mid-typing for guests.
  const [sessionSettled, setSessionSettled] = useState(false);
  useEffect(() => {
    if (!isPending) setSessionSettled(true);
  }, [isPending]);

  const [guest, setGuest] = useState<GuestModel>(initialGuestModel);
  const guestRef = useRef<GuestModel>(initialGuestModel);
  const [guestReady, setGuestReady] = useState(false);
  const guestDirtyRef = useRef(new Set<string>());
  const guestPendingRef = useRef(false);
  const guestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [accountReady, setAccountReady] = useState(false);

  const [accountModel, setAccountModel] = useState<AccountModel>(emptyAccountModel);
  const accountModelRef = useRef(accountModel);
  const accountModeRef = useRef(accountMode);
  accountModeRef.current = accountMode;
  const accountUserIdRef = useRef(accountUserId);
  accountUserIdRef.current = accountUserId;

  const accountEpochRef = useRef(0);
  const noteLoadEpochRef = useRef(0);
  const saveRevisionsRef = useRef(new Map<string, number>());
  const pendingSavesRef = useRef(new Map<string, Note>());
  const saveTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const inFlightSavesRef = useRef(new Map<string, Promise<void>>());
  const deleteVersionsRef = useRef(new Map<string, number>());
  const deleteRetriesRef = useRef(new Map<string, () => Promise<void>>());
  const deleteOperationsRef = useRef(new Map<string, Promise<void>>());
  const retryAccountLoadRef = useRef<() => void>(() => undefined);

  const updateAccountModel = useCallback((update: (current: AccountModel) => AccountModel) => {
    const next = update(accountModelRef.current);
    accountModelRef.current = next;
    setAccountModel(next);
  }, []);

  const commitGuest = useCallback((next: GuestModel) => {
    guestRef.current = next;
    setGuest(next);
  }, []);

  const cancelGuestTimer = useCallback(() => {
    if (guestTimerRef.current) clearTimeout(guestTimerRef.current);
    guestTimerRef.current = null;
  }, []);

  // Writes this tab's pending changes, merged with whatever other tabs have stored.
  const flushGuest = useCallback(() => {
    cancelGuestTimer();
    if (!guestPendingRef.current) return;

    const now = Date.now();
    const merged = normalizeGuestState(
      mergeGuestState(readGuestState(now), guestRef.current.state, guestDirtyRef.current),
      now,
    );
    const written = writeGuestState(merged);
    if (written) {
      guestDirtyRef.current.clear();
      guestPendingRef.current = false;
    }
    commitGuest({ state: merged, saveState: written ? "saved" : "error" });
  }, [cancelGuestTimer, commitGuest]);

  // Structural changes (select, create, remove, restore) save at once. Typing is debounced.
  const applyGuest = useCallback(
    (next: GuestState, immediate: boolean) => {
      const previous = guestRef.current.state;
      if (next === previous) return;

      for (const id of changedNoteIds(previous, next)) guestDirtyRef.current.add(id);
      guestPendingRef.current = true;
      commitGuest({ state: next, saveState: "saving" });

      cancelGuestTimer();
      if (immediate) flushGuest();
      else guestTimerRef.current = setTimeout(flushGuest, GUEST_SAVE_DELAY);
    },
    [cancelGuestTimer, commitGuest, flushGuest],
  );

  // Reloads guest notes from storage. Runs on mount and after sign-out, so notes that were
  // migrated to the account are not shown again from memory.
  const hydrateGuest = useCallback(() => {
    flushGuest();
    guestDirtyRef.current.clear();
    guestPendingRef.current = false;
    const now = Date.now();
    commitGuest({ state: normalizeGuestState(readGuestState(now), now), saveState: "idle" });
    setGuestReady(true);
  }, [commitGuest, flushGuest]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onStorage = (event: StorageEvent) => {
      if (
        event.key !== GUEST_STORAGE_KEY &&
        event.key !== GUEST_LEGACY_STORAGE_KEY &&
        event.key !== null
      ) {
        return;
      }
      const now = Date.now();
      const merged = normalizeGuestState(
        mergeGuestState(readGuestState(now), guestRef.current.state, guestDirtyRef.current),
        now,
      );
      commitGuest({ ...guestRef.current, state: merged });
    };
    const onPageHide = () => flushGuest();
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushGuest();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      flushGuest();
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [commitGuest, flushGuest]);

  const selectAccountNote = useCallback(
    async (id: string) => {
      const current = accountModelRef.current;
      if (!current.notes.some((note) => note.id === id)) return;
      writeLastOpenedNoteId(id);
      if (current.activeNote?.id === id) return;

      const loadEpoch = noteLoadEpochRef.current + 1;
      noteLoadEpochRef.current = loadEpoch;
      updateAccountModel((model) => ({ ...model, activeNote: null }));

      if (isBrowserOffline()) {
        updateAccountModel((model) => ({ ...model, saveState: "offline" }));
        return;
      }

      try {
        const note = await fetchNote(id);
        if (noteLoadEpochRef.current !== loadEpoch || !accountModeRef.current) return;
        updateAccountModel((model) => ({
          ...model,
          notes: mergeSummary(model.notes, summarizeNote(note)),
          activeNote: note,
        }));
      } catch (error) {
        if (noteLoadEpochRef.current !== loadEpoch) return;
        updateAccountModel((model) => ({ ...model, saveState: getFailureState(error) }));
      }
    },
    [updateAccountModel],
  );

  const flushAccountSaves = useCallback(async (onlyId?: string) => {
    const ids = onlyId ? [onlyId] : Array.from(pendingSavesRef.current.keys());

    for (const id of ids) {
      const timer = saveTimersRef.current.get(id);
      if (timer) {
        clearTimeout(timer);
        saveTimersRef.current.delete(id);
      }

      if (inFlightSavesRef.current.has(id)) continue;
      const note = pendingSavesRef.current.get(id);
      if (!note) continue;
      if (isBrowserOffline()) {
        updateAccountModel((model) => ({ ...model, saveState: "offline" }));
        continue;
      }

      pendingSavesRef.current.delete(id);
      const revision = saveRevisionsRef.current.get(id) ?? 0;
      let succeeded = false;
      const operation = (async () => {
        try {
          const saved = await saveNote(note);
          succeeded = true;
          if (saveRevisionsRef.current.get(id) !== revision) return;

          updateAccountModel((model) => ({
            ...model,
            notes: mergeSummary(model.notes, summarizeNote(saved)),
            activeNote: model.activeNote?.id === id ? saved : model.activeNote,
            saveState: "saved",
          }));
        } catch (error) {
          if (saveRevisionsRef.current.get(id) !== revision) return;
          if (!pendingSavesRef.current.has(id)) pendingSavesRef.current.set(id, note);
          updateAccountModel((model) => ({ ...model, saveState: getFailureState(error) }));
        } finally {
          inFlightSavesRef.current.delete(id);
          if (
            pendingSavesRef.current.has(id) &&
            !saveTimersRef.current.has(id) &&
            (succeeded || saveRevisionsRef.current.get(id) !== revision)
          ) {
            void flushAccountSaves(id);
          }
        }
      })();
      inFlightSavesRef.current.set(id, operation);
      await operation;
    }
  }, [updateAccountModel]);

  const scheduleAccountSave = useCallback(
    (note: Note) => {
      const revision = (saveRevisionsRef.current.get(note.id) ?? 0) + 1;
      saveRevisionsRef.current.set(note.id, revision);
      pendingSavesRef.current.set(note.id, note);
      const oldTimer = saveTimersRef.current.get(note.id);
      if (oldTimer) clearTimeout(oldTimer);

      updateAccountModel((model) => ({
        ...model,
        notes: mergeSummary(model.notes, summarizeNote(note)),
        activeNote: model.activeNote?.id === note.id ? note : model.activeNote,
        saveState: "saving",
      }));

      const timer = setTimeout(() => {
        saveTimersRef.current.delete(note.id);
        void flushAccountSaves(note.id);
      }, ACCOUNT_SAVE_DELAY);
      saveTimersRef.current.set(note.id, timer);
    },
    [flushAccountSaves, updateAccountModel],
  );

  const loadAccount = useCallback(
    async (epoch: number) => {
      const isCurrent = () => accountEpochRef.current === epoch && accountModeRef.current;
      if (isBrowserOffline()) {
        updateAccountModel((model) => ({ ...model, saveState: "offline" }));
        return;
      }

      try {
        const fetched = await fetchNotes();
        if (!isCurrent()) return;
        const deletedIds = new Set(Object.keys(accountModelRef.current.deleted));
        let summaries = sortNoteSummaries(
          fetched.filter((note) => !deletedIds.has(note.id)),
        );
        for (const pending of pendingSavesRef.current.values()) {
          if (!deletedIds.has(pending.id)) summaries = mergeSummary(summaries, summarizeNote(pending));
        }

        updateAccountModel((model) => ({ ...model, notes: summaries }));
        const rememberedId = readLastOpenedNoteId();
        const selected = summaries.find((note) => note.id === rememberedId) ?? summaries[0];
        if (selected) await selectAccountNote(selected.id);
      } catch (error) {
        if (!isCurrent()) return;
        updateAccountModel((model) => ({ ...model, saveState: getFailureState(error) }));
      }
    },
    [selectAccountNote, updateAccountModel],
  );

  useEffect(() => {
    const epoch = accountEpochRef.current + 1;
    accountEpochRef.current = epoch;
    noteLoadEpochRef.current += 1;

    if (!accountUserId) {
      updateAccountModel(() => emptyAccountModel);
      retryAccountLoadRef.current = () => undefined;
      setAccountReady(false);
      resetGuestMigration();
      hydrateGuest();
      return;
    }

    updateAccountModel(() => ({ ...emptyAccountModel }));
    setAccountReady(false);
    // Pending guest edits must reach storage before the migration reads it. Guest memory is
    // not used while signed in, so it is dropped; a later sign-out re-reads storage.
    flushGuest();
    commitGuest(initialGuestModel);
    setGuestReady(false);
    const runLoad = () => void loadAccount(epoch);
    retryAccountLoadRef.current = runLoad;
    let active = true;

    void (async () => {
      try {
        await migrateGuestOnce(accountUserId);
      } catch (error) {
        if (active && accountEpochRef.current === epoch) {
          updateAccountModel((model) => ({ ...model, saveState: getFailureState(error) }));
        }
      }
      if (active && accountEpochRef.current === epoch) {
        await loadAccount(epoch);
        if (active && accountEpochRef.current === epoch) setAccountReady(true);
      }
    })();

    const flushOnExit = () => void flushAccountSaves();
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushOnExit();
    };
    const onOnline = () => {
      retryAccountLoadRef.current();
      void flushAccountSaves();
      for (const retry of deleteRetriesRef.current.values()) void retry();
    };

    window.addEventListener("pagehide", flushOnExit);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", onOnline);

    return () => {
      active = false;
      window.removeEventListener("pagehide", flushOnExit);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("online", onOnline);
    };
  }, [
    accountUserId,
    commitGuest,
    flushAccountSaves,
    flushGuest,
    hydrateGuest,
    loadAccount,
    updateAccountModel,
  ]);

  const select = useCallback(
    (id: string) => {
      if (accountMode) {
        void selectAccountNote(id);
        return;
      }
      applyGuest(selectNote(guestRef.current.state, id, Date.now()), true);
    },
    [accountMode, applyGuest, selectAccountNote],
  );

  const create = useCallback(() => {
    const now = Date.now();
    if (!accountMode) {
      applyGuest(createBlankNote(guestRef.current.state, now), true);
      return;
    }

    const note: Note = {
      id: createClientId(),
      content: "",
      createdAt: now,
      updatedAt: now,
    };
    noteLoadEpochRef.current += 1;
    writeLastOpenedNoteId(note.id);
    updateAccountModel((model) => ({
      ...model,
      notes: mergeSummary(model.notes, summarizeNote(note)),
      activeNote: note,
    }));
    scheduleAccountSave(note);
  }, [accountMode, applyGuest, scheduleAccountSave, updateAccountModel]);

  const update = useCallback(
    (content: string) => {
      if (!accountMode) {
        applyGuest(updateActiveContent(guestRef.current.state, content, Date.now()), false);
        return;
      }

      const current = accountModelRef.current.activeNote;
      if (!current) return;
      const note: Note = {
        ...current,
        content,
        updatedAt: nextUpdatedAt(current.updatedAt),
      };
      updateAccountModel((model) => ({ ...model, activeNote: note }));
      scheduleAccountSave(note);
    },
    [accountMode, applyGuest, scheduleAccountSave, updateAccountModel],
  );

  const remove = useCallback(
    (id: string) => {
      if (!accountMode) {
        applyGuest(removeNote(guestRef.current.state, id, Date.now()), true);
        return;
      }
      const current = accountModelRef.current;
      const summary = current.notes.find((note) => note.id === id);
      if (!summary) return;
      const note = current.activeNote?.id === id ? current.activeNote : null;
      const version = (deleteVersionsRef.current.get(id) ?? 0) + 1;
      deleteVersionsRef.current.set(id, version);

      const timer = saveTimersRef.current.get(id);
      if (timer) clearTimeout(timer);
      saveTimersRef.current.delete(id);
      pendingSavesRef.current.delete(id);
      saveRevisionsRef.current.set(id, (saveRevisionsRef.current.get(id) ?? 0) + 1);

      updateAccountModel((model) => ({
        ...model,
        notes: model.notes.filter((candidate) => candidate.id !== id),
        activeNote: model.activeNote?.id === id ? null : model.activeNote,
        deleted: { ...model.deleted, [id]: { summary, note } },
        saveState: "saving",
      }));

      const retryRef: { current: () => Promise<void> } = {
        current: async () => undefined,
      };
      const attempt = async (): Promise<void> => {
        try {
          if (isBrowserOffline()) throw new TypeError("The browser is offline.");

          let fullNote = accountModelRef.current.deleted[id]?.note ?? note;
          if (!fullNote) fullNote = await fetchNote(id);
          if (deleteVersionsRef.current.get(id) !== version) return;

          updateAccountModel((model) => ({
            ...model,
            deleted: {
              ...model.deleted,
              [id]: { summary, note: fullNote },
            },
          }));

          const pendingSave = inFlightSavesRef.current.get(id);
          if (pendingSave) await pendingSave;
          if (deleteVersionsRef.current.get(id) !== version) return;

          await deleteNote(id);
          if (deleteVersionsRef.current.get(id) !== version) return;
          deleteRetriesRef.current.delete(id);
          updateAccountModel((model) => ({ ...model, saveState: "saved" }));
        } catch (error) {
          if (deleteVersionsRef.current.get(id) !== version) return;
          deleteRetriesRef.current.set(id, retryRef.current);
          updateAccountModel((model) => ({ ...model, saveState: getFailureState(error) }));
        }
      };

      const retry = () => {
        const operation = attempt().finally(() => {
          if (deleteOperationsRef.current.get(id) === operation) {
            deleteOperationsRef.current.delete(id);
          }
        });
        deleteOperationsRef.current.set(id, operation);
        return operation;
      };
      retryRef.current = retry;
      deleteRetriesRef.current.set(id, retry);
      void retry();

      const next = current.notes.find((candidate) => candidate.id !== id);
      if (current.activeNote?.id === id && next) void selectAccountNote(next.id);
    },
    [accountMode, applyGuest, selectAccountNote, updateAccountModel],
  );

  const restore = useCallback(
    (id: string) => {
      if (!accountMode) {
        applyGuest(restoreNote(guestRef.current.state, id, Date.now()), true);
        return;
      }
      const current = accountModelRef.current;
      const record = current.deleted[id];
      if (!record) return;

      deleteVersionsRef.current.set(id, (deleteVersionsRef.current.get(id) ?? 0) + 1);
      deleteRetriesRef.current.delete(id);
      updateAccountModel((model) => ({
        ...model,
        notes: mergeSummary(model.notes, record.summary),
        activeNote: record.note ?? model.activeNote,
        deleted: Object.fromEntries(
          Object.entries(model.deleted).filter(([deletedId]) => deletedId !== id),
        ),
        saveState: "saving",
      }));

      const deletion = deleteOperationsRef.current.get(id);
      void (async () => {
        if (deletion) await deletion;

        let note = record.note ?? accountModelRef.current.activeNote;
        if (!note || note.id !== id) {
          try {
            note = await fetchNote(id);
          } catch (error) {
            updateAccountModel((model) => ({ ...model, saveState: getFailureState(error) }));
            return;
          }
        }

        const restored: Note = {
          ...note,
          updatedAt: nextUpdatedAt(note.updatedAt),
        };
        updateAccountModel((model) => ({
          ...model,
          notes: mergeSummary(model.notes, summarizeNote(restored)),
          activeNote: restored,
        }));
        writeLastOpenedNoteId(id);
        scheduleAccountSave(restored);
      })();
    },
    [accountMode, applyGuest, scheduleAccountSave, updateAccountModel],
  );

  const guestNotes = useMemo(() => visibleGuestNotes(guest.state), [guest.state]);
  const guestActive = useMemo(() => activeGuestNote(guest.state), [guest.state]);
  const ready = sessionSettled && (accountMode ? accountReady : guestReady);

  if (accountMode) {
    return {
      mode: "account",
      notes: accountModel.notes,
      activeNote: accountModel.activeNote,
      saveState: accountModel.saveState,
      ready,
      select,
      create,
      update,
      remove,
      restore,
    };
  }

  return {
    mode: "guest",
    notes: guestNotes,
    activeNote: guestActive,
    saveState: guest.saveState,
    ready,
    select,
    create,
    update,
    remove,
    restore,
  };
}
