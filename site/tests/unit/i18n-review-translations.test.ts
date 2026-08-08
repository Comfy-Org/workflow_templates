import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  PROMPT_VERSION,
  buildSystemPrompt,
  buildUserPrompt,
  entryHash,
  parseFindings,
  pruneOrphanedVerdicts,
  reviewViolations,
  loadReviewState,
  reviewStatePath,
  parsePositiveInt,
  reviewLocale,
  sanitizeFindings,
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

describe('reviewLocale (end-to-end orchestration, no network)', () => {
  const two: Record<string, Partial<WorkflowContent>> = {
    wf1: { title: 'Wan2.5 文生图' },
    wf2: { title: '另一个工作流' },
  };
  const englishTwo: Record<string, WorkflowContent> = {
    wf1: english.wf1!,
    wf2: { ...english.wf1!, title: 'Another workflow' } as WorkflowContent,
  };
  const empty: ReviewState = { promptVersion: PROMPT_VERSION, entries: {} };

  const finding: Finding = {
    field: 'title',
    category: 'terminology',
    severity: 'critical',
    span: '万相',
    suggestion: 'Wan2.5',
    reason: 'Model name translated.',
  };

  it('reviews every stale entry and stores each verdict', async () => {
    const seen: string[] = [];
    const result = await reviewLocale(two, englishTwo, empty, async (shareId) => {
      seen.push(shareId);
      return [];
    });
    expect(seen.sort()).toEqual(['wf1', 'wf2']);
    expect(result.reviewed).toBe(2);
    expect(Object.keys(result.state.entries).sort()).toEqual(['wf1', 'wf2']);
  });

  it('does not call the reviewer at all when nothing is stale — the cost saving', async () => {
    const primed = await reviewLocale(two, englishTwo, empty, async () => []);
    let calls = 0;
    const second = await reviewLocale(two, englishTwo, primed.state, async () => {
      calls += 1;
      return [];
    });
    expect(calls).toBe(0);
    expect(second.reviewed).toBe(0);
  });

  it('re-reviews only the entry whose translation changed', async () => {
    const primed = await reviewLocale(two, englishTwo, empty, async () => []);
    const edited = { ...two, wf2: { title: '改过的标题' } };
    const seen: string[] = [];
    await reviewLocale(edited, englishTwo, primed.state, async (shareId) => {
      seen.push(shareId);
      return [];
    });
    expect(seen).toEqual(['wf2']);
  });

  it('records a failed entry as unreviewed rather than as clean', async () => {
    // The dangerous bug this guards: treating an API failure as "no findings"
    // would mark a locale reviewed-and-clean when it was never actually read.
    const result = await reviewLocale(two, englishTwo, empty, async (shareId) =>
      shareId === 'wf1' ? null : []
    );
    expect(result.failures).toEqual(['wf1']);
    expect(result.state.entries.wf1).toBeUndefined(); // no verdict stored
    expect(result.state.entries.wf2).toBeDefined();
    expect(result.reviewed).toBe(1);
  });

  it('retries a previously failed entry on the next run', async () => {
    const first = await reviewLocale(two, englishTwo, empty, async (shareId) =>
      shareId === 'wf1' ? null : []
    );
    const retried: string[] = [];
    await reviewLocale(two, englishTwo, first.state, async (shareId) => {
      retried.push(shareId);
      return [];
    });
    expect(retried).toEqual(['wf1']);
  });

  it('survives a reviewer that throws, without losing the other entries', async () => {
    const result = await reviewLocale(two, englishTwo, empty, async (shareId) => {
      if (shareId === 'wf1') throw new Error('429 rate limited');
      return [];
    });
    expect(result.failures[0]).toContain('429');
    expect(result.state.entries.wf2).toBeDefined();
  });

  it('carries findings through to prunable violations — the full path', async () => {
    const result = await reviewLocale(two, englishTwo, empty, async (shareId) =>
      shareId === 'wf1' ? [finding] : []
    );
    const violations = reviewViolations('zh', result.state);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ shareId: 'wf1', field: 'title' });
  });

  it('respects the concurrency limit', async () => {
    const many = Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [`w${i}`, { title: `t${i}` }])
    );
    const manyEn = Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [`w${i}`, { ...english.wf1!, title: `en${i}` }])
    ) as Record<string, WorkflowContent>;
    let inFlight = 0;
    let peak = 0;
    const seenIds: Record<string, true> = {};
    await reviewLocale(
      many,
      manyEn,
      { promptVersion: PROMPT_VERSION, entries: {} },
      async (shareId) => {
        seenIds[shareId] = true;
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await new Promise((r) => setTimeout(r, 5));
        inFlight -= 1;
        return [];
      },
      3
    );
    // Lower bound matters as much as the upper: without it this passes when the
    // pool builds zero runners and nothing is reviewed at all.
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThanOrEqual(3);
    expect(Object.keys(many).every((k) => k in seenIds)).toBe(true);
  });

  it('drops verdicts for archived workflows while reviewing the rest', async () => {
    const primed = await reviewLocale(two, englishTwo, empty, async () => []);
    const afterArchive = { wf1: two.wf1! }; // wf2 archived
    const result = await reviewLocale(afterArchive, englishTwo, primed.state, async () => []);
    expect(Object.keys(result.state.entries)).toEqual(['wf1']);
  });
});

