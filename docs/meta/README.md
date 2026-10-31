# Meta Layer

This directory explains where repository intent lives beyond the root
governance files and when it must be updated.

## Canonical Documents

- Root governance: `AI_CONSTITUTION.md`, `ARCHITECTURE.md`,
  `DEVELOPMENT_RULES.md`, `TESTING_STRATEGY.md`, `DECISION_HIERARCHY.md`,
  `CONTRIBUTING.md`, `RELEASE.md`, `ROADMAP.md`
- Repository map: [repository-map.md](./repository-map.md)
- Detailed architecture boundaries: `docs/architecture/`
- Specifications: `docs/specs/`
- Quality process: `docs/quality/`
- Hosted workflow guidance: `.github/workflows/README.md`
- AI execution guidance: `.github/instructions/`

## Update Matrix

| Change type                                                     | Required meta-layer updates                                                                  |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Public behavior or package contract change                      | Update the relevant spec, tests, and any affected root docs                                  |
| Module boundary or repository-shape change                      | Update `ARCHITECTURE.md`, `docs/architecture/`, and [repository-map.md](./repository-map.md) |
| New quality gate, formatter, linter, or release validation rule | Update `TESTING_STRATEGY.md`, `docs/quality/`, and `.github/workflows/README.md`             |
| New contributor or AI workflow expectation                      | Update `CONTRIBUTING.md`, `AI_CONSTITUTION.md`, or `.github/instructions/`                   |

## Dependency Baseline

The dependency baseline uses ESLint 10, typescript-eslint 8.72, Vite 8, Vitest 5, and TypeScript 6. Node.js support is `^22.13.0 || ^24.0.0 || >=26.0.0`, matching the intersection of the tool engines. Node.js types remain on the latest 22.x release to prevent accidental use of APIs unavailable on the oldest supported runtime. TypeScript 7 is intentionally excluded: its root export no longer provides the stable compiler and language-service APIs this package uses, and typescript-eslint currently supports TypeScript below 6.1. The test runner retains two workers without relaxing timeouts.

## Maintenance Rule

If a future maintainer would be surprised after reading only the root governance
files, this directory, and the relevant specs, the meta layer is incomplete and
must be updated in the same change.
