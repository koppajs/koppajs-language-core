# Validation Baseline

## Enforced Checks

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run validate`

## Current Tooling Position

- TypeScript strict mode is enforced.
- Vitest is the only automated test runner.
- A dedicated lint tool is not currently enforced.
- A dedicated formatter is not currently enforced.

## Rationale

The current repository is small enough that TypeScript strictness, unit tests, and build verification provide a meaningful baseline without adding redundant tooling.

If linting or formatting problems become persistent, add tooling only with a clear rule set and a repository-specific reason.
