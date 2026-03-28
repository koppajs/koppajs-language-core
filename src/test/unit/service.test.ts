import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import { describe, expect, it } from 'vitest';
import { KpaLanguageService } from '../../index';

describe('KpaLanguageService', () => {
  it('serves diagnostics and template completions from open overlay documents', () => {
    const service = new KpaLanguageService();
    const tempDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'kpa-overlay-service-'),
    );
    const filePath = path.join(tempDirectory, 'OverlayDocument.kpa');
    const uri = pathToFileURL(filePath).href;
    const text = [
      '[template]',
      '  <div>{{missing}}</div>',
      '  <div>{{co}}</div>',
      '[/template]',
      '',
      '[ts]',
      '  const helper = 1;',
      '  return {',
      '    state: { count: 1 },',
      '  };',
      '[/ts]',
    ].join('\n');

    service.openDocument(uri, text);

    expect(
      service
        .getDiagnostics(uri)
        .some((diagnostic) =>
          diagnostic.message.includes('Lokales Template-Symbol [missing]'),
        ),
    ).toBe(true);

    const completions = service.getTemplateExpressionCompletions(
      uri,
      text.indexOf('co') + 1,
    );
    const labels = completions?.map((completion) => completion.label) ?? [];

    expect(labels).toContain('count');
    expect(labels).not.toContain('helper');
    expect(labels).not.toContain('Array');

    service.closeDocument(uri);

    expect(service.getDiagnostics(uri)).toEqual([]);
  });

  it('serves template expression completions inside canonical dynamic bindings', () => {
    const service = new KpaLanguageService();
    const tempDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'kpa-overlay-service-'),
    );
    const filePath = path.join(tempDirectory, 'OverlayBindingDocument.kpa');
    const uri = pathToFileURL(filePath).href;
    const text = [
      '[template]',
      '  <div :hidden="co"></div>',
      '[/template]',
      '',
      '[ts]',
      '  return {',
      '    state: { count: 1 },',
      '  };',
      '[/ts]',
    ].join('\n');

    service.openDocument(uri, text);

    const completions = service.getTemplateExpressionCompletions(
      uri,
      text.indexOf('co') + 1,
    );
    const labels = completions?.map((completion) => completion.label) ?? [];

    expect(labels).toContain('count');
  });

  it('surfaces loop bindings in template expression completions', () => {
    const service = new KpaLanguageService();
    const tempDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'kpa-overlay-service-'),
    );
    const filePath = path.join(tempDirectory, 'OverlayLoopDocument.kpa');
    const uri = pathToFileURL(filePath).href;
    const text = [
      '[template]',
      '  <option loop="loopItem in options">{{ lo }}</option>',
      '[/template]',
      '',
      '[ts]',
      '  return {',
      '    state: { options: [] },',
      '  };',
      '[/ts]',
    ].join('\n');

    service.openDocument(uri, text);

    const completions = service.getTemplateExpressionCompletions(
      uri,
      text.indexOf('{{ lo') + 4,
    );
    const labels = completions?.map((completion) => completion.label) ?? [];

    expect(labels).toContain('loopItem');
    expect(labels).toContain('index');
  });

  it('uses canonical dynamic binding syntax for component prop completions and quick fixes', () => {
    const tempDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'kpa-component-props-'),
    );
    const componentPath = path.join(tempDirectory, 'UserCard.kpa');
    const pagePath = path.join(tempDirectory, 'Page.kpa');
    const pageUri = pathToFileURL(pagePath).href;

    fs.writeFileSync(
      componentPath,
      [
        '[template]',
        '  <div></div>',
        '[/template]',
        '',
        '[ts]',
        '  return {',
        '    props: {',
        '      title: { type: String, required: true },',
        '    },',
        '  };',
        '[/ts]',
      ].join('\n'),
    );

    const pageText = [
      '[template]',
      '  <UserCard />',
      '[/template]',
      '',
      '[ts]',
      "  import UserCard from './UserCard';",
      '[/ts]',
    ].join('\n');

    const service = new KpaLanguageService();
    service.openDocument(pageUri, pageText);

    const completions =
      service.getCompletions(pageUri, pageText.indexOf('/>') - 1) ?? [];
    const titleCompletion = completions.find(
      (completion) => completion.label === 'title',
    );
    const diagnostics = service.getDiagnostics(pageUri);
    const actions = service.getCodeActions(pageUri, diagnostics);

    expect(titleCompletion?.insertText).toBe(':title="$1"');
    expect(actions[0]?.edits[0]?.newText).toBe(` :title="''"`);
  });

  it('uses workspace roots for imported component definitions and references', () => {
    const tempDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'kpa-language-service-'),
    );
    const componentPath = path.join(tempDirectory, 'UserCard.kpa');
    const pageAPath = path.join(tempDirectory, 'PageA.kpa');
    const pageBPath = path.join(tempDirectory, 'PageB.kpa');

    fs.writeFileSync(componentPath, '[template]\n  <div></div>\n[/template]\n');

    const pageText = [
      '[template]',
      '  <UserCard />',
      '[/template]',
      '',
      '[ts]',
      "  import UserCard from './UserCard';",
      '[/ts]',
    ].join('\n');

    fs.writeFileSync(pageAPath, pageText);
    fs.writeFileSync(pageBPath, pageText);

    const service = new KpaLanguageService();
    const pageAUri = pathToFileURL(pageAPath).href;
    const pageBUri = pathToFileURL(pageBPath).href;
    const componentUri = pathToFileURL(componentPath).href;

    service.setWorkspaceRoots([tempDirectory]);
    service.openDocument(pageAUri, pageText);

    const offset = pageText.indexOf('UserCard') + 1;
    const definitions = service.getDefinitions(pageAUri, offset) ?? [];
    const references = service.getReferences(pageAUri, offset, true) ?? [];

    expect(definitions.some((location) => location.uri === componentUri)).toBe(
      true,
    );
    expect(references.some((location) => location.uri === pageAUri)).toBe(true);
    expect(references.some((location) => location.uri === pageBUri)).toBe(true);
  });

  it('resolves globally registered workspace components in canonical kebab-case templates', () => {
    const tempDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'kpa-language-service-'),
    );
    const componentPath = path.join(tempDirectory, 'counter-component.kpa');
    const bootstrapPath = path.join(tempDirectory, 'main.ts');
    const pagePath = path.join(tempDirectory, 'app-view.kpa');
    const pageUri = pathToFileURL(pagePath).href;
    const componentUri = pathToFileURL(componentPath).href;
    const pageText = [
      '[template]',
      '  <counter-component></counter-component>',
      '[/template]',
    ].join('\n');

    fs.writeFileSync(path.join(tempDirectory, 'tsconfig.json'), '{}\n');
    fs.writeFileSync(
      componentPath,
      [
        '[template]',
        '  <div></div>',
        '[/template]',
        '',
        '[ts]',
        '  return {',
        '    props: {',
        '      title: { type: String },',
        '    },',
        '  };',
        '[/ts]',
      ].join('\n'),
    );
    fs.writeFileSync(
      bootstrapPath,
      [
        "import { Core } from '@koppajs/koppajs-core';",
        "import counterComponent from './counter-component.kpa';",
        '',
        "Core.take(counterComponent, 'counter-component');",
      ].join('\n'),
    );

    const service = new KpaLanguageService();
    service.setWorkspaceRoots([tempDirectory]);
    service.openDocument(pageUri, pageText);

    const definitions = service.getDefinitions(
      pageUri,
      pageText.indexOf('counter-component') + 1,
    );
    const diagnostics = service.getDiagnostics(pageUri);
    const completions = service.getCompletions(
      pageUri,
      pageText.indexOf('></counter-component>'),
    );
    const titleCompletion = completions?.find(
      (completion) => completion.label === 'title',
    );

    expect(definitions?.some((location) => location.uri === componentUri)).toBe(
      true,
    );
    expect(
      diagnostics.some(
        (diagnostic) => diagnostic.code === 'unresolved-component-tag',
      ),
    ).toBe(false);
    expect(titleCompletion?.insertText).toBe(':title=\"$1\"');
  });

  it('returns component hover details and cross-file rename edits for imported components', () => {
    const tempDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'kpa-language-service-'),
    );
    const componentPath = path.join(tempDirectory, 'UserCard.kpa');
    const pageAPath = path.join(tempDirectory, 'PageA.kpa');
    const pageBPath = path.join(tempDirectory, 'PageB.kpa');
    const pageText = [
      '[template]',
      '  <UserCard />',
      '[/template]',
      '',
      '[ts]',
      "  import UserCard from './UserCard';",
      '[/ts]',
    ].join('\n');

    fs.writeFileSync(
      componentPath,
      [
        '[template]',
        '  <div></div>',
        '[/template]',
        '',
        '[ts]',
        '  return {',
        '    props: {',
        '      title: { type: String },',
        '    },',
        '  };',
        '[/ts]',
      ].join('\n'),
    );
    fs.writeFileSync(pageAPath, pageText);
    fs.writeFileSync(pageBPath, pageText);

    const service = new KpaLanguageService();
    const pageAUri = pathToFileURL(pageAPath).href;
    const pageBUri = pathToFileURL(pageBPath).href;
    const offset = pageText.indexOf('UserCard />') + 1;

    service.setWorkspaceRoots([tempDirectory]);
    service.openDocument(pageAUri, pageText);

    const hover = service.getHover(pageAUri, offset);
    const renameInfo = service.getRenameInfo(pageAUri, offset);
    const renameEdits =
      service.getRenameEdits(pageAUri, offset, 'AccountCard') ?? [];

    expect(hover?.contents[0]?.value).toContain('component UserCard');
    expect(hover?.contents[0]?.value).toContain('Props:');
    expect(renameInfo?.placeholder).toBe('UserCard');
    expect(
      renameInfo &&
        pageText.slice(
          renameInfo.range.start.offset,
          renameInfo.range.end.offset,
        ),
    ).toBe('UserCard');
    expect(
      renameEdits.some(
        (edit) => edit.uri === pageAUri && edit.newText === 'AccountCard',
      ),
    ).toBe(true);
    expect(
      renameEdits.some(
        (edit) => edit.uri === pageBUri && edit.newText === 'AccountCard',
      ),
    ).toBe(true);
  });

  it('returns document symbols and workspace symbols through the service facade', () => {
    const tempDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'kpa-language-service-'),
    );
    const componentPath = path.join(tempDirectory, 'UserCard.kpa');
    const componentUri = pathToFileURL(componentPath).href;
    const componentText = [
      '[template]',
      '  <div>{{label}}</div>',
      '[/template]',
      '',
      '[ts]',
      '  export function buildUserCard() {',
      "    return 'user-card';",
      '  }',
      '  const internalValue = 1;',
      '[/ts]',
    ].join('\n');

    fs.writeFileSync(componentPath, componentText);

    const service = new KpaLanguageService();
    service.setWorkspaceRoots([tempDirectory]);
    service.openDocument(componentUri, componentText);

    const documentSymbols = service.getDocumentSymbols(componentUri);
    const workspaceSymbols = service.getWorkspaceSymbols('buildUserCard');
    const scriptBlock = documentSymbols.find(
      (symbol) => symbol.name === '[ts]',
    );

    expect(documentSymbols.map((symbol) => symbol.name)).toEqual([
      '[template]',
      '[ts]',
    ]);
    expect(scriptBlock?.children.map((symbol) => symbol.name)).toEqual([
      'buildUserCard',
      'internalValue',
    ]);
    expect(workspaceSymbols).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          filePath: componentPath,
          name: 'buildUserCard',
        }),
      ]),
    );
  });
});
