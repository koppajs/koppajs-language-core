# Testing Strategy

## Current Baseline

The repository enforces:

- repository contract checks with `npm run check:docs` and `npm run check:meta`
- formatting checks with Prettier
- static analysis with ESLint
- type checking with `tsc --noEmit`
- unit tests with Vitest
- production build compilation with `tsc -p tsconfig.build.json`

The convenience entry point is `npm run validate`.

## Test Scope

Unit tests should cover:

- parsing and source-position behavior
- block and template diagnostics
- template expression semantics backed by TypeScript
- component import and API inference behavior
- workspace indexing and dependency invalidation
- public service-facade behavior
- published package boundary behavior, including the root entry point and package manifest surface
- root public export stability when contract changes are intentional

## Test Design Rules

- Prefer focused unit tests over broad integration fixtures.
- Use temporary directories for filesystem-backed workspace behavior.
- Assert exact behavior when the contract is explicit, including diagnostic messages when message text is part of the current contract.
- Avoid fake coverage. Do not add tests that only restate implementation without protecting a real behavior.

## Explicit Non-Goals

- No Playwright coverage because the repository has no UI.
- No snapshot-heavy golden suite unless the public API surface grows enough to justify it.
- No lint-only tests because linting and formatting are enforced as direct repository gates rather than as executable behavior tests.

## Gaps To Watch

- `KpaLanguageService` needs direct contract tests whenever new public methods are added.
- code-action variants, multi-file rename edge cases, and workspace invalidation flows still deserve more direct contract coverage than the lower-level modules they orchestrate
- Root export changes should be accompanied by public-surface assertions or equivalent explicit review.

## Release And CI Gates

- GitHub Actions CI runs `npm run validate` on Node.js 22 and 24.
- The release workflow reruns `npm run validate` and `npm run release:check` on Node.js 22 before publish.
- The tracked `.npmrc` keeps Node.js and npm engine mismatches from silently slipping into local or hosted installs.
- `npm run check:docs` combines structural and semantic documentation validation so repo docs stay aligned with package and workflow reality.
