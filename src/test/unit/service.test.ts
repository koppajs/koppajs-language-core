import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import { describe, expect, it } from 'vitest';
import { KpaLanguageService } from '../../index';

describe('KpaLanguageService', () => {
  it('serves diagnostics and template completions from open overlay documents', () => {
    const service = new KpaLanguageService();
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'kpa-overlay-service-'));
    const filePath = path.join(tempDirectory, 'OverlayDocument.kpa');
    const uri = pathToFileURL(filePath).href;
    const text = [
      '[template]',
      '  <div>{missing}</div>',
      '  <div>{co}</div>',
      '[/template]',
      '',
      '[ts]',
      '  const count = 1;',
      '[/ts]',
    ].join('\n');

    service.openDocument(uri, text);

    expect(
      service
        .getDiagnostics(uri)
        .some((diagnostic) => diagnostic.message.includes('Lokales Template-Symbol [missing]')),
    ).toBe(true);

    const completions = service.getTemplateExpressionCompletions(uri, text.indexOf('{co}') + 3);
    const labels = completions?.map((completion) => completion.label) ?? [];

    expect(labels).toContain('count');
    expect(labels).not.toContain('Array');

    service.closeDocument(uri);

    expect(service.getDiagnostics(uri)).toEqual([]);
  });

  it('uses workspace roots for imported component definitions and references', () => {
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'kpa-language-service-'));
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

    expect(definitions.some((location) => location.uri === componentUri)).toBe(true);
    expect(references.some((location) => location.uri === pageAUri)).toBe(true);
    expect(references.some((location) => location.uri === pageBUri)).toBe(true);
  });
});
