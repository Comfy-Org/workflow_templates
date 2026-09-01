import { defineConfig } from 'vitest/config';

/**
 * Integration tests hit a real deployment over the network, so they are kept in
 * a separate project from `vitest.config.ts`. `pnpm test` must stay hermetic and
 * runnable offline on every PR; these run on a schedule and on demand instead.
 *
 * Plain `defineConfig` rather than Astro's `getViteConfig`: nothing here imports
 * a component, so loading the full Astro + Vercel adapter config would only add
 * startup cost and failure modes.
 */
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    // A submit round trip is ~8s and the poll window is 240s.
    testTimeout: 300_000,
    hookTimeout: 60_000,
    // The specs are ordered steps against one shared job: submit, then poll,
    // then cancel. Running them concurrently would poll a job that does not
    // exist yet, and would put two GPU jobs on a single-deployment demo.
    fileParallelism: false,
    sequence: { concurrent: false },
    // Default off: one live deployment, one job, and a retry of the submit
    // would put a second GPU job on it. Specs that cannot queue work set their
    // own `retry` instead — the read-only GETs, and the /run probe, whose empty
    // body is rejected before any GPU time. A failed run here prepares a kill
    // switch, so one blip from the marketing CDN must not switch a demo off.
    // The three that stay at 0 are the ones tied to a real job — submit, poll
    // and cancel. A rerun would re-queue, orphan or chase a job the previous
    // attempt already dealt with, so submit and poll hand-roll narrower
    // in-place retries instead.
    retry: 0,
  },
});
