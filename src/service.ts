import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import ts from 'typescript';
import { htmlAttributes } from './data/htmlAttributes';
import { htmlTags } from './data/htmlTags';
import type { KpaBlockKind, KpaBlockNode, KpaDocument, KpaLocatedRange } from './language/ast';
import {
  kpaDiagnosticCodes,
  type MissingComponentPropDiagnosticData,
  type UnresolvedComponentTagDiagnosticData,
} from './language/diagnosticCodes';
import type { KpaBlockDiagnostic } from './language/diagnosticsRules';
import {
  collectLocalReferenceRangesForSymbols,
  resolveLocalSymbolOccurrenceAtOffset,
} from './language/localSymbolReferences';
import { parseKpaDocument } from './language/parser';
import {
  collectImportedKpaComponents,
  collectCanonicalTemplateTagsForComponent,
  findImportedKpaComponentForSymbol,
  getImportedKpaComponentApi,
  getImportedKpaComponentLocalSymbols,
  normalizeComponentRenameTarget,
  resolveCanonicalTemplateComponentAtOffset,
  type KpaImportedComponent,
  type KpaTemplateTag,
} from './language/templateComponents';
import {
  createTemplateSemanticVirtualFileName,
  getTemplateSemanticCompletions,
  getTemplateSemanticDefinitions,
  getTemplateSemanticHover,
  getTemplateSemanticReferences,
  getTemplateSemanticRenameInfo,
  getTemplateSemanticRenameRanges,
  type TemplateSemanticCompletion,
} from './language/templateSemantics';
import { getCanonicalTemplateIdentifierReferenceAtOffset } from './language/templateExpressions';
import { collectLocalScriptSymbols, type KpaScriptSymbol } from './language/symbols';
import { collectKpaDiagnosticsFromText, type KpaWorkspaceSymbolEntry } from './language/core';
import { getOpeningHtmlTagNameAtOffset, isOffsetInsideOpeningHtmlTag } from './utils/htmlUtils';
import {
  getCanonicalTemplateContext,
  getTemplateExpressionContext,
} from './utils/templateContext';
import { KpaWorkspaceGraph } from './workspaceGraph';

type ScriptBlock = KpaBlockNode & { kind: 'script-js' | 'script-ts' };

export interface KpaServiceMarkupContent {
  kind: 'code' | 'markdown';
  language?: string;
  value: string;
}

export interface KpaServiceHover {
  contents: readonly KpaServiceMarkupContent[];
  range: KpaLocatedRange;
}

export interface KpaServiceCompletion {
  detail?: string;
  documentation?: string;
  insertText?: string;
  insertTextFormat?: 'plain' | 'snippet';
  kind: string;
  label: string;
  replacementRange?: KpaLocatedRange;
}

export interface KpaServiceLocation {
  isDefinition?: boolean;
  range: KpaLocatedRange;
  uri: string;
}

export interface KpaServiceRenameInfo {
  placeholder: string;
  range: KpaLocatedRange;
}

export interface KpaServiceTextEdit {
  newText: string;
  range: KpaLocatedRange;
  uri: string;
}

export interface KpaServiceCodeAction {
  diagnosticCodes: readonly string[];
  edits: readonly KpaServiceTextEdit[];
  isPreferred?: boolean;
  kind: 'quickfix';
  title: string;
}

export interface KpaServiceDocumentSymbol {
  children: readonly KpaServiceDocumentSymbol[];
  detail: string;
  kind: string;
  name: string;
  range: KpaLocatedRange;
  selectionRange: KpaLocatedRange;
}

interface DocumentState {
  document: KpaDocument;
  sourcePath?: string;
  text: string;
  uri: string;
}

export class KpaLanguageService {
  private openDocuments = new Map<string, string>();
  private workspaceGraph = new KpaWorkspaceGraph();

  setWorkspaceRoots(rootPaths: readonly string[]): void {
    this.workspaceGraph.setRootPaths(rootPaths);
  }

  openDocument(uri: string, text: string): readonly string[] {
    this.openDocuments.set(uri, text);
    const filePath = toFilePath(uri);

    return filePath ? this.workspaceGraph.setOverlayText(filePath, text) : [];
  }

  updateDocument(uri: string, text: string): readonly string[] {
    this.openDocuments.set(uri, text);
    const filePath = toFilePath(uri);

    return filePath ? this.workspaceGraph.setOverlayText(filePath, text) : [];
  }

  closeDocument(uri: string): readonly string[] {
    this.openDocuments.delete(uri);
    const filePath = toFilePath(uri);

    return filePath ? this.workspaceGraph.deleteOverlayText(filePath) : [];
  }

  invalidateFilePath(filePath: string): readonly string[] {
    return this.workspaceGraph.invalidatePath(filePath);
  }

  getDiagnostics(uri: string): readonly KpaBlockDiagnostic[] {
    const state = this.getDocumentState(uri);

    if (!state) {
      return [];
    }

    return collectKpaDiagnosticsFromText(state.text, undefined, state.sourcePath).diagnostics;
  }

