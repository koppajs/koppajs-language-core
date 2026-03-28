# Quality Guide

This directory captures the repository's practical quality gates and the lean
tooling choices that support them.

## Documents In This Area

- [validation-baseline.md](./validation-baseline.md): enforced checks, hosted
  automation, and current repository baseline
- [tooling-baseline.md](./tooling-baseline.md): active local tooling, engine
  enforcement, and deliberate omissions

## Verification Matrix

- Documentation contract: `npm run check:docs`
- Meta-layer integrity: `npm run check:meta`
- Type safety: `npm run typecheck`
- Test suite: `npm run test`
- Build output: `npm run build`
- Main local gate: `npm run validate`
- Release payload check: `npm run release:check`
- Hosted workflow overview: [../../.github/workflows/README.md](../../.github/workflows/README.md)

## Maintenance Rule

Update this directory whenever quality gates, engine enforcement, release
validation, or workflow expectations change.
