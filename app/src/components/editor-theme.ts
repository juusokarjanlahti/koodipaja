import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { EditorView } from "@uiw/react-codemirror";

/**
 * Editor colours from the app's CSS variables (globals.css), so the editor follows the
 * light/dark system setting like the rest of the page. Every syntax colour has at least
 * 6:1 contrast against the editor background in both modes (WCAG 1.4.3 needs 4.5:1).
 */
const base = EditorView.theme({
  "&": { backgroundColor: "var(--surface)", color: "var(--text)" },
  ".cm-content": { caretColor: "var(--text)" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--text)" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "var(--code-selection) !important",
  },
  ".cm-gutters": { backgroundColor: "var(--bg)", color: "var(--muted)", borderRight: "1px solid var(--border)" },
  ".cm-activeLine": { backgroundColor: "var(--code-active-line)" },
  ".cm-activeLineGutter": { backgroundColor: "var(--code-active-line)", color: "var(--text)" },
  "&.cm-focused .cm-matchingBracket": { backgroundColor: "var(--code-selection)", outline: "1px solid var(--muted)" },
  ".cm-foldPlaceholder": { backgroundColor: "var(--bg)", color: "var(--muted)", border: "1px solid var(--border)" },
});

const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.operatorKeyword, t.definitionKeyword, t.moduleKeyword, t.self, t.null, t.bool], color: "var(--code-keyword)" },
  { tag: [t.string, t.special(t.string), t.character, t.regexp], color: "var(--code-string)" },
  { tag: [t.number, t.integer, t.float], color: "var(--code-number)" },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: "var(--code-comment)", fontStyle: "italic" },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.className, t.typeName, t.standard(t.variableName)], color: "var(--code-function)" },
  { tag: [t.variableName, t.propertyName, t.operator, t.punctuation, t.bracket], color: "var(--text)" },
  { tag: t.invalid, color: "var(--fail)", textDecoration: "underline" },
]);

export const editorTheme = [base, syntaxHighlighting(highlight)];
