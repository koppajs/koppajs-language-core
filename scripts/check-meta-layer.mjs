import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const requiredDirectories = [
  '.github',
  '.github/instructions',
  '.github/workflows',
  'docs',
  'docs/adr',
  'docs/architecture',
  'docs/meta',
  'docs/quality',
  'docs/specs',
  'scripts',
];

const requiredPaths = [
  'AI_CONSTITUTION.md',
  'ARCHITECTURE.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'DECISION_HIERARCHY.md',
  'DEVELOPMENT_RULES.md',
  'RELEASE.md',
  'ROADMAP.md',
  'TESTING_STRATEGY.md',
  'eslint.config.mjs',
  'prettier.config.mjs',
  '.prettierignore',
  '.github/instructions/ai-collaboration.md',
  '.github/workflows/README.md',
  '.github/workflows/ci.yml',
  '.github/workflows/release.yml',
  'docs/adr/README.md',
  'docs/architecture/README.md',
  'docs/architecture/module-boundaries.md',
  'docs/meta/README.md',
  'docs/meta/repository-map.md',
  'docs/quality/README.md',
  'docs/quality/tooling-baseline.md',
  'docs/quality/validation-baseline.md',
  'docs/specs/README.md',
  'docs/specs/core-plugin-integration-contract.md',
  'docs/specs/repository-documentation-contract.md',
  'scripts/check-doc-contract.mjs',
  'scripts/check-doc-semantics.mjs',
];

let failed = false;

for (const directory of requiredDirectories) {
  const absolutePath = path.join(root, directory);
  if (!existsSync(absolutePath) || !statSync(absolutePath).isDirectory()) {
    console.error(`Missing required directory: ${directory}/`);
    failed = true;
  }
}

for (const file of requiredPaths) {
  const absolutePath = path.join(root, file);
  if (!existsSync(absolutePath)) {
    console.error(`Missing required path: ${file}`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log('Meta layer check passed.');
