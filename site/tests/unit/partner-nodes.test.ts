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
    expect(isBillableWorkflow(['API'], 'ffffffffffff')).toBe(true);
  });

  // The reported bug: no tag, but the graph calls a paid partner node.
  it('catches an untagged workflow that calls a partner node', () => {
    expect(isBillableWorkflow([], snapshot.shareIds[0])).toBe(true);
    expect(isBillableWorkflow(undefined, snapshot.shareIds[0])).toBe(true);
  });

  it('leaves a scanned, clean, untagged workflow free', () => {
    const clean = snapshot.scannedShareIds.find((id) => !snapshot.shareIds.includes(id));
    expect(clean).toBeDefined();
    expect(isBillableWorkflow(['Image'], clean)).toBe(false);
  });

  // dante01yoon on #1100: absence from a positive-only list was treated as proof
  // of being free, so anything published after the snapshot claimed a free run.
  // He found a live example, 0309de53eb52.
  it('treats a workflow the snapshot never saw as billable', () => {
    expect(wasScannedForPartnerNodes('ffffffffffff')).toBe(false);
    expect(isBillableWorkflow([], 'ffffffffffff')).toBe(true);
    expect(isBillableWorkflow(undefined, 'ffffffffffff')).toBe(true);
  });

  it('treats a missing share id as billable rather than free', () => {
    expect(isBillableWorkflow(undefined, undefined)).toBe(true);
  });
});

describe('the scanned list', () => {
  it('covers every workflow flagged as using partner nodes', () => {
    const scanned = new Set(snapshot.scannedShareIds);
    for (const id of snapshot.shareIds) expect(scanned.has(id)).toBe(true);
  });

  it('is larger than the partner-node list, so free claims are earned not assumed', () => {
    expect(snapshot.scannedShareIds.length).toBeGreaterThan(snapshot.shareIds.length);
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
