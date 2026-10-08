import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_MAX_PRUNE_FRACTION,
  isEmptyTranslation,
  parsePruneFraction,
  pruneViolatingFields,
} from '../../scripts/i18n/enforce-translations';
import {
  PROMPT_VERSION,
  entryHash,
  reviewViolations,
  type Finding,
  type ReviewState,
} from '../../scripts/i18n/review-translations';
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

describe('parsePruneFraction (systemic-threshold config)', () => {
  it('uses the default when the variable is unset or blank', () => {
    expect(parsePruneFraction(undefined)).toBe(DEFAULT_MAX_PRUNE_FRACTION);
    // Blank would become 0 under a bare Number(), making EVERY prune systemic so
    // the build could never pass.
    expect(parsePruneFraction('')).toBe(DEFAULT_MAX_PRUNE_FRACTION);
    expect(parsePruneFraction('   ')).toBe(DEFAULT_MAX_PRUNE_FRACTION);
  });

  it('falls back on a non-numeric value instead of silently disabling the guard', () => {
    // Number('abc') is NaN, and `fraction > NaN` is always false — the guard would
    // stop guarding without a word. This is the bug being fixed.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(parsePruneFraction('abc')).toBe(DEFAULT_MAX_PRUNE_FRACTION);
    expect(parsePruneFraction('O.3')).toBe(DEFAULT_MAX_PRUNE_FRACTION); // letter O typo
    expect(warn).toHaveBeenCalled(); // and it says so, rather than failing silently
    warn.mockRestore();
  });

  it('rejects out-of-range fractions', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(parsePruneFraction('-0.1')).toBe(DEFAULT_MAX_PRUNE_FRACTION);
    expect(parsePruneFraction('1.5')).toBe(DEFAULT_MAX_PRUNE_FRACTION);
    warn.mockRestore();
  });

  it('honours a valid override, including the permissive extremes', () => {
    expect(parsePruneFraction('0.3')).toBe(0.3);
    expect(parsePruneFraction('0')).toBe(0); // deliberately strict: any prune is systemic
    expect(parsePruneFraction('1')).toBe(1); // deliberately permissive: never systemic
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

describe('AI review -> enforcement wiring (the composed path that runs in production)', () => {
  // Each half is covered in isolation elsewhere: reviewViolations() drops stale
  // verdicts, and pruneViolatingFields() honours extraViolations. Neither proves
  // they are wired together correctly, which is the only form that ships — a
  // regression in main()'s call would leave both unit suites green.
  const finding: Finding = {
    field: 'description',
    category: 'fluency',
    severity: 'critical',
    span: 'x',
    suggestion: 'y',
    reason: 'Unnatural phrasing.',
  };

  // Keeps both preserve terms, so nothing here is prunable by the deterministic
  // checks; any pruning observed is attributable to the AI verdict alone.
  const clean: Record<string, Partial<WorkflowContent>> = {
    wf1: { description: '使用 ComfyUI 和 VAE 解码器运行以获得清晰的输出。' },
  };

  const stateFor = (content: Record<string, Partial<WorkflowContent>>): ReviewState => ({
    promptVersion: PROMPT_VERSION,
    entries: { wf1: { hash: entryHash(english.wf1!, content.wf1!), findings: [finding] } },
  });

  it('prunes the field when the verdict still describes the current translation', () => {
    const violations = reviewViolations('zh', stateFor(clean), english, clean);
    const { content, prunedFieldCount } = pruneViolatingFields(
      clean,
      english,
      'zh',
      PRESERVE,
      {},
      violations
    );
    expect(prunedFieldCount).toBe(1);
    expect(content.wf1!.description).toBeUndefined();
  });

  it('does NOT prune once the translation changed after the verdict was written', () => {
    // The regression this guards: a stale verdict pruning a translation that may
    // have already fixed the very problem the verdict describes.
    const retranslated: Record<string, Partial<WorkflowContent>> = {
      wf1: { description: '使用 ComfyUI 和 VAE 解码器运行，输出更清晰。' },
    };
    const violations = reviewViolations('zh', stateFor(clean), english, retranslated);
    expect(violations).toEqual([]);

    const { content, prunedFieldCount } = pruneViolatingFields(
      retranslated,
      english,
      'zh',
      PRESERVE,
      {},
      violations
    );
    expect(prunedFieldCount).toBe(0);
    expect(content.wf1!.description).toBe(retranslated.wf1!.description);
  });
});
