# Project Config Resolution

## Evolution

- `evolution_phase`: active-stabilization
- `completeness_level`: medium
- `known_gaps`: only `tsconfig.json` and `jsconfig.json` compiler options relevant to path resolution are read
- `deferred_complexity`: full TypeScript module-resolution parity and richer config inheritance behavior
- `technical_debt_items`: config discovery and cache invalidation are directory-based and intentionally simple

## Description

Resolve workspace import paths and discover the nearest project configuration used by `.kpa` component import analysis.

## Inputs

- import specifiers
- optional source file paths
- allowed extension lists such as `.kpa`
- filesystem paths whose config caches may need invalidation

## Outputs

- resolved file paths for import specifiers
- nearest project-config metadata and config paths
- deterministic cache invalidation behavior for config lookups

## Behavior

1. Resolve relative and absolute import paths directly before consulting project config.
2. Search upward from the source file directory for the nearest `tsconfig.json` or `jsconfig.json`.
3. Read `compilerOptions.baseUrl` and `compilerOptions.paths` and use them to resolve non-relative imports.
4. Fall back to `baseUrl`-relative resolution for non-relative imports when no explicit path alias matches.
5. Cache nearest-config lookups by directory and expose explicit cache clear and invalidate functions.

## Constraints

- Resolution returns `undefined` when no concrete file exists with one of the allowed extensions.
- The implementation reads only the project-config fields needed for path resolution.
- Source-path-free calls cannot resolve imports because upward config discovery depends on a concrete file location.

## Edge Cases

- Import specifiers without file extensions are resolved against both direct file candidates and `index` files.
- Invalid or unreadable project-config files are treated as absent.
- Invalidating a file path clears cached nearest-config entries from that file's directory up to the filesystem root.

## Acceptance Criteria

- Relative `.kpa` imports resolve when the target file exists.
- `paths` aliases from the nearest `tsconfig.json` or `jsconfig.json` resolve to concrete `.kpa` files.
- Consumers can clear or invalidate cached project-config lookups explicitly.
