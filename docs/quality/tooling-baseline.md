# Tooling Baseline

## Purpose

This document records the active local tooling baseline and the intentional
choices behind it.

## Active Tooling

- npm for dependency installation and script execution
- TypeScript for type checking and build output
- Vitest for automated tests
- ESLint for static analysis of TypeScript and repository scripts
- Prettier for formatting
- Husky for lightweight local guards
- Node-based repository scripts for documentation and meta-layer validation

## Engine Enforcement

- `package.json` requires Node.js `>=22` and npm `>=10`
- `.npmrc` enforces `engine-strict=true`
- `.github/workflows/ci.yml` validates on Node.js 22 and 24
- `.github/workflows/release.yml` uses Node.js 22 for release validation and
  publish

## Repository Gates

- `npm run check:docs`: structural and semantic documentation validation
- `npm run check:meta`: repository-shape and workflow-file validation
- `npm run format:check`: verify formatting without rewriting files
- `npm run lint`: run ESLint as a failing quality gate
- `npm run check`: local quality gate for docs, meta, formatting, linting, type
  checks, and tests
- `npm run validate`: CI/release gate for the same checks plus build output

## Deliberate Omissions

- No browser or UI tooling belongs here because this package remains
  editor-agnostic and has no repository-local UI surface.

## Maintenance Rule

Add new tooling only when it solves an active repository problem that the
current gates do not already cover. When tooling does change, update this file,
`TESTING_STRATEGY.md`, and the workflow docs in the same change.
