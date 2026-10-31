# Change Log

All notable changes to **@koppajs/koppajs-language-core** are documented in this file.

This project uses a **manual, tag-driven release process**.
Only tagged versions represent official releases.

This changelog documents **intentional milestones and guarantees**,
not every internal refactor.

---

## [Unreleased]

Changes will only appear here when they:

- affect repository behavior or public guidance,
- change contributor workflow or governance,
- or alter the documented package or repository contract.

---

## [0.2.1]

- Report missing required default slots for empty or whitespace-only paired component tags, without treating the opening character of the closing tag as slot content.
- Scope component-prop assignability checks to the generated value and target assignment so unrelated script/import diagnostics do not reject valid expressions; retain real type-mismatch diagnostics and fallback for unresolved types.

---

## [0.2.0]

- **Breaking:** require Node.js `^22.13.0 || ^24.0.0 || >=26.0.0` for the updated toolchain. Node.js 22.0–22.12, 23, and 25 are no longer supported.
- Update the dependency baseline to TypeScript 6.0.3, ESLint 10.14.0, typescript-eslint 8.72.1, Vite 8.3.5, and Vitest 5.0.5.
- Retain the latest Node.js 22 types and the existing root-only package API. TypeScript 7 remains excluded because the required compiler and language-service APIs are not available through its root export.
- Load the Vitest configuration explicitly as ESM while retaining the two-worker limit and existing test timeouts.
- Verify the canonical explicit-return component contract with published Core 3.0.11, Vite plugin 2.0.0, and Router 0.1.8, including reactive rendering and route navigation.

---

## [0.1.4]

- Raise the declared and documented Node.js minimum to `>=22` and expand CI validation to Node.js 22 and 24.
- Add engine-strict/npm engine enforcement, a lightweight meta-layer guard, and explicit release payload verification.
- Document the repository meta layer and centralize the cross-repo Core/Vite-plugin contract used by language analysis.
- Add ESLint, Prettier, and semantic documentation consistency checks to the repository quality gates.

---

## [0.1.3]

- Add a governed repository documentation contract, local `check:docs`
  validation, and a matching pre-commit hook for the required root documents.
- Expand the repository guidance and contributor-facing root documents with the
  shared KoppaJS structure, branding, and local governance references.

---

## [0.1.2]

- Remove the temporary cleanup workflow and the remaining legacy references so
  the repository only refers to `@koppajs/koppajs-language-core`.

## [0.1.1]

- Correct the published npm package identity to `@koppajs/koppajs-language-core`.

## [0.1.0]

- Establish the initial published package boundary for deterministic `.kpa`
  parsing, diagnostics, template semantics, workspace indexing, and the shared
  language-service facade.
- Align the package with canonical KoppaJS template semantics, runtime
  component-contract analysis, workspace `Core.take(...)` discovery, and the
  manual tag-driven release model used across KoppaJS repositories.
