# @koppajs/language-core

Shared KoppaJS language primitives, semantic service, and workspace graph.

## Scope

This package owns the editor-agnostic language layer for `.kpa` files:

- parser and document model
- diagnostics rules
- template and component semantics
- workspace graph and symbol extraction
- reusable language service consumed by the language server and CLI

It intentionally does not depend on VS Code APIs.

## Scripts

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run validate`
Shared KoppaJS language primitives, semantic service, and workspace graph.
