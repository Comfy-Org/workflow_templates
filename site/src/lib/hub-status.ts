/**
 * Hub workflow review statuses.
 *
 * Split out of `hub-api.ts` so build scripts can share it. That module reads
 * `import.meta.env` at load, which only exists under Vite, so a plain Node
 * script cannot import from it and would otherwise keep its own copy of this
 * list. A snapshot built from a narrower status set than the pages it feeds goes
 * quietly wrong rather than failing.
 */

export type WorkflowStatus = 'pending' | 'approved' | 'rejected' | 'deprecated';

/** Every status, which is what a non-production build asks the index for. */
export const ALL_STATUSES: WorkflowStatus[] = ['pending', 'approved', 'rejected', 'deprecated'];
