import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { refreshSignoffRecords } from '../../scripts/i18n/refresh-signoff';
import { __resetResolverCache, hashResolvedArtifact, resolveLocalizedWorkflow } from '../../src/lib/i18n/resolver';
import type { Locale } from '../../src/lib/i18n/schema';

const A = 'aaaaaaaaaaaa';
const B = 'bbbbbbbbbbbb';
const TODAY = '2026-08-19';

let root: string;

function write(rel: string, value: unknown) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value));
}

function readReviews() {
  return JSON.parse(fs.readFileSync(path.join(root, 'reviews', 'zh.json'), 'utf-8'));
}

/**
 * Only title and description are non-empty in English, so those two are the
 * required set for these fixtures and the other required fields drop out
 * (English has nothing to translate for them).
 */
const english = {
  title: 'Wan Inpainting',
  description: 'English description',
  metaDescription: '',
  extendedDescription: '',
  howToUse: [],
  suggestedUseCases: [],
  faqItems: [],
};

/** A record whose seal matches the CURRENT resolved state of `sid`. */
function currentRecord(sid: string, contentHash: string) {
  __resetResolverCache();
  const probe = resolveLocalizedWorkflow(sid, 'zh' as Locale, {
    contentRoot: root,
    indexableLocales: ['zh' as Locale],
  });
  return {
    reviewer: 'zhixiong-lin',
    reviewedAt: '2026-08-14',
    reviewedContentHash: contentHash,
    reviewedArtifactChecksum: hashResolvedArtifact(probe.data),
  };
}

const staleRecord = {
  reviewer: 'zhixiong-lin',
  reviewedAt: '2026-08-14',
  reviewedContentHash: 'oldhash',
  reviewedArtifactChecksum: 'oldchecksum',
};

function run() {
  __resetResolverCache();
  return refreshSignoffRecords('zh' as Locale, root, TODAY);
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'signoff-'));
  write('content/en.json', { [A]: english });
  write('content/zh.json', { [A]: { title: '标题', description: '描述' } });
  write('manifest.json', { [A]: { content: 'h-current' } });
  write('review/zh.json', { promptVersion: 1, entries: {} });
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
  __resetResolverCache();
});

