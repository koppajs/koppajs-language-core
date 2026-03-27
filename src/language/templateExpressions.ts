import ts from 'typescript';
import { canonicalTemplateBlock } from '../data/kpaBlocks';
import type { KpaBlockNode, KpaDocument, KpaLocatedRange } from './ast';
import { createLocatedRange } from './sourcePositions';

const simpleTemplateRootReferencePattern =
  /^([A-Za-z_$][\w$]*)(?:(?:\??\.[A-Za-z_$][\w$]*)|\[[^[\]]*\]|\([^()]*\))*$/;

export interface KpaTemplateExpression {
  block: KpaBlockNode;
  range: KpaLocatedRange;
  contentRange: KpaLocatedRange;
  text: string;
  contentText: string;
}

export interface KpaTemplateRootReference {
  name: string;
  range: KpaLocatedRange;
  expression: KpaTemplateExpression;
}

export interface KpaTemplateIdentifierReference {
  name: string;
  range: KpaLocatedRange;
  expression: KpaTemplateExpression;
}

export function collectCanonicalTemplateExpressions(
  document: KpaDocument,
): readonly KpaTemplateExpression[] {
  return document.blocks.flatMap((block) =>
    block.name === canonicalTemplateBlock ? collectExpressionsFromBlock(document, block) : [],
  );
}

export function getCanonicalTemplateExpressionAtOffset(
  document: KpaDocument,
  offset: number,
): KpaTemplateExpression | undefined {
  return collectCanonicalTemplateExpressions(document).find(
    (expression) =>
      offset >= expression.contentRange.start.offset && offset <= expression.contentRange.end.offset,
  );
}

export function getTemplateExpressionRootReference(
  document: KpaDocument,
  expression: KpaTemplateExpression,
): KpaTemplateRootReference | undefined {
  const leadingWhitespaceLength = expression.contentText.match(/^\s*/)?.[0].length ?? 0;
  const trimmedContent = expression.contentText.trim();

  if (trimmedContent.length === 0) {
    return undefined;
  }

  const match = simpleTemplateRootReferencePattern.exec(trimmedContent);

  if (!match) {
    return undefined;
  }

  const name = match[1];
  const startOffset = expression.contentRange.start.offset + leadingWhitespaceLength;

  return {
    name,
    range: createLocatedRange(document.lineStarts, startOffset, startOffset + name.length),
    expression,
  };
}

export function collectCanonicalTemplateIdentifierReferences(
  document: KpaDocument,
): readonly KpaTemplateIdentifierReference[] {
  return collectCanonicalTemplateExpressions(document).flatMap((expression) =>
    collectTemplateIdentifierReferences(document, expression),
  );
}

export function getCanonicalTemplateIdentifierReferenceAtOffset(
  document: KpaDocument,
  offset: number,
): KpaTemplateIdentifierReference | undefined {
  return collectCanonicalTemplateIdentifierReferences(document).find(
    (reference) => offset >= reference.range.start.offset && offset <= reference.range.end.offset,
  );
}

function collectExpressionsFromBlock(
  document: KpaDocument,
  block: KpaBlockNode,
): readonly KpaTemplateExpression[] {
  const content = document.text.slice(
    block.contentRange.start.offset,
    block.contentRange.end.offset,
  );
  const expressions: KpaTemplateExpression[] = [];

  for (let index = 0; index < content.length; index++) {
    if (!startsMustacheExpression(content, index)) {
      if (content[index] === '<') {
        expressions.push(...collectDynamicBindingExpressionsAt(document, block, content, index));
      }

      continue;
    }

    const expressionEnd = findMustacheExpressionEnd(content, index + 2);

    if (expressionEnd === undefined) {
      expressions.push(createTemplateExpression(document, block, index, content.length));
      break;
    }

    expressions.push(createTemplateExpression(document, block, index, expressionEnd + 2));
    index = Math.max(index, expressionEnd + 1);
  }

  return expressions;
}

function collectDynamicBindingExpressionsAt(
  document: KpaDocument,
  block: KpaBlockNode,
  content: string,
  index: number,
): readonly KpaTemplateExpression[] {
  let cursor = index + 1;

  if (content[cursor] === '/') {
    return [];
  }

  while (isWhitespace(content[cursor])) {
    cursor++;
  }

  if (!isTagNameStart(content[cursor])) {
    return [];
  }

  cursor++;

  while (isTagNameCharacter(content[cursor])) {
    cursor++;
  }

  const expressions: KpaTemplateExpression[] = [];

  while (cursor < content.length) {
    while (isWhitespace(content[cursor])) {
      cursor++;
    }

    if (content[cursor] === '>') {
      return expressions;
    }

    if (content[cursor] === '/' && content[cursor + 1] === '>') {
      return expressions;
    }

    const parsedAttribute = readAttributeAt(content, cursor);

    if (!parsedAttribute) {
      cursor++;
      continue;
    }

    cursor = parsedAttribute.nextIndex;

    if (!parsedAttribute.expressionRange) {
      continue;
    }

    expressions.push(
      createRawTemplateExpression(
        document,
        block,
        parsedAttribute.expressionRange.startOffsetInBlock,
        parsedAttribute.expressionRange.endOffsetInBlock,
      ),
    );
  }

  return expressions;
}

