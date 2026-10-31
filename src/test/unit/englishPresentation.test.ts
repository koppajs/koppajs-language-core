import { describe, expect, it } from 'vitest';
import { htmlAttributes } from '../../data/htmlAttributes';
import { htmlTags } from '../../data/htmlTags';
import { collectBlockDiagnostics } from '../../diagnosticsEngine';

describe('English presentation', () => {
  it('keeps every HTML tag and attribute description in the approved English catalog', () => {
    expect(
      htmlTags.map(({ name, description }) => ({ name, description })),
    ).toMatchSnapshot();
    expect(
      htmlAttributes.map(({ label, documentation }) => ({
        label,
        documentation,
      })),
    ).toMatchSnapshot();
  });

  it('preserves user-authored Unicode identifiers inside English diagnostics', () => {
    const diagnostics = collectBlockDiagnostics(
      '[template]\n{{ größe }}\n[/template]',
    );
    expect(diagnostics.map(({ message }) => message)).toEqual([
      'Local template symbol [größe] was not found.',
    ]);
  });
});
