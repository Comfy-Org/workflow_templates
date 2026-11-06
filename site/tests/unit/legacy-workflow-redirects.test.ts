import { describe, expect, it } from 'vitest';
import { isLegacyWorkflowSegment } from '../../src/lib/legacy-workflow-redirects';

describe('isLegacyWorkflowSegment', () => {
  it('matches a retired `{name}-{12hex}` detail slug', () => {
    expect(isLegacyWorkflowSegment('api_kling_omni_v2v-7bf47dcb96a7')).toBe(true);
    expect(isLegacyWorkflowSegment('flux_dev_checkpoint_example-7dc1b1762932')).toBe(true);
    expect(isLegacyWorkflowSegment('d9db41cf7a1c-d9db41cf7a1c')).toBe(true);
  });

  it('matches a bare 12-hex hash slug', () => {
    expect(isLegacyWorkflowSegment('1dd396d7fa2a')).toBe(true);
    expect(isLegacyWorkflowSegment('396E7E3B9E66')).toBe(true);
  });

  it('matches the index-less `tag` sub-section', () => {
    expect(isLegacyWorkflowSegment('tag')).toBe(true);
  });

  it('does not match a real creator handle or an arbitrary bogus word', () => {
    expect(isLegacyWorkflowSegment('PurzBeats')).toBe(false);
    expect(isLegacyWorkflowSegment('sferro21')).toBe(false);
    expect(isLegacyWorkflowSegment('julien-mjm')).toBe(false);
    expect(isLegacyWorkflowSegment('undefined')).toBe(false);
    expect(isLegacyWorkflowSegment('ima')).toBe(false);
  });

  it('does not match a live workflow name that has no share-id suffix', () => {
    expect(isLegacyWorkflowSegment('01_get_started_text_to_image')).toBe(false);
  });

  it('handles empty / missing input', () => {
    expect(isLegacyWorkflowSegment('')).toBe(false);
    expect(isLegacyWorkflowSegment(undefined)).toBe(false);
    expect(isLegacyWorkflowSegment(null)).toBe(false);
  });
});
