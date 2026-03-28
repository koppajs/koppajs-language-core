import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

function fail(message) {
  console.error(message);
  failed = true;
}

function expectIncludes(relativePath, content, snippet) {
  if (!content.includes(snippet)) {
    fail(`Semantic doc check failed in ${relativePath}: missing -> ${snippet}`);
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let failed = false;

const packageManifest = JSON.parse(read('package.json'));
const readme = read('README.md');
const contributing = read('CONTRIBUTING.md');
const release = read('RELEASE.md');
const testingStrategy = read('TESTING_STRATEGY.md');
const workflowReadme = read('.github/workflows/README.md');
const qualityReadme = read('docs/quality/README.md');
const validationBaseline = read('docs/quality/validation-baseline.md');
const specsReadme = read('docs/specs/README.md');
const ciWorkflow = read('.github/workflows/ci.yml');
const releaseWorkflow = read('.github/workflows/release.yml');

const expectedNode = packageManifest.engines.node;
const expectedNpm = packageManifest.engines.npm;

const requiredScripts = [
  'check:docs',
  'check:meta',
  'format:check',
  'lint',
  'typecheck',
  'test',
  'check',
  'build',
  'validate',
  'release:check',
];

for (const scriptName of requiredScripts) {
  if (!packageManifest.scripts?.[scriptName]) {
    fail(`package.json is missing required script: ${scriptName}`);
  }
}

if (
  !packageManifest.scripts['check:docs']?.includes('check:docs:contract') ||
  !packageManifest.scripts['check:docs']?.includes('check:docs:semantics')
) {
  fail(
    'package.json check:docs script must chain both structural and semantic documentation checks.',
  );
}

expectIncludes('README.md', readme, `Node.js \`${expectedNode}\``);
expectIncludes('README.md', readme, 'Node.js 22 and 24');
for (const scriptName of [
  'check:docs',
  'check:meta',
  'format:check',
  'lint',
  'check',
  'validate',
]) {
  expectIncludes('README.md', readme, `npm run ${scriptName}`);
}

expectIncludes('CONTRIBUTING.md', contributing, `Node.js ${expectedNode}`);
expectIncludes('CONTRIBUTING.md', contributing, `npm ${expectedNpm}`);
expectIncludes(
  'CONTRIBUTING.md',
  contributing,
  'The tracked `.npmrc` enforces compatible Node.js and npm versions during install.',
);
for (const scriptName of [
  'check:docs',
  'check:meta',
  'format:check',
  'lint',
  'check',
  'release:check',
  'validate',
]) {
  expectIncludes('CONTRIBUTING.md', contributing, `npm run ${scriptName}`);
}

expectIncludes('RELEASE.md', release, 'Node.js 22 or newer');
expectIncludes('RELEASE.md', release, 'npm 10 or newer');
expectIncludes('RELEASE.md', release, 'npm run validate');
expectIncludes('RELEASE.md', release, 'npm run release:check');

expectIncludes('TESTING_STRATEGY.md', testingStrategy, 'Prettier');
expectIncludes('TESTING_STRATEGY.md', testingStrategy, 'ESLint');
expectIncludes(
  'TESTING_STRATEGY.md',
  testingStrategy,
  '`npm run check:docs` combines structural and semantic documentation validation',
);

for (const scriptName of [
  'check:docs',
  'check:meta',
  'format:check',
  'lint',
  'check',
  'validate',
  'release:check',
]) {
  expectIncludes(
    'docs/quality/README.md',
    qualityReadme,
    `npm run ${scriptName}`,
  );
}

expectIncludes(
  'docs/quality/validation-baseline.md',
  validationBaseline,
  'ESLint is enforced as a repository quality gate.',
);
expectIncludes(
  'docs/quality/validation-baseline.md',
  validationBaseline,
  'Prettier is enforced as a repository quality gate.',
);
expectIncludes(
  'docs/quality/validation-baseline.md',
  validationBaseline,
  'Node.js 22 and 24',
);

expectIncludes(
  '.github/workflows/README.md',
  workflowReadme,
  'Node.js 22 and 24',
);
expectIncludes(
  '.github/workflows/README.md',
  workflowReadme,
  'npm run validate',
);
expectIncludes(
  '.github/workflows/README.md',
  workflowReadme,
  'npm run release:check',
);

if (!/node-version:\s*\$\{\{\s*matrix\.node-version\s*\}\}/.test(ciWorkflow)) {
  fail(
    '.github/workflows/ci.yml no longer uses the documented Node.js test matrix.',
  );
}

for (const version of ['22', '24']) {
  if (!new RegExp(`-\\s+${escapeRegExp(version)}`).test(ciWorkflow)) {
    fail(
      `.github/workflows/ci.yml is missing Node.js ${version} in the test matrix.`,
    );
  }
}

expectIncludes(
  '.github/workflows/release.yml',
  releaseWorkflow,
  'node-version: 22',
);
expectIncludes(
  '.github/workflows/release.yml',
  releaseWorkflow,
  'npm run validate',
);
expectIncludes(
  '.github/workflows/release.yml',
  releaseWorkflow,
  'npm run release:check',
);

const specFiles = readdirSync(path.join(root, 'docs/specs'))
  .filter((fileName) => fileName.endsWith('.md') && fileName !== 'README.md')
  .sort();

for (const specFile of specFiles) {
  expectIncludes('docs/specs/README.md', specsReadme, `\`${specFile}\``);
}

if (failed) {
  process.exit(1);
}

console.log('Documentation semantics check passed.');
