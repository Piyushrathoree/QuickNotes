export interface Note {
  id: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface NoteSummary {
  id: string;
  title: string;
  updatedAt: number;
}

export type SaveState = "idle" | "saving" | "saved" | "offline" | "error";

export interface UiPrefs {
  previewOpen: boolean;
  sidebarOpen: boolean;
  theme: "light" | "dark";
  font: "draw" | "sans" | "serif";
}

export interface NoteStore {
  mode: "guest" | "account";
  notes: NoteSummary[];
  activeNote: Note | null;
  saveState: SaveState;
  ready: boolean;
  select(id: string): void;
  create(): void;
  update(content: string): void;
  remove(id: string): void;
  restore(id: string): void;
}

export function deriveTitle(content: string): string {
  return content.split(/\r?\n/, 1)[0]?.trim() || "Untitled note";
}
