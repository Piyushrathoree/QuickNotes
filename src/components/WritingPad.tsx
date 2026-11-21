"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
} from "react";
import { formatSize } from "@/components/format";
import { ExportMenu, saveNoteAs } from "@/components/ExportMenu";
import { splitNote } from "@/components/exportNote";
import { cn } from "@/lib/utils";
import type { NoteStore, SaveState } from "@/lib/types";
import type { NoteEditorHandle } from "@/components/editor/NoteEditor";

// The editor is CodeMirror. It loads on the client only, after the pad is on screen. The skeleton is one empty
// 28px row, the same as an empty note, so nothing moves when the editor mounts.
const NoteEditor = dynamic(() => import("@/components/editor/NoteEditor").then((mod) => mod.NoteEditor), {
  ssr: false,
  loading: () => <div aria-hidden="true" className="h-7 min-w-0 flex-1" />,
});

const saveStatus: Record<SaveState, { label: string; dot: string }> = {
  idle: { label: "Ready", dot: "bg-muted-foreground/60" },
  saving: { label: "Saving…", dot: "bg-warning" },
  saved: { label: "Saved", dot: "bg-success" },
  offline: { label: "Offline", dot: "bg-muted-foreground" },
  error: { label: "Not saved", dot: "bg-destructive" },
};

/** Joins the two fields back into the stored string. An empty note stays an empty string. */
function joinNote(title: string, body: string): string {
  if (title === "" && body === "") return "";
  return `${title}\n${body}`;
}

/** What the shell can ask of the pad. Focus goes to the title of an empty note, otherwise to the end of the body. */
export interface WritingPadHandle {
  focusNote: () => void;
}

/** The margin rule sits this far from the pad's left edge. The text starts 12px to its right. */
const MARGIN_RULE = "clamp(14px, 2.5vw, 32px)";

interface WritingPadProps {
  store: NoteStore;
  handleRef: RefObject<WritingPadHandle | null>;
}

