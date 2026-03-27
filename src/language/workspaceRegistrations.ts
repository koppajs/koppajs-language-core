import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import type { KpaLocatedRange } from './ast';
import { getNearestProjectConfigPath, resolveWorkspaceImportPath } from './projectConfig';
import { createLocatedRange, createLineStarts } from './sourcePositions';

export interface KpaWorkspaceComponentRegistration {
  componentName: string;
  registrationFilePath: string;
  registrationRange: KpaLocatedRange;
  resolvedFilePath: string;
  tagName: string;
}

const excludedDirectoryNames = new Set(['.git', 'coverage', 'dist', 'node_modules', 'out']);
const supportedScriptExtensions = new Set(['.cjs', '.cts', '.js', '.jsx', '.mjs', '.mts', '.ts', '.tsx']);

export function collectWorkspaceComponentRegistrations(
  sourcePath: string | undefined,
): readonly KpaWorkspaceComponentRegistration[] {
  if (!sourcePath) {
    return [];
  }

  const workspaceRoot = getWorkspaceRootPath(sourcePath);
  const registrations: KpaWorkspaceComponentRegistration[] = [];
  const seenKeys = new Set<string>();

  for (const scriptFilePath of collectScriptFilePathsRecursively(workspaceRoot)) {
    for (const registration of collectComponentRegistrationsFromScriptFile(scriptFilePath)) {
      const registrationKey = [
        registration.registrationFilePath,
        registration.resolvedFilePath,
        registration.tagName,
        registration.registrationRange.start.offset,
        registration.registrationRange.end.offset,
      ].join(':');

      if (seenKeys.has(registrationKey)) {
        continue;
      }

      seenKeys.add(registrationKey);
      registrations.push(registration);
    }
  }

  return registrations;
}

export function findWorkspaceComponentRegistrationByTagName(
  sourcePath: string | undefined,
  tagName: string,
): KpaWorkspaceComponentRegistration | undefined {
  const registrations = collectWorkspaceComponentRegistrations(sourcePath).filter(
    (registration) => registration.tagName === tagName,
  );

  if (registrations.length === 0) {
    return undefined;
  }

  return [...registrations].sort((left, right) => {
    const scoreDifference =
      scoreRegistrationCandidate(sourcePath, left) - scoreRegistrationCandidate(sourcePath, right);

    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    return left.registrationFilePath.localeCompare(right.registrationFilePath);
  })[0];
}

function collectComponentRegistrationsFromScriptFile(
  filePath: string,
): readonly KpaWorkspaceComponentRegistration[] {
  let text = '';

  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch {
    return [];
  }

  const sourceFile = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    getScriptKindForPath(filePath),
  );
  const lineStarts = createLineStarts(text);
  const importedKpaBindings = collectImportedKpaBindings(sourceFile, filePath);
  const registrations: KpaWorkspaceComponentRegistration[] = [];

  visitNodes(sourceFile, (node) => {
    if (!ts.isCallExpression(node) || !isCoreTakeCall(node.expression)) {
      return;
    }

    const [componentArgument, tagArgument] = node.arguments;

    if (!componentArgument || !tagArgument || !ts.isIdentifier(componentArgument)) {
      return;
    }

    const resolvedFilePath = importedKpaBindings.get(componentArgument.text);

    if (!resolvedFilePath || !isSupportedStringLiteral(tagArgument) || tagArgument.text.length === 0) {
      return;
    }

    registrations.push({
      componentName: toPascalCase(tagArgument.text),
      registrationFilePath: filePath,
      registrationRange: createStringLiteralContentRange(lineStarts, tagArgument),
      resolvedFilePath,
      tagName: tagArgument.text,
    });
  });

  return registrations;
}

function collectImportedKpaBindings(
  sourceFile: ts.SourceFile,
  sourcePath: string,
): ReadonlyMap<string, string> {
  const bindings = new Map<string, string>();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }

    const importClause = statement.importClause;

    if (!importClause || importClause.isTypeOnly) {
      continue;
    }

    const resolvedFilePath = resolveWorkspaceImportPath(
      statement.moduleSpecifier.text,
      sourcePath,
      ['.kpa'],
    );

    if (!resolvedFilePath) {
      continue;
    }

    if (importClause.name) {
      bindings.set(importClause.name.text, resolvedFilePath);
    }

    if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
      for (const element of importClause.namedBindings.elements) {
        if (!element.isTypeOnly) {
          bindings.set(element.name.text, resolvedFilePath);
        }
      }
    }
  }

  return bindings;
}

function visitNodes(node: ts.Node, callback: (node: ts.Node) => void): void {
  callback(node);
  ts.forEachChild(node, (child) => visitNodes(child, callback));
}

function isCoreTakeCall(expression: ts.LeftHandSideExpression): boolean {
  return ts.isPropertyAccessExpression(expression) && expression.name.text === 'take';
}

function isSupportedStringLiteral(
  node: ts.Expression,
): node is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);
}

function createStringLiteralContentRange(
  lineStarts: readonly number[],
  node: ts.StringLiteral | ts.NoSubstitutionTemplateLiteral,
): KpaLocatedRange {
  const contentStartOffset = node.getStart() + 1;
  const contentEndOffset = contentStartOffset + node.text.length;

  return createLocatedRange(lineStarts, contentStartOffset, contentEndOffset);
}

function getWorkspaceRootPath(sourcePath: string): string {
  const configPath = getNearestProjectConfigPath(sourcePath);

  return configPath ? path.dirname(configPath) : path.dirname(sourcePath);
}

function collectScriptFilePathsRecursively(rootPath: string): readonly string[] {
  if (!fs.existsSync(rootPath)) {
    return [];
  }

  const scriptFilePaths: string[] = [];

  visitDirectory(rootPath, scriptFilePaths);

  return scriptFilePaths;
}

function visitDirectory(directoryPath: string, scriptFilePaths: string[]): void {
  for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      if (excludedDirectoryNames.has(entry.name)) {
        continue;
      }

      visitDirectory(entryPath, scriptFilePaths);
      continue;
    }

    if (entry.isFile() && supportedScriptExtensions.has(path.extname(entry.name))) {
      scriptFilePaths.push(entryPath);
    }
  }
}

function getScriptKindForPath(filePath: string): ts.ScriptKind {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === '.jsx') {
    return ts.ScriptKind.JSX;
  }

  if (extension === '.tsx') {
    return ts.ScriptKind.TSX;
  }

  if (extension === '.js' || extension === '.mjs' || extension === '.cjs') {
    return ts.ScriptKind.JS;
  }

  return ts.ScriptKind.TS;
}

function scoreRegistrationCandidate(
  sourcePath: string | undefined,
  registration: KpaWorkspaceComponentRegistration,
): number {
  if (!sourcePath) {
    return 0;
  }

  return (
    scorePathDistance(sourcePath, registration.registrationFilePath) * 2 +
    scorePathDistance(sourcePath, registration.resolvedFilePath)
  );
}

function scorePathDistance(sourcePath: string, targetPath: string): number {
  const relativePath = path.relative(path.dirname(sourcePath), targetPath).replace(/\\/g, '/');
  const segmentCount = relativePath.split('/').filter((segment) => segment.length > 0).length;
  const parentPenalty = relativePath.startsWith('..') ? 50 : 0;
  const sameDirectoryBonus = path.dirname(sourcePath) === path.dirname(targetPath) ? -10 : 0;

  return parentPenalty + segmentCount + sameDirectoryBonus;
}

function toPascalCase(name: string): string {
  return name
    .split(/[-_\s]+/)
    .filter((part) => part.length > 0)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');
}