  getCompletions(uri: string, offset: number): readonly KpaServiceCompletion[] | undefined {
    const state = this.getDocumentState(uri);

    if (!state) {
      return undefined;
    }

    const expressionCompletions = this.collectTemplateExpressionCompletions(state, offset);

    if (expressionCompletions) {
      return expressionCompletions;
    }

    const attributeCompletions = this.getTemplateAttributeCompletions(state, offset);

    if (attributeCompletions) {
      return attributeCompletions;
    }

    return this.getTemplateTagCompletions(state, offset);
  }

  getTemplateExpressionCompletions(
    uri: string,
    offset: number,
  ): readonly KpaServiceCompletion[] | undefined {
    const state = this.getDocumentState(uri);

    if (!state) {
      return undefined;
    }

    return this.collectTemplateExpressionCompletions(state, offset);
  }

  private collectTemplateExpressionCompletions(
    state: DocumentState,
    offset: number,
  ): readonly KpaServiceCompletion[] | undefined {
    const templateExpressionContext = getTemplateExpressionContext(state.text, offset);

    if (!templateExpressionContext) {
      return undefined;
    }

    const semanticCompletions = getTemplateSemanticCompletions(
      templateExpressionContext.document,
      state.sourcePath,
      offset,
    );

    if (semanticCompletions && semanticCompletions.length > 0) {
      return semanticCompletions.map((completion) => createSemanticCompletion(completion));
    }

    return getUniqueTemplateVisibleSymbols(
      collectLocalScriptSymbols(templateExpressionContext.document).templateVisible,
    ).map((symbol) => createLocalCompletion(symbol));
  }

  private getTemplateTagCompletions(
    state: DocumentState,
    offset: number,
  ): readonly KpaServiceCompletion[] | undefined {
    const templateContext = getCanonicalTemplateContext(state.text, offset);

    if (!templateContext || getTemplateExpressionContext(state.text, offset, templateContext)) {
      return undefined;
    }

    const completions: KpaServiceCompletion[] = [];
    const seenLabels = new Set<string>();
    const importedComponents = collectImportedKpaComponents(
      templateContext.document,
      state.sourcePath,
    );

    for (const component of importedComponents) {
      for (const tagName of component.tagNames) {
        if (seenLabels.has(tagName)) {
          continue;
        }

        seenLabels.add(tagName);
        completions.push(createComponentTagCompletion(tagName, component.importPath));
      }
    }

    for (const tag of htmlTags) {
      if (seenLabels.has(tag.name)) {
        continue;
      }

      seenLabels.add(tag.name);
      completions.push(createHtmlTagCompletion(tag.name, tag.pattern, tag.description));
    }

    return completions;
  }

  private getTemplateAttributeCompletions(
    state: DocumentState,
    offset: number,
  ): readonly KpaServiceCompletion[] | undefined {
    const templateContext = getCanonicalTemplateContext(state.text, offset);

    if (
      !templateContext ||
      getTemplateExpressionContext(state.text, offset, templateContext) ||
      !isOffsetInsideOpeningHtmlTag(state.text, offset)
    ) {
      return undefined;
    }

    const tagName = getOpeningHtmlTagNameAtOffset(state.text, offset);

    if (!tagName) {
      return undefined;
    }

    const completions: KpaServiceCompletion[] = [];
    const seenLabels = new Set<string>();
    const component = collectImportedKpaComponents(templateContext.document, state.sourcePath).find(
      (candidate) => candidate.tagNames.includes(tagName),
    );
    const componentApi = component ? getImportedKpaComponentApi(component) : undefined;

    for (const prop of componentApi?.props ?? []) {
      if (seenLabels.has(prop.name)) {
        continue;
      }

      seenLabels.add(prop.name);
      completions.push(createComponentPropCompletion(prop));
    }

    for (const attribute of htmlAttributes) {
      if (seenLabels.has(attribute.label)) {
        continue;
      }

      seenLabels.add(attribute.label);
      completions.push(
        createHtmlAttributeCompletion(attribute.label, attribute.snippet, attribute.documentation),
      );
    }

    return completions;
  }

