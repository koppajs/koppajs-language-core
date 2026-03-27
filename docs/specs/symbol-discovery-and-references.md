# Symbol Discovery And References

## Evolution

- `evolution_phase`: stabilized-foundation
- `completeness_level`: medium-high
- `known_gaps`: generic symbol collection stays local to a document or workspace file, while template-facing bindings are limited to the canonical component return contract and do not yet provide safe rename coverage
- `deferred_complexity`: richer export analysis, namespace semantics, and broader cross-file symbol models
- `technical_debt_items`: local reference collection mixes lightweight AST walks with TypeScript semantic checks

## Description

Collect top-level script symbols from `.kpa` documents for generic file/workspace queries, derive template-facing bindings from the canonical component `return { state, methods, props }` contract, and map local references in script, canonical `{{ ... }}` template contexts, and canonical dynamic binding expressions.

## Inputs

- `KpaDocument`
- raw `.kpa` text plus file paths for workspace symbol collection
- cursor offsets used to resolve a symbol occurrence

## Outputs

- local symbol tables grouped into `all`, `exported`, and `templateVisible`
- symbol occurrences and reference ranges for rename/reference workflows
- workspace symbol entries for component files and exported script symbols

## Behavior

1. Parse `[ts]` and `[js]` blocks with TypeScript ASTs and collect top-level imports, variables, functions, classes, enums, interfaces, and type aliases.
2. Preserve symbol origin metadata including block kind, block name, export status, and exact source range.
3. Derive template-visible bindings from the canonical component runtime contract instead of arbitrary top-level helpers, with method bindings taking precedence over state and prop names.
4. Resolve a local symbol occurrence either from a script identifier under the cursor or from a canonical template identifier reference.
5. Collect local reference ranges by combining same-file script references with canonical template references for component return-contract bindings.
6. Expose workspace symbols as the component file name plus exported script symbols from the same `.kpa` file.

## Constraints

- Only top-level script declarations are collected for generic symbol tables; template-facing bindings come from the canonical return contract.
- Template reference collection considers canonical `{{ ... }}` template expressions and canonical dynamic binding expressions such as `:hidden="stateFlag"`.
- Workspace symbol collection derives component names from the file name rather than from script exports.

## Edge Cases

- Destructured variable declarations contribute one symbol per bound identifier.
- `export { local }` and `export default local` can mark previously collected local symbols as exported.
- When the cursor is on a template identifier name with no matching template-visible local symbol, the occurrence still resolves with an empty symbol list.
- Dynamic binding expressions on standard HTML attributes and component props resolve through the same template-visible symbol set.
- Top-level script helpers that are not surfaced through `state`, `methods`, or `props` are intentionally excluded from template symbol resolution.

## Acceptance Criteria

- Collected local symbols preserve kind, export status, and template visibility.
- Reference collection includes canonical template usages for the same component return-contract binding, including dynamic binding expressions.
- Workspace symbol collection returns the component file name and exported script symbols from `.kpa` text.
