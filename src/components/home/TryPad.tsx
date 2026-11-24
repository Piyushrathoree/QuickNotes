"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { readGuestState, writeGuestState } from "@/lib/store/guest";
import { createClientId } from "@/lib/store/logic";

const MAX_DRAFT = 4000;

/**
 * A few lines of the app's ruled paper that work. "Keep writing" turns what the visitor wrote into a guest note and
 * opens the notepad on it, so nothing typed on the landing page is thrown away.
 */
export function TryPad() {
  const router = useRouter();
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const hasDraft = draft.trim().length > 0;

  // Grow one ruled line at a time, so the writing never scrolls inside the box.
  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight}px`;
  }, [draft]);

  function keepWriting() {
    if (!hasDraft || saving) return;
    setSaving(true);
    const now = Date.now();
    const text = draft.replace(/\r\n?/g, "\n").trim();
    // The first line is the note's title in the app. A one-line draft gets a body so the title stays short.
    const content = text.includes("\n") ? text : `Written on the front page\n${text}`;
    const state = readGuestState(now);
    const note = { id: createClientId(), content, createdAt: now, updatedAt: now };
    writeGuestState({ notes: [note, ...state.notes], activeId: note.id });
    router.push("/write");
  }

  return (
    <div className="lx-try" data-filled={hasDraft || undefined}>
      <label htmlFor="lx-try-field" className="sr-only">
        Write something here, then keep writing in the notepad
      </label>
      <textarea
        id="lx-try-field"
        ref={fieldRef}
        className="lx-try-field"
        rows={3}
        maxLength={MAX_DRAFT}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            keepWriting();
          }
        }}
        placeholder="Your turn. Write the thing you almost forgot…"
        spellCheck
      />
      <div className="lx-try-foot" aria-live="polite">
        {hasDraft ? (
          <>
            <button type="button" className="lx-btn lx-btn-solid" onClick={keepWriting} disabled={saving}>
              {saving ? "Opening…" : "Keep writing"}
            </button>
            <span>Opens the notepad with this as a new note, saved in this browser.</span>
          </>
        ) : (
          <span>Nothing to install. What you write here becomes a note.</span>
        )}
      </div>
    </div>
  );
}
