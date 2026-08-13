import { describe, expect, it } from 'vitest';
import {
  isBillableWorkflow,
  usesPartnerNodes,
  wasScannedForPartnerNodes,
  PARTNER_NODE_SNAPSHOT_META,
} from '../../src/lib/partner-nodes';
import snapshot from '../../src/data/partner-node-workflows.snapshot.json';

/**
 * The hero CTA on a workflow page reads this to decide between "Try free on
 * Comfy Cloud" and "Try on Comfy Cloud". The `API` tag alone was not enough:
 * it is applied by hand, so approved workflows calling OpenAI, Gemini and
 * ByteDance carried no tag and advertised a free run that charges credits.
 */

const scannedEntries = Object.entries(snapshot.scannedAt);
const dateOf = (shareId: string) => snapshot.scannedAt[shareId as keyof typeof snapshot.scannedAt];

describe('usesPartnerNodes', () => {
  it('recognises a workflow in the snapshot', () => {
    const known = snapshot.shareIds[0];
    expect(usesPartnerNodes(known)).toBe(true);
  });

  it('does not recognise a workflow outside the snapshot', () => {
    expect(usesPartnerNodes('ffffffffffff')).toBe(false);
  });

  it('treats a missing share id as unknown rather than throwing', () => {
    expect(usesPartnerNodes(undefined)).toBe(false);
    expect(usesPartnerNodes(null)).toBe(false);
    expect(usesPartnerNodes('')).toBe(false);
  });
});

describe('isBillableWorkflow', () => {
  it('honours the curated API tag on its own', () => {
    expect(isBillableWorkflow(['API'], 'ffffffffffff', '2026-01-01')).toBe(true);
  });

  // The reported bug: no tag, but the graph calls a paid partner node.
  it('catches an untagged workflow that calls a partner node', () => {
    const paid = snapshot.shareIds[0];
    expect(isBillableWorkflow([], paid, dateOf(paid))).toBe(true);
    expect(isBillableWorkflow(undefined, paid, dateOf(paid))).toBe(true);
  });

  it('leaves a scanned, clean, unchanged workflow free', () => {
    const clean = scannedEntries.find(([id]) => !snapshot.shareIds.includes(id));
    expect(clean).toBeDefined();
    const [id, date] = clean!;
    expect(isBillableWorkflow(['Image'], id, date)).toBe(false);
  });

  // dante01yoon on #1100: absence from a positive-only list was treated as proof
  // of being free, so anything published after the snapshot claimed a free run.
  it('treats a workflow the snapshot never saw as billable', () => {
    expect(wasScannedForPartnerNodes('ffffffffffff', '2026-01-01')).toBe(false);
    expect(isBillableWorkflow([], 'ffffffffffff', '2026-01-01')).toBe(true);
    expect(isBillableWorkflow(undefined, 'ffffffffffff', '2026-01-01')).toBe(true);
  });

  it('treats a missing share id as billable rather than free', () => {
    expect(isBillableWorkflow(undefined, undefined, undefined)).toBe(true);
  });
});

/**
 * dante01yoon on #1100, second round: the backend preserves `share_id` across
 * re-publishes and repoints it at a new `published_workflow_version`, so a
 * workflow scanned clean can gain a paid node under the same id. A positive
 * scan is only evidence about the graph that was scanned.
 */
describe('re-publish under the same share id', () => {
  const cleanEntry = scannedEntries.find(([id]) => !snapshot.shareIds.includes(id))!;

  it('stops vouching for a workflow whose publish date has moved', () => {
    const [id, scannedDate] = cleanEntry;
    expect(wasScannedForPartnerNodes(id, scannedDate)).toBe(true);
    expect(wasScannedForPartnerNodes(id, '2099-01-01')).toBe(false);
  });

  it('bills a scanned-clean workflow that has since been re-published', () => {
    const [id] = cleanEntry;
    expect(isBillableWorkflow(['Image'], id, '2099-01-01')).toBe(true);
  });

  it('bills a scanned workflow arriving with no date to check', () => {
    const [id] = cleanEntry;
    expect(isBillableWorkflow(['Image'], id, undefined)).toBe(true);
    expect(isBillableWorkflow(['Image'], id, '')).toBe(true);
  });
});

describe('the scanned list', () => {
  it('covers every workflow flagged as using partner nodes', () => {
    for (const id of snapshot.shareIds) {
      expect(Object.prototype.hasOwnProperty.call(snapshot.scannedAt, id)).toBe(true);
    }
  });

  it('is larger than the partner-node list, so free claims are earned not assumed', () => {
    expect(scannedEntries.length).toBeGreaterThan(snapshot.shareIds.length);
  });

  it('records a publish date for every scanned workflow', () => {
    const undated = scannedEntries.filter(([, date]) => !date);
    expect(undated).toEqual([]);
  });
});

describe('the committed snapshot', () => {
  it('is non-empty, so a bad refresh cannot silently restore free claims', () => {
    expect(snapshot.shareIds.length).toBeGreaterThan(0);
    expect(PARTNER_NODE_SNAPSHOT_META.workflowCount).toBe(snapshot.shareIds.length);
  });

  it('holds unique, well-formed share ids', () => {
    expect(new Set(snapshot.shareIds).size).toBe(snapshot.shareIds.length);
    for (const id of snapshot.shareIds) expect(id).toMatch(/^[0-9a-f]{12}$/);
  });

  it('records how many node classes it was built from', () => {
    expect(PARTNER_NODE_SNAPSHOT_META.apiNodeCount).toBeGreaterThan(0);
  });
});
