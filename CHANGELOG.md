# Changelog

All notable changes to `@koppajs/koppajs-language-core` are recorded here.

## [0.1.1]

- Correct the published npm package identity to `@koppajs/koppajs-language-core`.
- Add an explicit cleanup workflow for the accidentally published unscoped package
  `koppajs-language-core`.

## [0.1.0]

- Establish the initial published package boundary for deterministic `.kpa`
  parsing, diagnostics, template semantics, workspace indexing, and the shared
  language-service facade.
- Align the package with canonical KoppaJS template semantics, runtime
  component-contract analysis, workspace `Core.take(...)` discovery, and the
  manual tag-driven release model used across KoppaJS repositories.
