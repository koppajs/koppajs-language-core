import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

interface PackageManifest {
  exports: Record<string, unknown>;
  files: readonly string[];
  main: string;
  name: string;
  publishConfig?: {
    access?: string;
  };
  types: string;
}

function readPackageManifest(): PackageManifest {
  return JSON.parse(
    readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'),
  ) as PackageManifest;
}

describe('package manifest', () => {
  it('publishes the scoped root package with an explicit package file list', () => {
    const packageManifest = readPackageManifest();

    expect(packageManifest.name).toBe('@koppajs/koppajs-language-core');
    expect(Object.keys(packageManifest.exports).sort()).toEqual(['.']);
    expect(packageManifest.main).toBe('./dist/index.js');
    expect(packageManifest.types).toBe('./dist/index.d.ts');
    expect(packageManifest.publishConfig?.access).toBe('public');
    expect(packageManifest.files).toEqual([
      'dist',
      'README.md',
      'CHANGELOG.md',
      'LICENSE',
    ]);
  });
});
