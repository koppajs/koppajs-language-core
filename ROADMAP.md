# Roadmap

## Current Direction

The repository is in a stabilization phase. The goal is to make the language core explicit, documented, and safe to build on before expanding its feature set.

## Near-Term Priorities

1. Keep the root public contract stable and well-documented.
2. Expand direct tests around `KpaLanguageService` when new public behaviors are added.
3. Continue filling feature specs so implementation, tests, and documentation stay aligned.

## Deferred Work

- richer structured diagnostics beyond message text and optional codes
- clearer policy for diagnostic localization
- performance work for large workspaces only after measured pressure exists
- additional editor-facing features only in downstream adapter packages, not in this core package

## Non-Goals

- rewriting the package around a new abstraction model
- adding UI or browser-specific concerns here
- adding lint, formatter, or integration tooling without a concrete repository problem
