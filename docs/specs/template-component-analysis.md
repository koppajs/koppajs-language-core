# Template Component Analysis

## Evolution

- `evolution_phase`: active-stabilization
- `completeness_level`: medium
- `known_gaps`: API inference is convention-based and does not attempt full component compilation
- `deferred_complexity`: richer type compatibility and deeper slot semantics
- `technical_debt_items`: component API extraction relies on direct TypeScript AST inspection and filesystem reads

## Description

Resolve imported `.kpa` components, map them to canonical template tags, and infer component-facing APIs from the imported component source.

## Inputs

- `KpaDocument`
- optional `sourcePath`
- optional workspace files reachable through direct relative imports or project-config path aliases

## Outputs

- imported component descriptors with resolved file paths and tag aliases
- canonical component usage records with parsed attributes and insertion points
- inferred component API entries for `Props`, `Emits`, and `Slots`
- component diagnostics and rename targets

## Behavior

1. Inspect script blocks for `.kpa` component imports.
2. Resolve imports through relative paths, absolute paths, `baseUrl`, and `paths` aliases from the nearest `tsconfig.json` or `jsconfig.json`.
3. Expose both PascalCase and kebab-case tag names for imported components.
4. Infer component APIs from imported component script blocks using `Props`, `Emits`, and `Slots` declarations.
5. Match canonical template tags against imported components and collect parsed attributes for call sites.
6. Report unresolved imports, unresolved component tags, missing required props or slots, unknown props or emits, and simple prop type mismatches.
7. Normalize rename targets between tag names and symbol names.

## Constraints

- Only canonical template tags participate in component call-site analysis.
- API inference requires the imported component file to exist and be readable.
- Type validation is intentionally narrower than full TypeScript assignability.

## Edge Cases

- A component imported as `UserCard` is addressable as both `UserCard` and `user-card`.
- Broken `.kpa` imports can produce diagnostics even when the import statement itself exists.
- Self-closing and non-self-closing component tags are both supported in usage collection.

## Acceptance Criteria

- Imported `.kpa` components resolve to concrete file paths when the target exists.
- Component tag aliases resolve back to the same imported component.
- Props, emits, and slots are discoverable from imported component source.
- Required prop violations expose structured data usable by code actions.
