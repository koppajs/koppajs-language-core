# Validation Baseline

## Enforced Checks

- `npm run check:docs`
- `npm run check:meta`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run validate`

## Automation

- GitHub Actions CI runs `npm run validate` on pull requests and on pushes to `main` and `develop`.
- GitHub Actions release automation runs on `vX.Y.Z` tags, validates the package, verifies the publishable payload with `npm run release:check`, requires the tagged commit to be on `main`, verifies the tag version against `package.json`, creates a GitHub Release, and then publishes to npm.
- The published package remains root-entry-only through `package.json` `exports["."]`.

## Current Tooling Position

- TypeScript strict mode is enforced.
- Vitest is the only automated test runner.
- The tracked `.npmrc` enforces compatible Node.js and npm versions during install.
- A dedicated lint tool is not currently enforced.
- A dedicated formatter is not currently enforced.
- The package declares support for Node.js `>=22`; CI currently validates on Node.js 22 and 24.

## Rationale

The current repository is small enough that TypeScript strictness, unit tests, and build verification provide a meaningful baseline without adding redundant tooling.

If linting or formatting problems become persistent, add tooling only with a clear rule set and a repository-specific reason.
