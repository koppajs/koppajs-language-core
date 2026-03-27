# Architecture

## Classification

- Repository type: core package
- Primary responsibility: runtime language analysis for KoppaJS `.kpa` files
- Build-time responsibility: TypeScript compilation only
- UI: none
- Maturity: pre-1.0 but behaviorally stable enough to maintain an explicit contract

## System Overview

The repository is organized around a layered language stack:

1. Structural primitives in `src/language/ast.ts`, `src/language/sourcePositions.ts`, `src/language/parser.ts`, and `src/language/documentModel.ts`
2. Diagnostic and semantic analysis in `src/language/diagnosticCodes.ts`, `src/language/diagnosticsRules.ts`, `src/language/templateDiagnosticsRules.ts`, `src/language/componentContract.ts`, `src/language/templateExpressions.ts`, `src/language/templateLoopScopes.ts`, `src/language/templateSemantics.ts`, `src/language/workspaceRegistrations.ts`, and `src/language/templateComponents.ts`
3. Workspace-aware indexing in `src/language/workspaceIndex.ts`, `src/language/projectConfig.ts`, and `src/workspaceGraph.ts`
4. Public service facade in `src/service.ts`
5. Published package contract in `src/index.ts`

Static data used by the service lives in `src/data/`. Small context helpers live in `src/utils/`.

## Published Boundary

- The npm package publishes one entry point only: `package.json` `exports["."]`.
- That root module intentionally re-exports explicit runtime helpers for parsing, diagnostics, template analysis, symbols and references, workspace indexing, project-config resolution, and the service facade.
- Internal repository-only files may exist, but they are not public package entry points unless they are re-exported from [`src/index.ts`](/Users/thesortex/git-repos/koppajs/koppajs-language-core/src/index.ts).

## Boundary Rules

- Parsing builds a `KpaDocument` and does not try to fully parse embedded HTML, CSS, or TypeScript.
- Diagnostics compose explicit passes rather than one opaque engine, with diagnostic codes kept separate from message production.
- Template semantic analysis uses TypeScript virtual files, runtime component-contract extraction, and loop-scope helpers while remaining isolated from editor-specific concerns.
- Workspace component registration discovery is part of language analysis, not the service layer.
- Workspace indexing owns file discovery and cache invalidation.
- `KpaLanguageService` owns orchestration for open documents and workspace-backed features. Lower-level modules should stay reusable without the service facade.
- The public package contract is the root export only. Internal files may exist for repository use without being part of the published surface.

## Runtime Characteristics

- Node.js runtime
- synchronous filesystem reads for deterministic workspace scans
- TypeScript compiler APIs for script and template semantic analysis
- no watcher, daemon, or persistent cache layer in this package

## Repository References

- Module boundary details: [`docs/architecture/module-boundaries.md`](/Users/thesortex/git-repos/koppajs/koppajs-language-core/docs/architecture/module-boundaries.md)
- Architecture index: [`docs/architecture/README.md`](/Users/thesortex/git-repos/koppajs/koppajs-language-core/docs/architecture/README.md)
- Foundational ADR: [`docs/adr/0001-editor-agnostic-language-core.md`](/Users/thesortex/git-repos/koppajs/koppajs-language-core/docs/adr/0001-editor-agnostic-language-core.md)
