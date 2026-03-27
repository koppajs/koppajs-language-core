# Language Service

## Evolution

- `evolution_phase`: active-stabilization
- `completeness_level`: medium
- `known_gaps`: the service does not provide formatting, semantic tokens, or transport-layer abstractions
- `deferred_complexity`: more code actions, incremental semantic caching, and richer multi-file rename workflows
- `technical_debt_items`: code-action variants, invalidation-heavy workspace flows, and broader multi-file rename edge cases still have thinner direct contract coverage than the lower-level modules they orchestrate

## Description

Expose a single editor-agnostic runtime facade for open-document and workspace-backed language features.

## Inputs

- document URIs
- raw document text for open overlays
- absolute workspace root paths
- cursor offsets
- diagnostics selected for code-action generation
- new names for rename operations
- workspace-symbol search queries

## Outputs

- diagnostics
- completions
- hover content
- definitions and references
- rename info and text edits
- code actions
- document symbols
- workspace symbols
- affected open-document URIs after invalidation

## Behavior

1. Track overlay text for opened and updated documents by URI.
2. Track workspace roots and invalidate overlay-backed or file-backed state through the workspace graph.
3. Fall back to filesystem-backed document reads when a URI is not open.
4. Delegate structural, template, component, symbol, and semantic operations to lower-level modules.
5. Provide:
   - template expression completions inside canonical `{{ ... }}` expressions and canonical dynamic bindings such as `:hidden="..."`, sourced from the component `return { state, methods, props }` contract plus active loop bindings
   - component and HTML tag completions, including workspace-registered custom elements discovered through `Core.take(...)`
   - component and HTML attribute completions, including canonical dynamic component prop snippets such as `:prop="..."`
   - hover and definitions for template symbols and resolved components
   - references for template symbols and rename for explicitly imported components
   - quick fixes for missing component props and unresolved component tags
   - document symbols and workspace symbols
   - affected open-document URI discovery after invalidation
6. Use the workspace graph for cross-file component references, invalidation, and symbol discovery.

## Constraints

- URIs are expected to be file URIs when filesystem-backed behavior is required.
- Offsets are absolute character offsets into the document text.
- The service remains transport-agnostic and does not emit LSP objects directly.

## Edge Cases

- Closing an overlay-backed document removes the in-memory text and falls back to the filesystem only if the file exists.
- Component definitions resolve to file URIs when the imported or workspace-registered component can be resolved on disk.
- Ambiguous local rename targets can raise an error instead of guessing.
- Loop-local bindings participate in expression completions and diagnostics but are not yet exposed as first-class rename/reference targets.
- Component return-contract bindings participate in completions, hover, definitions, and references, but rename is intentionally withheld until script-side coverage is complete.

## Acceptance Criteria

- Open documents can return diagnostics without writing files to disk.
- Template expression completions surface template-visible runtime symbols from the canonical component return contract inside canonical `{{ ... }}` expressions and canonical dynamic bindings.
- Template expression completions inside active `loop="..."` regions surface loop item bindings and implicit helper names.
- Imported component definitions and references can be resolved across workspace files.
- Workspace-registered kebab-case components can surface definitions and prop completions without adding a local `.kpa` import to the current file.
- Code actions are produced only when the corresponding structured diagnostic data exists and use canonical binding syntax for inserted component props.
