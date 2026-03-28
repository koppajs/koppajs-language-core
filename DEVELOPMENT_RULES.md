# Development Rules

## Change Discipline

1. Start from the existing implementation and tests. Do not redesign the package from doctrine alone.
2. Keep public behavior explicit. A new fallback, alias, or inferred behavior must be visible in code and documented if public.
3. Root-module export changes and published package-manifest boundary changes are contract changes. Do not add or remove root exports, entry points, or published package files silently.
4. Keep module seams narrow. Prefer extending an existing module over adding a new layer for a single call site.
5. Do not replace the current TypeScript and Vitest baseline without a demonstrated problem.
6. The canonical npm package name for this repository is `@koppajs/koppajs-language-core`. Any other package identity is a release blocker.

## Code Rules

- Prefer small functions over hidden side effects.
- Preserve strict typing and explicit return shapes.
- Keep synchronous filesystem usage in workspace code unless the architecture is intentionally revised.
- Reuse existing terminology: document, block, template, component, workspace, service.
- Do not add compatibility shims unless an active consumer requires them.

## Documentation Rules

- If behavior changes, update the relevant spec in `docs/specs/`.
- If boundaries change, update [`ARCHITECTURE.md`](./ARCHITECTURE.md) and architecture docs.
- If repository shape or workflow expectations change, update `docs/meta/` and `.github/workflows/README.md`.
- If AI collaboration expectations change, update `.github/instructions/`.
- If the public contract changes, update [`README.md`](./README.md), package-boundary tests, and any affected specs.
- Do not describe roadmap items as implemented behavior.

## Validation Rules

- Run `npm run validate` for normal repository changes.
- Keep ESLint, Prettier, and semantic documentation checks passing when they touch the affected files.
- Add unit tests for new behavior or for bug fixes that affect the public contract.
- Do not add Playwright or UI checks unless the repository gains a real UI surface.

## Documentation Contract Rules

- `README.md`, `CHANGELOG.md`, `CODE_OF_CONDUCT.md`, and `CONTRIBUTING.md` are governed by [docs/specs/repository-documentation-contract.md](./docs/specs/repository-documentation-contract.md).
- If one of those files changes shape, update the spec and `scripts/check-doc-contract.mjs` in the same change.
- Keep official KoppaJS branding, logo usage, and closing governance sections consistent across the governed root documents.