describe('reviewViolations freshness (stale verdicts must not prune fresh text)', () => {
  const finding: Finding = {
    field: 'title',
    category: 'terminology',
    severity: 'critical',
    span: 'x',
    suggestion: 'y',
    reason: 'Model name translated.',
  };

  it('prunes when the verdict matches the current translation', () => {
    const state = stateWith([finding]);
    expect(reviewViolations('zh', state, english, target)).toHaveLength(1);
  });

  it('does NOT prune once the translation has been re-translated since the verdict', () => {
    // The dangerous case: a verdict about old text would otherwise prune a
    // translation that may have fixed the very problem the verdict describes.
    const state = stateWith([finding]);
    const fixed = { wf1: { ...target.wf1!, title: 'Wan2.5 文生图 (corrected)' } };
    expect(reviewViolations('zh', state, english, fixed)).toEqual([]);
  });

  it('does NOT prune when the English source changed under a stored verdict', () => {
    const state = stateWith([finding]);
    const newEnglish = { wf1: { ...english.wf1!, title: 'Rewritten source title' } };
    expect(reviewViolations('zh', state, newEnglish, target)).toEqual([]);
  });

  it('keeps the old behaviour when no content is supplied (caller vouches for freshness)', () => {
    expect(reviewViolations('zh', stateWith([finding]))).toHaveLength(1);
  });
});

describe('parsePositiveInt (env guards)', () => {
  it('falls back for unset or blank', () => {
    expect(parsePositiveInt(undefined, 4, 'X')).toBe(4);
    expect(parsePositiveInt('', 4, 'X')).toBe(4);
  });

  it('falls back for values that would silently disable a guard', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // NaN concurrency builds zero runners and writes the locale as reviewed-and-clean.
    expect(parsePositiveInt('abc', 4, 'X')).toBe(4);
    expect(parsePositiveInt('0', 4, 'X')).toBe(4);
    expect(parsePositiveInt('-2', 4, 'X')).toBe(4);
    expect(parsePositiveInt('2.5', 4, 'X')).toBe(4);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('honours a valid override', () => {
    expect(parsePositiveInt('12', 4, 'X')).toBe(12);
  });
});

describe('sanitizeFindings (stored state may be truncated or hand-edited)', () => {
  it('drops entries with an unknown severity or category', () => {
    expect(sanitizeFindings([{ field: 'title', category: 'vibes', severity: 'critical' }])).toEqual(
      []
    );
    expect(sanitizeFindings([{ field: 'title', category: 'accuracy', severity: 'huge' }])).toEqual(
      []
    );
  });

  it('survives junk without throwing', () => {
    expect(sanitizeFindings([null, 42, 'x', {}])).toEqual([]);
  });

  it('keeps a well-formed finding even when the field is absent from the translation', () => {
    // Unlike parseFindings: stored verdicts legitimately outlive a field's presence.
    expect(
      sanitizeFindings([
        {
          field: 'extendedDescription',
          category: 'fluency',
          severity: 'minor',
          span: 'a',
          suggestion: 'b',
          reason: 'c',
        },
      ])
    ).toHaveLength(1);
  });
});

describe('loadReviewState (reads a committed, therefore corruptible, file)', () => {
  // A temp directory, never the real src/i18n/review: that path is committed by the
  // pipeline, so a test that cleans it up would delete real review state.
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-review-'));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));
  const write = (data: unknown) =>
    fs.writeFileSync(path.join(dir, 'zh.json'), JSON.stringify(data));

  it('returns an empty state when the file is absent', () => {
    expect(loadReviewState('zh', dir)).toEqual({ promptVersion: PROMPT_VERSION, entries: {} });
  });

  it('discards everything when the rubric version differs', () => {
    write({ promptVersion: PROMPT_VERSION + 1, entries: { wf1: { hash: 'h', findings: [] } } });
    expect(loadReviewState('zh', dir).entries).toEqual({});
  });

  it('drops malformed verdicts instead of throwing', () => {
    write({
      promptVersion: PROMPT_VERSION,
      entries: {
        good: { hash: 'h', findings: [] },
        noHash: { findings: [] },
        findingsNotArray: { hash: 'h', findings: 'nope' },
        nullVerdict: null,
      },
    });
    expect(Object.keys(loadReviewState('zh', dir).entries)).toEqual(['good']);
  });

  it('strips findings with an unknown severity, which would report NaN in the summary', () => {
    write({
      promptVersion: PROMPT_VERSION,
      entries: {
        wf1: {
          hash: 'h',
          findings: [
            {
              field: 'title',
              category: 'accuracy',
              severity: 'apocalyptic',
              span: '',
              suggestion: '',
              reason: '',
            },
            {
              field: 'title',
              category: 'accuracy',
              severity: 'minor',
              span: '',
              suggestion: '',
              reason: '',
            },
          ],
        },
      },
    });
    const findings = loadReviewState('zh', dir).entries.wf1!.findings;
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe('minor');
    expect(summarize(loadReviewState('zh', dir)).bySeverity.minor).toBe(1);
  });

  it('survives a truncated / unparseable file', () => {
    fs.writeFileSync(path.join(dir, 'zh.json'), '{"promptVersion": 1, "entries": {');
    expect(loadReviewState('zh', dir).entries).toEqual({});
  });

  it('defaults to the real review directory when no dir is given', () => {
    // Guards the injection itself: the default must still resolve under src/i18n/review.
    // Exact, not toContain: a redirect to src/i18n/review-backup would satisfy a
    // substring check while silently pointing production at the wrong directory.
    expect(reviewStatePath('zh')).toBe(
      path.join(process.cwd(), 'src', 'i18n', 'review', 'zh.json')
    );
    expect(reviewStatePath('zh', dir)).toBe(path.join(dir, 'zh.json'));
  });
});
