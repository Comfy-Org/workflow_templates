import { describe, expect, it } from 'vitest';
import {
  PROMPT_VERSION,
  buildSystemPrompt,
  buildUserPrompt,
  entryHash,
  parseFindings,
  pruneOrphanedVerdicts,
  reviewViolations,
  selectEntriesForReview,
  summarize,
  type Finding,
  type ReviewState,
} from '../../scripts/i18n/review-translations';
import type { WorkflowContent } from '../../src/lib/i18n/schema';

const english: Record<string, WorkflowContent> = {
  wf1: {
    title: 'Wan2.5 text to image',
    description: 'Generate images from a text prompt with Wan2.5.',
    metaDescription: 'Wan2.5 text to image on ComfyUI.',
    extendedDescription: 'This workflow runs Wan2.5 for text to image.',
    howToUse: ['Load the workflow'],
    suggestedUseCases: [],
    faqItems: [{ question: 'Which model?', answer: 'Wan2.5.' }],
  } as WorkflowContent,
};

const target: Record<string, Partial<WorkflowContent>> = {
  wf1: { title: 'Wan2.5 文生图', description: '使用 Wan2.5 从文本提示词生成图像。' },
};

function stateWith(findings: Finding[]): ReviewState {
  return {
    promptVersion: PROMPT_VERSION,
    entries: { wf1: { hash: entryHash(english.wf1!, target.wf1!), findings } },
  };
}

describe('entryHash', () => {
  it('changes when the translation changes, so an edited field is re-reviewed', () => {
    const before = entryHash(english.wf1!, { title: 'A' });
    const after = entryHash(english.wf1!, { title: 'B' });
    expect(before).not.toBe(after);
  });

  it('changes when the English source changes, so a re-worded source is re-reviewed', () => {
    const a = entryHash(english.wf1!, target.wf1!);
    const b = entryHash({ ...english.wf1!, title: 'Different' }, target.wf1!);
    expect(a).not.toBe(b);
  });

  it('changes when the rubric version changes, so a rubric bump forces a full re-review', () => {
    const v1 = entryHash(english.wf1!, target.wf1!, 1);
    const v2 = entryHash(english.wf1!, target.wf1!, 2);
    expect(v1).not.toBe(v2);
  });

  it('is stable for identical input, so an unchanged entry costs nothing', () => {
    expect(entryHash(english.wf1!, target.wf1!)).toBe(entryHash(english.wf1!, target.wf1!));
  });
});

describe('selectEntriesForReview', () => {
  it('selects entries with no prior verdict', () => {
    const state: ReviewState = { promptVersion: PROMPT_VERSION, entries: {} };
    expect(selectEntriesForReview(target, english, state)).toEqual(['wf1']);
  });

  it('skips entries whose stored hash still matches — the incremental saving', () => {
    expect(selectEntriesForReview(target, english, stateWith([]))).toEqual([]);
  });

  it('re-selects an entry once its translation changes', () => {
    const edited = { wf1: { ...target.wf1!, title: 'edited' } };
    expect(selectEntriesForReview(edited, english, stateWith([]))).toEqual(['wf1']);
  });

  it('ignores entries with no English counterpart, which the validator already reports', () => {
    const orphan = { ghost: { title: 'x' } };
    const state: ReviewState = { promptVersion: PROMPT_VERSION, entries: {} };
    expect(selectEntriesForReview(orphan, english, state)).toEqual([]);
  });
});

describe('pruneOrphanedVerdicts', () => {
  it('drops verdicts for workflows that no longer exist so state cannot grow forever', () => {
    const state: ReviewState = {
      promptVersion: PROMPT_VERSION,
      entries: {
        wf1: { hash: 'h', findings: [] },
        archived: { hash: 'h', findings: [] },
      },
    };
    const pruned = pruneOrphanedVerdicts(state, target);
    expect(Object.keys(pruned.entries)).toEqual(['wf1']);
  });
});

