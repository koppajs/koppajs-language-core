import { describe, expect, it } from 'vitest';
import * as publicApi from '../../index';

describe('public root module', () => {
  it('exports the documented runtime contract and keeps internal shims private', () => {
    const runtimeKeys = Object.keys(publicApi)
      .filter(
        (key) =>
          key !== '__esModule' && key !== 'default' && key !== 'module.exports',
      )
      .sort();

    expect(runtimeKeys).toEqual([
      'KpaLanguageService',
      'KpaWorkspaceGraph',
      'KpaWorkspaceIndex',
      'clearProjectConfigCache',
      'collectCanonicalTemplateComponentDiagnostics',
      'collectCanonicalTemplateComponentUsages',
      'collectCanonicalTemplateExpressions',
      'collectCanonicalTemplateIdentifierReferences',
      'collectCanonicalTemplateTags',
      'collectCanonicalTemplateTagsForComponent',
      'collectImportedKpaComponents',
      'collectKpaDiagnosticsFromDocument',
      'collectKpaDiagnosticsFromText',
      'collectLocalReferenceRangesForSymbols',
      'collectLocalScriptSymbols',
      'collectWorkspaceSymbolsFromKpaText',
      'collectWorkspaceTemplateComponentUsagesForResolvedFile',
      'createLineStarts',
      'createLocatedRange',
      'createTemplateSemanticVirtualFileName',
      'findImportedKpaComponentForSymbol',
      'getBlockAtOffset',
      'getCanonicalTemplateExpressionAtOffset',
      'getCanonicalTemplateIdentifierReferenceAtOffset',
      'getCanonicalTemplateTagAtOffset',
      'getImportedKpaComponentApi',
      'getImportedKpaComponentLocalSymbols',
      'getNearestProjectConfig',
      'getNearestProjectConfigPath',
      'getTemplateExpressionRootReference',
      'getTemplateSemanticCompletions',
      'getTemplateSemanticDefinitions',
      'getTemplateSemanticHover',
      'getTemplateSemanticReferences',
      'getTemplateSemanticRenameInfo',
      'getTemplateSemanticRenameRanges',
      'invalidateProjectConfigCacheForPath',
      'isOffsetInsideBlockNames',
      'kpaDiagnosticCodes',
      'normalizeComponentRenameTarget',
      'offsetToPosition',
      'parseKpaDocument',
      'resolveCanonicalTemplateComponentAtOffset',
      'resolveLocalSymbolOccurrenceAtOffset',
      'resolveWorkspaceImportPath',
      'toKebabCase',
    ]);
    expect(runtimeKeys).not.toContain('collectBlockDiagnostics');
  });
});
