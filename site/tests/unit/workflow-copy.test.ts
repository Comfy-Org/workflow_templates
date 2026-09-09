import { describe, expect, it } from 'vitest';
import { WORKFLOW_COPY, getWorkflowCopy } from '../../src/data/workflow-copy';
import { WORKFLOW_ENTITY_GRAPHS } from '../../src/data/workflow-entity-graphs';
import { curatedKey } from '../../src/data/curated-workflow-keys';

/** Share ids for the curated pages, in the same order as WORKFLOW_COPY. */
const SHARE_IDS: Record<string, string> = {
  video_ltx2_5_i2v: 'b37902cee452',
  api_seedance2_5_r2v: 'cd0c4f9f61a4',
  video_minimax_h3_i2v: 'a781503cf508',
  video_wan_animate2: '9394f9968da3',
};

describe('curatedKey', () => {
  it('maps a hub share id to its template-name key', () => {
    expect(curatedKey('b37902cee452')).toBe('video_ltx2_5_i2v');
  });

  it('passes an unmapped value through unchanged', () => {
    expect(curatedKey('video_ltx2_5_i2v')).toBe('video_ltx2_5_i2v');
    expect(curatedKey('some_other_template')).toBe('some_other_template');
  });
});

describe('getWorkflowCopy', () => {
  it('resolves by template name and by share id alike', () => {
    for (const [key, shareId] of Object.entries(SHARE_IDS)) {
      const byName = getWorkflowCopy(key);
      const byShareId = getWorkflowCopy(shareId);
      expect(byName, key).toBeDefined();
      expect(byShareId).toEqual(byName);
    }
  });

  it('returns undefined for a workflow with no curated copy', () => {
    // The overwhelming majority of the hub — these pages keep the hub's own text.
    expect(getWorkflowCopy('image_flux_krea_dev')).toBeUndefined();
    expect(getWorkflowCopy('ffffffffffff')).toBeUndefined();
  });

  it('joins paragraphs with the blank line the detail page splits on', () => {
    const copy = getWorkflowCopy('video_ltx2_5_i2v');
    const paragraphs = WORKFLOW_COPY.video_ltx2_5_i2v.extendedDescription ?? [];
    expect(copy?.extendedDescription?.split('\n\n')).toEqual([...paragraphs]);
  });
});

describe('WORKFLOW_COPY', () => {
  it('only covers workflows that also carry a curated entity graph', () => {
    for (const key of Object.keys(WORKFLOW_COPY)) {
      expect(WORKFLOW_ENTITY_GRAPHS[key], key).toBeDefined();
    }
  });

  it('stores clean, non-empty paragraphs', () => {
    for (const [key, copy] of Object.entries(WORKFLOW_COPY)) {
      const paragraphs = copy.extendedDescription ?? [];
      expect(paragraphs.length, key).toBeGreaterThan(0);
      for (const paragraph of paragraphs) {
        expect(paragraph, key).toBe(paragraph.trim());
        expect(paragraph.length, key).toBeGreaterThan(0);
        // A paragraph carrying its own blank line would split into two on the
        // page and silently desync from what was signed off.
        expect(paragraph, key).not.toContain('\n');
      }
    }
  });

  // The reason this copy exists: the page's @graph names entities that the
  // hub's generated prose never mentions, leaving the schema uncorroborated.
  it('mentions the entities its page already declares', () => {
    for (const [key, copy] of Object.entries(WORKFLOW_COPY)) {
      const prose = (copy.extendedDescription ?? []).join(' ').toLowerCase();
      const graph = WORKFLOW_ENTITY_GRAPHS[key];
      const terms = [...graph.coreTopics, ...graph.entities].map((term) =>
        // "Rendering (Computer Graphics)" is written as "rendering" in prose.
        term.name.replace(/\s*\(.*?\)/, '').toLowerCase()
      );
      const mentioned = terms.filter((term) => prose.includes(term));
      expect(
        mentioned.length,
        `${key} mentions ${mentioned.length} of ${terms.length}`
      ).toBeGreaterThanOrEqual(10);
    }
  });
});
