# AI Collaboration Instructions

## Read Before Editing

For any non-trivial change, read:

1. `DECISION_HIERARCHY.md`
2. `AI_CONSTITUTION.md`
3. `ARCHITECTURE.md`
4. the relevant specs in `docs/specs/`
5. `DEVELOPMENT_RULES.md`
6. `TESTING_STRATEGY.md`

## Working Rules

- Prefer spec -> tests -> implementation -> docs for behavior changes.
- Do not silently change the published root export surface or package metadata
  contract.
- Keep the package editor-agnostic and deterministic.
- Update the meta layer when architecture, workflow, release, or AI
  expectations change.
- Keep ESLint, Prettier, and semantic documentation checks green when the
  affected files move.
- If a change depends on assumptions from `@koppajs/koppajs-core` or
  `@koppajs/koppajs-vite-plugin`, keep
  `docs/specs/core-plugin-integration-contract.md` aligned.
