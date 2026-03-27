# Decision Hierarchy

When repository materials disagree, resolve them in this order:

1. KoppaJS Engineering Doctrine and this repository's binding constitution
2. Published package contract
   - `package.json` exports
   - `package.json` published entry-point metadata (`main`, `types`, `files`)
   - root module exports in `src/index.ts`
   - tests that lock public behavior
3. Feature specs in `docs/specs/`
4. Architecture documents
   - [`ARCHITECTURE.md`](/Users/thesortex/git-repos/koppajs/koppajs-language-core/ARCHITECTURE.md)
   - `docs/architecture/*`
   - ADRs in `docs/adr/`
5. Development process documents
   - [`DEVELOPMENT_RULES.md`](/Users/thesortex/git-repos/koppajs/koppajs-language-core/DEVELOPMENT_RULES.md)
   - [`TESTING_STRATEGY.md`](/Users/thesortex/git-repos/koppajs/koppajs-language-core/TESTING_STRATEGY.md)
   - [`CONTRIBUTING.md`](/Users/thesortex/git-repos/koppajs/koppajs-language-core/CONTRIBUTING.md)
6. README and quality notes
7. Roadmap items

## Resolution Rule

If a lower-priority document conflicts with code and tests, update the document. If code conflicts with a higher-priority contract, either align the code or explicitly approve a contract change and update every affected layer in the same change.
