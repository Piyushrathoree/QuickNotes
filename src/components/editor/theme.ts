import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";

/**
 * Base theme for CodeMirror's own elements. Colours come from the app's tokens, so light and dark follow the same
 * values the rest of the app uses. The caret is the accent colour. Selection uses the ::selection token in globals.
 */
export const editorBaseTheme = EditorView.theme({
  "&": {
    backgroundColor: "transparent",
    color: "var(--text)",
    fontFamily: "var(--write-font)",
    fontSize: "1rem",
    lineHeight: "1.75rem",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    fontFamily: "inherit",
    lineHeight: "1.75rem",
    overflow: "visible",
  },
  ".cm-content": {
    padding: "0",
    fontFamily: "inherit",
    caretColor: "var(--accent)",
    minHeight: "0",
  },
  ".cm-line": {
    padding: "0",
    lineHeight: "1.75rem",
  },
  ".cm-placeholder": {
    color: "var(--muted-foreground)",
    fontFamily: "inherit",
  },
});

/** Colours for code-block tokens. Neutral tokens only, so nothing orange or clay appears. */
export const codeHighlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: [t.keyword, t.modifier, t.operatorKeyword], color: "var(--accent)" },
    { tag: [t.propertyName], color: "var(--accent)" },
    { tag: [t.string, t.special(t.string)], color: "var(--success)" },
    { tag: [t.number, t.bool, t.null, t.atom], color: "var(--accent-hover)" },
    { tag: [t.comment, t.lineComment, t.blockComment], color: "var(--text-muted)", fontStyle: "italic" },
    { tag: [t.typeName, t.className, t.namespace], color: "var(--text-secondary)", fontWeight: "600" },
    { tag: [t.function(t.variableName), t.definition(t.variableName)], color: "var(--text)" },
    { tag: [t.operator, t.punctuation, t.bracket, t.meta], color: "var(--text-secondary)" },
    { tag: t.invalid, color: "var(--danger)" },
  ]),
);