  getHover(uri: string, offset: number): KpaServiceHover | undefined {
    const state = this.getDocumentState(uri);

    if (!state) {
      return undefined;
    }

    const templateContext = getCanonicalTemplateContext(state.text, offset);

    if (!templateContext) {
      return undefined;
    }

    const componentReference = resolveCanonicalTemplateComponentAtOffset(
      templateContext.document,
      state.sourcePath,
      offset,
    );

    if (componentReference) {
      return {
        contents: createComponentHoverContents(
          componentReference.component,
          getImportedKpaComponentApi(componentReference.component),
        ),
        range: componentReference.tag.range,
      };
    }

    const templateExpressionContext = getTemplateExpressionContext(
      state.text,
      offset,
      templateContext,
    );

    if (!templateExpressionContext) {
      return undefined;
    }

    const identifierReference = getCanonicalTemplateIdentifierReferenceAtOffset(
      templateExpressionContext.document,
      offset,
    );
    const matchingSymbols = identifierReference
      ? collectLocalScriptSymbols(templateExpressionContext.document).templateVisible.filter(
          (symbol) => symbol.name === identifierReference.name,
        )
      : [];
    const semanticHover = getTemplateSemanticHover(
      templateExpressionContext.document,
      state.sourcePath,
      offset,
    );

    if (semanticHover) {
      const contents = [createSemanticHoverContent(semanticHover)];

      if (matchingSymbols.length > 0) {
        contents.push(...matchingSymbols.map((symbol) => createLocalHoverContent(symbol)));
      }

      return {
        contents,
        range: semanticHover.range,
      };
    }

    if (!identifierReference || matchingSymbols.length === 0) {
      return undefined;
    }

    return {
      contents: matchingSymbols.map((symbol) => createLocalHoverContent(symbol)),
      range: identifierReference.range,
    };
  }

  getDefinitions(uri: string, offset: number): readonly KpaServiceLocation[] | undefined {
    const state = this.getDocumentState(uri);

    if (!state) {
      return undefined;
    }

    const templateContext = getCanonicalTemplateContext(state.text, offset);

    if (!templateContext) {
      return undefined;
    }

    const componentReference = resolveCanonicalTemplateComponentAtOffset(
      templateContext.document,
      state.sourcePath,
      offset,
    );

    if (componentReference?.component.resolvedFilePath) {
      return [
        {
          range: createZeroRange(),
          uri: toFileUri(componentReference.component.resolvedFilePath),
        },
      ];
    }

    const templateExpressionContext = getTemplateExpressionContext(
      state.text,
      offset,
      templateContext,
    );

    if (!templateExpressionContext) {
      return undefined;
    }

    const currentVirtualFileName = createTemplateSemanticVirtualFileName(state.sourcePath);
    const semanticDefinitions = getTemplateSemanticDefinitions(
      templateExpressionContext.document,
      state.sourcePath,
      offset,
    );

    if (semanticDefinitions && semanticDefinitions.length > 0) {
      return semanticDefinitions.map((definition) => ({
        range: definition.range,
        uri: definition.fileName === currentVirtualFileName ? uri : toFileUri(definition.fileName),
      }));
    }

    const identifierReference = getCanonicalTemplateIdentifierReferenceAtOffset(
      templateExpressionContext.document,
      offset,
    );

    if (!identifierReference) {
      return undefined;
    }

    const matchingSymbols = collectLocalScriptSymbols(
      templateExpressionContext.document,
    ).templateVisible.filter((symbol) => symbol.name === identifierReference.name);

    if (matchingSymbols.length === 0) {
      return undefined;
    }

    return matchingSymbols.map((symbol) => ({
      range: symbol.range,
      uri,
    }));
  }

  getReferences(
    uri: string,
    offset: number,
    includeDeclaration: boolean,
  ): readonly KpaServiceLocation[] | undefined {
    const state = this.getDocumentState(uri);

    if (!state) {
      return undefined;
    }

    const componentReference = resolveCanonicalTemplateComponentAtOffset(
      state.document,
      state.sourcePath,
      offset,
    );

    if (componentReference) {
      return this.getComponentReferences(
        uri,
        state.document,
        state.sourcePath,
        componentReference.component,
        includeDeclaration,
      );
    }

    const currentVirtualFileName = createTemplateSemanticVirtualFileName(state.sourcePath);
    const semanticReferences = getTemplateSemanticReferences(
      state.document,
      state.sourcePath,
      offset,
    );

    if (semanticReferences && semanticReferences.length > 0) {
      return semanticReferences
        .filter((reference) => includeDeclaration || !reference.isDefinition)
        .map((reference) => ({
          isDefinition: reference.isDefinition,
          range: reference.range,
          uri: reference.fileName === currentVirtualFileName ? uri : toFileUri(reference.fileName),
        }));
    }

    const occurrence = resolveLocalSymbolOccurrenceAtOffset(state.document, offset);

    if (!occurrence || occurrence.symbols.length === 0) {
      return undefined;
    }

    const componentSymbols = occurrence.symbols.filter((symbol) =>
      Boolean(findImportedKpaComponentForSymbol(state.document, state.sourcePath, symbol)),
    );

    if (componentSymbols.length > 0) {
      const component = findImportedKpaComponentForSymbol(
        state.document,
        state.sourcePath,
        componentSymbols[0],
      );

      if (component) {
        return this.getComponentReferences(
          uri,
          state.document,
          state.sourcePath,
          component,
          includeDeclaration,
          componentSymbols,
        );
      }
    }

    const declarationOffsets = new Set(
      occurrence.symbols.map((symbol) => `${symbol.range.start.offset}:${symbol.range.end.offset}`),
    );

    return collectLocalReferenceRangesForSymbols(state.document, occurrence.symbols)
      .filter(
        (range) =>
          includeDeclaration ||
          !declarationOffsets.has(`${range.start.offset}:${range.end.offset}`),
      )
      .map((range) => ({
        range,
        uri,
      }));
  }

