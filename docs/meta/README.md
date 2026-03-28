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

| Change type | Required meta-layer updates |
| ----------- | --------------------------- |
| Public behavior or package contract change | Update the relevant spec, tests, and any affected root docs |
| Module boundary or repository-shape change | Update `ARCHITECTURE.md`, `docs/architecture/`, and [repository-map.md](./repository-map.md) |
| New quality gate or release validation rule | Update `TESTING_STRATEGY.md`, `docs/quality/`, and `.github/workflows/README.md` |
| New contributor or AI workflow expectation | Update `CONTRIBUTING.md`, `AI_CONSTITUTION.md`, or `.github/instructions/` |

## Maintenance Rule

If a future maintainer would be surprised after reading only the root governance
files, this directory, and the relevant specs, the meta layer is incomplete and
must be updated in the same change.
