"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { toast } from "sonner";
import { Menu01Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { applyFont, applyTheme } from "@/components/appearance";
import { Icon } from "@/components/Icon";
import { NotesSidebar } from "@/components/NotesSidebar";
import { ThemeButton } from "@/components/ThemeButton";
import { iconButtonClass } from "@/components/styles";
import { WritingPad, type WritingPadHandle } from "@/components/WritingPad";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { readUiPrefs, usePrefs } from "@/lib/store/prefs";
import { useNoteStore } from "@/lib/store/useNoteStore";
import { cn } from "@/lib/utils";

const noSubscribe = () => () => undefined;

// False while hydrating (the server snapshot), true afterwards. Lets the sidebar attribute wait for the real prefs.
function useHydrated(): boolean {
  return useSyncExternalStore(noSubscribe, () => true, () => false);
}

export function AppShell() {
  const store = useNoteStore();
  const { prefs, setPrefs } = usePrefs();
  const hydrated = useHydrated();
  const padRef = useRef<WritingPadHandle>(null);
  const asideRef = useRef<HTMLElement>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Radix would return focus to the menu button after the sheet closes. After a pick, send it to the pad instead.
  const pickedFromSheet = useRef(false);
  const sidebarOpen = prefs.sidebarOpen;

  // Callbacks read the latest store through a ref, so they keep their identity and the memoized sidebar skips
  // re-rendering while the pad types.
  const storeRef = useRef(store);
  useLayoutEffect(() => {
    storeRef.current = store;
  });

  const focusPad = useCallback(() => padRef.current?.focusNote(), []);

  // flushSync: the pad must show the new note before it decides where focus goes.
  const newNote = useCallback(() => {
    flushSync(() => storeRef.current.create());
    focusPad();
  }, [focusPad]);

  const pickNote = useCallback(
    (id: string) => {
      flushSync(() => storeRef.current.select(id));
      focusPad();
    },
    [focusPad],
  );

  const deleteNote = useCallback((id: string) => {
    storeRef.current.remove(id);
    toast("Note deleted", {
      action: { label: "Undo", onClick: () => storeRef.current.restore(id) },
    });
  }, []);

  // Same actions from the mobile sheet: close it first, then the pad takes focus once it has closed.
  const newNoteFromSheet = useCallback(() => {
    pickedFromSheet.current = true;
    storeRef.current.create();
    setSheetOpen(false);
  }, []);

  const pickNoteFromSheet = useCallback((id: string) => {
    pickedFromSheet.current = true;
    storeRef.current.select(id);
    setSheetOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => {
    setPrefs((current) => ({ ...current, sidebarOpen: !current.sidebarOpen }));
  }, [setPrefs]);

  // Drives the desktop sidebar width (see .sb-aside in globals.css). Layout effect, so it lands before paint.
  // Skipped during hydration: the server snapshot would wrongly say "open" and animate the sidebar on load.
  useLayoutEffect(() => {
    if (!hydrated) return;
    document.documentElement.dataset.sidebar = sidebarOpen ? "open" : "collapsed";

    // A collapsed sidebar hides its labels. If focus was on one of them, move it to the toggle that stays visible.
    const aside = asideRef.current;
    const active = document.activeElement;
    if (
      !sidebarOpen &&
      aside &&
      active instanceof HTMLElement &&
      aside.contains(active) &&
      !active.matches('[aria-controls="notes-sidebar"]')
    ) {
      aside.querySelector<HTMLElement>('[aria-controls="notes-sidebar"]')?.focus();
    }
  }, [hydrated, sidebarOpen]);

  // Another tab changed the appearance. Read storage directly so this never runs against the server snapshot.
  useEffect(() => {
    const onStorage = () => {
      const current = readUiPrefs();
      applyTheme(current.theme);
      applyFont(current.font);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Mod+Shift+O starts a new note, in both modes. Mod+B shows or hides the sidebar.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      const mod = event.metaKey || event.ctrlKey;
      if (!mod || event.altKey) return;
      const key = event.key.toLowerCase();
      if (event.shiftKey && key === "o") {
        event.preventDefault();
        newNote();
      } else if (!event.shiftKey && key === "b") {
        event.preventDefault();
        toggleSidebar();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [newNote, toggleSidebar]);

  return (
    <div className="flex h-dvh bg-canvas text-foreground">
      {/* One element for both widths. Its width animates; the tree inside never changes. */}
      <aside
        ref={asideRef}
        id="notes-sidebar"
        className="sb-aside hidden shrink-0 flex-col overflow-hidden border-r border-border bg-sidebar md:flex"
      >
        <NotesSidebar
          notes={store.notes}
          activeId={store.activeNote?.id}
          ready={store.ready}
          onNewNote={newNote}
          onPick={pickNote}
          onDelete={deleteNote}
          onToggle={toggleSidebar}
          open={sidebarOpen}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-1 px-3 md:hidden">
          <button type="button" onClick={() => setSheetOpen(true)} aria-label="Open notes" className={iconButtonClass}>
            <Icon icon={Menu01Icon} />
          </button>
          <span className="flex-1 select-none text-[15px] font-semibold tracking-[-0.01em] text-foreground">Quick Notes</span>
          <ThemeButton />
          <button type="button" onClick={newNote} aria-label="New note" className={cn(iconButtonClass, "text-brand")}>
            <Icon icon={PencilEdit02Icon} />
          </button>
        </header>

        <main className="flex min-h-0 flex-1 flex-col p-2 md:p-3">
          <WritingPad store={store} handleRef={padRef} />
        </main>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          onCloseAutoFocus={(event) => {
            if (!pickedFromSheet.current) return;
            event.preventDefault();
            pickedFromSheet.current = false;
            focusPad();
          }}
          className="w-[min(20rem,85vw)] max-w-none gap-0 bg-sidebar p-0 sm:max-w-none"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Quick Notes</SheetTitle>
          </SheetHeader>
          <NotesSidebar
            notes={store.notes}
            activeId={store.activeNote?.id}
            ready={store.ready}
            onNewNote={newNoteFromSheet}
            onPick={pickNoteFromSheet}
            onDelete={deleteNote}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
