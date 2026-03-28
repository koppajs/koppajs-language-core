import { canonicalTemplateBlock } from '../data/kpaBlocks';
import type { KpaBlockNode, KpaDocument } from './ast';

interface ParsedTemplateAttribute {
  name: string;
  valueText?: string;
}

interface TemplateTagMatch {
  attributes: readonly ParsedTemplateAttribute[];
  isClosing: boolean;
  isSelfClosing: boolean;
  name: string;
  tagEnd: number;
  tagStart: number;
}

interface TemplateLoopScopeEntry {
  declarations: readonly string[];
  endOffset: number;
  names: readonly string[];
  startOffset: number;
}

const identifierPattern = /^[A-Za-z_$][\w$]*$/;
const implicitLoopBindingNames = [
  'index',
  'key',
  'isFirst',
  'isLast',
  'isEven',
  'isOdd',
] as const;

export function collectTemplateLoopScopeNamesAtOffset(
  document: KpaDocument,
  offset: number,
): readonly string[] {
  const names: string[] = [];
  const seenNames = new Set<string>();

  for (const scope of collectTemplateLoopScopeEntries(document).filter(
    (entry) => offset >= entry.startOffset && offset <= entry.endOffset,
  )) {
    for (const name of scope.names) {
      if (seenNames.has(name)) {
        continue;
      }

      seenNames.add(name);
      names.push(name);
    }
  }

  return names;
}

export function collectTemplateLoopScopeDeclarationsAtOffset(
  document: KpaDocument,
  offset: number,
): readonly string[] {
  const declarations: string[] = [];
  const seenDeclarations = new Set<string>();

  for (const scope of collectTemplateLoopScopeEntries(document).filter(
    (entry) => offset >= entry.startOffset && offset <= entry.endOffset,
  )) {
    for (const declaration of scope.declarations) {
      if (seenDeclarations.has(declaration)) {
        continue;
      }

      seenDeclarations.add(declaration);
      declarations.push(declaration);
    }
  }

  return declarations;
}

function collectTemplateLoopScopeEntries(
  document: KpaDocument,
): readonly TemplateLoopScopeEntry[] {
  return document.blocks.flatMap((block) => {
    if (block.name !== canonicalTemplateBlock) {
      return [];
    }

    const matches = collectTemplateTagMatchesFromBlock(document, block);
    const loopScopes: TemplateLoopScopeEntry[] = [];
    const openTagStack: Array<{
      loopNames?: readonly string[];
      match: TemplateTagMatch;
    }> = [];

    for (const match of matches) {
      if (match.isClosing) {
        const openTagIndex = findMatchingOpenTagIndex(openTagStack, match.name);

        if (openTagIndex === -1) {
          continue;
        }

        const openTag = openTagStack.splice(openTagIndex, 1)[0];

        if (!openTag.loopNames || openTag.loopNames.length === 0) {
          continue;
        }

        loopScopes.push(
          createLoopScopeEntry(
            document,
            block,
            openTag.loopNames,
            openTag.match.tagStart,
            match.tagEnd,
          ),
        );
        continue;
      }

      const loopNames = parseLoopBindingNames(match.attributes);

      if (match.isSelfClosing) {
        if (loopNames.length > 0) {
          loopScopes.push(
            createLoopScopeEntry(
              document,
              block,
              loopNames,
              match.tagStart,
              match.tagEnd,
            ),
          );
        }

        continue;
      }

      openTagStack.push({
        loopNames,
        match,
      });
    }

    for (const openTag of openTagStack) {
      if (!openTag.loopNames || openTag.loopNames.length === 0) {
        continue;
      }

      loopScopes.push(
        createLoopScopeEntry(
          document,
          block,
          openTag.loopNames,
          openTag.match.tagStart,
          block.contentRange.end.offset - block.contentRange.start.offset,
        ),
      );
    }

    return loopScopes;
  });
}

function createLoopScopeEntry(
  document: KpaDocument,
  block: KpaBlockNode,
  names: readonly string[],
  startOffsetInBlock: number,
  endOffsetInBlock: number,
): TemplateLoopScopeEntry {
  const absoluteStartOffset =
    block.contentRange.start.offset + startOffsetInBlock;
  const absoluteEndOffset = block.contentRange.start.offset + endOffsetInBlock;

  return {
    declarations: names.map((name) => createLoopDeclaration(name)),
    endOffset: absoluteEndOffset,
    names,
    startOffset: absoluteStartOffset,
  };
}

function createLoopDeclaration(name: string): string {
  if (name === 'index') {
    return 'const index = 0;';
  }

  if (
    name === 'isFirst' ||
    name === 'isLast' ||
    name === 'isEven' ||
    name === 'isOdd'
  ) {
    return `const ${name} = false;`;
  }

  return `const ${name} = undefined as any;`;
}

