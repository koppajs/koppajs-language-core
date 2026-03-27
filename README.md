# @koppajs/koppajs-language-core

`@koppajs/koppajs-language-core` is the editor-agnostic language package for KoppaJS `.kpa` files.

It provides deterministic parsing, diagnostics, template semantics, workspace indexing, and a language-service facade that higher-level adapters can embed without taking a dependency on editor APIs.

Classification:
- repository type: core package
- runtime responsibility: `.kpa` parsing, diagnostics, template semantics, and workspace analysis
- build-time responsibility: TypeScript compilation and package publishing only
- UI surface: none

## Purpose

This repository exists to centralize the reusable language behavior for KoppaJS files:

- block parsing and document modeling
- structural and semantic diagnostics
- template expression and component analysis
- workspace symbol discovery and dependency tracking
- a service facade for completions, hover, definitions, references, rename, and code actions

## Ownership Boundaries

This package owns:

- runtime language logic for `.kpa` documents
- TypeScript-backed semantic analysis for template expressions
- filesystem-backed workspace indexing and component dependency tracking
- the published root module contract in [`src/index.ts`](/Users/thesortex/git-repos/koppajs/koppajs-language-core/src/index.ts)

This package does not own:

- editor transport layers such as LSP or VS Code integration
- CLI presentation or process orchestration
- file watching daemons
- formatting, code generation, or compilation of `.kpa` files
- browser UI or Playwright-driven workflows

## Public Contract

The published npm surface is a single root entry point defined by `package.json` `exports["."]` and implemented in [`src/index.ts`](/Users/thesortex/git-repos/koppajs/koppajs-language-core/src/index.ts). There are no public subpath exports.

That root entry point intentionally groups the runtime contract into a few explicit families:

- structural document primitives such as `parseKpaDocument`, `getBlockAtOffset`, `createLineStarts`, `createLocatedRange`, and `offsetToPosition`
- diagnostics entry points such as `collectKpaDiagnosticsFromDocument`, `collectKpaDiagnosticsFromText`, and `kpaDiagnosticCodes`
- template analysis helpers covering expressions, local references, imported components, workspace-registered components, and TypeScript-backed template semantics
- workspace and project-config runtime helpers including `KpaWorkspaceIndex`, `KpaWorkspaceGraph`, and config-resolution cache controls
- the high-level `KpaLanguageService` facade

The exact runtime value exports are locked by [`src/test/unit/publicApi.test.ts`](/Users/thesortex/git-repos/koppajs/koppajs-language-core/src/test/unit/publicApi.test.ts), and the root-only package manifest boundary is locked by [`src/test/unit/packageMetadata.test.ts`](/Users/thesortex/git-repos/koppajs/koppajs-language-core/src/test/unit/packageMetadata.test.ts). Lower-level files that are not re-exported from the root module, such as [`src/diagnosticsEngine.ts`](/Users/thesortex/git-repos/koppajs/koppajs-language-core/src/diagnosticsEngine.ts), are internal compatibility shims for repository use and are not part of the published package entry point.

## Usage

```ts
import {
  KpaLanguageService,
  collectKpaDiagnosticsFromText,
  parseKpaDocument,
} from '@koppajs/koppajs-language-core';

const text = [
  '[template]',
  '  <div>{{count}}</div>',
  '[/template]',
  '',
  '[ts]',
  '  const count = 1;',
  '[/ts]',
].join('\n');

const document = parseKpaDocument(text);
const { diagnostics } = collectKpaDiagnosticsFromText(text);

const service = new KpaLanguageService();
service.openDocument('file:///workspace/Counter.kpa', text);

const completions = service.getCompletions(
  'file:///workspace/Counter.kpa',
  text.indexOf('count') + 1,
);
```

## Ecosystem Fit

This repository is a KoppaJS core package. It is intended to sit below language-server, editor-adapter, and CLI packages so those packages can share one source of truth for `.kpa` language behavior.

The package is runtime code, not build tooling. It executes in Node.js, requires Node.js `>=16`, and uses synchronous filesystem access where workspace indexing requires deterministic reads.

## Quality Baseline

The enforced repository checks are:

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run validate`

GitHub Actions runs `npm run validate` on pushes to `main` and `develop` and on pull requests. Tagged releases publish to npm only after the git tag version matches `package.json`.

No dedicated lint or formatter is enforced today. That is intentional until a real consistency problem justifies more tooling.

## Release Model

Releases are manual and tag-driven. The release candidate is prepared on `develop`, moved through a `release/*` branch into `main`, tagged on `main` as `vX.Y.Z`, and then published by GitHub Actions. After a successful release, `main` is merged back into `develop`.

The repository-specific release contract lives in [`RELEASE.md`](/Users/thesortex/git-repos/koppajs/koppajs-language-core/RELEASE.md). Release notes are tracked in [`CHANGELOG.md`](/Users/thesortex/git-repos/koppajs/koppajs-language-core/CHANGELOG.md).

## Governance

Repository governance is defined by the KoppaJS meta layer:

- [`AI_CONSTITUTION.md`](/Users/thesortex/git-repos/koppajs/koppajs-language-core/AI_CONSTITUTION.md)
- [`ARCHITECTURE.md`](/Users/thesortex/git-repos/koppajs/koppajs-language-core/ARCHITECTURE.md)
- [`DEVELOPMENT_RULES.md`](/Users/thesortex/git-repos/koppajs/koppajs-language-core/DEVELOPMENT_RULES.md)
- [`TESTING_STRATEGY.md`](/Users/thesortex/git-repos/koppajs/koppajs-language-core/TESTING_STRATEGY.md)
- [`DECISION_HIERARCHY.md`](/Users/thesortex/git-repos/koppajs/koppajs-language-core/DECISION_HIERARCHY.md)
- [`CONTRIBUTING.md`](/Users/thesortex/git-repos/koppajs/koppajs-language-core/CONTRIBUTING.md)
- [`ROADMAP.md`](/Users/thesortex/git-repos/koppajs/koppajs-language-core/ROADMAP.md)

Detailed architecture, ADRs, specs, and quality references live under [`docs/`](/Users/thesortex/git-repos/koppajs/koppajs-language-core/docs).