  getRenameInfo(uri: string, offset: number): KpaServiceRenameInfo | undefined {
    const state = this.getDocumentState(uri);

    if (!state) {
      return undefined;
    }

    const componentReference = resolveCanonicalTemplateComponentAtOffset(
      state.document,
      state.sourcePath,
      offset,
    );

    if (componentReference) {
      return {
        placeholder: componentReference.tag.name,
        range: componentReference.tag.range,
      };
    }

    const semanticRenameInfo = getTemplateSemanticRenameInfo(
      state.document,
      state.sourcePath,
      offset,
    );

    if (semanticRenameInfo) {
      return semanticRenameInfo;
    }

    const occurrence = resolveLocalSymbolOccurrenceAtOffset(state.document, offset);

    if (!occurrence || occurrence.symbols.length === 0) {
      return undefined;
    }

    const componentSymbols = occurrence.symbols.filter((symbol) =>
      Boolean(findImportedKpaComponentForSymbol(state.document, state.sourcePath, symbol)),
    );

    if (componentSymbols.length > 0) {
      return {
        placeholder: occurrence.symbols[0].name,
        range: occurrence.range,
      };
    }

    if (occurrence.symbols.length > 1) {
      throw new Error(
        `Template symbol [${occurrence.symbols[0].name}] ist mehrdeutig und kann nicht sicher umbenannt werden.`,
      );
    }

    return {
      placeholder: occurrence.symbols[0].name,
      range: occurrence.range,
    };
  }

  getRenameEdits(
    uri: string,
    offset: number,
    newName: string,
  ): readonly KpaServiceTextEdit[] | undefined {
    const state = this.getDocumentState(uri);

    if (!state) {
      return undefined;
    }

    const componentReference = resolveCanonicalTemplateComponentAtOffset(
      state.document,
      state.sourcePath,
      offset,
    );

    if (componentReference) {
      return this.createComponentRenameEdits(
        uri,
        state.document,
        state.sourcePath,
        componentReference.component,
        newName,
      );
    }

    const currentVirtualFileName = createTemplateSemanticVirtualFileName(state.sourcePath);
    const semanticRenameRanges = getTemplateSemanticRenameRanges(
      state.document,
      state.sourcePath,
      offset,
    );

    if (semanticRenameRanges && semanticRenameRanges.length > 0) {
      return semanticRenameRanges.map((range) => ({
        newText: newName,
        range: range.range,
        uri: range.fileName === currentVirtualFileName ? uri : toFileUri(range.fileName),
      }));
    }

    const occurrence = resolveLocalSymbolOccurrenceAtOffset(state.document, offset);

    if (!occurrence || occurrence.symbols.length === 0) {
      return undefined;
    }

    const componentSymbols = occurrence.symbols.filter((symbol) =>
      Boolean(findImportedKpaComponentForSymbol(state.document, state.sourcePath, symbol)),
    );

    if (componentSymbols.length > 0) {
      const component = findImportedKpaComponentForSymbol(
        state.document,
        state.sourcePath,
        componentSymbols[0],
      );

      if (component) {
        return this.createComponentRenameEdits(
          uri,
          state.document,
          state.sourcePath,
          component,
          newName,
          componentSymbols,
        );
      }
    }

    if (occurrence.symbols.length > 1) {
      throw new Error(
        `Template symbol [${occurrence.symbols[0].name}] ist mehrdeutig und kann nicht sicher umbenannt werden.`,
      );
    }

    return collectLocalReferenceRangesForSymbols(state.document, occurrence.symbols).map(
      (range) => ({
        newText: newName,
        range,
        uri,
      }),
    );
  }

  getCodeActions(
    uri: string,
    diagnostics: readonly KpaBlockDiagnostic[],
  ): readonly KpaServiceCodeAction[] {
    const state = this.getDocumentState(uri);

    if (!state) {
      return [];
    }

    const actions: KpaServiceCodeAction[] = [];

    for (const diagnostic of diagnostics) {
      if (diagnostic.code === kpaDiagnosticCodes.missingComponentProp) {
        const action = this.createMissingPropCodeAction(
          uri,
          diagnostic,
          diagnostic.data as MissingComponentPropDiagnosticData | undefined,
        );

        if (action) {
          actions.push(action);
        }
      }

      if (diagnostic.code === kpaDiagnosticCodes.unresolvedComponentTag) {
        const action = this.createImportComponentCodeAction(
          uri,
          state,
          diagnostic,
          diagnostic.data as UnresolvedComponentTagDiagnosticData | undefined,
        );

        if (action) {
          actions.push(action);
        }
      }
    }

    return actions;
  }

