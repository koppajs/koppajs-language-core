import type { KpaDocument } from './ast';
import type { KpaBlockDiagnostic } from './diagnosticsRules';
import { collectTemplateContextSymbols } from './symbols';
import { collectCanonicalTemplateIdentifierReferences } from './templateExpressions';
import { collectTemplateLoopScopeNamesAtOffset } from './templateLoopScopes';

const knownGlobalTemplateNames = new Set([
  'Array',
  'Boolean',
  'Date',
  'Infinity',
  'JSON',
  'Map',
  'Math',
  'NaN',
  'Number',
  'Object',
  'Promise',
  'RegExp',
  'Set',
  'String',
  'Symbol',
  'URL',
  'URLSearchParams',
  'console',
  'decodeURIComponent',
  'encodeURIComponent',
  'false',
  'isFinite',
  'isNaN',
  'null',
  'parseFloat',
  'parseInt',
  'true',
  'undefined',
]);

export function collectTemplateDiagnosticsFromDocument(
  document: KpaDocument,
): KpaBlockDiagnostic[] {
  const templateVisibleNames = new Set(
    collectTemplateContextSymbols(document).map((symbol) => symbol.name),
  );

  return collectCanonicalTemplateIdentifierReferences(document).flatMap((reference) => {
    const loopScopeNames = new Set(
      collectTemplateLoopScopeNamesAtOffset(document, reference.range.start.offset),
    );

    if (
      templateVisibleNames.has(reference.name) ||
      loopScopeNames.has(reference.name) ||
      knownGlobalTemplateNames.has(reference.name)
    ) {
      return [];
    }

    return [
      {
        range: {
          line: reference.range.start.line,
          startChar: reference.range.start.character,
          endChar: reference.range.end.character,
        },
        message: `Lokales Template-Symbol [${reference.name}] wurde nicht gefunden.`,
      },
    ];
  });
}
