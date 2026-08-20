/**
 * Every UI string key a component asks for must exist in en.json.
 *
 * `t()` falls back to English and then to the key itself, so a typo does not
 * throw: it renders `footer.product` to the reader. That is the failure this
 * guards, and it is invisible in review because the markup looks correct.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import en from '../../src/i18n/locales/en.json';

const COMPONENT_DIR = path.join(process.cwd(), 'src');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(astro|vue|ts)$/.test(entry.name) && !entry.name.endsWith('.test.ts')
      ? [full]
      : [];
  });
}

/** `t('a.b', locale)` and the `tt('a.b')` shorthand components bind locally. */
const KEY_CALL = /\btt?\(\s*'([a-z][A-Za-z0-9.]*\.[A-Za-z0-9.]+)'/g;

describe('UI string keys', () => {
  const referenced = new Map<string, string[]>();
  for (const file of sourceFiles(COMPONENT_DIR)) {
    const source = fs.readFileSync(file, 'utf-8');
    for (const match of source.matchAll(KEY_CALL)) {
      const key = match[1];
      referenced.set(key, [...(referenced.get(key) ?? []), path.relative(COMPONENT_DIR, file)]);
    }
  }

  it('finds the keys the components actually use', () => {
    // A guard that matched nothing would pass forever.
    expect(referenced.size).toBeGreaterThan(20);
  });

  it('resolves every referenced key against en.json', () => {
    const strings = en as Record<string, string>;
    const missing = [...referenced.entries()]
      .filter(([key]) => !(key in strings))
      .map(([key, files]) => `${key} (${[...new Set(files)].join(', ')})`);

    expect(missing).toEqual([]);
  });
});

/**
 * The localized routes build their <title> from a template key now. English is
 * ranking on those exact strings today, so the English rendering has to come out
 * byte-identical to the concatenation it replaced.
 */
describe('meta title templates', () => {
  const strings = en as Record<string, string>;

  it('renders the English detail title exactly as before', () => {
    expect(strings['template.metaTitle'].replace('{title}', 'Text to Image (New)')).toBe(
      'Text to Image (New) - ComfyUI Workflow'
    );
  });

  it('renders the English category title exactly as before', () => {
    expect(
      strings['category.metaTitle']
        .replace('{category}', 'Image Generation')
        .replace('{site}', strings['meta.title'])
    ).toBe('Image Generation Workflows - Comfy Workflows');
  });

  it('renders the English tag title exactly as before', () => {
    expect(
      strings['tag.metaTitle']
        .replace('{tag}', 'Character')
        .replace('{site}', 'Comfy Workflows')
        .replace('{workflows}', strings['nav.templates'])
    ).toBe('Character Comfy Workflows - Workflows');
  });

  it('keeps every placeholder the routes substitute', () => {
    // A translation that drops a placeholder would render a literal {title}.
    expect(strings['template.metaTitle']).toContain('{title}');
    expect(strings['category.metaTitle']).toContain('{category}');
    expect(strings['category.metaTitle']).toContain('{site}');
    expect(strings['tag.metaTitle']).toContain('{tag}');
  });
});