function parseLoopBindingNames(
  attributes: readonly ParsedTemplateAttribute[],
): readonly string[] {
  const loopAttribute = attributes.find(
    (attribute) => attribute.name === 'loop',
  );
  const loopExpression = loopAttribute?.valueText?.trim();

  if (!loopExpression) {
    return [];
  }

  const loopMatch = /^(.+?)\s+in\s+(.+)$/.exec(loopExpression);

  if (!loopMatch) {
    return [];
  }

  const bindingNames = new Set<string>(implicitLoopBindingNames);
  const bindingPart = loopMatch[1]?.trim() ?? '';

  if (bindingPart.startsWith('[') && bindingPart.endsWith(']')) {
    const parts = bindingPart
      .slice(1, -1)
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    if (
      parts.length === 2 &&
      parts.every((part) => identifierPattern.test(part))
    ) {
      bindingNames.add(parts[0]!);
      bindingNames.add(parts[1]!);
    }

    return [...bindingNames];
  }

  if (identifierPattern.test(bindingPart)) {
    bindingNames.add(bindingPart);
  }

  return [...bindingNames];
}

function collectTemplateTagMatchesFromBlock(
  document: KpaDocument,
  block: KpaBlockNode,
): readonly TemplateTagMatch[] {
  const content = document.text.slice(
    block.contentRange.start.offset,
    block.contentRange.end.offset,
  );
  const tags: TemplateTagMatch[] = [];

  for (let index = 0; index < content.length; index++) {
    if (startsMustacheExpression(content, index)) {
      const expressionEnd = findMustacheExpressionEnd(content, index + 2);

      if (expressionEnd === undefined) {
        break;
      }

      index = Math.max(index, expressionEnd + 1);
      continue;
    }

    if (content[index] !== '<') {
      continue;
    }

    const tagMatch = readTagAt(content, index);

    if (!tagMatch) {
      continue;
    }

    tags.push(tagMatch);
    index = Math.max(index, tagMatch.tagEnd - 1);
  }

  return tags;
}

function readTagAt(
  content: string,
  index: number,
): TemplateTagMatch | undefined {
  let cursor = index + 1;
  let isClosing = false;

  if (content[cursor] === '/') {
    isClosing = true;
    cursor++;
  }

  while (isWhitespace(content[cursor])) {
    cursor++;
  }

  const nameStart = cursor;

  if (!isTagNameStart(content[cursor])) {
    return undefined;
  }

  cursor++;

  while (isTagNameCharacter(content[cursor])) {
    cursor++;
  }

  const nameEnd = cursor;
  const attributes: ParsedTemplateAttribute[] = [];

  while (cursor < content.length) {
    while (isWhitespace(content[cursor])) {
      cursor++;
    }

    if (content[cursor] === '>') {
      return {
        attributes,
        isClosing,
        isSelfClosing: false,
        name: content.slice(nameStart, nameEnd),
        tagEnd: cursor + 1,
        tagStart: index,
      };
    }

    if (content[cursor] === '/' && content[cursor + 1] === '>') {
      return {
        attributes,
        isClosing,
        isSelfClosing: true,
        name: content.slice(nameStart, nameEnd),
        tagEnd: cursor + 2,
        tagStart: index,
      };
    }

    const parsedAttribute = readAttributeAt(content, cursor);

    if (!parsedAttribute) {
      cursor++;
      continue;
    }

    attributes.push(parsedAttribute.attribute);
    cursor = parsedAttribute.nextIndex;
  }

  return {
    attributes,
    isClosing,
    isSelfClosing: false,
    name: content.slice(nameStart, nameEnd),
    tagEnd: cursor,
    tagStart: index,
  };
}

function readAttributeAt(
  content: string,
  index: number,
): { attribute: ParsedTemplateAttribute; nextIndex: number } | undefined {
  if (!isAttributeNameStart(content[index])) {
    return undefined;
  }

  let cursor = index + 1;

  while (isAttributeNameCharacter(content[cursor])) {
    cursor++;
  }

  const name = content.slice(index, cursor);

  while (isWhitespace(content[cursor])) {
    cursor++;
  }

  if (content[cursor] !== '=') {
    return {
      attribute: { name },
      nextIndex: cursor,
    };
  }

  cursor++;

  while (isWhitespace(content[cursor])) {
    cursor++;
  }

  const quote = content[cursor];

  if (quote === '"' || quote === "'") {
    const valueStart = cursor + 1;
    let valueEnd = valueStart;

    while (valueEnd < content.length && content[valueEnd] !== quote) {
      valueEnd++;
    }

    return {
      attribute: {
        name,
        valueText: content.slice(valueStart, valueEnd),
      },
      nextIndex: valueEnd < content.length ? valueEnd + 1 : valueEnd,
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
    attribute: {
      name,
      valueText: content.slice(valueStart, cursor),
    },
    nextIndex: cursor,
  };
}

function findMatchingOpenTagIndex(
  openTagStack: ReadonlyArray<{
    loopNames?: readonly string[];
    match: TemplateTagMatch;
  }>,
  closingTagName: string,
): number {
  for (let index = openTagStack.length - 1; index >= 0; index--) {
    if (openTagStack[index]?.match.name === closingTagName) {
      return index;
    }
  }

  return -1;
}

function startsMustacheExpression(content: string, index: number): boolean {
  return content[index] === '{' && content[index + 1] === '{';
}

function findMustacheExpressionEnd(
  content: string,
  startIndex: number,
): number | undefined {
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
  return (
    character === ' ' ||
    character === '\t' ||
    character === '\n' ||
    character === '\r'
  );
}
