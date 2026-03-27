# Module Boundaries

## Structural Layer

- `src/language/ast.ts`
- `src/language/sourcePositions.ts`
- `src/language/parser.ts`
- `src/language/documentModel.ts`

Responsibilities:

- define source and block data structures
- convert raw `.kpa` text into deterministic document structures
- answer block-context lookups by offset

This layer must not depend on workspace scanning, filesystem state, or TypeScript language services.

## Language Analysis Layer

- `src/language/diagnosticCodes.ts`
- `src/language/diagnosticsRules.ts`
- `src/language/templateDiagnosticsRules.ts`
- `src/language/componentContract.ts`
- `src/language/symbols.ts`
- `src/language/localSymbolReferences.ts`
- `src/language/templateExpressions.ts`
- `src/language/templateLoopScopes.ts`
- `src/language/templateSemantics.ts`
- `src/language/workspaceRegistrations.ts`
- `src/language/templateComponents.ts`
- `src/language/projectConfig.ts`
- `src/language/workspaceSymbols.ts`
- `src/language/core.ts`

Responsibilities:

- collect diagnostics
- define stable diagnostic codes and structured diagnostic payloads
- extract runtime `return { state, methods, props }` contract bindings
- infer local and exported symbols
- derive loop-scope bindings from canonical `loop="..."` directives
- resolve template expressions and semantic mappings
- discover imported `.kpa` components and infer their API
- discover workspace `Core.take(...)` component registrations
- resolve project-config path aliases
- compose public language-level helpers

This layer may depend on TypeScript compiler APIs. It must remain reusable without the service facade.

## Workspace Layer

- `src/language/workspaceIndex.ts`
- `src/workspaceGraph.ts`

Responsibilities:

- discover `.kpa` files beneath workspace roots
- cache parsed file content
- derive workspace symbols and diagnostics
- track importer-to-component dependencies and invalidation impact

This layer owns synchronous filesystem reads and cache invalidation behavior.

## Service Layer

- `src/service.ts`

Responsibilities:

- manage open document overlays
- coordinate diagnostics, completions, hover, definitions, references, rename, code actions, document symbols, and workspace symbols
- bridge file-backed workspace data with overlay-backed document state

This layer is the highest-level runtime facade in the repository. It must not absorb unrelated editor transport concerns.

## Published Package Boundary

- `package.json` exposes only the root module entry point.
- [`src/index.ts`](/Users/thesortex/git-repos/koppajs/koppajs-language-core/src/index.ts) is therefore the only published package boundary and must remain explicit.
- Internal support files can be used inside the repository, but they are not public unless the root module re-exports them intentionally.

## Static Data And Helpers

- `src/data/*`
- `src/utils/*`

Responsibilities:

- static HTML and block metadata
- small context helpers shared across analysis modules

These files should stay simple and dependency-light.