describe('refreshSignoffRecords', () => {
  it('never bootstraps a locale that has no sign-off wave', () => {
    write('reviews/zh.json', {});
    expect(run()).toBeNull();
    // and an absent file is the same case, not a crash
    fs.rmSync(path.join(root, 'reviews', 'zh.json'));
    expect(run()).toBeNull();
  });

  it('leaves a record alone while its seal still matches', () => {
    write('reviews/zh.json', { [A]: currentRecord(A, 'h-current') });
    const summary = run()!;
    expect(summary.upToDate).toBe(1);
    expect(summary.refreshed).toEqual([]);
    expect(readReviews()[A].reviewedAt).toBe('2026-08-14');
  });

  it('re-stamps a broken seal when the page meets the launch bar', () => {
    write('reviews/zh.json', { [A]: staleRecord });
    const summary = run()!;
    expect(summary.refreshed).toEqual([A]);
    const record = readReviews()[A];
    expect(record.reviewedContentHash).toBe('h-current');
    expect(record.reviewedAt).toBe(TODAY);
    expect(record.reviewer).toBe('zhixiong-lin');
    expect(record.approvedScope).toContain('auto-refresh');
    // the refreshed seal must actually match, or the page still cannot index
    __resetResolverCache();
    const probe = resolveLocalizedWorkflow(A, 'zh' as Locale, {
      contentRoot: root,
      indexableLocales: ['zh' as Locale],
    });
    expect(record.reviewedArtifactChecksum).toBe(hashResolvedArtifact(probe.data));
  });

  it('refuses a page with a required field still in English', () => {
    write('content/zh.json', { [A]: { title: '标题' } }); // description missing
    write('reviews/zh.json', { [A]: staleRecord });
    const summary = run()!;
    expect(summary.refusedUntranslated).toEqual([A]);
    expect(readReviews()[A]).toEqual(staleRecord);
  });

  it('refuses a page with an unresolved serious finding on served machine text', () => {
    write('reviews/zh.json', { [A]: staleRecord });
    write('review/zh.json', {
      promptVersion: 1,
      entries: { [A]: { findings: [{ field: 'description', severity: 'major' }] } },
    });
    const summary = run()!;
    expect(summary.refusedFindings).toEqual([A]);
    expect(readReviews()[A]).toEqual(staleRecord);
  });

  it('treats a serious finding as moot when an override supersedes the flagged text', () => {
    write('reviews/zh.json', { [A]: staleRecord });
    write('overrides/zh.json', { [A]: { description: '人工修订的描述' } });
    write('review/zh.json', {
      promptVersion: 1,
      entries: { [A]: { findings: [{ field: 'description', severity: 'major' }] } },
    });
    const summary = run()!;
    // flagged bytes are machine text; served bytes are the override
    expect(summary.refreshed).toEqual([A]);
  });

  it('does not let a minor finding block a refresh', () => {
    write('reviews/zh.json', { [A]: staleRecord });
    write('review/zh.json', {
      promptVersion: 1,
      entries: { [A]: { findings: [{ field: 'description', severity: 'minor' }] } },
    });
    expect(run()!.refreshed).toEqual([A]);
  });

  it('seals a workflow published after the wave, under the wave reviewer', () => {
    write('content/en.json', { [A]: english, [B]: english });
    write('content/zh.json', {
      [A]: { title: '标题', description: '描述' },
      [B]: { title: '新标题', description: '新描述' },
    });
    write('manifest.json', { [A]: { content: 'h-current' }, [B]: { content: 'h-new' } });
    write('reviews/zh.json', { [A]: currentRecord(A, 'h-current') });
    const summary = run()!;
    expect(summary.sealedNew).toEqual([B]);
    const record = readReviews()[B];
    expect(record.reviewer).toBe('zhixiong-lin');
    expect(record.approvedScope).toContain('auto-sealed');
  });

  it('keeps the wave reviewer and scope even when every original record is obsolete', () => {
    // The one human-reviewed workflow left the catalog; a new one arrived. The
    // wave still happened, so the new seal must carry its reviewer and scope,
    // not "unknown".
    write('content/en.json', { [B]: english });
    write('content/zh.json', { [B]: { title: '新标题', description: '新描述' } });
    write('manifest.json', { [B]: { content: 'h-new' } });
    write('reviews/zh.json', {
      [A]: { ...staleRecord, approvedScope: 'ai-flagged items (native review sheet 2026-08-14)' },
    });
    const summary = run()!;
    expect(summary.droppedGone).toEqual([A]);
    expect(summary.sealedNew).toEqual([B]);
    const record = readReviews()[B];
    expect(record.reviewer).toBe('zhixiong-lin');
    expect(record.approvedScope).toContain('native review sheet 2026-08-14');
    expect(record.approvedScope).toContain('auto-sealed');
  });

  it('preserves the original wave scope on refresh instead of replacing it', () => {
    write('reviews/zh.json', {
      [A]: { ...staleRecord, approvedScope: 'ai-flagged items (native review sheet 2026-08-14)' },
    });
    run();
    const scope = readReviews()[A].approvedScope as string;
    expect(scope).toContain('native review sheet 2026-08-14');
    expect(scope).toContain('auto-refresh 2026-08-19');
  });

  it('does not stack refresh markers across repeated refreshes', () => {
    write('reviews/zh.json', {
      [A]: { ...staleRecord, approvedScope: 'ai-flagged items (native review sheet 2026-08-14)' },
    });
    run();
    // break the seal again by changing the translation, then refresh again
    write('content/zh.json', { [A]: { title: '改了的标题', description: '描述' } });
    run();
    const scope = readReviews()[A].approvedScope as string;
    expect(scope.split('auto-refresh').length - 1).toBe(1);
    expect(scope).toContain('native review sheet 2026-08-14');
  });

  it('strips a leading automated marker instead of promoting it to human scope', () => {
    // A record can carry ONLY an automated marker (sealed under a wave that had
    // no human scope text). On refresh, that marker must be replaced, not kept
    // as if it were the human-authored part.
    write('reviews/zh.json', {
      [A]: { ...staleRecord, approvedScope: 'auto-sealed 2026-08-14: published after the last wave, AI-review clean' },
    });
    run();
    const scope = readReviews()[A].approvedScope as string;
    expect(scope).not.toContain('auto-sealed');
    expect(scope.split('auto-refresh').length - 1).toBe(1);
    // and refreshing again still leaves exactly one marker
    write('content/zh.json', { [A]: { title: '又改了', description: '描述' } });
    run();
    const scope2 = readReviews()[A].approvedScope as string;
    expect(scope2.split('auto-refresh').length - 1).toBe(1);
    expect(scope2).not.toContain('auto-sealed');
  });

  it('blocks on a serious finding that names no field (fails closed)', () => {
    write('reviews/zh.json', { [A]: staleRecord });
    write('review/zh.json', {
      promptVersion: 1,
      entries: { [A]: { findings: [{ severity: 'major' }] } },
    });
    const summary = run()!;
    expect(summary.refusedFindings).toEqual([A]);
    expect(readReviews()[A]).toEqual(staleRecord);
  });

  it('marks every record it writes as automated, and touches no human record', () => {
    write('content/en.json', { [A]: english, [B]: english });
    write('content/zh.json', {
      [A]: { title: '标题', description: '描述' },
      [B]: { title: '新标题', description: '新描述' },
    });
    write('manifest.json', { [A]: { content: 'h-current' }, [B]: { content: 'h-new' } });
    write('reviews/zh.json', { [A]: currentRecord(A, 'h-current') });
    run();
    const reviews = readReviews();
    expect(reviews[A].automated).toBeUndefined(); // human record, untouched
    expect(reviews[B].automated).toBe(true); // machine-written, says so
    // and the refresh branch marks automated too, preserving the human identity
    write('reviews/zh.json', { [A]: staleRecord });
    const s2 = run()!;
    expect(s2.refreshed).toEqual([A]);
    const r2 = readReviews()[A];
    expect(r2.automated).toBe(true);
    expect(r2.reviewer).toBe('zhixiong-lin');
  });

  it('aborts without touching records when the English catalog is unreadable', () => {
    // A transient read failure must never read as "every workflow left the
    // catalog" — that would wipe the locale's entire sign-off state.
    write('reviews/zh.json', { [A]: currentRecord(A, 'h-current') });
    fs.writeFileSync(path.join(root, 'content', 'en.json'), '{ not json');
    expect(run()).toBeNull();
    expect(readReviews()[A].reviewedContentHash).toBe('h-current');
  });

  it('refuses to seal a workflow whose manifest hash is missing', () => {
    // No manifest hash means no meaningful seal: an empty reviewedContentHash
    // would compare equal to the predicate's own empty fallback and pass.
    write('content/en.json', { [A]: english, [B]: english });
    write('content/zh.json', {
      [A]: { title: '标题', description: '描述' },
      [B]: { title: '新标题', description: '新描述' },
    });
    write('manifest.json', { [A]: { content: 'h-current' } }); // B absent
    write('reviews/zh.json', { [A]: currentRecord(A, 'h-current') });
    const summary = run()!;
    expect(summary.refusedNoHash).toEqual([B]);
    expect(readReviews()[B]).toBeUndefined();
  });

  it('revokes a matching seal when a new blocking finding arrives on unchanged text', () => {
    // Content identical, seal intact — but the reviewer now reports a serious
    // field-less problem. Keeping the seal would keep the page indexed despite
    // an unresolved blocker, so the record is removed until a human looks.
    write('reviews/zh.json', { [A]: currentRecord(A, 'h-current') });
    write('review/zh.json', {
      promptVersion: 1,
      entries: { [A]: { findings: [{ severity: 'critical' }] } },
    });
    const summary = run()!;
    expect(summary.revokedFindings).toEqual([A]);
    expect(readReviews()[A]).toBeUndefined();
  });

  it('drops the record of a workflow that left the catalog', () => {
    write('reviews/zh.json', { [A]: currentRecord(A, 'h-current'), [B]: staleRecord });
    const summary = run()!;
    expect(summary.droppedGone).toEqual([B]);
    expect(readReviews()[B]).toBeUndefined();
  });
});
