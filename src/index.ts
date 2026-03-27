export * from './language/ast';
export * from './language/core';
export * from './language/diagnosticCodes';
export * from './language/documentModel';
export * from './language/localSymbolReferences';
export * from './language/parser';
export * from './language/projectConfig';
export * from './language/sourcePositions';
export * from './language/templateExpressions';
export * from './language/templateSemantics';
export * from './language/workspaceSymbols';
export * from './service';
export * from './workspaceGraph';
export {
  collectLocalScriptSymbols,
  type KpaLocalScriptSymbolTable,
  type KpaScriptSymbol,
  type KpaScriptSymbolKind,
} from './language/symbols';
export {
  collectCanonicalTemplateComponentDiagnostics,
  collectCanonicalTemplateComponentUsages,
  collectCanonicalTemplateTags,
  collectCanonicalTemplateTagsForComponent,
  collectImportedKpaComponents,
  collectWorkspaceTemplateComponentUsagesForResolvedFile,
  findImportedKpaComponentForSymbol,
  getCanonicalTemplateTagAtOffset,
  getImportedKpaComponentApi,
  getImportedKpaComponentLocalSymbols,
  normalizeComponentRenameTarget,
  resolveCanonicalTemplateComponentAtOffset,
  toKebabCase,
  type KpaCanonicalTemplateComponentUsage,
  type KpaComponentApiEntry,
  type KpaImportedComponent,
  type KpaImportedComponentApi,
  type KpaTemplateAttribute,
  type KpaTemplateTag,
  type KpaWorkspaceTemplateComponentUsage,
  type NormalizedComponentRenameTarget,
  type ResolvedKpaTemplateComponent,
} from './language/templateComponents';
