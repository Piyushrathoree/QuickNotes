"use client";

import { memo, useSyncExternalStore } from "react";
import Link from "next/link";
import { HelpCircleIcon, PencilEdit02Icon, SidebarLeftIcon } from "@hugeicons/core-free-icons";
import { AccountArea } from "@/components/AccountArea";
import { Icon } from "@/components/Icon";
import { NoteList } from "@/components/NoteList";
import { ThemeButton } from "@/components/ThemeButton";
import { iconButtonClass } from "@/components/styles";
import { Kbd } from "@/components/ui/kbd";
import type { NoteSummary } from "@/lib/types";

const noSubscribe = () => () => undefined;

// Platform-dependent, so it resolves on the client only. The server snapshot is null, which keeps the hydration match.
function getIsMac(): boolean {
  return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
}

function useShortcutLabels(): { newNote: string; toggle: string } {
  const mac = useSyncExternalStore<boolean | null>(noSubscribe, getIsMac, () => null);
  if (mac === null) return { newNote: "", toggle: "" };
  return mac ? { newNote: "⌘⇧O", toggle: "⌘B" } : { newNote: "Ctrl+Shift+O", toggle: "Ctrl+B" };
}

interface NotesSidebarProps {
  notes: NoteSummary[];
  activeId: string | undefined;
  ready: boolean;
  onNewNote: () => void;
  onPick: (id: string) => void;
  onDelete: (id: string) => void;
  /** Desktop only. Passing it makes the sidebar collapsible: the same tree then shows its icon rail. */
  onToggle?: () => void;
  /** Desktop only: whether the sidebar is expanded. */
  open?: boolean;
}

/**
 * One tree for the desktop sidebar (both widths) and the mobile drawer. Collapsing never swaps components:
 * the parent's data-sidebar attribute drives the widths and the fades (see .sb-aside in globals.css).
 * The icon column is a 36px box at the same x in both states, so icons do not move while the sidebar animates.
 */
export const NotesSidebar = memo(function NotesSidebar({
  notes,
  activeId,
  ready,
  onNewNote,
  onPick,
  onDelete,
  onToggle,
  open = true,
}: NotesSidebarProps) {
  const shortcuts = useShortcutLabels();
  const collapsible = onToggle !== undefined;

  return (
    <div className="sb-panel flex min-h-0 flex-1 flex-col">
      {/* Desktop only: the header with the collapse toggle, wordmark, About and theme. The mobile drawer draws its own header. */}
      {collapsible && (
      <div className="flex h-12 shrink-0 items-center gap-1 px-2.5">
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={open}
            aria-controls="notes-sidebar"
            title={`${open ? "Collapse" : "Expand"} sidebar${shortcuts.toggle ? ` (${shortcuts.toggle})` : ""}`}
            className={iconButtonClass}
          >
            <Icon icon={SidebarLeftIcon} />
          </button>
        )}
        <span className="sb-fade min-w-0 flex-1 truncate pl-1 text-[15px] font-semibold tracking-[-0.01em] text-foreground select-none">
          Quick Notes
        </span>
        <span className="sb-fade flex shrink-0 items-center">
          {/* A real link (not a button) so crawlers find the About page from the app itself. */}
          <Link
            href="/about"
            aria-label="About Quick Notes, Markdown shortcuts and FAQ"
            title="About, shortcuts and FAQ"
            className={iconButtonClass}
          >
            <Icon icon={HelpCircleIcon} />
          </Link>
          <ThemeButton />
        </span>
      </div>
      )}

      <div className="px-2.5">
        <button
          type="button"
          onClick={onNewNote}
          aria-label="New note"
          title={shortcuts.newNote ? `New note (${shortcuts.newNote})` : "New note"}
          className="sb-new flex h-9 items-center overflow-hidden rounded-lg bg-brand-soft text-left text-sm font-medium text-foreground outline-none hover:bg-brand-soft-hover focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="grid size-9 shrink-0 place-items-center">
            <Icon icon={PencilEdit02Icon} className="text-brand" />
          </span>
          <span className="sb-fade min-w-0 flex-1 whitespace-nowrap">New note</span>
          {shortcuts.newNote && <Kbd className="sb-fade mr-2.5 hidden md:inline-flex">{shortcuts.newNote}</Kbd>}
        </button>
      </div>

      {/* Collapsed rail only: theme sits under New note, in the same icon column. */}
      {collapsible && (
        <div className="sb-rail-only flex-col items-start px-2.5 pt-1">
          <ThemeButton />
        </div>
      )}

      <p className="sb-fade mt-5 px-4.5 pb-1.5 text-xs font-medium whitespace-nowrap text-muted-foreground">Notes</p>

      <div className="sb-fade min-h-0 flex-1 overflow-y-auto px-2.5 pb-2">
        <NoteList notes={notes} activeId={activeId} ready={ready} onPick={onPick} onDelete={onDelete} />
      </div>

      {/* Pinned to the bottom and never shrinks: the note list above scrolls instead. Expanded: Font row and account
          row (guests: sign-in card above the Font row). Collapsed: Font and account icons. Both share one grid cell,
          so the rail sits at the bottom edge and the expanded footer fades out beneath it. */}
      <div className="grid shrink-0 grid-cols-1 items-end border-t border-border px-2.5 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="sb-fade col-start-1 row-start-1 min-w-0">
          <AccountArea />
        </div>
        {collapsible && (
          <div className="sb-rail-only col-start-1 row-start-1 flex-col items-start">
            <AccountArea variant="rail" />
          </div>
        )}
      </div>
    </div>
  );
});
