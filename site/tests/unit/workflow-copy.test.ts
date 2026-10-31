import { describe, expect, it } from 'vitest';
import {
  WORKFLOW_COPY,
  getWorkflowCopy,
  hashHubText,
  type WorkflowCopy,
} from '../../src/data/workflow-copy';
import { WORKFLOW_ENTITY_GRAPHS } from '../../src/data/workflow-entity-graphs';
import { curatedKey } from '../../src/data/curated-workflow-keys';

/** Share ids for the curated pages, in the same order as WORKFLOW_COPY. */
const SHARE_IDS: Record<string, string> = {
  video_ltx2_5_i2v: 'b37902cee452',
  api_seedance2_5_r2v: 'cd0c4f9f61a4',
  video_minimax_h3_i2v: 'a781503cf508',
  video_wan_animate2: '9394f9968da3',
};

/** A one-entry table whose replaced hub text is known, for exercising the gate. */
const STALE_HUB_TEXT = 'Generated hub prose the client asked us to replace.';
const CURATED_TEXT = 'Approved paragraph one.\n\nApproved paragraph two.';
const CURATED: Record<string, WorkflowCopy> = {
  demo_workflow: {
    replacesHubText: hashHubText(STALE_HUB_TEXT),
    extendedDescription: ['Approved paragraph one.', 'Approved paragraph two.'],
  },
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

describe('hashHubText', () => {
  it('is a stable 12-hex fingerprint that ignores surrounding whitespace', () => {
    expect(hashHubText(STALE_HUB_TEXT)).toMatch(/^[0-9a-f]{12}$/);
    expect(hashHubText(`\n\n${STALE_HUB_TEXT}\n`)).toBe(hashHubText(STALE_HUB_TEXT));
    expect(hashHubText(`${STALE_HUB_TEXT} edited`)).not.toBe(hashHubText(STALE_HUB_TEXT));
  });
});

describe('getWorkflowCopy', () => {
  it('resolves by template name and by share id alike', () => {
    for (const [key, shareId] of Object.entries(SHARE_IDS)) {
      const byName = getWorkflowCopy(key);
      const byShareId = getWorkflowCopy(shareId);
      expect(byName.status, key).toBe('applied');
      expect(byShareId).toEqual(byName);
    }
  });

  it('reports no entry for a workflow with no curated copy', () => {
    // The overwhelming majority of the hub — these pages keep the hub's own text.
    expect(getWorkflowCopy('image_flux_krea_dev')).toEqual({ status: 'none' });
    expect(getWorkflowCopy('ffffffffffff', 'whatever the hub says')).toEqual({ status: 'none' });
  });

  it('applies while the hub still serves the text the entry replaced', () => {
    expect(getWorkflowCopy('demo_workflow', STALE_HUB_TEXT, CURATED)).toEqual({
      status: 'applied',
      extendedDescription: CURATED_TEXT,
    });
    // Trailing blank lines from the hub generator are not a content change.
    expect(getWorkflowCopy('demo_workflow', `${STALE_HUB_TEXT}\n\n`, CURATED).status).toBe(
      'applied'
    );
  });

  it('applies when the hub sends no text at all (local content-collection builds)', () => {
    expect(getWorkflowCopy('demo_workflow', '', CURATED).status).toBe('applied');
    expect(getWorkflowCopy('demo_workflow', undefined, CURATED).status).toBe('applied');
  });

  it('retires the moment the hub record changes, so the hub wins', () => {
    const edited = getWorkflowCopy(
      'demo_workflow',
      `${STALE_HUB_TEXT} Now with a sentence added in the hub.`,
      CURATED
    );
    expect(edited).toEqual({ status: 'retired' });
    expect(edited.extendedDescription).toBeUndefined();
  });

  it('retires once the hub carries the curated copy itself', () => {
    // The intended end state: the hub record was updated to this text, the
    // override is a no-op and the entry can be deleted.
    expect(getWorkflowCopy('demo_workflow', CURATED_TEXT, CURATED)).toEqual({ status: 'retired' });
  });

  it('joins paragraphs with the blank line the detail page splits on', () => {
    const copy = getWorkflowCopy('video_ltx2_5_i2v');
    const paragraphs = WORKFLOW_COPY.video_ltx2_5_i2v.extendedDescription ?? [];
    expect(copy.extendedDescription?.split('\n\n')).toEqual([...paragraphs]);
  });
});

describe('WORKFLOW_COPY', () => {
  it('only covers workflows that also carry a curated entity graph', () => {
    for (const key of Object.keys(WORKFLOW_COPY)) {
      expect(WORKFLOW_ENTITY_GRAPHS[key], key).toBeDefined();
    }
  });

  it('records the fingerprint of the hub text every entry replaces', () => {
    for (const [key, copy] of Object.entries(WORKFLOW_COPY)) {
      expect(copy.replacesHubText, key).toMatch(/^[0-9a-f]{12}$/);
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
