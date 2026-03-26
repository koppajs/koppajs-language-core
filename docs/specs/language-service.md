# Language Service

## Evolution

- `evolution_phase`: active-stabilization
- `completeness_level`: medium
- `known_gaps`: the service does not provide formatting, semantic tokens, or transport-layer abstractions
- `deferred_complexity`: more code actions, incremental semantic caching, and richer multi-file rename workflows
- `technical_debt_items`: some service methods delegate to lower-level modules that still expose mixed diagnostic-message conventions

## Description

Expose a single editor-agnostic runtime facade for open-document and workspace-backed language features.

## Inputs

- document URIs
- raw document text for open overlays
- absolute workspace root paths
- cursor offsets
- diagnostics selected for code-action generation

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
2. Fall back to filesystem-backed document reads when a URI is not open.
3. Delegate structural, template, and component diagnostics to lower-level modules.
4. Provide:
   - template expression completions
   - component and HTML tag completions
   - component and HTML attribute completions
   - hover, definitions, references, and rename for template symbols and imported components
   - quick fixes for missing component props and unresolved component tags
5. Use the workspace graph for cross-file component references and symbol discovery.

## Constraints

- URIs are expected to be file URIs when filesystem-backed behavior is required.
- Offsets are absolute character offsets into the document text.
- The service remains transport-agnostic and does not emit LSP objects directly.

## Edge Cases

- Closing an overlay-backed document removes the in-memory text and falls back to the filesystem only if the file exists.
- Component definitions resolve to file URIs when the imported component can be resolved on disk.
- Ambiguous local rename targets can raise an error instead of guessing.

## Acceptance Criteria

- Open documents can return diagnostics without writing files to disk.
- Template expression completions surface template-visible local symbols.
- Imported component definitions and references can be resolved across workspace files.
- Code actions are produced only when the corresponding structured diagnostic data exists.
