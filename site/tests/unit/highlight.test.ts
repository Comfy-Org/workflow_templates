import { describe, expect, it } from 'vitest';

import { MAX_HIGHLIGHT_BYTES, highlightInline } from '../../src/lib/highlight';

describe('highlightInline', () => {
  it('tokenizes JSON keys, strings and numbers as separate spans', async () => {
    const html = await highlightInline('{"scale": 0.51, "id": "abc"}', 'json');

    expect(html).toBeTruthy();
    const colors = new Set([...html!.matchAll(/color:(#[0-9A-Fa-f]{6,8})/g)].map((m) => m[1]));
    expect(colors.size).toBeGreaterThan(2);
  });

  it('tokenizes Python so the SDK snippet renders highlighted', async () => {
    const html = await highlightInline('client = Comfy(api_key="k")  # note', 'python');

    expect(html).toContain('<span');
    expect(html).toContain('# note');
  });

  it('omits a wrapping pre so the caller keeps its own element and classes', async () => {
    const html = await highlightInline('{"a": 1}', 'json');

    expect(html).not.toContain('<pre');
    expect(html).not.toContain('background-color');
  });

  it('preserves indentation, which a scrollable payload block relies on', async () => {
    const html = await highlightInline('{\n    "a": 1\n}', 'json');

    expect(html).toContain('    "');
  });

  it('declines payloads past the size cap rather than blocking on a huge parse', async () => {
    const oversized = `{"a": "${'x'.repeat(MAX_HIGHLIGHT_BYTES)}"}`;

    await expect(highlightInline(oversized, 'json')).resolves.toBeNull();
  });

  it('measures the cap in bytes, so a multibyte payload cannot slip under it', async () => {
    // CJK is 3 UTF-8 bytes per character but 1 UTF-16 unit: this payload is
    // one third of the cap by .length and ~3x over it by bytes. A length-based
    // guard would highlight it.
    const multibyte = `{"a": "${'语'.repeat(Math.ceil(MAX_HIGHLIGHT_BYTES / 3))}"}`;
    expect(multibyte.length).toBeLessThan(MAX_HIGHLIGHT_BYTES);

    await expect(highlightInline(multibyte, 'json')).resolves.toBeNull();
  });
});