function startsMustacheExpression(content: string, index: number): boolean {
  return content[index] === '{' && content[index + 1] === '{';
}

function findMustacheExpressionEnd(content: string, startIndex: number): number | undefined {
  let cursor = startIndex;
  let nestedBraceDepth = 0;
  let quote: '"' | "'" | '`' | undefined;
  let escaped = false;

  while (cursor < content.length) {
    const character = content[cursor];

    if (quote) {
      if (escaped) {
        escaped = false;
        cursor++;
        continue;
      }

      if (character === '\\') {
        escaped = true;
        cursor++;
        continue;
      }

      if (character === quote) {
        quote = undefined;
      }

      cursor++;
      continue;
    }

    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      cursor++;
      continue;
    }

    if (character === '{') {
      nestedBraceDepth++;
      cursor++;
      continue;
    }

    if (character === '}') {
      if (nestedBraceDepth > 0) {
        nestedBraceDepth--;
        cursor++;
        continue;
      }

      if (content[cursor + 1] === '}') {
        return cursor;
      }
    }

    cursor++;
  }

  return undefined;
}

function createTemplateExpression(
  document: KpaDocument,
  block: KpaBlockNode,
  startOffsetInBlock: number,
  endOffsetInBlock: number,
): KpaTemplateExpression {
  const blockStartOffset = block.contentRange.start.offset;
  const startOffset = blockStartOffset + startOffsetInBlock;
  const endOffset = blockStartOffset + endOffsetInBlock;
  const hasClosingDelimiter =
    endOffset - startOffset >= 4 &&
    document.text[endOffset - 2] === '}' &&
    document.text[endOffset - 1] === '}';
  const contentEndOffset = hasClosingDelimiter ? endOffset - 2 : endOffset;

  return {
    block,
    range: createLocatedRange(document.lineStarts, startOffset, endOffset),
    contentRange: createLocatedRange(document.lineStarts, startOffset + 2, contentEndOffset),
    text: document.text.slice(startOffset, endOffset),
    contentText: document.text.slice(startOffset + 2, contentEndOffset),
  };
}

function createRawTemplateExpression(
  document: KpaDocument,
  block: KpaBlockNode,
  startOffsetInBlock: number,
  endOffsetInBlock: number,
): KpaTemplateExpression {
  const blockStartOffset = block.contentRange.start.offset;
  const startOffset = blockStartOffset + startOffsetInBlock;
  const endOffset = blockStartOffset + endOffsetInBlock;
  const text = document.text.slice(startOffset, endOffset);

  return {
    block,
    range: createLocatedRange(document.lineStarts, startOffset, endOffset),
    contentRange: createLocatedRange(document.lineStarts, startOffset, endOffset),
    text,
    contentText: text,
  };
}

