# Template Component Analysis

## Evolution

- `evolution_phase`: active-stabilization
- `completeness_level`: medium
- `known_gaps`: API inference is convention-based and does not attempt full component compilation
- `deferred_complexity`: richer type compatibility and deeper slot semantics
- `technical_debt_items`: component API extraction relies on direct TypeScript AST inspection and filesystem reads

## Description

Resolve canonical template components from explicit `.kpa` imports and workspace `Core.take(...)` registrations, map them to canonical template tags, and infer component-facing APIs from the resolved component source.

## Inputs

- `KpaDocument`
- optional `sourcePath`
- optional workspace files reachable through direct relative imports, project-config path aliases, and `Core.take(...)` registrations

## Outputs

- imported component descriptors with resolved file paths and tag aliases
- resolved workspace-registered component descriptors for canonical kebab-case tags
- canonical component usage records with parsed attributes and insertion points
- inferred component API entries for runtime `props`, typed `Emits`, and `Slots`
- component diagnostics and rename targets

## Behavior

1. Inspect script blocks for `.kpa` component imports.
2. Resolve imports through relative paths, absolute paths, `baseUrl`, and `paths` aliases from the nearest `tsconfig.json` or `jsconfig.json`.
3. Inspect workspace script files for `Core.take(componentSource, "tag-name")` registrations that point at imported `.kpa` files.
4. Expose both PascalCase and kebab-case tag names for imported components, while keeping workspace registrations bound to their explicit custom-element tag names.
5. Infer component APIs from resolved component source using runtime `return { props: ... }` contracts, typed `Emits`/`Slots` declarations when present, and `<slot>` elements in the canonical template block.
6. Match canonical template tags against imported or workspace-registered components and collect parsed attributes for call sites, including static attributes and dynamic bindings such as `:prop="expression"` and `onEvent="handler"`.
7. Report unresolved imports, unresolved component tags, missing required props or slots, unknown props or emits, and simple prop type mismatches.
8. Normalize rename targets between tag names and symbol names.

## Constraints

- Only canonical template tags participate in component call-site analysis.
- Dynamic prop bindings are analyzed through canonical binding syntax such as `:title="value"`, while typed emitted component events are identified through explicit `on<Event>` handlers such as `onClose="handleClose"` when a component exposes an `Emits` declaration.
- Workspace registration discovery is convention-based and only recognizes explicit property calls such as `Core.take(...)` with a string-literal tag name and an imported `.kpa` component binding.
- Cross-repository assumptions about `Core.take(...)`, component runtime contracts, and `.kpa` component shape are governed by `core-plugin-integration-contract.md`.
- API inference requires the resolved component file to exist and be readable.
- Runtime prop discovery is sourced from the canonical component `return` object, while slot discovery is sourced from explicit `Slots` declarations and concrete `<slot>` tags.
- Required-slot semantics still come only from typed declarations.
- Type validation is intentionally narrower than full TypeScript assignability.

## Edge Cases

- A component imported as `UserCard` is addressable as both `UserCard` and `user-card`.
- A component registered as `Core.take(counterComponent, "counter-component")` is addressable from templates as `<counter-component>`.
- Broken `.kpa` imports can produce diagnostics even when the import statement itself exists.
- Self-closing and non-self-closing component tags are both supported in usage collection.

## Acceptance Criteria

- Imported `.kpa` components resolve to concrete file paths when the target exists.
- Component tag aliases resolve back to the same imported component.
- Workspace-registered kebab-case component tags suppress unresolved-tag diagnostics when the registration resolves to a `.kpa` file.
- Runtime props, typed emits, and slots are discoverable from resolved component source, with slot names inferred from typed declarations or concrete `<slot>` tags.
- Required prop violations expose structured data usable by code actions.