  getDocumentSymbols(uri: string): readonly KpaServiceDocumentSymbol[] {
    const state = this.getDocumentState(uri);

    if (!state) {
      return [];
    }

    const scriptSymbols = collectLocalScriptSymbols(state.document).all;

    return state.document.blocks.map((block) => createBlockDocumentSymbol(block, scriptSymbols));
  }

  getWorkspaceSymbols(query: string): readonly KpaWorkspaceSymbolEntry[] {
    return this.workspaceGraph.collectWorkspaceSymbols(query);
  }

  getOpenDocumentUrisForAffectedPaths(paths: readonly string[]): readonly string[] {
    const affectedUris = new Set<string>();

    for (const affectedPath of paths) {
      const affectedUri = toFileUri(affectedPath);

      if (this.openDocuments.has(affectedUri)) {
        affectedUris.add(affectedUri);
      }
    }

    return [...affectedUris];
  }

  private getDocumentState(uri: string): DocumentState | undefined {
    const openText = this.openDocuments.get(uri);

    if (openText !== undefined) {
      return {
        document: parseKpaDocument(openText),
        sourcePath: toFilePath(uri),
        text: openText,
        uri,
      };
    }

    const filePath = toFilePath(uri);

    if (!filePath || !fs.existsSync(filePath)) {
      return undefined;
    }

    const text = fs.readFileSync(filePath, 'utf8');

    return {
      document: parseKpaDocument(text),
      sourcePath: filePath,
      text,
      uri,
    };
  }

  private getComponentReferences(
    uri: string,
    document: KpaDocument,
    sourcePath: string | undefined,
    component: KpaImportedComponent,
    includeDeclaration: boolean,
    componentSymbols = getImportedKpaComponentLocalSymbols(document, sourcePath, component),
  ): readonly KpaServiceLocation[] {
    const locations: KpaServiceLocation[] = [];
    const localDeclarationOffsets = new Set(
      componentSymbols.map((symbol) => `${symbol.range.start.offset}:${symbol.range.end.offset}`),
    );

    for (const range of deduplicateRanges([
      ...collectLocalReferenceRangesForSymbols(document, componentSymbols),
      ...collectCanonicalTemplateTagsForComponent(document, component).map((tag) => tag.range),
    ])) {
      if (
        !includeDeclaration &&
        localDeclarationOffsets.has(`${range.start.offset}:${range.end.offset}`)
      ) {
        continue;
      }

      locations.push({ range, uri });
    }

    if (component.resolvedFilePath) {
      const workspaceUsages = this.workspaceGraph.collectComponentUsagesForResolvedFile(
        component.resolvedFilePath,
      );

      for (const workspaceUsage of workspaceUsages) {
        for (const usage of workspaceUsage.usages) {
          const declarationOffsetKey = `${usage.component.importRange.start.offset}:${usage.component.importRange.end.offset}`;
          const workspaceUri = toFileUri(workspaceUsage.filePath);

          for (const range of usage.symbolRanges) {
            if (
              !includeDeclaration &&
              range.start.offset === usage.component.importRange.start.offset &&
              range.end.offset === usage.component.importRange.end.offset
            ) {
              continue;
            }

            locations.push({ range, uri: workspaceUri });
          }

          for (const tag of usage.tags) {
            if (
              !includeDeclaration &&
              `${tag.range.start.offset}:${tag.range.end.offset}` === declarationOffsetKey
            ) {
              continue;
            }

            locations.push({ range: tag.range, uri: workspaceUri });
          }
        }
      }
    }

    return deduplicateLocations(locations);
  }

  private createComponentRenameEdits(
    uri: string,
    document: KpaDocument,
    sourcePath: string | undefined,
    component: KpaImportedComponent,
    newName: string,
    componentSymbols = getImportedKpaComponentLocalSymbols(document, sourcePath, component),
  ): readonly KpaServiceTextEdit[] {
    const normalizedTarget = normalizeComponentRenameTarget(newName);
    const edits: KpaServiceTextEdit[] = [];

    applyComponentRenameEdits(
      edits,
      uri,
      collectLocalReferenceRangesForSymbols(document, componentSymbols),
      collectCanonicalTemplateTagsForComponent(document, component),
      normalizedTarget.symbolName,
      normalizedTarget.kebabTagName,
    );

    if (component.resolvedFilePath) {
      const workspaceUsages = this.workspaceGraph.collectComponentUsagesForResolvedFile(
        component.resolvedFilePath,
      );

      for (const workspaceUsage of workspaceUsages) {
        const workspaceUri = toFileUri(workspaceUsage.filePath);

        if (workspaceUri === uri) {
          continue;
        }

        for (const usage of workspaceUsage.usages) {
          applyComponentRenameEdits(
            edits,
            workspaceUri,
            usage.symbolRanges,
            usage.tags,
            normalizedTarget.symbolName,
            normalizedTarget.kebabTagName,
          );
        }
      }
    }

    return edits;
  }

