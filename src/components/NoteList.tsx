"use client";

import { memo } from "react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { relativeTime } from "@/components/format";
import { Icon } from "@/components/Icon";
import { useNow } from "@/components/useNow";
import { cn } from "@/lib/utils";
import type { NoteSummary } from "@/lib/types";

interface NoteListProps {
  notes: NoteSummary[];
  activeId: string | undefined;
  ready: boolean;
  onPick: (id: string) => void;
  onDelete: (id: string) => void;
}

interface NoteRowProps {
  id: string;
  title: string;
  updatedAt: number;
  now: number;
  active: boolean;
  onPick: (id: string) => void;
  onDelete: (id: string) => void;
}

// Plain props only, so a row re-renders when its own title, time or active state changes, not on every keystroke.
const NoteRow = memo(function NoteRow({ id, title, updatedAt, now, active, onPick, onDelete }: NoteRowProps) {
  return (
    <li
      className={cn(
        "group flex items-center rounded-md transition-colors duration-150",
        active ? "bg-selected" : "hover:bg-hover",
      )}
    >
      <button
        type="button"
        onClick={() => onPick(id)}
        aria-current={active ? "true" : undefined}
        className="min-w-0 flex-1 rounded-md px-2.5 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="block truncate text-sm font-medium text-foreground">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{now > 0 ? relativeTime(updatedAt, now) : ""}</span>
      </button>
      <button
        type="button"
        aria-label={`Delete note: ${title}`}
        onClick={() => onDelete(id)}
        className="mr-1 grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground opacity-100 outline-none transition-[color,opacity] duration-150 hover:text-destructive focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100"
      >
        <Icon icon={Delete02Icon} />
      </button>
    </li>
  );
});

export const NoteList = memo(function NoteList({ notes, activeId, ready, onPick, onDelete }: NoteListProps) {
  // Changes once a minute at most, so only the rows' time labels are touched by it.
  const now = useNow();

  if (!ready) {
    return (
      <div className="flex flex-col gap-1 px-0.5" aria-hidden="true">
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-12 animate-pulse rounded-md bg-hover" />
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <p className="px-2.5 py-3 text-sm leading-6 text-muted-foreground">
        No notes yet. Start writing and it will appear here.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-0.5">
      {notes.map((note) => (
        <NoteRow
          key={note.id}
          id={note.id}
          title={note.title}
          updatedAt={note.updatedAt}
          now={now}
          active={note.id === activeId}
          onPick={onPick}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
});
