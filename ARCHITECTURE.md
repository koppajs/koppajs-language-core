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
2. Diagnostic and semantic analysis in `src/language/diagnosticsRules.ts`, `src/language/templateDiagnosticsRules.ts`, `src/language/templateExpressions.ts`, `src/language/templateSemantics.ts`, and `src/language/templateComponents.ts`
3. Workspace-aware indexing in `src/language/workspaceIndex.ts`, `src/language/projectConfig.ts`, and `src/workspaceGraph.ts`
4. Public service facade in `src/service.ts`
5. Published package contract in `src/index.ts`

Static data used by the service lives in `src/data/`. Small context helpers live in `src/utils/`.

## Boundary Rules

- Parsing builds a `KpaDocument` and does not try to fully parse embedded HTML, CSS, or TypeScript.
- Diagnostics compose explicit passes rather than one opaque engine.
- Template semantic analysis uses TypeScript virtual files and must remain isolated from editor-specific concerns.
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
