/**
 * Build-time loader for a template's graph JSON. Server only — the browser
 * gets its graph from the payload ApiPayloadSection already fetches.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { WorkflowGraph } from './sdk-snippet';

// Graphs come from the repo's own templates/ directory: the version-controlled
// source of truth, present in a fresh checkout, and — the reason it is the only
// candidate — outside the site package. The Vercel adapter traces this read and
// cannot tell that it happens at build time, so pointing it at the synced copy
// in public/workflows/ makes it ship every graph inside the render function
// (76MB → 631MB locally, past the 250MB function limit in CI). Reads run with
// the site package as cwd, and every detail page is prerendered, so nothing
// here is needed at runtime.
const GRAPH_DIRS = [join(process.cwd(), '..', 'templates')];

export function loadWorkflowGraph(
  templateName: string,
  dirs: readonly string[] = GRAPH_DIRS
): WorkflowGraph | null {
  for (const dir of dirs) {
    try {
      const raw = readFileSync(join(dir, `${templateName}.json`), 'utf8');
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && Array.isArray((parsed as WorkflowGraph).nodes)) {
        return parsed as WorkflowGraph;
      }
    } catch {
      /* try the next location */
    }
  }
  return null;
}
