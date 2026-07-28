import { describe, expect, it } from 'vitest';
import { collectViolations, collectUiViolations } from '../../scripts/i18n/validate-translations';
import type { WorkflowContent } from '../../src/lib/i18n/schema';

const PRESERVE = ['ComfyUI', 'Wan', 'LoRA'];

function en(overrides: Partial<WorkflowContent> = {}): WorkflowContent {
  return {
    title: 'Wan 2.1 Inpainting',
    description: 'Generate coherent video with Wan 2.1 in ComfyUI.',
    metaDescription: 'Create video with Wan 2.1 in ComfyUI. See https://comfy.org/docs for more.',
    extendedDescription: 'A long English body describing the workflow in detail and at length.',
    howToUse: ['Load the workflow', 'Run it'],
    suggestedUseCases: [],
    faqItems: [{ question: 'How?', answer: 'Like this.' }],
    ...overrides,
  };
}

const kinds = (vs: ReturnType<typeof collectViolations>) => vs.map((v) => v.kind);

describe('collectViolations', () => {
  it('passes a well-formed Chinese translation', () => {
    const zh = {
      title: 'Wan 2.1 图像修复',
      description: '在 ComfyUI 中使用 Wan 2.1 生成连贯的视频。',
      metaDescription: '在 ComfyUI 中使用 Wan 2.1 创建视频。详见 https://comfy.org/docs 。',
      extendedDescription: '一段较长的中文正文，详细描述该工作流的用途和细节，内容充实。',
      howToUse: ['加载工作流', '运行'],
      faqItems: [{ question: '怎么用？', answer: '像这样。' }],
    };
    expect(collectViolations('s1', 'zh', en(), zh, PRESERVE)).toEqual([]);
  });

  it('flags English leakage in a CJK locale', () => {
    const zh = { extendedDescription: 'A long English body describing the workflow in detail.' };
    expect(kinds(collectViolations('s1', 'zh', en(), zh, PRESERVE))).toContain('language');
  });

  it('flags a preserve-term translated away', () => {
    // "Wan" removed/translated in the localized description.
    const zh = { description: '在 ComfyUI 中生成连贯的视频。' };
    const violations = collectViolations('s1', 'zh', en(), zh, PRESERVE);
    expect(violations.some((v) => v.kind === 'glossary' && v.detail.includes('Wan'))).toBe(true);
  });

  it('flags an array length mismatch (dropped FAQ / step)', () => {
    const zh = { howToUse: ['加载工作流'] }; // English has 2
    expect(kinds(collectViolations('s1', 'zh', en(), zh, PRESERVE))).toContain('structure');
  });

  it('flags a malformed FAQ item', () => {
    const zh = { faqItems: [{ question: '怎么用？', answer: '' }] };
    expect(kinds(collectViolations('s1', 'zh', en(), zh, PRESERVE))).toContain('structure');
  });

  it('flags a dropped URL', () => {
    const zh = { metaDescription: '在 ComfyUI 中使用 Wan 2.1 创建视频。' }; // URL missing
    expect(kinds(collectViolations('s1', 'zh', en(), zh, PRESERVE))).toContain('format');
  });

  it('flags an introduced banned hype word', () => {
    const es = { description: 'Genera videos stunning con Wan 2.1 en ComfyUI.' };
    expect(kinds(collectViolations('s1', 'es', en(), es, PRESERVE))).toContain('brand-voice');
  });

  it('flags a Latin-locale field identical to English (untranslated)', () => {
    const es = { extendedDescription: en().extendedDescription };
    expect(kinds(collectViolations('s1', 'es', en(), es, PRESERVE))).toContain('language');
  });

  it('only checks fields present in the translation', () => {
    // Only title provided (and legitimately localized) -> no violations.
    expect(collectViolations('s1', 'zh', en(), { title: 'Wan 2.1 图像修复' }, PRESERVE)).toEqual(
      []
    );
  });

  it('does not flag a brand/identifier title left in English', () => {
    // Titles are often all proper nouns or raw identifiers that stay English in
    // every locale; the language check must not fire on the title field.
    const enName = en({ title: 'cinematic_annotate_video' });
    const zh = { title: 'cinematic_annotate_video' };
    expect(kinds(collectViolations('s1', 'zh', enName, zh, PRESERVE))).not.toContain('language');
    const es = { title: 'cinematic_annotate_video' };
    expect(kinds(collectViolations('s1', 'es', enName, es, PRESERVE))).not.toContain('language');
  });

  it('does not flag a preserve-term that repeats fewer times but is still present', () => {
    // English repeats "LoRA" twice; a natural translation keeps it once. The
    // term survives, so this is not "translated away".
    const enName = en({ howToUse: ['Enable the LoRA path', 'Disable the LoRA path'] });
    const ja = { howToUse: ['LoRA パスを有効化', '無効化する'] };
    expect(kinds(collectViolations('s1', 'ja', enName, ja, PRESERVE))).not.toContain('glossary');
  });

  it('still flags a preserve-term that vanishes entirely', () => {
    // "LoRA" present in English but fully gone (e.g. rendered as katakana).
    const enName = en({ howToUse: ['Enable the LoRA path', 'Run it'] });
    const ja = { howToUse: ['ローラ パスを有効化', '実行する'] };
    expect(kinds(collectViolations('s1', 'ja', enName, ja, PRESERVE))).toContain('glossary');
  });

  it('enforces a curated override term (must render the paired translation)', () => {
    // Override says English "workflow" must be "工作流" in zh; the translation used
    // a different word, so it fails.
    const enName = en({ description: 'Run this workflow in ComfyUI.' });
    const zh = { description: '在 ComfyUI 中运行此流程。' }; // uses 流程, not 工作流
    const overrides = { workflow: '工作流' };
    const vs = collectViolations('s1', 'zh', enName, zh, PRESERVE, overrides);
    expect(vs.some((v) => v.kind === 'glossary' && v.detail.includes('工作流'))).toBe(true);
  });

  it('passes when the override term is rendered correctly', () => {
    const enName = en({ description: 'Run this workflow in ComfyUI.' });
    const zh = { description: '在 ComfyUI 中运行此工作流。' };
    const overrides = { workflow: '工作流' };
    expect(collectViolations('s1', 'zh', enName, zh, PRESERVE, overrides)).toEqual([]);
  });
});

