import { describe, it, expect } from 'vitest';
import { extractAuthorNotes } from '../../scripts/lib/extract/author-notes';

describe('extractAuthorNotes', () => {
  it('extracts text from Note nodes', () => {
    const workflow = {
      nodes: [{ type: 'Note', widgets_values: ['This is a note about the workflow'] }],
    };
    expect(extractAuthorNotes(workflow)).toBe('This is a note about the workflow');
  });

  it('extracts text from MarkdownNote nodes', () => {
    const workflow = {
      nodes: [{ type: 'MarkdownNote', widgets_values: ['# Title\nSome markdown content'] }],
    };
    expect(extractAuthorNotes(workflow)).toBe('# Title\nSome markdown content');
  });

  it('extracts text from CM_NoteNode nodes', () => {
    const workflow = {
      nodes: [{ type: 'CM_NoteNode', widgets_values: ['Custom manager note'] }],
    };
    expect(extractAuthorNotes(workflow)).toBe('Custom manager note');
  });

  it('combines multiple notes with double newlines', () => {
    const workflow = {
      nodes: [
        { type: 'Note', widgets_values: ['First note'] },
        { type: 'Note', widgets_values: ['Second note'] },
      ],
    };
    expect(extractAuthorNotes(workflow)).toBe('First note\n\nSecond note');
  });

  it('strips HTML tags', () => {
    const workflow = {
      nodes: [{ type: 'Note', widgets_values: ['<b>Bold</b> and <i>italic</i> text'] }],
    };
    expect(extractAuthorNotes(workflow)).toBe('Bold and italic text');
  });

  it('truncates to 3000 characters', () => {
    const longText = 'A'.repeat(4000);
    const workflow = {
      nodes: [{ type: 'Note', widgets_values: [longText] }],
    };
    expect(extractAuthorNotes(workflow)).toHaveLength(3000);
  });

  it('handles object-form widgets_values', () => {
    const workflow = {
      nodes: [{ type: 'Note', widgets_values: { text: 'Object note', other: 42 } }],
    };
    expect(extractAuthorNotes(workflow)).toBe('Object note');
  });

  it('ignores non-note node types', () => {
    const workflow = {
      nodes: [
        { type: 'KSampler', widgets_values: ['some sampler value'] },
        { type: 'SaveImage', widgets_values: ['output'] },
      ],
    };
    expect(extractAuthorNotes(workflow)).toBe('');
  });

  it('ignores empty/whitespace-only values', () => {
    const workflow = {
      nodes: [{ type: 'Note', widgets_values: ['', '  ', 'actual content'] }],
    };
    expect(extractAuthorNotes(workflow)).toBe('actual content');
  });

  it('handles missing nodes gracefully', () => {
    expect(extractAuthorNotes({})).toBe('');
    expect(extractAuthorNotes({ nodes: [] })).toBe('');
  });

  it('handles non-string widget values', () => {
    const workflow = {
      nodes: [{ type: 'Note', widgets_values: [42, true, null, 'text'] }],
    };
    expect(extractAuthorNotes(workflow)).toBe('text');
  });
});
