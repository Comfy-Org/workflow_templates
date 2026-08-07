import { describe, expect, it } from 'vitest';
import {
  isBillableWorkflow,
  usesPartnerNodes,
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

  it('leaves a genuinely free workflow free', () => {
    expect(isBillableWorkflow(['Image'], 'ffffffffffff')).toBe(false);
    expect(isBillableWorkflow(undefined, undefined)).toBe(false);
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
