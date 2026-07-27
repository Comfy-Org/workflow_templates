import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveLocalizedWorkflow, __resetResolverCache } from '../../src/lib/i18n/resolver';
import type { Locale } from '../../src/lib/i18n/schema';

const HASH = 'hash-v1';
const SHARE = 'abc123456789';

// Build a throwaway content root on disk so the fs-based resolver runs for real.
let root: string;

function write(rel: string, value: unknown) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value));
}

function setup(
  opts: {
    en?: Record<string, unknown>;
    zh?: Record<string, unknown>;
    human?: Record<string, unknown>;
    override?: Record<string, unknown>;
    reviewedHash?: string | null;
    currentHash?: string;
  } = {}
) {
  const en = opts.en ?? {
    title: 'Wan 2.1 Inpainting',
    description: 'English description',
    metaDescription: 'English meta',
    extendedDescription: 'English long body',
    howToUse: ['Load it'],
    suggestedUseCases: [],
    faqItems: [{ question: 'Q?', answer: 'A' }],
  };
  write(`content/en.json`, { [SHARE]: en });
  if (opts.zh) write(`content/zh.json`, { [SHARE]: opts.zh });
  if (opts.human) write(`human/zh.json`, { [SHARE]: opts.human });
  if (opts.override) write(`overrides/zh.json`, { [SHARE]: opts.override });
  write('manifest.json', { [SHARE]: { content: opts.currentHash ?? HASH, fields: {} } });
  if (opts.reviewedHash !== null) {
    write('reviews/zh.json', {
      [SHARE]: {
        reviewer: 'tiger',
        reviewedAt: '2026-07-24',
        reviewedContentHash: opts.reviewedHash ?? HASH,
        reviewedArtifactChecksum: 'ck',
      },
    });
  }
}

const RESOLVE = (locale: Locale = 'zh') =>
  resolveLocalizedWorkflow(SHARE, locale, {
    contentRoot: root,
    supportedLocales: ['zh', 'ja', 'ko'],
    indexableLocales: ['zh'],
  });

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-resolver-'));
  __resetResolverCache();
});
afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
  __resetResolverCache();
});

describe('resolveLocalizedWorkflow', () => {
  it('applies precedence override > human > machine > english per field', () => {
    setup({
      zh: { title: '机翻标题', description: '机翻描述', metaDescription: '机翻元' },
      human: { title: '人工种子标题', description: '人工种子描述' },
      override: { title: '审校标题' },
    });
    const { data, provenance } = RESOLVE();
    expect(data.title).toBe('审校标题'); // override wins over human + machine
    expect(provenance.title).toBe('override');
    expect(data.description).toBe('人工种子描述'); // human wins over machine
    expect(provenance.description).toBe('human');
    expect(data.metaDescription).toBe('机翻元'); // machine (no human/override)
    expect(provenance.metaDescription).toBe('machine');
    expect(data.extendedDescription).toBe('English long body'); // english fallback
    expect(provenance.extendedDescription).toBe('english');
  });

  it('is indexable when every required field is translated + reviewed at current hash', () => {
    setup({
      zh: {
        title: '标题',
        description: '描述',
        metaDescription: '元描述',
        extendedDescription: '长描述',
        faqItems: [{ question: '问', answer: '答' }],
      },
    });
    const r = RESOLVE();
    expect(r.indexable).toBe(true);
    expect(r.reason).toBe('');
  });

  it('is NOT indexable when a required field falls back to English', () => {
    setup({
      zh: {
        title: '标题',
        description: '描述',
        metaDescription: '元描述',
        // extendedDescription missing -> english fallback
        faqItems: [{ question: '问', answer: '答' }],
      },
    });
    const r = RESOLVE();
    expect(r.indexable).toBe(false);
    expect(r.reason).toContain('extendedDescription');
  });

  it('drops out when English changed after sign-off (manifest hash != reviewed hash)', () => {
    setup({
      zh: {
        title: '标题',
        description: '描述',
        metaDescription: '元描述',
        extendedDescription: '长描述',
        faqItems: [{ question: '问', answer: '答' }],
      },
      reviewedHash: 'hash-v0', // reviewer signed an older source
      currentHash: 'hash-v1',
    });
    const r = RESOLVE();
    expect(r.indexable).toBe(false);
    expect(r.reason).toContain('stale');
  });

  it('never blends silently: returns full English data even when non-indexable', () => {
    setup({ zh: { title: '标题' } }); // only title translated
    const r = RESOLVE();
    expect(r.indexable).toBe(false);
    // data is still fully populated (English fallback) so a non-indexable page can render
    expect(r.data.description).toBe('English description');
    expect(r.data.faqItems).toHaveLength(1);
  });

  it('handles a completely missing workflow without throwing', () => {
    setup({});
    const r = resolveLocalizedWorkflow('does-not-exist', 'zh', {
      contentRoot: root,
      supportedLocales: ['zh'],
      indexableLocales: ['zh'],
    });
    expect(r.indexable).toBe(false);
    expect(r.data.title).toBe('');
  });
});