describe('parseFindings', () => {
  const good = {
    findings: [
      {
        field: 'title',
        category: 'terminology',
        severity: 'critical',
        span: '万相2.5',
        suggestion: 'Wan2.5',
        reason: 'Model name must stay in English.',
      },
    ],
  };

  it('keeps a well-formed finding', () => {
    expect(parseFindings(good, target.wf1!)).toHaveLength(1);
  });

  it('drops a finding naming a field that is not translatable', () => {
    const raw = { findings: [{ ...good.findings[0], field: 'notAField' }] };
    expect(parseFindings(raw, target.wf1!)).toEqual([]);
  });

  it('drops a finding for a field absent from the translation (already English fallback)', () => {
    // extendedDescription is not present in target.wf1, so a finding about it is
    // hallucinated — trusting it would prune a field that has nothing in it.
    const raw = { findings: [{ ...good.findings[0], field: 'extendedDescription' }] };
    expect(parseFindings(raw, target.wf1!)).toEqual([]);
  });

  it('drops a finding with an unknown severity rather than trusting it', () => {
    const raw = { findings: [{ ...good.findings[0], severity: 'catastrophic' }] };
    expect(parseFindings(raw, target.wf1!)).toEqual([]);
  });

  it('drops a finding with an unknown category', () => {
    const raw = { findings: [{ ...good.findings[0], category: 'vibes' }] };
    expect(parseFindings(raw, target.wf1!)).toEqual([]);
  });

  it('returns empty for malformed model output instead of throwing', () => {
    expect(parseFindings(null, target.wf1!)).toEqual([]);
    expect(parseFindings({}, target.wf1!)).toEqual([]);
    expect(parseFindings({ findings: 'nope' }, target.wf1!)).toEqual([]);
    expect(parseFindings({ findings: [null, 42] }, target.wf1!)).toEqual([]);
  });
});

describe('reviewViolations', () => {
  const finding = (severity: Finding['severity']): Finding => ({
    field: 'title',
    category: 'terminology',
    severity,
    span: 'x',
    suggestion: 'y',
    reason: 'Model name translated.',
  });

  it('converts critical and major findings into prunable violations', () => {
    const violations = reviewViolations('zh', stateWith([finding('critical'), finding('major')]));
    expect(violations).toHaveLength(2);
    expect(violations[0]).toMatchObject({ shareId: 'wf1', locale: 'zh', field: 'title' });
  });

  it('does NOT prune on a minor finding — a nit should not cost the whole field', () => {
    expect(reviewViolations('zh', stateWith([finding('minor')]))).toEqual([]);
  });

  it('labels the detail so a pruned field is traceable to the AI reviewer', () => {
    const [violation] = reviewViolations('zh', stateWith([finding('critical')]));
    expect(violation!.detail).toContain('ai-review/terminology/critical');
  });
});

describe('summarize', () => {
  it('counts findings by severity and category for the run log', () => {
    const findings: Finding[] = [
      {
        field: 'title',
        category: 'terminology',
        severity: 'critical',
        span: '',
        suggestion: '',
        reason: '',
      },
      {
        field: 'title',
        category: 'fluency',
        severity: 'minor',
        span: '',
        suggestion: '',
        reason: '',
      },
    ];
    const summary = summarize(stateWith(findings));
    expect(summary.entries).toBe(1);
    expect(summary.findings).toBe(2);
    expect(summary.bySeverity.critical).toBe(1);
    expect(summary.bySeverity.minor).toBe(1);
    expect(summary.byCategory.terminology).toBe(1);
    expect(summary.byCategory.fluency).toBe(1);
  });
});

describe('buildSystemPrompt', () => {
  it('lists the preserve terms the reviewer must enforce', () => {
    const prompt = buildSystemPrompt('zh', ['ComfyUI', 'Wan2.5'], {});
    expect(prompt).toContain('ComfyUI, Wan2.5');
  });

  it('includes the locale product-UI terminology pairs so hub matches the app', () => {
    const prompt = buildSystemPrompt('zh', [], { upscale: '放大' });
    expect(prompt).toContain('upscale → 放大');
  });

  it('tells the reviewer that an empty findings list is a valid answer', () => {
    // Without this the model invents defects to look useful, which would prune
    // perfectly good translations.
    expect(buildSystemPrompt('zh', [], {}).toLowerCase()).toContain('empty findings array');
  });
});

describe('buildUserPrompt', () => {
  it('puts English beside the translation for each shared field', () => {
    const prompt = buildUserPrompt('wf1', english.wf1!, target.wf1!);
    expect(prompt).toContain('## title');
    expect(prompt).toContain('Wan2.5 text to image');
    expect(prompt).toContain('Wan2.5 文生图');
  });

  it('omits fields missing from the translation, which already render English', () => {
    const prompt = buildUserPrompt('wf1', english.wf1!, { title: 'x' });
    expect(prompt).not.toContain('## description');
  });
});
