import { describe, expect, it } from 'vitest';
import { titleCaseKeyword } from '../../src/lib/workflow-pages/schema';

describe('titleCaseKeyword', () => {
  it('title-cases each word', () => {
    expect(titleCaseKeyword('ai headshot generator')).toBe('AI Headshot Generator');
  });

  it('uppercases a standalone "ai" to "AI"', () => {
    expect(titleCaseKeyword('ai')).toBe('AI');
    expect(titleCaseKeyword('generate with ai')).toBe('Generate With AI');
  });

  it('does not mangle words that merely start with "ai"', () => {
    // The \bAi\b boundary must not turn "Air"/"Aircraft" into "AIr"/"AIrcraft".
    expect(titleCaseKeyword('air brush')).toBe('Air Brush');
    expect(titleCaseKeyword('aircraft render')).toBe('Aircraft Render');
  });

  it('title-cases the first letter after a hyphen', () => {
    expect(titleCaseKeyword('image-to-video')).toBe('Image-To-Video');
  });
});
