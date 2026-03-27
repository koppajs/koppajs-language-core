# Development Rules

## Change Discipline

1. Start from the existing implementation and tests. Do not redesign the package from doctrine alone.
2. Keep public behavior explicit. A new fallback, alias, or inferred behavior must be visible in code and documented if public.
3. Root-module export changes and published package-manifest boundary changes are contract changes. Do not add or remove root exports, entry points, or published package files silently.
4. Keep module seams narrow. Prefer extending an existing module over adding a new layer for a single call site.
5. Do not replace the current TypeScript and Vitest baseline without a demonstrated problem.

## Code Rules

- Prefer small functions over hidden side effects.
- Preserve strict typing and explicit return shapes.
- Keep synchronous filesystem usage in workspace code unless the architecture is intentionally revised.
- Reuse existing terminology: document, block, template, component, workspace, service.
- Do not add compatibility shims unless an active consumer requires them.

## Documentation Rules

- If behavior changes, update the relevant spec in `docs/specs/`.
- If boundaries change, update [`ARCHITECTURE.md`](/Users/thesortex/git-repos/koppajs/koppajs-language-core/ARCHITECTURE.md) and architecture docs.
- If the public contract changes, update [`README.md`](/Users/thesortex/git-repos/koppajs/koppajs-language-core/README.md), package-boundary tests, and any affected specs.
- Do not describe roadmap items as implemented behavior.

## Validation Rules

- Run `npm run validate` for normal repository changes.
- Add unit tests for new behavior or for bug fixes that affect the public contract.
- Do not add Playwright or UI checks unless the repository gains a real UI surface.
