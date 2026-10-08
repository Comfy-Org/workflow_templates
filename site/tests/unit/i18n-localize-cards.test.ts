import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { localizeCards } from '../../src/lib/i18n/localize-cards';
import { __resetResolverCache } from '../../src/lib/i18n/resolver';
import type { Locale } from '../../src/lib/i18n/schema';

const SHARE = 'abc123456789';
const OTHER = 'def987654321';

let root: string;

function write(rel: string, value: unknown) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value));
}

/** A card as `loadSerializedTemplates` hands it over: English, from the hub index. */
function card(shareId: string, title: string, description: string) {
  return { shareId, title, description, tags: ['Video'], usage: 42 };
}

const english = {
  title: 'Wan 2.1 Inpainting',
  description: 'English description',
  metaDescription: 'm',
  extendedDescription: 'e',
  howToUse: ['Load it'],
  suggestedUseCases: [],
  faqItems: [],
};

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'cards-'));
  __resetResolverCache();
  write('content/en.json', { [SHARE]: english, [OTHER]: english });
  write('manifest.json', {});
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
  __resetResolverCache();
});

const opts = () => ({ contentRoot: root });

describe('localizeCards', () => {
  it('replaces the card text with the translation a visitor will see', () => {
    write('content/zh.json', {
      [SHARE]: { ...english, title: 'Wan 2.1 图像修复', description: '中文描述' },
    });
    const [out] = localizeCards(
      [card(SHARE, 'Wan 2.1 Inpainting', 'English description')],
      'zh' as Locale,
      opts()
    );
    expect(out!.title).toBe('Wan 2.1 图像修复');
    expect(out!.description).toBe('中文描述');
  });

  it('leaves English untouched rather than resolving it', () => {
    const input = [card(SHARE, 'Wan 2.1 Inpainting', 'English description')];
    expect(localizeCards(input, 'en' as Locale, opts())).toEqual(input);
  });

  it('keeps the language-neutral fields exactly as they arrived', () => {
    write('content/zh.json', { [SHARE]: { ...english, title: '标题', description: '描述' } });
    const [out] = localizeCards([card(SHARE, 'A', 'B')], 'zh' as Locale, opts());
    expect(out!.tags).toEqual(['Video']);
    expect(out!.usage).toBe(42);
    expect(out!.shareId).toBe(SHARE);
  });

  it('falls back to English for a field the translation does not carry', () => {
    // The pruning path: a field the model got wrong is dropped, not rewritten.
    write('content/zh.json', {
      [SHARE]: { ...english, title: '只有标题', description: undefined },
    });
    const [out] = localizeCards(
      [card(SHARE, 'English title', 'English description')],
      'zh' as Locale,
      opts()
    );
    expect(out!.title).toBe('只有标题');
    expect(out!.description).toBe('English description');
  });

  it('never lets a blank translation blank out a card', () => {
    write('content/zh.json', { [SHARE]: { ...english, title: '   ', description: '' } });
    const [out] = localizeCards(
      [card(SHARE, 'English title', 'English description')],
      'zh' as Locale,
      opts()
    );
    expect(out!.title).toBe('English title');
    expect(out!.description).toBe('English description');
  });

  it('leaves a workflow the resolver has never seen exactly as it arrived', () => {
    // Published after the last translation run: English is correct, not a bug.
    write('content/zh.json', { [SHARE]: { ...english, title: '标题' } });
    const unknown = card('zzz000111222', 'Brand New Workflow', 'Just published');
    const [out] = localizeCards([unknown], 'zh' as Locale, opts());
    expect(out).toEqual(unknown);
  });

  it('localizes every entry in a mixed list independently', () => {
    write('content/zh.json', {
      [SHARE]: { ...english, title: '第一个' },
      // OTHER deliberately absent from zh -> stays English
    });
    const out = localizeCards(
      [card(SHARE, 'First', 'd1'), card(OTHER, 'Second', 'd2')],
      'zh' as Locale,
      opts()
    );
    expect(out[0]!.title).toBe('第一个');
    expect(out[1]!.title).toBe('Second');
  });

  it('does not mutate the input array or its entries', () => {
    write('content/zh.json', { [SHARE]: { ...english, title: '标题' } });
    const input = [card(SHARE, 'English title', 'English description')];
    const snapshot = JSON.parse(JSON.stringify(input));
    localizeCards(input, 'zh' as Locale, opts());
    expect(input).toEqual(snapshot);
  });

  it('translates regardless of indexability, so readers are never shown English on purpose', () => {
    // The gate points search engines at English; it does not withhold the
    // translation from the person actually reading the page.
    write('content/zh.json', { [SHARE]: { ...english, title: '可读的标题' } });
    const [gated] = localizeCards([card(SHARE, 'English', 'd')], 'zh' as Locale, {
      contentRoot: root,
      indexableLocales: [],
    });
    const [flipped] = localizeCards([card(SHARE, 'English', 'd')], 'zh' as Locale, {
      contentRoot: root,
      indexableLocales: ['zh' as Locale],
    });
    expect(gated!.title).toBe('可读的标题');
    expect(flipped!.title).toBe('可读的标题');
  });
});
