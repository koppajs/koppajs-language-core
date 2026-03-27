# Contributing

## Workflow

1. Read the relevant source, tests, and specs before changing behavior.
2. Confirm whether the change affects the published root-module contract or only internal behavior.
3. Make the smallest change that solves the real problem.
4. Update specs and documentation in the same change when behavior or boundaries move.
5. Run `npm run validate`.

## Release Workflow

The canonical release process for this repository is documented in [`RELEASE.md`](/Users/thesortex/git-repos/koppajs/koppajs-language-core/RELEASE.md).

Release happens manually and is tag-driven:

1. Prepare the release on `develop`, including the `package.json` version and the matching `CHANGELOG.md` entry.
2. Run `npm run validate` on the release candidate.
3. Create a `release/*` branch from `develop`.
4. Merge that release branch into `main`.
5. Create tag `vX.Y.Z` on the release commit that is now on `main`.
6. Push `main` and then push the tag.
7. Let the GitHub Actions `Release` workflow validate, create the GitHub Release, and publish to npm.
8. Merge the updated `main` back into `develop` after the release succeeds.

The repository must have an `NPM_TOKEN` Actions secret with publish rights before starting this flow.

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