function collectTemplateIdentifierReferences(
  document: KpaDocument,
  expression: KpaTemplateExpression,
): readonly KpaTemplateIdentifierReference[] {
  const wrappedExpressionText = `(${expression.contentText})`;
  const sourceFile = ts.createSourceFile(
    'embedded.kpa.template.ts',
    wrappedExpressionText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const [statement] = sourceFile.statements;

  if (!statement || !ts.isExpressionStatement(statement)) {
    return [];
  }

  const rootExpression = unwrapParenthesizedExpression(statement.expression);
  const references: KpaTemplateIdentifierReference[] = [];

  visit(rootExpression);

  return references;

  function visit(node: ts.Node): void {
    if (node !== rootExpression && isNestedTemplateScopeBoundary(node)) {
      return;
    }

    if (ts.isIdentifier(node) && isTemplateIdentifierReferenceNode(node)) {
      references.push({
        name: node.text,
        range: toExpressionDocumentRange(document, expression, node, sourceFile),
        expression,
      });
      return;
    }

    ts.forEachChild(node, visit);
  }
}

function unwrapParenthesizedExpression(expression: ts.Expression): ts.Expression {
  let currentExpression = expression;

  while (ts.isParenthesizedExpression(currentExpression)) {
    currentExpression = currentExpression.expression;
  }

  return currentExpression;
}

function readAttributeAt(
  content: string,
  index: number,
): {
  expressionRange?: {
    startOffsetInBlock: number;
    endOffsetInBlock: number;
  };
  nextIndex: number;
} | undefined {
  let cursor = index;

  if (!isAttributeNameStart(content[cursor])) {
    return undefined;
  }

  cursor++;

  while (isAttributeNameCharacter(content[cursor])) {
    cursor++;
  }

  const name = content.slice(index, cursor);
  const isDynamicBinding = name.startsWith(':') || name.startsWith('bind:');

  while (isWhitespace(content[cursor])) {
    cursor++;
  }

  if (content[cursor] !== '=') {
    return { nextIndex: cursor };
  }

  cursor++;

  while (isWhitespace(content[cursor])) {
    cursor++;
  }

  const quote = content[cursor];

  if (quote === '"' || quote === "'") {
    const valueStart = cursor + 1;
    const valueEnd = findQuotedAttributeValueEnd(content, valueStart, quote);

    return {
      expressionRange:
        isDynamicBinding && valueEnd > valueStart
          ? {
              startOffsetInBlock: valueStart,
              endOffsetInBlock: valueEnd,
            }
          : undefined,
      nextIndex: valueEnd < content.length && content[valueEnd] === quote ? valueEnd + 1 : valueEnd,
    };
  }

  const valueStart = cursor;

  while (
    cursor < content.length &&
    !isWhitespace(content[cursor]) &&
    content[cursor] !== '>' &&
    !(content[cursor] === '/' && content[cursor + 1] === '>')
  ) {
    cursor++;
  }

  return {
    expressionRange:
      isDynamicBinding && cursor > valueStart
        ? {
            startOffsetInBlock: valueStart,
            endOffsetInBlock: cursor,
          }
        : undefined,
    nextIndex: cursor,
  };
}

function findQuotedAttributeValueEnd(
  content: string,
  startIndex: number,
  quote: '"' | "'",
): number {
  let cursor = startIndex;
  let escaped = false;

  while (cursor < content.length) {
    const character = content[cursor];

    if (escaped) {
      escaped = false;
      cursor++;
      continue;
    }

    if (character === '\\') {
      escaped = true;
      cursor++;
      continue;
    }

    if (character === quote) {
      return cursor;
    }

    cursor++;
  }

  return cursor;
}

function isNestedTemplateScopeBoundary(node: ts.Node): boolean {
  return ts.isFunctionLike(node) || ts.isClassLike(node);
}

function isTemplateIdentifierReferenceNode(node: ts.Identifier): boolean {
  const parent = node.parent;

  if (ts.isPropertyAccessExpression(parent) && parent.name === node) {
    return false;
  }

  if (ts.isPropertyAssignment(parent) && parent.name === node) {
    return false;
  }

  if (ts.isBindingElement(parent) && (parent.name === node || parent.propertyName === node)) {
    return false;
  }

  if (ts.isParameter(parent) && parent.name === node) {
    return false;
  }

  if (ts.isVariableDeclaration(parent) && parent.name === node) {
    return false;
  }

  if (ts.isFunctionExpression(parent) && parent.name === node) {
    return false;
  }

  if (ts.isFunctionDeclaration(parent) && parent.name === node) {
    return false;
  }

  if (ts.isClassExpression(parent) && parent.name === node) {
    return false;
  }

  if (ts.isClassDeclaration(parent) && parent.name === node) {
    return false;
  }

  if (ts.isLabeledStatement(parent) && parent.label === node) {
    return false;
  }

  if (
    ts.isTypeReferenceNode(parent) ||
    ts.isExpressionWithTypeArguments(parent) ||
    ts.isTypePredicateNode(parent) ||
    ts.isQualifiedName(parent) ||
    ts.isPropertySignature(parent) ||
    ts.isMethodDeclaration(parent) ||
    ts.isTypeAliasDeclaration(parent) ||
    ts.isInterfaceDeclaration(parent) ||
    ts.isEnumDeclaration(parent) ||
    ts.isEnumMember(parent)
  ) {
    return false;
  }

  return true;
}

function toExpressionDocumentRange(
  document: KpaDocument,
  expression: KpaTemplateExpression,
  node: ts.Node,
  sourceFile: ts.SourceFile,
): KpaLocatedRange {
  const parsePrefixLength = 1;
  const startOffset =
    expression.contentRange.start.offset + node.getStart(sourceFile) - parsePrefixLength;
  const endOffset = expression.contentRange.start.offset + node.end - parsePrefixLength;

  return createLocatedRange(document.lineStarts, startOffset, endOffset);
}

function isTagNameStart(character: string | undefined): boolean {
  return character !== undefined && /[A-Za-z]/.test(character);
}

function isTagNameCharacter(character: string | undefined): boolean {
  return character !== undefined && /[A-Za-z0-9:_-]/.test(character);
}

function isAttributeNameStart(character: string | undefined): boolean {
  return character !== undefined && /[A-Za-z_:@]/.test(character);
}

function isAttributeNameCharacter(character: string | undefined): boolean {
  return character !== undefined && /[A-Za-z0-9_:@.-]/.test(character);
}

function isWhitespace(character: string | undefined): boolean {
  return character === ' ' || character === '\t' || character === '\n' || character === '\r';
}
