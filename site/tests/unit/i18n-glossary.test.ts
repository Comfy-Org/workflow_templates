import { describe, expect, it } from 'vitest';
import {
  buildMirror,
  flattenStrings,
  PRESERVE_TERMS,
  selectGlossary,
} from '../../scripts/i18n/sync-glossary';
import { applyOverrides, enforceableOverrides } from '../../scripts/i18n/glossary-overrides.cjs';

describe('flattenStrings', () => {
  it('flattens nested dictionaries to dot paths, keeping only strings', () => {
    expect(flattenStrings({ a: 'x', b: { c: 'y', d: { e: 'z' } }, n: 3, arr: ['q'] })).toEqual({
      a: 'x',
      'b.c': 'y',
      'b.d.e': 'z',
    });
  });
});

describe('buildMirror', () => {
  it('pairs English terms with their localized values', () => {
    const en = { 'menu.workflow': 'Workflow', 'menu.node': 'Node' };
    const zh = { 'menu.workflow': '工作流', 'menu.node': '节点' };
    expect(buildMirror(en, zh)).toEqual({ Workflow: '工作流', Node: '节点' });
  });

  it('skips identity pairs, empties, and long sentences', () => {
    const en = {
      k1: 'Queue', // translated
      k2: 'API', // identity (kept English in the app too) -> skip
      k3: '', // empty -> skip
      k4: 'Are you absolutely sure you want to delete this entire workflow now?', // > 40 chars
    };
    const zh = { k1: '队列', k2: 'API', k3: '空', k4: '你确定吗' };
    expect(buildMirror(en, zh)).toEqual({ Queue: '队列' });
  });

  it('keeps the first mapping when an English term repeats', () => {
    const en = { a: 'Save', b: 'Save' };
    const zh = { a: '保存', b: '储存' };
    expect(buildMirror(en, zh)).toEqual({ Save: '保存' });
  });
});

describe('PRESERVE_TERMS', () => {
  it('includes brand + model proper nouns but not common technique words', () => {
    expect(PRESERVE_TERMS).toContain('ComfyUI');
    expect(PRESERVE_TERMS).toContain('LoRA');
    expect(PRESERVE_TERMS).toContain('Wan');
    expect(PRESERVE_TERMS).toContain('Seedance');
    // SEO wants these translated to match search intent, so they are NOT preserved.
    expect(PRESERVE_TERMS).not.toContain('inpainting');
    expect(PRESERVE_TERMS).not.toContain('upscale');
    expect(PRESERVE_TERMS).not.toContain('sampler');
  });

  it('has no duplicates', () => {
    expect(new Set(PRESERVE_TERMS).size).toBe(PRESERVE_TERMS.length);
  });
});

