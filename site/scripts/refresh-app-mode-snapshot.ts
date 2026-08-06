/**
 * Refresh the app mode snapshot read by `src/lib/hub-app-mode.ts`.
 *
 * The workflow index endpoint carries no app flag, so app mode is read from
 * each workflow's own graph: `extra.linearMode` is set when the workflow is
 * published with the default view set to "app", and `extra.linearData` holds
 * the app form. That means one request per workflow, too slow for a build, so
 * the result is committed as a snapshot (the same approach as
 * `refresh-feature-flags-snapshot.ts`).
 *
 * Run after workflows are published or converted to apps:
 *   pnpm app-mode:refresh-snapshot
 *
 * Fetches directly rather than through `src/lib/hub-api` because that module
 * reads `import.meta.env`, which only exists under Vite.
 */
import { renameSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import type { HubWorkflowDetail, HubWorkflowTemplateEntry } from '../src/lib/hub-api';

/** Concurrent detail requests, to keep a full catalog pass to about a minute. */
const CONCURRENCY = 16;

/** Per-request deadline; workflow graphs are large, so this is generous. */
const REQUEST_TIMEOUT_MS = 30_000;

const HUB_API_BASE = (process.env.PUBLIC_HUB_API_URL || 'https://cloud.comfy.org').replace(
  /\/$/,
  ''
);

const snapshotPath = fileURLToPath(
  new URL('../src/data/app-mode-workflows.snapshot.json', import.meta.url)
);
const tempPath = `${snapshotPath}.tmp`;

interface AppModeWorkflow {
  shareId: string;
  title: string;
}

async function hubGet<T>(path: string): Promise<T> {
  const res = await fetch(`${HUB_API_BASE}${path}`, {
    headers: { Accept: 'application/json' },
    // Without a deadline a single stalled connection hangs the whole pass, and
    // the script aborts rather than writing a short snapshot, so a hang would
    // block the refresh indefinitely instead of failing.
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${path}`);
  return (await res.json()) as T;
}

/** True when the workflow is published with the default view set to "app". */
function isAppMode(workflowJson: Record<string, unknown> | undefined): boolean {
  const extra = workflowJson?.extra as Record<string, unknown> | undefined;
  return extra?.linearMode === true;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await fn(items[index]);
      }
    })
  );
  return results;
}

const entries = await hubGet<HubWorkflowTemplateEntry[]>(
  '/api/hub/workflows/index?status=approved'
);
const withShareId = entries.filter((entry) => Boolean(entry.shareId));
console.log(`Checking ${withShareId.length} workflows for App Mode…`);

let failed = 0;
const probed = await mapWithConcurrency(withShareId, CONCURRENCY, async (entry) => {
  try {
    const detail = await hubGet<HubWorkflowDetail>(
      `/api/hub/workflows/${encodeURIComponent(entry.shareId!)}`
    );
    if (!isAppMode(detail.workflow_json)) return null;
    return { shareId: entry.shareId!, title: entry.title || entry.name } satisfies AppModeWorkflow;
  } catch (err) {
    // A single unreachable workflow must not silently shrink the snapshot.
    failed++;
    console.error(`  failed ${entry.shareId}: ${(err as Error).message}`);
    return null;
  }
});

if (failed > 0) {
  console.error(`Snapshot refresh aborted: ${failed} workflow(s) could not be read.`);
  process.exit(1);
}

// Sorted by share id so re-running produces a stable, reviewable diff.
const workflows = probed
  .filter((item): item is AppModeWorkflow => item !== null)
  .sort((a, b) => a.shareId.localeCompare(b.shareId));

writeFileSync(
  tempPath,
  JSON.stringify({ fetchedAt: new Date().toISOString(), workflows }, null, 2) + '\n',
  'utf8'
);
renameSync(tempPath, snapshotPath);
console.log(`Wrote ${workflows.length} App Mode workflows to ${snapshotPath}`);
