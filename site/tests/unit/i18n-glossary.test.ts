import { describe, expect, it } from 'vitest';
import { buildMirror, flattenStrings, PRESERVE_TERMS } from '../../scripts/i18n/sync-glossary';

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