  private createMissingPropCodeAction(
    uri: string,
    diagnostic: KpaBlockDiagnostic,
    data: MissingComponentPropDiagnosticData | undefined,
  ): KpaServiceCodeAction | undefined {
    if (!data) {
      return undefined;
    }

    return {
      diagnosticCodes: diagnostic.code !== undefined ? [String(diagnostic.code)] : [],
      edits: [
        {
          newText: ` ${data.propName}={${createPropPlaceholder(data.propTypeText)}}`,
          range: createInsertionRange(data.insertOffset),
          uri,
        },
      ],
      isPreferred: true,
      kind: 'quickfix',
      title: `Prop [${data.propName}] fuer [${data.componentName}] ergaenzen`,
    };
  }

  private createImportComponentCodeAction(
    uri: string,
    state: DocumentState,
    diagnostic: KpaBlockDiagnostic,
    data: UnresolvedComponentTagDiagnosticData | undefined,
  ): KpaServiceCodeAction | undefined {
    if (!data || !state.sourcePath) {
      return undefined;
    }

    const targetPath = this.workspaceGraph.findBestComponentFilePathByName(
      data.componentName,
      state.sourcePath,
      [state.sourcePath],
    );

    if (!targetPath) {
      return undefined;
    }

    const importPath = createRelativeKpaImportPath(state.sourcePath, targetPath);
    const importText = `  import ${data.componentName} from '${importPath}';`;
    const insertion = createImportInsertion(state, importText);

    return {
      diagnosticCodes: diagnostic.code !== undefined ? [String(diagnostic.code)] : [],
      edits: [
        {
          newText: insertion.text,
          range: insertion.range,
          uri,
        },
      ],
      isPreferred: true,
      kind: 'quickfix',
      title: `Komponente [${data.componentName}] importieren`,
    };
  }
}

function createLocalCompletion(symbol: KpaScriptSymbol): KpaServiceCompletion {
  return {
    documentation: createLocalSymbolDocumentation(symbol),
    kind: symbol.kind,
    label: symbol.name,
    detail: `Local ${symbol.kind} from [${symbol.blockName}]`,
  };
}

function createHtmlTagCompletion(
  label: string,
  snippet: string,
  documentation: string,
): KpaServiceCompletion {
  return {
    documentation,
    insertText: snippet,
    insertTextFormat: 'snippet',
    kind: 'snippet',
    label,
  };
}

function createComponentTagCompletion(label: string, importPath: string): KpaServiceCompletion {
  return {
    detail: 'Imported Koppa component',
    documentation: `Imported Koppa component from \`${importPath}\`.`,
    insertText: `<${label}>$0</${label}>`,
    insertTextFormat: 'snippet',
    kind: 'module',
    label,
  };
}

function createComponentPropCompletion(prop: {
  name: string;
  typeText?: string;
  optional: boolean;
}): KpaServiceCompletion {
  return {
    detail: prop.typeText
      ? `Component prop${prop.optional ? ' (optional)' : ''}: ${prop.typeText}`
      : `Component prop${prop.optional ? ' (optional)' : ''}`,
    documentation: `Imported component prop \`${prop.name}\`${prop.typeText ? ` of type \`${prop.typeText}\`` : ''}.`,
    insertText: `${prop.name}={$1}`,
    insertTextFormat: 'snippet',
    kind: 'property',
    label: prop.name,
  };
}

function createHtmlAttributeCompletion(
  label: string,
  snippet: string,
  documentation: string,
): KpaServiceCompletion {
  return {
    documentation,
    insertText: snippet,
    insertTextFormat: 'snippet',
    kind: 'property',
    label,
  };
}

function createSemanticCompletion(completion: TemplateSemanticCompletion): KpaServiceCompletion {
  return {
    detail: completion.detail,
    documentation: completion.documentation,
    insertText: completion.name,
    insertTextFormat: 'plain',
    kind: completion.kind,
    label: completion.name,
    replacementRange: completion.replacementRange,
  };
}

function createLocalHoverContent(symbol: KpaScriptSymbol): KpaServiceMarkupContent {
  return {
    kind: 'markdown',
    value: [
      '```typescript',
      `${symbol.kind} ${symbol.name}`,
      '```',
      '',
      `Template-visible local ${symbol.kind} from \`[${symbol.blockName}]\` block.${
        symbol.isExported ? '\n\nExported from this file.' : ''
      }`,
    ].join('\n'),
  };
}

