# AI Constitution

This repository is governed by the KoppaJS Engineering Doctrine.

## Binding Rules

1. Analyze before editing. Do not infer architecture from file names alone when source and tests can be read directly.
2. Preserve the published root-module contract unless a breaking change is explicitly approved.
3. Prefer minimal edits that align behavior, tests, specs, and documentation at the same time.
4. Keep the package editor-agnostic. Do not introduce VS Code, browser, or transport-layer dependencies here.
5. Do not add speculative abstractions. A new layer must answer a repeated concrete need already present in the codebase.
6. Keep behavior deterministic. Workspace reads, diagnostics, and semantic mapping must remain explainable from code and inputs.
7. Treat code and types as truth. Documentation must describe implemented behavior, not aspirational behavior.
8. When implementation changes affect contracts, update the relevant spec, architecture note, README, and tests in the same change.
9. Avoid unnecessary tooling. New tooling must solve an active repository problem and must not duplicate existing checks.
10. Before concluding work, run `npm run validate` unless a clearly stated environment blocker prevents it.

## Agent-Specific Expectations

- Prefer the existing module seams in `src/language`, `src/service.ts`, and `src/workspaceGraph.ts`.
- Keep diagnostics explicit. Do not hide compatibility behavior behind implicit fallbacks.
- Preserve synchronous filesystem behavior unless a measured need justifies a change.
- Do not claim linting, formatting, or UI coverage that the repository does not enforce.
