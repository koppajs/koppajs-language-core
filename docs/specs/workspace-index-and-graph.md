# Workspace Index And Graph

## Evolution

- `evolution_phase`: active-stabilization
- `completeness_level`: medium-high
- `known_gaps`: workspace scanning is synchronous and full-directory based rather than watcher-driven or incremental
- `deferred_complexity`: persistent caching and large-workspace optimization
- `technical_debt_items`: invalidation works at file granularity and reparses changed files on demand

## Description

Discover `.kpa` files within workspace roots, cache parsed file content, and track component import dependencies so diagnostics and references can be recalculated deterministically.

## Inputs

- workspace root paths
- optional overlay text keyed by absolute file path
- explicit file paths for invalidation or targeted collection

## Outputs

- discovered `.kpa` file paths
- workspace symbols
- file diagnostics
- component usage records by resolved component file
- affected file paths after invalidation

## Behavior

1. Recursively scan workspace roots for `.kpa` files while skipping known output and dependency directories.
2. Cache parsed file content by file path and file modification time.
3. Respect overlay text over on-disk file content when overlays are present.
4. Collect workspace symbols from component file names and exported script symbols.
5. Resolve best-fit component file candidates by name and path proximity.
6. Track importer-to-component dependencies and invalidate dependent `.kpa` files when a component or project config changes.
7. Clear or invalidate project-config cache entries when config-relevant files change.

## Constraints

- This layer is Node.js and filesystem dependent.
- Hidden editor state is not stored here beyond explicit overlays supplied by callers.
- Root discovery only considers `.kpa` files.

## Edge Cases

- Passing a file path instead of a directory still yields a usable search root.
- Changing `tsconfig.json`, `jsconfig.json`, or TypeScript source files invalidates dependent `.kpa` files because import resolution may change.
- Overlay-backed files are reparsed when overlay text changes even if the file does not exist on disk.

## Acceptance Criteria

- Workspace roots yield stable sorted `.kpa` file lists.
- Component lookups return matching file paths for component names.
- Diagnostics and component usages are discoverable across workspace roots.
- Invalidating a component file also invalidates importer files that depend on it.
