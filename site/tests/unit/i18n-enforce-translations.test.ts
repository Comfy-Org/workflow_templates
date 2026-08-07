import { describe, expect, it } from 'vitest';
import { pruneViolatingFields, isEmptyTranslation } from '../../scripts/i18n/enforce-translations';
import type { WorkflowContent } from '../../src/lib/i18n/schema';

const PRESERVE = ['ComfyUI', 'VAE'];

const english: Record<string, WorkflowContent> = {
  wf1: {
    title: 'ComfyUI VAE workflow',
    description: 'Run ComfyUI with a VAE decoder for crisp output.',
    metaDescription: 'ComfyUI and VAE, explained.',
    extendedDescription: 'This ComfyUI workflow uses a VAE.',
    howToUse: ['Load the VAE in ComfyUI'],
    suggestedUseCases: [],
    faqItems: [{ question: 'What is a VAE?', answer: 'A ComfyUI decoder.' }],
  } as WorkflowContent,
};

describe('pruneViolatingFields', () => {
  it('prunes only the field where a preserve-term was dropped, keeping the rest', () => {
    const zh: Record<string, Partial<WorkflowContent>> = {
      wf1: {
        // "description" dropped ComfyUI + VAE (translated away) -> must be pruned.
        description: '使用解码器运行以获得清晰的输出。',
        // "extendedDescription" kept both terms -> must survive.
        extendedDescription: '此 ComfyUI 工作流使用 VAE。',
      },
    };
    const { content, prunedFieldCount, pruned } = pruneViolatingFields(
      zh,
      english,
      'zh',
      PRESERVE,
      {}
    );
    expect(content.wf1).not.toHaveProperty('description'); // pruned
    expect(content.wf1.extendedDescription).toBe('此 ComfyUI 工作流使用 VAE。'); // kept
    expect(prunedFieldCount).toBe(1);
    expect(pruned.every((v) => v.field === 'description')).toBe(true);
  });

  it('counts a field with multiple violations as one prune', () => {
    const zh: Record<string, Partial<WorkflowContent>> = {
      // description drops BOTH ComfyUI and VAE -> two glossary violations, one field.
      wf1: { description: '运行以获得清晰的输出。' },
    };
    const { prunedFieldCount, pruned } = pruneViolatingFields(zh, english, 'zh', PRESERVE, {});
    expect(prunedFieldCount).toBe(1);
    expect(pruned.length).toBeGreaterThan(1); // >1 violation, still one pruned field
  });

  it('leaves a clean locale untouched', () => {
    const zh: Record<string, Partial<WorkflowContent>> = {
      wf1: { extendedDescription: '此 ComfyUI 工作流使用 VAE。' },
    };
    const { content, prunedFieldCount } = pruneViolatingFields(zh, english, 'zh', PRESERVE, {});
    expect(prunedFieldCount).toBe(0);
    expect(content).toEqual(zh);
  });

  it('leaves entries with no English match untouched (validator owns misalignment)', () => {
    const zh: Record<string, Partial<WorkflowContent>> = {
      unknownId: { description: '任意内容' },
    };
    const { content, prunedFieldCount } = pruneViolatingFields(zh, english, 'zh', PRESERVE, {});
    expect(prunedFieldCount).toBe(0);
    expect(content.unknownId).toEqual({ description: '任意内容' });
  });

  it('reports the denominator (fields inspected) for the systemic threshold', () => {
    const zh: Record<string, Partial<WorkflowContent>> = {
      wf1: {
        description: '使用解码器运行。', // dropped terms -> pruned
        extendedDescription: '此 ComfyUI 工作流使用 VAE。', // kept
      },
    };
    const { fieldsInspected, prunedFieldCount } = pruneViolatingFields(
      zh,
      english,
      'zh',
      PRESERVE,
      {}
    );
    expect(fieldsInspected).toBe(2);
    expect(prunedFieldCount).toBe(1); // 50% -> main() would flag systemic at this scale
  });
});

describe('pruneViolatingFields with AI-review findings', () => {
  // A translation that passes every deterministic check but is bad on quality —
  // the exact case the reviewer exists for. Deterministically it looks fine.
  const cleanZh: Record<string, Partial<WorkflowContent>> = {
    wf1: {
      description: '使用 ComfyUI 和 VAE 解码器运行以获得清晰的输出。',
      extendedDescription: '此 ComfyUI 工作流使用 VAE。',
    },
  };

  it('leaves clean content untouched when no review findings are supplied', () => {
    const { prunedFieldCount } = pruneViolatingFields(cleanZh, english, 'zh', PRESERVE, {});
    expect(prunedFieldCount).toBe(0);
  });

  it('prunes a field the reviewer flagged even though it passes every regex check', () => {
    const { content, prunedFieldCount } = pruneViolatingFields(
      cleanZh,
      english,
      'zh',
      PRESERVE,
      {},
      [
        {
          shareId: 'wf1',
          locale: 'zh',
          field: 'description',
          kind: 'glossary',
          detail: 'ai-review/accuracy/critical: Claims a model the English never mentions.',
        },
      ]
    );
    expect(content.wf1).not.toHaveProperty('description'); // pruned on quality
    expect(content.wf1.extendedDescription).toBeDefined(); // untouched
    expect(prunedFieldCount).toBe(1);
  });

  it('ignores a finding about a field that is already absent, so it cannot inflate the systemic ratio', () => {
    const { prunedFieldCount } = pruneViolatingFields(
      { wf1: { description: '使用 ComfyUI 和 VAE 解码器运行以获得清晰的输出。' } },
      english,
      'zh',
      PRESERVE,
      {},
      [
        {
          shareId: 'wf1',
          locale: 'zh',
          // Not present in the content above -> already English fallback.
          field: 'extendedDescription',
          kind: 'glossary',
          detail: 'ai-review/fluency/major: unnatural phrasing',
        },
      ]
    );
    expect(prunedFieldCount).toBe(0);
  });

  it('counts a deterministic and a review violation on one field as a single prune', () => {
    const zh: Record<string, Partial<WorkflowContent>> = {
      wf1: { description: '运行以获得清晰的输出。' }, // drops ComfyUI + VAE
    };
    const { prunedFieldCount } = pruneViolatingFields(zh, english, 'zh', PRESERVE, {}, [
      {
        shareId: 'wf1',
        locale: 'zh',
        field: 'description',
        kind: 'glossary',
        detail: 'ai-review/accuracy/major: also inaccurate',
      },
    ]);
    expect(prunedFieldCount).toBe(1);
  });
});

describe('isEmptyTranslation (wholesale-failure guard)', () => {
  it('flags a run where every target locale is empty but English is populated', () => {
    expect(isEmptyTranslation(582, [0])).toBe(true); // the OpenAI-quota case: zh came back {}
    expect(isEmptyTranslation(582, [0, 0, 0])).toBe(true); // all targets empty
  });

  it('allows partial progress (at least one target has entries)', () => {
    expect(isEmptyTranslation(582, [582])).toBe(false);
    expect(isEmptyTranslation(582, [0, 300])).toBe(false); // zh empty but ja partial -> publish
  });

  it('never fires when there is no English source or no targets were attempted', () => {
    expect(isEmptyTranslation(0, [0])).toBe(false); // nothing to translate against
    expect(isEmptyTranslation(582, [])).toBe(false); // TRANSLATE_LOCALES unset (e.g. local run)
  });
});
