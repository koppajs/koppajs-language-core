# Template Semantics

## Evolution

- `evolution_phase`: active-stabilization
- `completeness_level`: medium
- `known_gaps`: semantic analysis is built from a synthetic virtual file, operates one canonical template expression at a time, and does not yet provide safe rename workflows for component return-contract bindings or loop-local bindings across multiple expressions
- `deferred_complexity`: incremental semantic caching, richer diagnostics reuse, and broader TypeScript module-resolution parity
- `technical_debt_items`: virtual-to-source range mapping is custom and must stay aligned with the generated virtual source layout

## Description

Use TypeScript language-service APIs to provide semantic completions, hover, definitions, references, and rename data for canonical `{{ ... }}` template expressions and canonical dynamic binding expressions such as `:hidden="menuVisible"`.

## Inputs

- `KpaDocument`
- optional source paths used to name the virtual file and enable workspace-aware TypeScript resolution
- cursor offsets inside canonical template expressions

## Outputs

- deterministic virtual file names
- semantic completions
- semantic hover payloads
- definitions and references
- rename placeholders and rename ranges

## Behavior

1. Identify the canonical template expression at the cursor offset and return `undefined` when the cursor is outside that scope.
2. Build a synthetic `.template.ts` virtual file that combines the canonical runtime script block with synthetic bindings for template-visible `return { state, methods, props }` entries and the current expression under analysis.
3. Use TypeScript language-service queries to obtain completions, hover data, definitions, references, and rename metadata.
4. Filter root-level completions to template-visible component return-contract names and active loop-scope bindings while allowing member completions from TypeScript type information.
5. Map text spans from the virtual file back to `.kpa` ranges and preserve non-`.kpa` file references when TypeScript resolves external files.

## Constraints

- The feature requires TypeScript compiler APIs at runtime.
- Canonical semantic expression lookup is driven by `{{ ... }}` delimiters and dynamic binding attribute values introduced by `:` or `bind:`.
- Template root scope is sourced from the canonical component runtime contract, not from arbitrary top-level script declarations.
- Active loop scopes introduced by `loop="item in items"` contribute synthetic bindings for the declared item names and runtime helpers such as `index`, `key`, `isFirst`, `isLast`, `isEven`, and `isOdd`.
- Rename info does not allow import-path renames and intentionally withholds rename support for component return-contract bindings.
- Virtual-file-backed results only exist when range mapping back to source is possible.

## Edge Cases

- When no source path is available, the virtual file name falls back to a deterministic path under `process.cwd()/__kpa_virtual__/untitled.kpa.template.ts`.
- Workspace-aware references and definitions can point into imported `.ts` files as well as the current virtual template file.
- Root-level completions intentionally exclude ambient globals such as `Array` and non-return top-level helpers when they are not template-visible runtime names.
- Dynamic binding expressions on native elements and component tags share the same semantic pipeline as `{{ ... }}` expressions.
- Loop-local bindings participate in completions and hover within the active loop scope but do not currently expose stable cross-expression rename/reference mappings.
- Component state and method definitions resolve back to their property names inside the canonical runtime `return` object.

## Acceptance Criteria

- Member completions surface typed properties from component runtime bindings in both `{{ ... }}` and `:prop="..."` expression sites.
- Root completions inside active loop bodies surface the loop item binding and implicit helper names.
- Hover information includes TypeScript-derived display text for the referenced symbol.
- Definitions and references can resolve back to runtime `state` and `methods` entries in the current `.kpa` file.
