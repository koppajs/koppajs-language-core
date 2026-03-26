# Diagnostics Pipeline

## Evolution

- `evolution_phase`: stabilized-foundation
- `completeness_level`: medium-high
- `known_gaps`: diagnostics currently rely on message text and optional codes rather than a richer normalized schema
- `deferred_complexity`: localization policy, severity stratification, and incremental diagnostics
- `technical_debt_items`: some diagnostics remain plain messages while component diagnostics also expose structured `code` and `data`

## Description

Produce structural and semantic diagnostics for `.kpa` documents by composing explicit diagnostic passes.

## Inputs

- raw `.kpa` text or a pre-parsed `KpaDocument`
- optional `knownBlocks` override for structural validation
- optional `sourcePath` for component import resolution and TypeScript-backed analysis

## Outputs

- `KpaBlockDiagnostic[]`
- optional diagnostic `code` values for component-oriented issues
- optional diagnostic `data` payloads for code actions

## Behavior

1. Structural diagnostics validate canonical block ordering and closure.
2. Template diagnostics flag unresolved local template identifiers while allowing a fixed set of known globals.
3. Component diagnostics validate imported `.kpa` component usage, including:
   - unresolved component imports
   - unresolved component tags
   - missing required props
   - unknown props
   - simple prop type mismatches
   - missing slots
   - unknown emits
4. `collectKpaDiagnosticsFromText` parses once and returns both the `document` and collected diagnostics.

## Constraints

- Structural diagnostics only consider known block names.
- Compatibility aliases such as `[html]` are intentionally ignored by structural runtime diagnostics today.
- Some diagnostic messages are currently emitted in German because that is the implemented contract.

## Edge Cases

- Unknown open blocks do not satisfy canonical closing-tag expectations.
- Nested identifier scopes inside template expressions avoid false-positive unresolved-symbol diagnostics.
- Component diagnostics depend on `sourcePath` when imports need filesystem resolution.

## Acceptance Criteria

- Well-formed documents can produce zero diagnostics.
- Unmatched or mismatched canonical closing tags produce deterministic structural errors.
- Missing local template symbols are reported with the correct source range.
- Missing component props include structured code-action metadata.
