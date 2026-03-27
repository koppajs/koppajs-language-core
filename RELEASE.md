# Release Process for `koppajs-language-core`

This document describes the repository-specific release workflow for
`koppajs-language-core`.

The project uses a manual, tag-driven release process.
Only tagged versions are official releases.

The effective flow is:

1. Finalize the release content on `develop`
2. Create a `release/*` branch from that state
3. Merge the release branch into `main`
4. Tag the release commit on `main` as `vX.Y.Z`
5. Push `main` and then push the tag
6. Let GitHub Actions validate and publish the release
7. Merge the updated `main` back into `develop`

## Release Model

This repository does not use automated versioning tools such as Changesets or
semantic-release.

The release is controlled by:

- the version in `package.json`
- the release entry in `CHANGELOG.md`
- the merge of the release-ready state into `main`
- the Git tag in the form `vX.Y.Z`
- the GitHub Actions workflow in `.github/workflows/release.yml`

Important consequences:

- a merge to `main` alone does not publish anything
- a tag push is the technical release trigger
- the tag version must exactly match `package.json`
- the tag must point to a commit that is already on `main`
- after a successful release, `main` should be merged back into `develop`

Do not tag `develop`.
Do not tag the `release/*` branch.
Tag only the release commit that is already on `main`.

## Preconditions

Before cutting a release, ensure all of the following are true:

- the intended release scope is already complete on `develop`
- `package.json` contains the target version
- `CHANGELOG.md` contains the corresponding release notes
- `package-lock.json` is up to date
- the release content has been reviewed
- the repository secrets required by GitHub Actions are configured

Tooling expectations for local verification:

- Node.js 20 or newer
- npm 10 or newer

## What Must Be Prepared on `develop`

All release content is finalized on `develop`, not on `main`.

That includes:

- feature and fix commits intended for the release
- the version bump in `package.json`
- the matching entry in `CHANGELOG.md`
- any last release-blocking fixes

In other words:

- `develop` is where the release state is prepared
- `release/*` is the transport branch for that already prepared state
- `main` is the branch that receives the final release commit
- the tag on `main` is the technical release trigger
- after the release, `main` becomes the source for the final synchronization
  back into `develop`

## Local Validation Before Branching

Before creating the release branch, validate the exact release candidate
locally.

Recommended commands:

```bash
npm ci
npm run validate
npm pack --dry-run
```

Why this matters:

- the release workflow runs the same validation gates again in CI
- failing locally is cheaper than failing after tagging
- `npm pack --dry-run` verifies the publishable package payload

The published package contents are controlled by the `files` field in
`package.json`. The intended publish payload is:

- `dist`
- `README.md`
- `CHANGELOG.md`
- `LICENSE`

## Step-by-Step Release Workflow

### 1. Finalize the release on `develop`

Ensure `develop` already contains the exact release content.

Typical release preparation includes:

- updating `package.json` from the previous version to the next release version
- moving the relevant notes into the final section in `CHANGELOG.md`
- committing any last release fixes

Example intent:

```bash
git checkout develop
git status
```

Make sure the release-ready state is committed before creating `release/*`.

Do not create the tag at this stage.

### 2. Create the `release/*` branch

Create a release branch from the validated `develop` state.

Example:

```bash
git checkout -b release/X.Y.Z
```

If your `main` merge happens by pull request, push the branch and open the pull
request from `release/*` to `main`.

### 3. Merge the release branch into `main`

Merge `release/*` into `main` using the repository's normal process.

The critical requirement is:

- `main` must contain the final release commit before tagging

Conceptually:

```bash
git checkout main
git merge --no-ff release/X.Y.Z
```

### 4. Tag the release commit on `main`

After the release branch has been merged, create the Git tag on the release
commit that is now on `main`.

Example:

```bash
git checkout main
git pull
git tag vX.Y.Z
```

The tag format is mandatory:

- `vX.Y.Z` is valid
- `X.Y.Z` is not valid for this workflow

### 5. Push `main` and the tag

Push the merged `main` branch and then the tag.

Example:

```bash
git push origin main
git push origin vX.Y.Z
```

The release workflow is triggered by the tag push.
Without the tag push, no npm release happens.

### 6. Wait for the release workflow to finish

Do not merge `main` back into `develop` before the release result is clear.

First verify that:

- the GitHub Actions release workflow passed
- the GitHub Release was created
- the npm publish step completed successfully

### 7. Merge `main` back into `develop`

After the release has been successfully published, merge the updated `main`
back into `develop`.

Why it matters:

- it keeps `develop` aligned with the exact released state on `main`
- it preserves release metadata updates
- it prevents the next release from starting from an incomplete branch state

Conceptually:

```bash
git checkout develop
git merge --no-ff main
```

## What GitHub Actions Does

The workflow `.github/workflows/release.yml` runs on:

```yaml
on:
  push:
    tags:
      - "v*.*.*"
```

That means every pushed tag matching `vX.Y.Z` starts the release pipeline.

The job performs these steps:

1. Checkout the repository with full history
2. Setup Node.js 20
3. Fetch `main`
4. Verify the tagged commit is already on `main`
5. Run `npm ci`
6. Run `npm run validate`
7. Verify that `GITHUB_REF_NAME` without the `v` prefix matches
   `package.json.version`
8. Create a GitHub Release with generated release notes
9. Run `npm publish --access public`

If any step fails, the release job stops immediately.

## Version Match Rule

The release workflow contains an explicit guard:

- tag `vX.Y.Z` requires `package.json` version `X.Y.Z`
- a mismatched tag and `package.json` version fails the release

Before pushing a tag, always double-check:

- the merged commit on `main`
- the version in `package.json`
- the tag name you are about to push

## GitHub Release and npm Publish

If all checks pass, the workflow does two release actions:

1. It creates a GitHub Release with generated release notes
2. It publishes the package to npm with public access

This requires:

- `GITHUB_TOKEN` for creating the GitHub Release
- `NPM_TOKEN` repository secret for `npm publish`

## Practical Checklist

1. Verify the release scope on `develop`
2. Update `package.json`
3. Update `CHANGELOG.md`
4. Run local validation
5. Create `release/*` from `develop`
6. Merge `release/*` into `main`
7. Confirm the merged commit on `main` has the correct version and changelog
8. Create tag `vX.Y.Z` on that `main` commit
9. Push `main`
10. Push the tag
11. Watch the GitHub Actions release workflow
12. Verify the GitHub Release exists
13. Verify the package version is available on npm
14. Merge `main` back into `develop`

## Common Mistakes to Avoid

- preparing the version bump on `main` instead of `develop`
- tagging before the release branch has been merged into `main`
- tagging `develop` or `release/*` directly
- pushing a tag that does not match `package.json`
- forgetting to update `CHANGELOG.md`
- assuming a merge to `main` automatically publishes to npm
- forgetting that the release workflow uses the pushed tag as its trigger
- forgetting to merge the released `main` state back into `develop`