function createComponentHoverContents(
  component: {
    name: string;
    tagNames: readonly string[];
    importPath: string;
    resolvedFilePath?: string;
  },
  api?: {
    props: readonly { name: string; typeText?: string; optional: boolean }[];
    emits: readonly { name: string }[];
    slots: readonly { name: string }[];
  },
): readonly KpaServiceMarkupContent[] {
  const parts = [
    '```typescript',
    `component ${component.name}`,
    '```',
    '',
    `Imported Koppa component from \`${component.importPath}\`.`,
  ];

  if (component.tagNames.length > 1) {
    parts.push(
      '',
      `Template tag aliases: ${component.tagNames.map((tagName) => `\`${tagName}\``).join(', ')}.`,
    );
  }

  parts.push(
    '',
    component.resolvedFilePath
      ? `Resolved workspace file: \`${component.resolvedFilePath}\`.`
      : 'Workspace file could not be resolved.',
  );

  if (api?.props.length) {
    parts.push(
      '',
      `Props: ${api.props
        .map(
          (prop) =>
            `\`${prop.name}${prop.optional ? '?' : ''}\`${prop.typeText ? `: \`${prop.typeText}\`` : ''}`,
        )
        .join(', ')}.`,
    );
  }

  if (api?.emits.length) {
    parts.push('', `Emits: ${api.emits.map((entry) => `\`${entry.name}\``).join(', ')}.`);
  }

  if (api?.slots.length) {
    parts.push('', `Slots: ${api.slots.map((entry) => `\`${entry.name}\``).join(', ')}.`);
  }

  return [
    {
      kind: 'markdown',
      value: parts.join('\n'),
    },
  ];
}

function createSemanticHoverContent(hover: {
  displayText: string;
  documentation?: string;
}): KpaServiceMarkupContent {
  return {
    kind: 'markdown',
    value: ['```typescript', hover.displayText, '```', hover.documentation ?? '']
      .filter((part) => part.length > 0)
      .join('\n\n'),
  };
}

function createLocalSymbolDocumentation(symbol: KpaScriptSymbol): string {
  const exportText = symbol.isExported ? ' Exported from this file.' : '';

  return `Template-visible local ${symbol.kind} from \`[${symbol.blockName}]\` block.${exportText}`;
}

function getUniqueTemplateVisibleSymbols(
  symbols: readonly KpaScriptSymbol[],
): readonly KpaScriptSymbol[] {
  const seenNames = new Set<string>();

  return symbols.filter((symbol) => {
    if (seenNames.has(symbol.name)) {
      return false;
    }

    seenNames.add(symbol.name);
    return true;
  });
}

function createBlockDocumentSymbol(
  block: KpaBlockNode,
  scriptSymbols: readonly KpaScriptSymbol[],
): KpaServiceDocumentSymbol {
  return {
    children: scriptSymbols
      .filter((symbol) => isSymbolInsideBlock(symbol, block))
      .map(createScriptDocumentSymbol),
    detail: describeBlockKind(block.kind),
    kind: mapBlockSymbolKind(block.kind),
    name: `[${block.name}]`,
    range: block.range,
    selectionRange: block.openTag.range,
  };
}

function createScriptDocumentSymbol(symbol: KpaScriptSymbol): KpaServiceDocumentSymbol {
  return {
    children: [],
    detail: symbol.kind,
    kind: mapScriptSymbolKind(symbol.kind),
    name: symbol.name,
    range: symbol.range,
    selectionRange: symbol.range,
  };
}

function isSymbolInsideBlock(symbol: KpaScriptSymbol, block: KpaBlockNode): boolean {
  return (
    symbol.range.start.offset >= block.contentRange.start.offset &&
    symbol.range.end.offset <= block.contentRange.end.offset
  );
}

function mapBlockSymbolKind(kind: KpaBlockKind): string {
  switch (kind) {
    case 'template':
    case 'alias-html':
    case 'alias-tpl':
      return 'namespace';
    case 'script-ts':
    case 'script-js':
      return 'module';
    case 'style-css':
    case 'style-sass':
    case 'style-scss':
      return 'package';
    case 'unknown':
      return 'object';
  }
}

function mapScriptSymbolKind(kind: KpaScriptSymbol['kind']): string {
  switch (kind) {
    case 'class':
      return 'class';
    case 'enum':
      return 'enum';
    case 'function':
      return 'function';
    case 'import':
    case 'import-type':
      return 'module';
    case 'interface':
      return 'interface';
    case 'type-alias':
      return 'type';
    case 'variable':
      return 'variable';
  }
}

function describeBlockKind(kind: KpaBlockKind): string {
  switch (kind) {
    case 'template':
      return 'Canonical template block';
    case 'script-ts':
      return 'TypeScript block';
    case 'script-js':
      return 'JavaScript block';
    case 'style-css':
      return 'CSS block';
    case 'style-sass':
      return 'Sass block';
    case 'style-scss':
      return 'SCSS block';
    case 'alias-html':
      return 'Compatibility HTML alias block';
    case 'alias-tpl':
      return 'Compatibility template alias block';
    case 'unknown':
      return 'Unknown block';
  }
}

