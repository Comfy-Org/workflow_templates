import { describe, expect, it } from 'vitest';
import {
  extractContent,
  hashContent,
  hashValue,
  staleFields,
  pruneStaleFields,
  buildHumanSeed,
} from '../../scripts/i18n/build-content-source';
import type { WorkflowContent } from '../../src/lib/i18n/schema';

describe('extractContent', () => {
  it('normalizes the 7 fields and drops unknown keys', () => {
    const c = extractContent({
      shareId: 'x',
      title: 'T',
      description: 'D',
      metaDescription: 'M',
      extendedDescription: 'E',
      howToUse: ['a', 2, 'b'],
      suggestedUseCases: ['u'],
      faqItems: [{ question: 'q', answer: 'a', extra: 1 }, { junk: true }],
      randomField: 'ignored',
    });
    expect(c).toEqual({
      title: 'T',
      description: 'D',
      metaDescription: 'M',
      extendedDescription: 'E',
      howToUse: ['a', 'b'], // non-strings filtered
      suggestedUseCases: ['u'],
      faqItems: [{ question: 'q', answer: 'a' }], // extra keys dropped, empty item dropped
    });
  });

  it('defaults missing fields to empty', () => {
    expect(extractContent({ title: 'only' })).toEqual({
      title: 'only',
      description: '',
      metaDescription: '',
      extendedDescription: '',
      howToUse: [],
      suggestedUseCases: [],
      faqItems: [],
    });
  });
});

const CONTENT: WorkflowContent = {
  title: 'T',
  description: 'D',
  metaDescription: 'M',
  extendedDescription: 'E',
  howToUse: [],
  suggestedUseCases: [],
  faqItems: [],
};

describe('hashContent', () => {
  it('is deterministic and changes with any field', () => {
    const a = hashContent(CONTENT);
    const b = hashContent({ ...CONTENT, description: 'D2' });
    expect(hashContent(CONTENT).content).toBe(a.content); // stable
    expect(b.content).not.toBe(a.content); // combined hash moved
    expect(b.fields.description).not.toBe(a.fields.description); // field hash moved
    expect(b.fields.title).toBe(a.fields.title); // untouched field stable
  });
});

describe('staleFields', () => {
  it('lists only the fields whose hash changed', () => {
    const prev = { s1: hashContent(CONTENT), s2: hashContent(CONTENT) };
    const next = { s1: hashContent({ ...CONTENT, title: 'NEW' }), s2: hashContent(CONTENT) };
    expect(staleFields(prev, next)).toEqual({ s1: ['title'] });
  });
  it('treats a brand-new workflow (no prior hash) as not stale', () => {
    expect(staleFields({}, { s2: hashContent(CONTENT) })).toEqual({});
  });
  it('marks every field stale when the prior entry lacks per-field hashes', () => {
    const prev = { s1: { content: 'oldhash' } } as unknown as Parameters<typeof staleFields>[0];
    const next = { s1: hashContent(CONTENT) };
    expect(staleFields(prev, next).s1).toEqual([
      'title',
      'description',
      'metaDescription',
      'extendedDescription',
      'howToUse',
      'suggestedUseCases',
      'faqItems',
    ]);
  });
});

describe('pruneStaleFields', () => {
  it('drops only the stale fields, keeping the rest of the entry', () => {
    const machine = { s1: { title: '机器标题', description: '机器描述' }, s2: { title: '机器' } };
    expect(pruneStaleFields(machine, { s1: ['title'] })).toEqual({
      s1: { description: '机器描述' },
      s2: { title: '机器' },
    });
  });
  it('removes the entry entirely when all its fields are pruned', () => {
    const machine = { s1: { title: 'x' } };
    expect(pruneStaleFields(machine, { s1: ['title'] })).toEqual({});
  });
  it('is a no-op when nothing is stale', () => {
    const machine = { s1: { title: 'x' } };
    expect(pruneStaleFields(machine, {})).toEqual(machine);
  });
});

describe('buildHumanSeed', () => {
  const english = { abc: { ...CONTENT, title: 'English Title', description: 'English Desc' } };
  const nameByShareId = { abc: 'wf_name' };

  it('seeds human title/description only when they differ from English', () => {
    const seed = buildHumanSeed(english, nameByShareId, {
      wf_name: { title: '中文标题', description: 'English Desc' },
    });
    expect(seed.abc).toEqual({ title: '中文标题' }); // description equalled EN -> skipped
  });
  it('omits workflows with no matching human entry', () => {
    expect(buildHumanSeed(english, nameByShareId, {})).toEqual({});
  });
});

describe('hashValue', () => {
  it('is a stable 12-hex string', () => {
    expect(hashValue(['a', 'b'])).toMatch(/^[0-9a-f]{12}$/);
    expect(hashValue(['a', 'b'])).toBe(hashValue(['a', 'b']));
  });
});
