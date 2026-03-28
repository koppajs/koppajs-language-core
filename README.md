<a id="readme-top"></a>

<div align="center">
  <img src="https://public-assets-1b57ca06-687a-4142-a525-0635f7649a5c.s3.eu-central-1.amazonaws.com/koppajs/koppajs-logo-text-900x226.png" width="500" alt="KoppaJS Logo">
</div>

<br>

<div align="center">
  <a href="https://www.npmjs.com/package/@koppajs/koppajs-language-core"><img src="https://img.shields.io/npm/v/@koppajs/koppajs-language-core?style=flat-square" alt="npm version"></a>
  <a href="https://github.com/koppajs/koppajs-language-core/actions"><img src="https://img.shields.io/github/actions/workflow/status/koppajs/koppajs-language-core/ci.yml?branch=main&style=flat-square" alt="CI Status"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square" alt="License"></a>
</div>

<br>

<div align="center">
  <h1 align="center">@koppajs/koppajs-language-core</h1>
  <h3 align="center">Shared language primitives, semantic service, and workspace graph for KoppaJS</h3>
  <p align="center">
    <i>Parser, diagnostics, template semantics, and workspace analysis in one editor-agnostic package.</i>
  </p>
</div>

<br>

<div align="center">
  <p align="center">
    <a href="https://github.com/koppajs/koppajs-documentation">Documentation</a>
    &middot;
    <a href="https://github.com/koppajs/koppajs-language-server">Language Server</a>
    &middot;
    <a href="https://github.com/koppajs/koppajs-kpa-check">KPA Check</a>
    &middot;
    <a href="https://github.com/koppajs/koppajs-vscode-extension">VS Code Extension</a>
    &middot;
    <a href="https://github.com/koppajs/koppajs-language-core/issues">Issues</a>
  </p>
</div>

<br>

<details>
<summary>Table of Contents</summary>
  <ol>
    <li><a href="#purpose">Purpose</a></li>
    <li><a href="#ownership-boundaries">Ownership Boundaries</a></li>
    <li><a href="#public-contract">Public Contract</a></li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#ecosystem-fit">Ecosystem Fit</a></li>
    <li><a href="#quality-baseline">Quality Baseline</a></li>
    <li><a href="#release-model">Release Model</a></li>
    <li><a href="#architecture-governance">Architecture & Governance</a></li>
    <li><a href="#community-contribution">Community & Contribution</a></li>
    <li><a href="#license">License</a></li>
  </ol>
</details>

---

## Purpose

This repository exists to centralize the reusable language behavior for KoppaJS files:

- block parsing and document modeling
- structural and semantic diagnostics
- template expression and component analysis
- workspace symbol discovery and dependency tracking
- a service facade for completions, hover, definitions, references, rename, and code actions

---

## Ownership Boundaries

This package owns:

- runtime language logic for `.kpa` documents
- TypeScript-backed semantic analysis for template expressions
- filesystem-backed workspace indexing and component dependency tracking
- the published root module contract in [`src/index.ts`](./src/index.ts)

This package does not own:

- editor transport layers such as LSP or VS Code integration
- CLI presentation or process orchestration
- file watching daemons
- formatting, code generation, or compilation of `.kpa` files
- browser UI or Playwright-driven workflows

---

## Public Contract

The published npm surface is a single root entry point defined by `package.json` `exports["."]` and implemented in [`src/index.ts`](./src/index.ts). There are no public subpath exports.

That root entry point intentionally groups the runtime contract into a few explicit families:

- structural document primitives such as `parseKpaDocument`, `getBlockAtOffset`, `createLineStarts`, `createLocatedRange`, and `offsetToPosition`
- diagnostics entry points such as `collectKpaDiagnosticsFromDocument`, `collectKpaDiagnosticsFromText`, and `kpaDiagnosticCodes`
- template analysis helpers covering expressions, local references, imported components, workspace-registered components, and TypeScript-backed template semantics
- workspace and project-config runtime helpers including `KpaWorkspaceIndex`, `KpaWorkspaceGraph`, and config-resolution cache controls
- the high-level `KpaLanguageService` facade

The exact runtime value exports are locked by [`src/test/unit/publicApi.test.ts`](./src/test/unit/publicApi.test.ts), and the root-only package manifest boundary is locked by [`src/test/unit/packageMetadata.test.ts`](./src/test/unit/packageMetadata.test.ts). Lower-level files that are not re-exported from the root module, such as [`src/diagnosticsEngine.ts`](./src/diagnosticsEngine.ts), are internal compatibility shims for repository use and are not part of the published package entry point.

---

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

---

## Ecosystem Fit

This repository is a KoppaJS core package. It is intended to sit below language-server, editor-adapter, and CLI packages so those packages can share one source of truth for `.kpa` language behavior.

The package is runtime code, not build tooling. It executes in Node.js, requires Node.js `>=22`, and uses synchronous filesystem access where workspace indexing requires deterministic reads.

---

## Quality Baseline

The enforced repository checks are:

- `npm run check:docs`
- `npm run check:meta`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run validate`

GitHub Actions runs `npm run validate` on Node.js 22 and 24 for pushes to `main` and `develop` and for pull requests. Tagged releases rerun `npm run validate` and `npm run release:check` on Node.js 22 before publish, and only continue when the git tag version matches `package.json`.

No dedicated lint or formatter is enforced today. That is intentional until a real consistency problem justifies more tooling.

---

## Release Model

Releases are manual and tag-driven. The release candidate is prepared on `develop`, moved through a `release/*` branch into `main`, tagged on `main` as `vX.Y.Z`, and then published by GitHub Actions. After a successful release, `main` is merged back into `develop`.

The repository-specific release contract lives in [`RELEASE.md`](./RELEASE.md). Release notes are tracked in [`CHANGELOG.md`](./CHANGELOG.md).

---

## Architecture & Governance

Project intent, contributor rules, and documentation contracts live in the local repo meta layer:

- [AI_CONSTITUTION.md](./AI_CONSTITUTION.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [DECISION_HIERARCHY.md](./DECISION_HIERARCHY.md)
- [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md)
- [TESTING_STRATEGY.md](./TESTING_STRATEGY.md)
- [RELEASE.md](./RELEASE.md)
- [ROADMAP.md](./ROADMAP.md)
- [CHANGELOG.md](./CHANGELOG.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- [docs/specs/README.md](./docs/specs/README.md)
- [docs/specs/repository-documentation-contract.md](./docs/specs/repository-documentation-contract.md)
- [docs/meta/README.md](./docs/meta/README.md)
- [docs/architecture/README.md](./docs/architecture/README.md)
- [docs/quality/README.md](./docs/quality/README.md)

The file-shape contract for `README.md`, `CHANGELOG.md`, `CODE_OF_CONDUCT.md`, and `CONTRIBUTING.md` is defined in [docs/specs/repository-documentation-contract.md](./docs/specs/repository-documentation-contract.md).

Run the local repository guards before committing:

```bash
npm run check:docs
npm run check:meta
```

---

## Community & Contribution

Issues and pull requests are welcome:

https://github.com/koppajs/koppajs-language-core/issues

Contributor workflow details live in [CONTRIBUTING.md](./CONTRIBUTING.md).

Community expectations live in [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

---

## License

Apache License 2.0 — © 2026 KoppaJS, Bastian Bensch
