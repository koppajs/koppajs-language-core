import { describe, expect, it } from 'vitest';
import { parseKpaDocument } from '../../language/parser';
import { collectTemplateLoopScopeNamesAtOffset } from '../../language/templateLoopScopes';

describe('template loop scopes', () => {
  it('collects loop bindings and implicit loop helpers at the cursor offset', () => {
    const text = [
      '[template]',
      '  <option loop="option in options">{{ option.label }} {{ index }}</option>',
      '[/template]',
    ].join('\n');
    const document = parseKpaDocument(text);
    const offset = text.indexOf('option.label') + 1;

    expect(collectTemplateLoopScopeNamesAtOffset(document, offset)).toEqual([
      'index',
      'key',
      'isFirst',
      'isLast',
      'isEven',
      'isOdd',
      'option',
    ]);
  });

  it('collects tuple loop bindings alongside implicit helpers', () => {
    const text = [
      '[template]',
      '  <option loop="[entryKey, option] in options">{{ entryKey }} {{ option.label }}</option>',
      '[/template]',
    ].join('\n');
    const document = parseKpaDocument(text);
    const offset = text.indexOf('option.label') + 1;

    expect(collectTemplateLoopScopeNamesAtOffset(document, offset)).toEqual([
      'index',
      'key',
      'isFirst',
      'isLast',
      'isEven',
      'isOdd',
      'entryKey',
      'option',
    ]);
  });
});
