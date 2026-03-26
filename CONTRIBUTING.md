# Contributing

## Workflow

1. Read the relevant source, tests, and specs before changing behavior.
2. Confirm whether the change affects the published root-module contract or only internal behavior.
3. Make the smallest change that solves the real problem.
4. Update specs and documentation in the same change when behavior or boundaries move.
5. Run `npm run validate`.

## Pull Request Expectations

- Explain the user-visible or contract-visible change.
- Call out any public API additions or removals explicitly.
- Note any intentional documentation or spec updates.
- Do not bundle speculative refactors with behavior changes.

## Repository-Specific Rules

- Keep this package editor-agnostic.
- Prefer extending existing modules in `src/language/` over creating one-off abstractions.
- Keep workspace behavior deterministic and easy to reason about.
- Do not add new tooling without showing why the current baseline is insufficient.

## Review Checklist

- Code, specs, architecture notes, and README agree
- public API changes are explicit
- tests cover the new or corrected behavior
- `npm run validate` passes
