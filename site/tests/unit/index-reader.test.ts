import { describe, it, expect } from 'vitest';
import { flattenTemplates, getTopByUsage } from '../../scripts/lib/index-reader';

describe('flattenTemplates', () => {
  it('flattens categories into a single array', () => {
    const categories = [
      {
        moduleName: 'mod1',
        category: 'cat1',
        icon: '🎨',
        title: 'Category 1',
        type: 'image',
        templates: [
          { name: 'template1', description: 'desc1', mediaType: 'image' as const },
          { name: 'template2', description: 'desc2', mediaType: 'image' as const },
        ],
      },
      {
        moduleName: 'mod2',
        category: 'cat2',
        icon: '🎥',
        title: 'Category 2',
        type: 'video',
        templates: [{ name: 'template3', description: 'desc3', mediaType: 'video' as const }],
      },
    ];
    const result = flattenTemplates(categories);
    expect(result).toHaveLength(3);
    expect(result.map((t) => t.name)).toEqual(['template1', 'template2', 'template3']);
  });

  it('handles empty categories', () => {
    expect(flattenTemplates([])).toEqual([]);
  });

  it('handles categories with no templates', () => {
    const categories = [
      {
        moduleName: 'mod1',
        category: 'cat1',
        icon: '🎨',
        title: 'Category 1',
        type: 'image',
        templates: [],
      },
    ];
    expect(flattenTemplates(categories)).toEqual([]);
  });
});

describe('getTopByUsage', () => {
  const templates = [
    { name: 'low', description: 'd', mediaType: 'image' as const, usage: 10 },
    { name: 'high', description: 'd', mediaType: 'image' as const, usage: 100 },
    { name: 'mid', description: 'd', mediaType: 'image' as const, usage: 50 },
    { name: 'none', description: 'd', mediaType: 'image' as const },
  ];

  it('sorts by usage descending', () => {
    const result = getTopByUsage(templates);
    expect(result[0].name).toBe('high');
    expect(result[1].name).toBe('mid');
    expect(result[2].name).toBe('low');
  });

  it('limits to N results', () => {
    const result = getTopByUsage(templates, 2);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('high');
    expect(result[1].name).toBe('mid');
  });

  it('treats missing usage as 0', () => {
    const result = getTopByUsage(templates);
    expect(result[result.length - 1].name).toBe('none');
  });

  it('returns all when no limit', () => {
    const result = getTopByUsage(templates);
    expect(result).toHaveLength(4);
  });
});
