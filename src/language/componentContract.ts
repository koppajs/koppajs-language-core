import ts from 'typescript';

export type KpaTemplateContextBindingOrigin =
  | 'component-method'
  | 'component-prop'
  | 'component-state';

export interface KpaTemplateContextBinding {
  kind: 'function' | 'variable';
  name: string;
  nameEnd: number;
  nameStart: number;
  origin: KpaTemplateContextBindingOrigin;
  optional: boolean;
  typeText?: string;
  valueText?: string;
}

export interface KpaRuntimeComponentPropEntry {
  hasDefault: boolean;
  name: string;
  nameEnd: number;
  nameStart: number;
  optional: boolean;
  typeText?: string;
}

interface RuntimeComponentStateEntry {
  name: string;
  nameEnd: number;
  nameStart: number;
  valueText?: string;
}

interface RuntimeComponentMethodEntry {
  name: string;
  nameEnd: number;
  nameStart: number;
  valueText: string;
}

const supportedRuntimePropTypeNames = new Map<string, string>([
  ['Array', 'unknown[]'],
  ['Boolean', 'boolean'],
  ['Function', '(...args: unknown[]) => unknown'],
  ['Number', 'number'],
  ['Object', 'Record<string, unknown>'],
  ['String', 'string'],
]);

export function collectRuntimeComponentProps(
  sourceFile: ts.SourceFile,
): readonly KpaRuntimeComponentPropEntry[] {
  const componentReturn = getRuntimeComponentReturnObject(sourceFile);

  if (!componentReturn) {
    return [];
  }

  const propsObject = getNamedObjectLiteralProperty(componentReturn, 'props');

  if (!propsObject) {
    return [];
  }

  return propsObject.properties.flatMap((property) => {
    const propertyName = getRuntimeContractPropertyName(property.name);

    if (!propertyName) {
      return [];
    }

    const propDefinition = getPropertyAssignmentObjectLiteral(property);
    const required = propDefinition
      ? readBooleanLiteralProperty(propDefinition, 'required') === true
      : false;
    const hasDefault = propDefinition
      ? getObjectLiteralPropertyAssignment(propDefinition, 'default') !==
        undefined
      : false;

    return [
      {
        hasDefault,
        name: propertyName.text,
        nameEnd: propertyName.end,
        nameStart: propertyName.getStart(sourceFile),
        optional: !required,
        typeText: propDefinition
          ? inferRuntimePropTypeText(propDefinition, sourceFile)
          : undefined,
      } satisfies KpaRuntimeComponentPropEntry,
    ];
  });
}

export function collectRuntimeTemplateContextBindings(
  sourceFile: ts.SourceFile,
): readonly KpaTemplateContextBinding[] {
  const componentReturn = getRuntimeComponentReturnObject(sourceFile);

  if (!componentReturn) {
    return [];
  }

  const seenNames = new Set<string>();
  const bindings: KpaTemplateContextBinding[] = [];

  for (const methodEntry of collectRuntimeMethodEntries(
    componentReturn,
    sourceFile,
  )) {
    seenNames.add(methodEntry.name);
    bindings.push({
      kind: 'function',
      name: methodEntry.name,
      nameEnd: methodEntry.nameEnd,
      nameStart: methodEntry.nameStart,
      optional: false,
      origin: 'component-method',
      valueText: methodEntry.valueText,
    });
  }

  for (const stateEntry of collectRuntimeStateEntries(
    componentReturn,
    sourceFile,
  )) {
    if (seenNames.has(stateEntry.name)) {
      continue;
    }

    seenNames.add(stateEntry.name);
    bindings.push({
      kind: 'variable',
      name: stateEntry.name,
      nameEnd: stateEntry.nameEnd,
      nameStart: stateEntry.nameStart,
      optional: false,
      origin: 'component-state',
      valueText: stateEntry.valueText,
    });
  }

  for (const propEntry of collectRuntimeComponentProps(sourceFile)) {
    if (seenNames.has(propEntry.name)) {
      continue;
    }

    seenNames.add(propEntry.name);
    bindings.push({
      kind: 'variable',
      name: propEntry.name,
      nameEnd: propEntry.nameEnd,
      nameStart: propEntry.nameStart,
      optional: propEntry.optional && !propEntry.hasDefault,
      origin: 'component-prop',
      typeText: propEntry.typeText,
    });
  }

  return bindings;
}

