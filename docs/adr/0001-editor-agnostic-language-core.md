# ADR 0001: Keep Language Core Editor-Agnostic

- Status: accepted
- Date: 2026-03-26

## Context

This package is shared by higher-level KoppaJS tooling. Parser behavior, diagnostics, workspace indexing, and language-service logic need one source of truth, but editor adapters and transport layers have different integration constraints.

## Decision

Keep `koppajs-language-core` focused on runtime language analysis only.

The package may expose a language-service facade, but that facade must remain editor-agnostic and must not depend on VS Code APIs, browser APIs, or LSP transport objects.

## Consequences

- downstream adapters remain thin and reusable
- public contracts stay focused on `.kpa` analysis instead of transport details
- no Playwright or UI tooling belongs in this repository unless the repository scope changes
- filesystem and TypeScript dependencies remain acceptable because they directly support runtime analysis
