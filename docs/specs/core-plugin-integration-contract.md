# Core And Plugin Integration Contract

## Scope

This spec defines the cross-repository assumptions that
`@koppajs/koppajs-language-core` makes about `@koppajs/koppajs-core` and
`@koppajs/koppajs-vite-plugin`.

## Description

The language core does not execute runtime bootstrap or Vite transforms.
Instead, it analyzes `.kpa` source files and workspace code by following the
stable conventions that downstream KoppaJS repositories expose.

## Inputs

- `.kpa` source files
- TypeScript or JavaScript workspace files that import `.kpa` components
- explicit `Core.take(componentSource, "tag-name")` registrations
- canonical component script contracts such as `return { state, methods, props
}`
- typed `Emits` and `Slots` declarations inside component source when present

## Outputs

- resolved component definitions for diagnostics, hover, definitions, and
  references
- inferred component props, emits, and slots for template analysis
- workspace-registered component tag discovery
- template-visible symbol sets sourced from the canonical component runtime
  contract

## Behavior

1. Treat explicit `Core.take(componentSource, "tag-name")` calls as the
   workspace-registration contract for custom-element tags.
2. Treat the canonical component `return { state, methods, props }` structure
   as the runtime symbol contract for template completions and symbol mapping.
3. Read typed `Emits` and `Slots` declarations directly from component source
   when present, without depending on emitted build artifacts.
4. Resolve `.kpa` component imports and registrations from source files rather
   than from Vite-transformed output modules.
5. Keep language analysis compatible with the component shape that
   `@koppajs/koppajs-vite-plugin` is expected to emit, but do not require the
   plugin to run during repository-local analysis.

## Constraints

- The recognized workspace-registration shape is intentionally narrow and does
  not include inferred aliases or dynamic registration helpers.
- The language core is coupled to stable KoppaJS conventions, not to transient
  implementation details inside downstream repositories.
- Changes in `Core.take(...)`, canonical component return contracts, or
  component source conventions require coordinated updates to this spec and any
  affected language-core specs or tests.
- This repository remains source-analysis-driven; it must not depend on Vite or
  browser runtime execution to answer language-service queries.

## Edge Cases

- A component can be available to templates either through a local `.kpa`
  import or through a workspace `Core.take(...)` registration.
- Typed `Emits` and `Slots` declarations may be present even when runtime
  `props` are incomplete, and vice versa.
- If downstream repositories expand their runtime or emitted contracts, this
  repository should ignore unsupported additions until they are intentionally
  adopted and documented here.

## Acceptance Criteria

- Workspace registrations discovered through `Core.take(...)` remain available
  to template component resolution.
- Template symbol analysis continues to derive root symbols from the canonical
  component runtime contract.
- Component API inference continues to use source-visible `props`, `Emits`, and
  `Slots` conventions without requiring transformed plugin output.
- Any intentional cross-repository contract change updates this spec alongside
  the affected language-core specs, tests, and root guidance.
