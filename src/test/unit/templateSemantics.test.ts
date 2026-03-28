import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { parseKpaDocument } from '../../language/parser';
import {
  createTemplateSemanticVirtualFileName,
  getTemplateSemanticCompletions,
  getTemplateSemanticDefinitions,
  getTemplateSemanticHover,
  getTemplateSemanticReferences,
  getTemplateSemanticRenameInfo,
  getTemplateSemanticRenameRanges,
} from '../../language/templateSemantics';

describe('getTemplateSemanticCompletions', () => {
  it('returns typed member completions inside canonical template expressions', () => {
    const text = [
      '[template]',
      '  <div>{{user.}}</div>',
      '[/template]',
      '',
      '[ts]',
      '  return {',
      '    state: { user: { name: "Ada", age: 32 } },',
      '  };',
      '[/ts]',
    ].join('\n');
    const document = parseKpaDocument(text);
    const offset = text.indexOf('user.') + 'user.'.length;

    const completions = getTemplateSemanticCompletions(
      document,
      '/tmp/example.kpa',
      offset,
    );

    expect(completions?.some((completion) => completion.name === 'name')).toBe(
      true,
    );
    expect(completions?.some((completion) => completion.name === 'age')).toBe(
      true,
    );
  });

  it('filters root completions to template-visible local names', () => {
    const text = [
      '[template]',
      '  <div>{{co}}</div>',
      '[/template]',
      '',
      '[ts]',
      '  const helper = 1;',
      '  return {',
      '    state: { count: 1 },',
      '    methods: {',
      '      increment() {},',
      '    },',
      '  };',
      '[/ts]',
    ].join('\n');
    const document = parseKpaDocument(text);
    const offset = text.indexOf('co') + 1;

    const completions = getTemplateSemanticCompletions(
      document,
      '/tmp/example.kpa',
      offset,
    );
    const names = completions?.map((completion) => completion.name) ?? [];

    expect(names).toContain('count');
    expect(names).toContain('increment');
    expect(names).not.toContain('helper');
    expect(names).not.toContain('Array');
  });

  it('includes loop bindings in root completions for loop-scoped expressions', () => {
    const text = [
      '[template]',
      '  <option loop="loopItem in options">{{lo}}</option>',
      '[/template]',
      '',
      '[ts]',
      '  return {',
      '    state: { options: [] },',
      '  };',
      '[/ts]',
    ].join('\n');
    const document = parseKpaDocument(text);
    const offset = text.indexOf('{{lo') + 3;

    const completions = getTemplateSemanticCompletions(
      document,
      '/tmp/example.kpa',
      offset,
    );
    const names = completions?.map((completion) => completion.name) ?? [];

    expect(names).toContain('loopItem');
    expect(names).toContain('index');
  });
});

describe('getTemplateSemanticHover', () => {
  it('returns typed hover information for template member access', () => {
    const text = [
      '[template]',
      '  <div>{{user.name}}</div>',
      '[/template]',
      '',
      '[ts]',
      '  return {',
      '    state: { user: { name: "Ada", age: 32 } },',
      '  };',
      '[/ts]',
    ].join('\n');
    const document = parseKpaDocument(text);
    const offset = text.indexOf('name') + 1;

    const hover = getTemplateSemanticHover(
      document,
      '/tmp/example.kpa',
      offset,
    );

    expect(hover?.displayText).toContain('name');
    expect(hover?.displayText).toContain('string');
  });
});

describe('component-contract semantic mapping', () => {
  it('resolves definitions and references for state bindings from the return contract', () => {
    const tempDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'kpa-template-semantics-'),
    );
    const sourcePath = path.join(tempDirectory, 'component.kpa');
    const text = [
      '[template]',
      '  <div>{{count}}</div>',
      '[/template]',
      '',
      '[ts]',
      '  return {',
      '    state: { count: 1 },',
      '    methods: {',
      '      increment() {',
      '        this.count++;',
      '      },',
      '    },',
      '  };',
      '[/ts]',
    ].join('\n');
    const document = parseKpaDocument(text);
    const offset = text.indexOf('{{count') + 3;

    const definitions = getTemplateSemanticDefinitions(
      document,
      sourcePath,
      offset,
    );
    const references = getTemplateSemanticReferences(
      document,
      sourcePath,
      offset,
    );
    const renameInfo = getTemplateSemanticRenameInfo(
      document,
      sourcePath,
      offset,
    );
    const renameRanges = getTemplateSemanticRenameRanges(
      document,
      sourcePath,
      offset,
    );

    expect(
      definitions?.some(
        (definition) =>
          definition.fileName ===
            createTemplateSemanticVirtualFileName(sourcePath) ||
          text.slice(
            definition.range.start.offset,
            definition.range.end.offset,
          ) === 'count',
      ),
    ).toBe(true);
    expect(
      references?.some(
        (reference) =>
          text.slice(
            reference.range.start.offset,
            reference.range.end.offset,
          ) === 'count',
      ),
    ).toBe(true);
    expect(renameInfo).toBeUndefined();
    expect(renameRanges).toBeUndefined();
  });
});
