import type { WorkflowJson } from '../types';

const NOTE_TYPES = new Set(['Note', 'MarkdownNote', 'CM_NoteNode']);
const MAX_LENGTH = 3000;

export function extractAuthorNotes(workflow: WorkflowJson): string {
  const texts: string[] = [];

  for (const node of workflow.nodes || []) {
    if (!NOTE_TYPES.has(node.type)) continue;

    const widgetsValues = node.widgets_values;
    if (Array.isArray(widgetsValues)) {
      for (const val of widgetsValues) {
        if (typeof val === 'string' && val.trim()) {
          texts.push(val.trim());
        }
      }
    } else if (widgetsValues && typeof widgetsValues === 'object') {
      for (const val of Object.values(widgetsValues as Record<string, unknown>)) {
        if (typeof val === 'string' && val.trim()) {
          texts.push(val.trim());
        }
      }
    }
  }

  const combined = texts.join('\n\n');
  const stripped = combined.replace(/<[^>]*>/g, '');
  return stripped.slice(0, MAX_LENGTH);
}
