import { describe, expect, it } from 'vitest';
import { collectViolations } from '../../scripts/i18n/validate-translations';
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
});
