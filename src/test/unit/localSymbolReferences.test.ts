import { describe, expect, it } from 'vitest';
import {
  collectLocalReferenceRangesForSymbols,
  resolveLocalSymbolOccurrenceAtOffset,
} from '../../language/localSymbolReferences';
import { parseKpaDocument } from '../../language/parser';

describe('resolveLocalSymbolOccurrenceAtOffset', () => {
  it('resolves a local script symbol from a script usage offset', () => {
    const text = [
      '[ts]',
      'const count = 1;',
      'console.log(count);',
      '[/ts]',
    ].join('\n');
    const document = parseKpaDocument(text);
    const offset = text.indexOf('count);') + 2;

    const occurrence = resolveLocalSymbolOccurrenceAtOffset(document, offset);

    expect(occurrence?.symbols.map((symbol) => symbol.name)).toEqual(['count']);
    expect(
      text.slice(occurrence!.range.start.offset, occurrence!.range.end.offset),
    ).toBe('count');
  });
});

describe('collectLocalReferenceRangesForSymbols', () => {
  it('collects only script references for top-level script symbols', () => {
    const text = [
      '[template]',
      '  <div>{{count}}</div>',
      '[/template]',
      '',
      '[ts]',
      'const count = 1;',
      'console.log(count);',
      '[/ts]',
    ].join('\n');
    const document = parseKpaDocument(text);
    const occurrence = resolveLocalSymbolOccurrenceAtOffset(
      document,
      text.indexOf('count);') + 2,
    );

    const references = collectLocalReferenceRangesForSymbols(
      document,
      occurrence?.symbols ?? [],
    );

    expect(
      references.map((range) =>
        text.slice(range.start.offset, range.end.offset),
      ),
    ).toEqual(['count', 'count']);
  });

  it('collects return-contract declarations together with template references for component state', () => {
    const text = [
      '[template]',
      '  <div>{{count}}</div>',
      '[/template]',
      '',
      '[ts]',
      '  return {',
      '    state: { count: 1 },',
      '  };',
      '[/ts]',
    ].join('\n');
    const document = parseKpaDocument(text);
    const occurrence = resolveLocalSymbolOccurrenceAtOffset(
      document,
      text.indexOf('{{count') + 3,
    );

    const references = collectLocalReferenceRangesForSymbols(
      document,
      occurrence?.symbols ?? [],
    );

    expect(
      references.map((range) =>
        text.slice(range.start.offset, range.end.offset),
      ),
    ).toEqual(['count', 'count']);
  });
});
