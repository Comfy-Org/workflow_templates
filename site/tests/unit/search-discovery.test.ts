import { describe, expect, it } from 'vitest';
import { buildDiscoveryData } from '../../src/lib/search-discovery';
import type { SerializedTemplate, CreatorEntry } from '../../src/lib/hub-api';

function template(overrides: Partial<SerializedTemplate> = {}): SerializedTemplate {
  return {
    name: 'wf',
    shareId: 'abc123',
    title: 'A Workflow',
    description: 'desc',
    mediaType: 'image',
    tags: [],
    models: [],
    logos: [],
    usage: 0,
    date: '2026-01-01',
    thumbnails: ['a-1.webp'],
    username: 'alice',
    creatorDisplayName: 'Alice',
    creatorAvatarUrl: '',
    isApp: false,
    ...overrides,
  };
}

const creators: CreatorEntry[] = [
  { username: 'alice', displayName: 'Alice', avatarUrl: 'alice.png' },
  { username: 'bob', displayName: 'Bob', avatarUrl: 'bob.png' },
  { username: 'carol', displayName: 'Carol', avatarUrl: '' },
];

describe('buildDiscoveryData', () => {
  it('ranks popular workflows by usage and trims to the top 8', () => {
    const templates = Array.from({ length: 12 }, (_, i) =>
      template({ name: `wf${i}`, shareId: `id${i}`, usage: i })
    );
    const { popular, totalCount } = buildDiscoveryData(templates, creators);

    expect(totalCount).toBe(12);
    expect(popular).toHaveLength(8);
    expect(popular[0].usage).toBe(11);
    expect(popular[0].name).toBe('wf11');
    // Trimmed popular card carries thumbnail as a single string, not an array.
    expect(popular[0].thumbnail).toBe('a-1.webp');
    expect(popular[0]).not.toHaveProperty('thumbnails');
  });

  it('counts tag and model facets, sorted by frequency descending', () => {
    const templates = [
      template({ name: 'a', tags: ['video', 'flux'], models: ['Flux'] }),
      template({ name: 'b', tags: ['video'], models: ['Flux'] }),
      template({ name: 'c', tags: ['video'], models: ['Wan'] }),
    ];
    const { facets } = buildDiscoveryData(templates, creators);

    expect(facets.tags[0]).toEqual({ name: 'video', count: 3 });
    expect(facets.tags.find((t) => t.name === 'flux')).toEqual({ name: 'flux', count: 1 });
    expect(facets.models[0]).toEqual({ name: 'Flux', count: 2 });
    expect(facets.models).toContainEqual({ name: 'Wan', count: 1 });
  });

  it('enriches creators with workflow count + usage and sorts by usage', () => {
    const templates = [
      template({ name: 'a', username: 'alice', usage: 100 }),
      template({ name: 'b', username: 'alice', usage: 50 }),
      template({ name: 'c', username: 'bob', usage: 300 }),
    ];
    const { creators: enriched } = buildDiscoveryData(templates, creators);

    // Bob (300) outranks Alice (150); Carol (no workflows) stays last with zeros.
    expect(enriched.map((c) => c.username)).toEqual(['bob', 'alice', 'carol']);
    expect(enriched[0]).toMatchObject({ username: 'bob', workflowCount: 1, usage: 300 });
    expect(enriched[1]).toMatchObject({ username: 'alice', workflowCount: 2, usage: 150 });
    expect(enriched[2]).toMatchObject({ username: 'carol', workflowCount: 0, usage: 0 });
  });

  it('handles an empty catalog without throwing', () => {
    const { popular, creators: enriched, facets, totalCount } = buildDiscoveryData([], creators);
    expect(popular).toEqual([]);
    expect(facets.tags).toEqual([]);
    expect(facets.models).toEqual([]);
    expect(totalCount).toBe(0);
    // Creators still returned, all with zero counts.
    expect(enriched.every((c) => c.workflowCount === 0 && c.usage === 0)).toBe(true);
  });
});
