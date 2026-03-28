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