describe('selectGlossary', () => {
  // The Russian failure: 27% of fields pruned, every violation the same term.
  // The translator capped the mirror longest-term-first, so the shortest and
  // most common word in the product fell off the list, while the reviewer read
  // the uncapped mirror and went on demanding it.
  const corpus = JSON.stringify({
    a: { title: 'Workflow for video', description: 'Run this workflow, then open the workflow' },
    b: { title: 'Another workflow', description: 'Latent Consistency Model sampler' },
  });

  it('keeps a short, frequent term over a long, unused one', () => {
    const mirror = {
      Workflow: 'Рабочий процесс',
      'Latent Consistency Model Sampler Settings': 'Настройки сэмплера LCM',
    };
    const selected = selectGlossary(mirror, {}, corpus, 1);

    expect(Object.keys(selected)).toEqual(['Workflow']);
  });

  it('ranked by length instead, the frequent term is the one that is lost', () => {
    // Pinning the old behaviour so the regression cannot come back unnoticed.
    const byLength = Object.entries({
      Workflow: 'Рабочий процесс',
      'Latent Consistency Model Sampler Settings': 'Настройки сэмплера LCM',
    })
      .sort((a, b) => b[0].length - a[0].length)
      .slice(0, 1);

    expect(byLength[0][0]).not.toBe('Workflow');
  });

  it('always keeps curated overrides, even past the cap', () => {
    const selected = selectGlossary({ Workflow: 'Рабочий процесс' }, { Seed: 'Сид' }, corpus, 1);

    expect(selected).toMatchObject({ Workflow: 'Рабочий процесс', Seed: 'Сид' });
  });

  it('lets an override win over the harvested pair', () => {
    const selected = selectGlossary({ Workflow: 'Поток' }, { Workflow: 'Рабочий процесс' }, corpus);

    expect(selected.Workflow).toBe('Рабочий процесс');
  });

  it('lets a null override RETRACT a harvested pair', () => {
    // The escape hatch for a pair the app's own UI contradicts. The mirror is
    // regenerated from the app locales every run, so retraction is the only way
    // to drop one: a hand-edit to the mirror would not survive the next sync.
    const selected = selectGlossary(
      { Workflow: 'Рабочий процесс', Video: 'Видео' },
      { Video: null },
      corpus
    );

    expect(selected).toEqual({ Workflow: 'Рабочий процесс' });
  });

  it('applies a retraction after the cap, so nothing is promoted in its place', () => {
    // Pins the design decision. Filtering the mirror before ranking would free a
    // slot and pull the next-ranked term into the enforced glossary, which is how
    // retracting one bad pair could start enforcing a term nobody vetted.
    const mirror = { Workflow: 'Рабочий процесс', video: 'Видео', Seed: 'Сид' };

    const retracted = selectGlossary(mirror, { Workflow: null }, corpus, 2);

    expect('Seed' in retracted).toBe(false);
    expect(Object.keys(retracted)).toEqual(['video']);
  });

  it('still ignores a blank override rather than treating it as a retraction', () => {
    // Blank stays an accident; only an explicit null is a deliberate retraction.
    const selected = selectGlossary({ Workflow: 'Рабочий процесс' }, { Workflow: '  ' }, corpus);

    expect(selected.Workflow).toBe('Рабочий процесс');
  });

  it('counts whole terms only, so a short term cannot ride inside a longer word', () => {
    const selected = selectGlossary(
      { AI: 'ИИ', Workflow: 'Рабочий процесс' },
      {},
      JSON.stringify({ a: { title: 'Explain the workflow', description: 'workflow again' } }),
      1
    );

    expect(Object.keys(selected)).toEqual(['Workflow']);
  });

  it('does not let a term score inside an identifier', () => {
    // The corpus is full of names like `wan2_2`, so a term riding inside one
    // would out-rank a term that is genuinely used in prose.
    const selected = selectGlossary(
      { AI: 'ИИ', Workflow: 'Рабочий процесс' },
      {},
      JSON.stringify({
        a: { title: 'AI2 and AI_model and 3AI', description: 'the workflow' },
      }),
      1
    );

    expect(Object.keys(selected)).toEqual(['Workflow']);
  });

  it('prefers the longer term when two are equally frequent', () => {
    // The tie-break is the only thing choosing between them, so without this the
    // `b.en.length` comparison can be dropped or reversed and nothing fails.
    // Disjoint terms, so neither can score inside the other and the counts are
    // genuinely equal at one each.
    const selected = selectGlossary(
      { Seed: 'Сид', Sampler: 'Сэмплер' },
      {},
      JSON.stringify({ a: { title: 'Seed', description: 'Sampler' } }),
      1
    );

    expect(Object.keys(selected)).toEqual(['Sampler']);
  });
});

describe('applyOverrides', () => {
  it('replaces on a string and deletes on a null', () => {
    expect(applyOverrides({ a: '1', b: '2' }, { a: 'one', b: null })).toEqual({ a: 'one' });
  });

  it('ignores a retraction for a term that was never harvested', () => {
    expect(applyOverrides({ a: '1' }, { zzz: null })).toEqual({ a: '1' });
  });

  it('does not mutate its input', () => {
    const base = { a: '1' };
    applyOverrides(base, { a: null });

    expect(base).toEqual({ a: '1' });
  });
});

describe('enforceableOverrides', () => {
  it('keeps curated terms and drops retractions', () => {
    // Everything that checks content against the override layer reads it through
    // here. `collectViolations` treats an override as a hard requirement with no
    // model in the loop, so a null reaching it would demand fields render as the
    // literal null.
    expect(enforceableOverrides({ Queue: 'Cola', Video: null })).toEqual({ Queue: 'Cola' });
  });

  it('drops a blank the same way it always did', () => {
    expect(enforceableOverrides({ Queue: '   ' })).toEqual({});
  });
});
