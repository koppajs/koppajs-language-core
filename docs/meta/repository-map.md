# Repository Map

## Purpose

This document describes the current top-level responsibilities in this
repository. Update it when boundaries move.

## Top-Level Structure

### `src/`

Runtime source for `@koppajs/koppajs-language-core`.

- `src/index.ts`
  - published root entry point
- `src/service.ts`
  - editor-agnostic language-service facade
- `src/language/`
  - parsing, diagnostics, semantic analysis, component analysis, and workspace
    helpers
- `src/data/`
  - static language data such as tags and attributes
- `src/utils/`
  - focused shared helpers
- `src/test/`
  - Vitest coverage for public behavior and lower-level language modules

### `docs/`

Repository memory and behavioral contracts.

- `docs/specs/`
  - behavior-level specifications
- `docs/architecture/`
  - module-boundary details
- `docs/adr/`
  - long-lived architecture decisions
- `docs/meta/`
  - repository map and maintenance guidance
- `docs/quality/`
  - quality gates and tooling baseline

### `.github/`

Hosted automation and AI guidance.

- `.github/workflows/`
  - CI and release workflows plus workflow documentation
- `.github/instructions/`
  - repository-specific AI collaboration guidance

### `.husky/`

Local commit-time checks.

- `pre-commit`
  - runs documentation, meta-layer, formatting, and lint guards

### `scripts/`

Lightweight repository-local validation scripts.

- `check-doc-contract.mjs`
  - governed root document contract validation
- `check-doc-semantics.mjs`
  - semantic documentation consistency checks against package and workflow facts
- `check-meta-layer.mjs`
  - meta-layer and workflow-file presence validation

## Boundary Rules

- Runtime code in `src/` must not depend on docs, scripts, or hosted workflow
  files.
- Scripts validate repository contracts; they do not define runtime semantics.
- Documentation must describe implemented behavior and actual workflow
  expectations, not speculative future tooling.
