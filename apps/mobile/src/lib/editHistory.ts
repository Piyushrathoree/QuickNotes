export type EditField = 'title' | 'body';
type Selection = { start: number; end: number };
export type EditSnapshot = { content: string; field: EditField; selection: Selection };

const groupWindowMs = 700;
const maxSteps = 50;
const maxCharactersPerStack = 2_000_000;

class SnapshotStack {
  private entries: EditSnapshot[] = [];
  private characters = 0;

  get hasEntries() { return this.entries.length > 0; }

  push(entry: EditSnapshot) {
    this.entries.push(entry);
    this.characters += entry.content.length;
    while (this.entries.length > 1 && (this.entries.length > maxSteps || this.characters > maxCharactersPerStack)) {
      this.characters -= this.entries.shift()!.content.length;
    }
  }

  pop() {
    const entry = this.entries.pop();
    if (entry) this.characters -= entry.content.length;
    return entry;
  }

  clear() {
    this.entries.length = 0;
    this.characters = 0;
  }
}

export class EditHistory {
  private past = new SnapshotStack();
  private future = new SnapshotStack();
  private group: { field: EditField; delta: number; time: number; nextCaret: number } | null = null;

  get canUndo() { return this.past.hasEntries; }
  get canRedo() { return this.future.hasEntries; }

  record(before: EditSnapshot, delta = 0, time = Date.now()) {
    const { field, selection } = before;
    const canGroup = Math.abs(delta) === 1 && selection.start === selection.end;
    const previous = this.group;
    if (!canGroup || !previous || previous.field !== field || previous.delta !== delta ||
      previous.nextCaret !== selection.start || time - previous.time > groupWindowMs) {
      this.past.push(before);
    }
    this.group = canGroup ? { field, delta, time, nextCaret: selection.start + delta } : null;
    this.future.clear();
  }

  step(direction: 'undo' | 'redo', current: EditSnapshot) {
    const source = direction === 'undo' ? this.past : this.future;
    const destination = direction === 'undo' ? this.future : this.past;
    const result = source.pop();
    if (!result) return;
    destination.push(current);
    this.group = null;
    return result;
  }

  reset() {
    this.past.clear();
    this.future.clear();
    this.group = null;
  }
}