export function WritingPad({ store, handleRef }: WritingPadProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<NoteEditorHandle>(null);
  // Caret to set in the body after a multi-line paste into the title. Applied once the body has re-rendered.
  const pendingBodyCaret = useRef<number | null>(null);
  // A focus request ran before the editor finished loading. The editor takes it when it is ready.
  const pendingEditorFocus = useRef<"start" | "end" | null>(null);

  const content = store.activeNote?.content ?? "";
  const { title, body } = useMemo(() => splitNote(content), [content]);
  const size = useMemo(() => formatSize(content), [content]);
  const status = saveStatus[store.saveState];
  // Signed in with notes but none open yet: the note is still loading, so typing would be lost.
  const locked = store.mode === "account" && !store.activeNote && store.notes.length > 0;
  const readOnly = !store.ready || locked;

  useLayoutEffect(() => {
    const caret = pendingBodyCaret.current;
    if (caret === null) return;
    pendingBodyCaret.current = null;
    editorRef.current?.focusAt(caret);
  });

  // Writes both fields back as one string, so the store, sync and sidebar only ever see title + "\n" + body.
  function commit(nextTitle: string, nextBody: string) {
    // Signed in with no notes yet: the first keystroke creates one.
    if (!store.activeNote) store.create();
    store.update(joinNote(nextTitle, nextBody));
  }

  function handleTitleChange(event: ChangeEvent<HTMLInputElement>) {
    commit(event.target.value, body);
  }

  function handleBodyChange(nextBody: string) {
    commit(title, nextBody);
  }

  function focusTitleEnd() {
    const input = titleRef.current;
    if (!input) return;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  // The editor takes focus now, or once it has loaded.
  const focusEditor = useCallback((where: "start" | "end") => {
    const editor = editorRef.current;
    if (!editor) {
      pendingEditorFocus.current = where;
    } else if (where === "start") {
      editor.focusStart();
    } else {
      editor.focusEnd();
    }
  }, []);

  const focusEditorEnd = useCallback(() => focusEditor("end"), [focusEditor]);

  const onEditorReady = useCallback(() => {
    const where = pendingEditorFocus.current;
    if (!where) return;
    pendingEditorFocus.current = null;
    focusEditor(where);
  }, [focusEditor]);

  // An empty title takes focus (new notes, first load, empty notes). Otherwise the caret goes to the end of the body.
  // Reads the DOM, so callers must flush the store update first.
  const focusNote = useCallback(() => {
    const input = titleRef.current;
    if (!input) return;
    if (input.value === "") {
      input.focus();
      input.setSelectionRange(0, 0);
    } else {
      focusEditorEnd();
    }
  }, [focusEditorEnd]);

  useImperativeHandle(handleRef, () => ({ focusNote }), [focusNote]);

  // First load: focus the note once the store has loaded it. Editing is locked until then.
  useEffect(() => {
    if (store.ready) focusNote();
  }, [store.ready, focusNote]);

  // Enter, or Arrow Down at the end of the title, moves focus to the start of the body.
  function handleTitleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    const { selectionStart, selectionEnd, value } = event.currentTarget;
    const atEnd = selectionStart === value.length && selectionEnd === value.length;
    if (event.key === "Enter" || (event.key === "ArrowDown" && atEnd)) {
      event.preventDefault();
      editorRef.current?.focusStart();
    }
  }

  // A multi-line paste into the title: the first line stays in the title, the rest opens the body.
  function handleTitlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text/plain").replace(/\r\n?/g, "\n");
    const lineBreak = text.indexOf("\n");
    if (lineBreak === -1) return; // One line pastes as usual.
    event.preventDefault();
    const { selectionStart, selectionEnd } = event.currentTarget;
    const start = selectionStart ?? title.length;
    const end = selectionEnd ?? start;
    const restOfPaste = text.slice(lineBreak + 1);
    // Title text after the caret moves down into the body, behind the rest of the paste.
    const bodyHead = restOfPaste + title.slice(end);
    commit(
      title.slice(0, start) + text.slice(0, lineBreak),
      body ? `${bodyHead}\n${body}` : bodyHead,
    );
    pendingBodyCaret.current = restOfPaste.length;
  }

  // Cmd/Ctrl+S inside the pad saves the note as Markdown, and the browser's save dialog stays shut.
  function handlePadKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.nativeEvent.isComposing) return;
    if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
    if (event.key.toLowerCase() !== "s") return;
    event.preventDefault();
    saveNoteAs(content, "md");
  }

  // Clicks on the title keep their own caret. Clicks in the pad outside the text (the empty space below it, the
  // margins, the counter) put the caret at the end of the body.
  function focusPad(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (target instanceof Element && target.closest(".cm-editor, input, button")) return;
    focusEditorEnd();
  }

  return (
    // The pad is the scroll container: its border, radius and shadow scroll with it, and the counter is a sticky
    // footer, so nothing sits in an inner box with padding of its own.
    <div
      onClick={focusPad}
      onKeyDown={handlePadKeyDown}
      onScroll={() => editorRef.current?.refresh()}
      className="relative flex min-h-0 w-full flex-1 flex-col overflow-y-auto overscroll-contain rounded-[16px] border border-border bg-pad shadow-pad"
    >
      {/* One ruled sheet for the title and the body: same 28px grid, same insets, so no rule breaks at the boundary. */}
      {/* Fills the pad. Its min-height is the pad less the counter strip, so the rules run to the strip and stop. */}
      <div
        className="notepad relative flex min-h-[calc(100%-2rem)] shrink-0 flex-col pt-3 pr-4 md:pr-6"
        style={{ paddingLeft: `calc(${MARGIN_RULE} + 12px)` }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-px bg-border"
          style={{ left: MARGIN_RULE }}
        />

        {/* Title row: two 28px rules tall. The title text sits on the second rule. */}
        <div className="relative h-14 shrink-0">
          <input
            ref={titleRef}
            type="text"
            aria-label="Note title"
            placeholder={store.ready ? "Untitled note" : undefined}
            autoComplete="off"
            spellCheck
            value={title}
            readOnly={readOnly}
            onChange={handleTitleChange}
            onKeyDown={handleTitleKeyDown}
            onPaste={handleTitlePaste}
            className="block h-14 w-full text-ellipsis bg-transparent pt-4 text-[1.75rem] leading-[36px] font-extrabold tracking-[-0.01em] text-secondary-foreground caret-brand outline-none placeholder:font-medium placeholder:text-muted-foreground"
          />
        </div>

        {/* One empty 28px rule between the title and the body. Clicking it starts the body. The rules run through it. */}
        <div
          aria-hidden="true"
          onClick={(event) => {
            event.stopPropagation();
            focusEditor("start");
          }}
          className="h-7 shrink-0 cursor-text"
        />

        <NoteEditor
          noteId={store.activeNote?.id ?? null}
          value={body}
          readOnly={readOnly}
          placeholder={store.ready ? "Start writing…" : ""}
          onChange={handleBodyChange}
          onAtTop={focusTitleEnd}
          onReady={onEditorReady}
          handleRef={editorRef}
        />
      </div>

      <div className="pointer-events-none sticky bottom-0 flex h-8 shrink-0 items-center justify-end px-3">
        <div className="flex items-center gap-2 rounded-md bg-pad/90 px-1.5 py-0 text-xs text-muted-foreground tabular-nums">
          <ExportMenu content={content} />
          <span>{size}</span>
          <span aria-hidden="true">·</span>
          <span role="status" className="flex items-center gap-1.5">
            <span aria-hidden="true" className={cn("size-1.5 rounded-full", status.dot)} />
            {status.label}
          </span>
        </div>
      </div>
    </div>
  );
}