function collectRuntimeStateEntries(
  componentReturn: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile,
): readonly RuntimeComponentStateEntry[] {
  const stateObject = getNamedObjectLiteralProperty(componentReturn, 'state');

  if (!stateObject) {
    return [];
  }

  return stateObject.properties.flatMap((property) => {
    const propertyName = getRuntimeContractPropertyName(property.name);

    if (!propertyName) {
      return [];
    }

    return [
      {
        name: propertyName.text,
        nameEnd: propertyName.end,
        nameStart: propertyName.getStart(sourceFile),
        valueText: readPropertyValueText(property, sourceFile),
      } satisfies RuntimeComponentStateEntry,
    ];
  });
}

function collectRuntimeMethodEntries(
  componentReturn: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile,
): readonly RuntimeComponentMethodEntry[] {
  const methodsObject = getNamedObjectLiteralProperty(
    componentReturn,
    'methods',
  );

  if (!methodsObject) {
    return [];
  }

  return methodsObject.properties.flatMap((property) => {
    if (!isRuntimeMethodProperty(property)) {
      return [];
    }

    const propertyName = getRuntimeContractPropertyName(property.name);

    if (!propertyName) {
      return [];
    }

    return [
      {
        name: propertyName.text,
        nameEnd: propertyName.end,
        nameStart: propertyName.getStart(sourceFile),
        valueText: createMethodValueText(property, sourceFile),
      } satisfies RuntimeComponentMethodEntry,
    ];
  });
}

function getRuntimeComponentReturnObject(
  sourceFile: ts.SourceFile,
): ts.ObjectLiteralExpression | undefined {
  for (const statement of sourceFile.statements) {
    if (
      ts.isReturnStatement(statement) &&
      statement.expression &&
      ts.isObjectLiteralExpression(statement.expression)
    ) {
      return statement.expression;
    }
  }

  return undefined;
}

function getNamedObjectLiteralProperty(
  objectLiteral: ts.ObjectLiteralExpression,
  propertyName: string,
): ts.ObjectLiteralExpression | undefined {
  return getPropertyAssignmentObjectLiteral(
    getObjectLiteralPropertyAssignment(objectLiteral, propertyName),
  );
}

function getObjectLiteralPropertyAssignment(
  objectLiteral: ts.ObjectLiteralExpression,
  propertyName: string,
): ts.PropertyAssignment | undefined {
  return objectLiteral.properties.find(
    (property): property is ts.PropertyAssignment =>
      ts.isPropertyAssignment(property) &&
      getRuntimeContractPropertyName(property.name)?.text === propertyName,
  );
}

function getPropertyAssignmentObjectLiteral(
  property: ts.ObjectLiteralElementLike | undefined,
): ts.ObjectLiteralExpression | undefined {
  return property &&
    ts.isPropertyAssignment(property) &&
    ts.isObjectLiteralExpression(property.initializer)
    ? property.initializer
    : undefined;
}

function readPropertyValueText(
  property: ts.ObjectLiteralElementLike,
  sourceFile: ts.SourceFile,
): string | undefined {
  if (ts.isPropertyAssignment(property)) {
    return property.initializer.getText(sourceFile).trim() || undefined;
  }

  if (ts.isShorthandPropertyAssignment(property)) {
    return property.name.text;
  }

  return undefined;
}

function inferRuntimePropTypeText(
  propDefinition: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile,
): string | undefined {
  const explicitTypeAssignment = getObjectLiteralPropertyAssignment(
    propDefinition,
    'type',
  );

  if (explicitTypeAssignment) {
    return inferTypeTextFromTypeInitializer(
      explicitTypeAssignment.initializer,
      sourceFile,
    );
  }

  const defaultAssignment = getObjectLiteralPropertyAssignment(
    propDefinition,
    'default',
  );

  if (defaultAssignment) {
    return inferTypeTextFromValueExpression(
      defaultAssignment.initializer,
      sourceFile,
    );
  }

  return undefined;
}