function applyComponentRenameEdits(
  edits: KpaServiceTextEdit[],
  uri: string,
  symbolRanges: readonly KpaLocatedRange[],
  tags: readonly KpaTemplateTag[],
  symbolName: string,
  kebabTagName: string,
): void {
  for (const range of symbolRanges) {
    edits.push({
      newText: symbolName,
      range,
      uri,
    });
  }

  for (const tag of tags) {
    edits.push({
      newText: tag.name.includes('-') ? kebabTagName : symbolName,
      range: tag.range,
      uri,
    });
  }
}

function deduplicateRanges(ranges: readonly KpaLocatedRange[]): readonly KpaLocatedRange[] {
  const seenRanges = new Set<string>();

  return ranges.filter((range) => {
    const key = `${range.start.offset}:${range.end.offset}`;

    if (seenRanges.has(key)) {
      return false;
    }

    seenRanges.add(key);
    return true;
  });
}

function deduplicateLocations(
  locations: readonly KpaServiceLocation[],
): readonly KpaServiceLocation[] {
  const seenLocations = new Set<string>();

  return locations.filter((location) => {
    const key = `${location.uri}:${location.range.start.offset}:${location.range.end.offset}`;

    if (seenLocations.has(key)) {
      return false;
    }

    seenLocations.add(key);
    return true;
  });
}

function createRelativeKpaImportPath(sourcePath: string, targetPath: string): string {
  let relativePath = path.relative(path.dirname(sourcePath), targetPath).replace(/\\/g, '/');

  if (relativePath.endsWith('/index.kpa')) {
    relativePath = relativePath.slice(0, -'/index.kpa'.length);
  } else if (relativePath.endsWith('.kpa')) {
    relativePath = relativePath.slice(0, -'.kpa'.length);
  }

  if (!relativePath.startsWith('.')) {
    relativePath = `./${relativePath}`;
  }

  return relativePath;
}

function createImportInsertion(
  state: DocumentState,
  importStatement: string,
): {
  range: KpaLocatedRange;
  text: string;
} {
  const scriptBlock = state.document.blocks.find(isScriptBlock);

  if (!scriptBlock) {
    return {
      range: createInsertionRange(state.text.length, state.document),
      text: `${state.text.endsWith('\n') ? '\n' : '\n\n'}[ts]\n${importStatement}\n[/ts]\n`,
    };
  }

  const content = state.text.slice(
    scriptBlock.contentRange.start.offset,
    scriptBlock.contentRange.end.offset,
  );
  const sourceFile = ts.createSourceFile(
    scriptBlock.kind === 'script-ts' ? 'embedded.kpa.ts' : 'embedded.kpa.js',
    content,
    ts.ScriptTarget.Latest,
    true,
    scriptBlock.kind === 'script-ts' ? ts.ScriptKind.TS : ts.ScriptKind.JS,
  );
  const importStatements = sourceFile.statements.filter(ts.isImportDeclaration);
  const insertOffset =
    importStatements.length > 0
      ? scriptBlock.contentRange.start.offset + importStatements[importStatements.length - 1].end
      : scriptBlock.contentRange.start.offset;

  return {
    range: createInsertionRange(insertOffset, state.document),
    text: `\n${importStatement}`,
  };
}

function createPropPlaceholder(typeText: string | undefined): string {
  const normalizedTypeText = typeText?.replace(/\s+/g, '') ?? '';

  if (normalizedTypeText.includes('string') || /'[^']*'|"[^"]*"/.test(typeText ?? '')) {
    return '""';
  }

  if (normalizedTypeText.includes('number')) {
    return '0';
  }

  if (normalizedTypeText.includes('boolean')) {
    return 'false';
  }

  if (normalizedTypeText.includes('[]') || normalizedTypeText.includes('Array<')) {
    return '[]';
  }

  if (
    normalizedTypeText.includes('{') ||
    normalizedTypeText.includes('object') ||
    normalizedTypeText.includes('Record<')
  ) {
    return '{}';
  }

  return 'undefined';
}

function createInsertionRange(offset: number, document?: KpaDocument): KpaLocatedRange {
  if (!document) {
    return createZeroRange();
  }

  const lineStarts = document.lineStarts;
  let line = 0;

  while (line + 1 < lineStarts.length && lineStarts[line + 1] <= offset) {
    line++;
  }

  const character = offset - lineStarts[line];

  return {
    end: {
      character,
      line,
      offset,
    },
    start: {
      character,
      line,
      offset,
    },
  };
}

function createZeroRange(): KpaLocatedRange {
  return {
    end: { character: 0, line: 0, offset: 0 },
    start: { character: 0, line: 0, offset: 0 },
  };
}

function isScriptBlock(block: KpaBlockNode): block is ScriptBlock {
  return block.kind === 'script-ts' || block.kind === 'script-js';
}

function toFilePath(uri: string): string | undefined {
  if (!uri.startsWith('file:')) {
    return undefined;
  }

  return fileURLToPath(uri);
}

function toFileUri(filePath: string): string {
  return pathToFileURL(path.resolve(filePath)).toString();
}
