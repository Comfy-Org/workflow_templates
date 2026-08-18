/**
 * Build-time loader for a template's graph JSON. Server only — the browser
 * gets its graph from the payload ApiPayloadSection already fetches.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { WorkflowGraph } from './sdk-snippet';

// Graphs are read from the repo's own templates/ directory (the source of
// truth, present in a fresh checkout) and fall back to the copy sync-templates
// writes into public/workflows/. Both run with the site package as cwd.
const GRAPH_DIRS = [
  join(process.cwd(), '..', 'templates'),
  join(process.cwd(), 'public', 'workflows'),
];

export function loadWorkflowGraph(templateName: string): WorkflowGraph | null {
  for (const dir of GRAPH_DIRS) {
    try {
      const raw = readFileSync(join(dir, `${templateName}.json`), 'utf8');
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && 'nodes' in parsed) {
        return parsed as WorkflowGraph;
      }
    } catch {
      /* try the next location */
    }
  }
  return null;
}
