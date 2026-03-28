# Tooling Baseline

## Purpose

This document records the active local tooling baseline and the intentional
choices behind it.

## Active Tooling

- npm for dependency installation and script execution
- TypeScript for type checking and build output
- Vitest for automated tests
- Husky for lightweight local guards
- Node-based repository scripts for documentation and meta-layer validation

## Engine Enforcement

- `package.json` requires Node.js `>=22` and npm `>=10`
- `.npmrc` enforces `engine-strict=true`
- `.github/workflows/ci.yml` validates on Node.js 22 and 24
- `.github/workflows/release.yml` uses Node.js 22 for release validation and
  publish

## Deliberate Omissions

- No ESLint gate is enforced today because the repository does not currently
  have a recurring code-quality problem that the existing tests and TypeScript
  checks fail to catch.
- No Prettier gate is enforced today for the same reason.
- No browser or UI tooling belongs here because this package remains
  editor-agnostic and has no repository-local UI surface.

## Maintenance Rule

Add new tooling only when it solves an active repository problem that the
current gates do not already cover. When tooling does change, update this file,
`TESTING_STRATEGY.md`, and the workflow docs in the same change.
