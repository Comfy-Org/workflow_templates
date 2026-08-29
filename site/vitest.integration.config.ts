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
    // A submit round trip is ~8s and the poll window is 45s.
    testTimeout: 120_000,
    hookTimeout: 60_000,
    // The specs are ordered steps against one shared job: submit, then poll,
    // then cancel. Running them concurrently would poll a job that does not
    // exist yet, and would put two GPU jobs on a single-deployment demo.
    fileParallelism: false,
    sequence: { concurrent: false },
    // One live deployment, one job: a retry would submit a second one.
    retry: 0,
  },
});