function inferTypeTextFromTypeInitializer(
  initializer: ts.Expression,
  sourceFile: ts.SourceFile,
): string | undefined {
  if (ts.isIdentifier(initializer)) {
    return (
      supportedRuntimePropTypeNames.get(initializer.text) ?? initializer.text
    );
  }

  if (ts.isStringLiteralLike(initializer)) {
    return (
      supportedRuntimePropTypeNames.get(initializer.text) ?? initializer.text
    );
  }

  if (ts.isArrayLiteralExpression(initializer)) {
    const memberTypes = initializer.elements
      .flatMap(
        (element) =>
          inferTypeTextFromTypeInitializer(asExpression(element), sourceFile) ??
          [],
      )
      .filter((typeText, index, values) => values.indexOf(typeText) === index);

    if (memberTypes.length > 0) {
      return memberTypes.join(' | ');
    }
  }

  return initializer.getText(sourceFile).trim() || undefined;
}

function inferTypeTextFromValueExpression(
  initializer: ts.Expression,
  sourceFile: ts.SourceFile,
): string | undefined {
  if (
    ts.isStringLiteralLike(initializer) ||
    ts.isNoSubstitutionTemplateLiteral(initializer)
  ) {
    return 'string';
  }

  if (
    ts.isNumericLiteral(initializer) ||
    isNegativeNumericLiteral(initializer)
  ) {
    return 'number';
  }

  if (
    initializer.kind === ts.SyntaxKind.TrueKeyword ||
    initializer.kind === ts.SyntaxKind.FalseKeyword
  ) {
    return 'boolean';
  }

  if (initializer.kind === ts.SyntaxKind.NullKeyword) {
    return 'null';
  }

  if (ts.isArrayLiteralExpression(initializer)) {
    return 'unknown[]';
  }

  if (ts.isObjectLiteralExpression(initializer)) {
    return 'Record<string, unknown>';
  }

  if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) {
    return '(...args: unknown[]) => unknown';
  }

  return initializer.getText(sourceFile).trim() || undefined;
}

function readBooleanLiteralProperty(
  objectLiteral: ts.ObjectLiteralExpression,
  propertyName: string,
): boolean | undefined {
  const property = getObjectLiteralPropertyAssignment(
    objectLiteral,
    propertyName,
  );

  if (!property) {
    return undefined;
  }

  if (property.initializer.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }

  if (property.initializer.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }

  return undefined;
}

function getRuntimeContractPropertyName(
  propertyName: ts.PropertyName | undefined,
): ts.Identifier | ts.StringLiteral | undefined {
  if (!propertyName) {
    return undefined;
  }

  if (ts.isIdentifier(propertyName) || ts.isStringLiteral(propertyName)) {
    return propertyName;
  }

  return undefined;
}

function isRuntimeMethodProperty(
  property: ts.ObjectLiteralElementLike,
): boolean {
  if (ts.isMethodDeclaration(property)) {
    return true;
  }

  return (
    ts.isPropertyAssignment(property) &&
    (ts.isArrowFunction(property.initializer) ||
      ts.isFunctionExpression(property.initializer))
  );
}

function createMethodValueText(
  property: ts.ObjectLiteralElementLike,
  sourceFile: ts.SourceFile,
): string {
  if (ts.isMethodDeclaration(property)) {
    return `function ${property.getText(sourceFile).trim()}`;
  }

  if (ts.isPropertyAssignment(property)) {
    return property.initializer.getText(sourceFile).trim();
  }

  return 'function () {}';
}

function isNegativeNumericLiteral(
  node: ts.Node,
): node is ts.PrefixUnaryExpression {
  return (
    ts.isPrefixUnaryExpression(node) &&
    node.operator === ts.SyntaxKind.MinusToken &&
    ts.isNumericLiteral(node.operand)
  );
}

function asExpression(node: ts.Expression | ts.SpreadElement): ts.Expression {
  return ts.isSpreadElement(node) ? node.expression : node;
}