const uiKinds = (vs: ReturnType<typeof collectUiViolations>) => vs.map((v) => v.kind);

describe('collectUiViolations', () => {
  const enUi = {
    'hub.title': 'Comfy Workflows',
    'model.metaH1': '{label} ComfyUI Workflows',
    'model.metaDescription': '{count} {label} workflows for ComfyUI.',
  };

  it('passes a translation that preserves placeholders and types', () => {
    const zh = {
      'hub.title': 'Comfy 工作流',
      'model.metaH1': '{label} ComfyUI 工作流',
      'model.metaDescription': '{count} 个 {label} ComfyUI 工作流。',
    };
    expect(collectUiViolations('zh', enUi, zh)).toEqual([]);
  });

  it('allows missing keys (they render via the English fallback)', () => {
    expect(collectUiViolations('zh', enUi, { 'hub.title': 'Comfy 工作流' })).toEqual([]);
  });

  it('flags a dropped placeholder', () => {
    const zh = { 'model.metaDescription': '{label} 的 ComfyUI 工作流。' }; // {count} dropped
    expect(uiKinds(collectUiViolations('zh', enUi, zh))).toContain('placeholder');
  });

  it('flags a renamed placeholder', () => {
    const zh = { 'model.metaH1': '{name} ComfyUI 工作流' }; // {label} -> {name}
    expect(uiKinds(collectUiViolations('zh', enUi, zh))).toContain('placeholder');
  });

  it('flags a type mismatch against English', () => {
    const zh = { 'hub.title': ['not', 'a', 'string'] as unknown as string };
    expect(uiKinds(collectUiViolations('zh', enUi, zh))).toContain('type');
  });

  it('flags a key that does not exist in English', () => {
    const zh = { 'hub.ghost': '幽灵' };
    expect(uiKinds(collectUiViolations('zh', enUi, zh))).toContain('unknown-key');
  });
});
