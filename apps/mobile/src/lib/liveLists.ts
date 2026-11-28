/**
 * Live lists for the phone editor. Notes are stored as Markdown ("- item"); the editor shows "• item" while you write,
 * like the web editor. "• " and "- " are the same length, so every cursor position maps one to one and nothing jumps.
 */

const BULLET_MARKDOWN = /^([ \t]*)[-*+] (?!\[[ xX]\] )/gm;
const BULLET_SHOWN = /^([ \t]*)[•◦▪] /gm;
// One glyph per nesting level, all one character wide, so positions never shift.
const GLYPHS = ['•', '◦', '▪'] as const;

/** Markdown → what the editor shows. */
export function toLive(body: string): string {
  return body.replace(BULLET_MARKDOWN, (_match, indent: string) => {
    const level = Math.floor(indent.replace(/\t/g, '  ').length / 2);
    return `${indent}${GLYPHS[level % GLYPHS.length]} `;
  });
}

/** What the editor shows → Markdown. A typed or pasted "• " becomes a real list item too. */
export function fromLive(text: string): string {
  return text.replace(BULLET_SHOWN, '$1- ');
}

/** Where a single typed character landed: the first index where the texts differ. */
function insertionPoint(previous: string, next: string): number {
  let index = 0;
  while (index < previous.length && previous[index] === next[index]) index++;
  return index;
}

/**
 * Enter on a list line: continue the list on the new line ("- ", "- [ ] ", "2. "). Enter on an empty item ends the
 * list instead. Returns null when the edit was not a newline typed inside a list item.
 */
export function continueList(previous: string, next: string): { body: string; cursor: number } | null {
  if (next.length !== previous.length + 1) return null;
  const at = insertionPoint(previous, next);
  if (next[at] !== '\n' || next.slice(at + 1) !== previous.slice(at)) return null;

  const start = at === 0 ? 0 : previous.lastIndexOf('\n', at - 1) + 1;
  const line = previous.slice(start, at);
  const item = /^([ \t]*)(?:[-*+]( \[[ xX]\])?|(\d{1,9})([.)])) +(.*)$/.exec(line);
  const emptyItem = /^([ \t]*)(?:[-*+]( \[[ xX]\])?|\d{1,9}[.)]) *$/.exec(line);

  if (emptyItem && !item?.[5]?.trim()) {
    const indent = emptyItem[1];
    if (indent.length > 0) {
      // An empty sub-item steps back out one level and stays on that line.
      const step = /^[ \t]*\d/.test(line) ? 3 : 2;
      const outdented = indent.slice(0, Math.max(0, indent.length - step)) + line.trimStart().trimEnd() + ' ';
      return { body: previous.slice(0, start) + outdented + previous.slice(at), cursor: start + outdented.length };
    }
    // An empty top-level item: drop its marker and stay on that line, which ends the list.
    return { body: previous.slice(0, start) + previous.slice(at), cursor: start };
  }
  if (!item) return null;

  const [, indent, task, number, delimiter] = item;
  const marker = number ? `${Number(number) + 1}${delimiter} ` : task ? '- [ ] ' : '- ';
  const insert = `\n${indent}${marker}`;
  return { body: previous.slice(0, at) + insert + previous.slice(at), cursor: at + insert.length };
}

/** After a marker was converted on screen, the caret belongs right after what was typed. */
export function caretAfterEdit(previous: string, next: string): number {
  let suffix = 0;
  while (
    suffix < previous.length &&
    suffix < next.length &&
    previous[previous.length - 1 - suffix] === next[next.length - 1 - suffix]
  ) suffix++;
  return Math.max(insertionPoint(previous, next), next.length - suffix);
}

/**
 * Backspace on an empty list item (just "- " or "  ◦ " on screen): a sub-item steps out one level, a top-level item
 * loses its marker. This works in what the editor shows, so it takes the on-screen texts, before and after the key.
 */
export function backspaceOutdent(previousShown: string, nextShown: string): { body: string; cursor: number } | null {
  if (nextShown.length !== previousShown.length - 1) return null;
  const at = insertionPoint(previousShown, nextShown);
  if (previousShown[at] !== ' ' || (previousShown[at + 1] !== undefined && previousShown[at + 1] !== '\n')) return null;
  const start = at === 0 ? 0 : previousShown.lastIndexOf('\n', at - 1) + 1;
  const line = previousShown.slice(start, at + 1);
  const match = /^([ \t]*)([-*+•◦▪]|\d{1,9}[.)]) $/.exec(line);
  if (!match) return null;
  const [, indent, marker] = match;
  const rest = previousShown.slice(at + 1);
  if (indent.length === 0) return { body: previousShown.slice(0, start) + rest, cursor: start };
  const step = /\d/.test(marker) ? 3 : 2;
  const outdented = indent.slice(0, Math.max(0, indent.length - step)) + marker + ' ';
  return { body: previousShown.slice(0, start) + outdented + rest, cursor: start + outdented.length };
}
