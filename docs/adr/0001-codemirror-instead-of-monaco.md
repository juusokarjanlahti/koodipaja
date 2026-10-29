# ADR 0001: CodeMirror 6 instead of Monaco

- Status: accepted
- Date: 2026-10-30

## Context

The architecture plan named Monaco as the code editor. When implementing the
submission flow we compared it with CodeMirror 6 for this product's needs.

| Criterion | Monaco | CodeMirror 6 |
|---|---|---|
| Mobile and touch | Officially unsupported | Supported |
| Bundle size | Several MB | ~150-300 kB for our use |
| Loading | `@monaco-editor/react` loads from a CDN by default; self-hosting needs extra bundler work | Bundled with the app |
| Accessibility | Good | Good, designed for screen readers |
| IDE features (IntelliSense) | Strong | Basic |

## Decision

Use CodeMirror 6 via `@uiw/react-codemirror` with language packages per exercise language.

## Consequences

- Students can work on phones and tablets, which matters for self-paced AMK courses.
- No third-party CDN at runtime, which keeps the GDPR story simple.
- We give up IDE-grade autocompletion. Beginner exercises do not need it, and it can
  arguably hurt learning at that level.
- Revisit if we add advanced courses where IDE features matter.
