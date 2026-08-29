/**
 * Experiment flags — repo-owned kill switches for unpolished, in-progress
 * surfaces (interactive demos, teardown pages, ranking-capture experiments).
 *
 * Deliberately NOT the same thing as `config/featureFlags.ts`. That one mirrors
 * PostHog and answers "is this product capability rolled out?". This one is a
 * plain JSON file in git and answers "is this experiment safe to show right
 * now?" — so CI can flip it without a PostHog round trip, and the flip lands as
 * a reviewable commit.
 *
 * Read at BUILD time only. Every consumer must branch in `.astro` frontmatter
 * so the disabled branch is absent from the emitted HTML rather than hidden
 * with CSS or unmounted by client JS. That keeps the output fully static and
 * keeps crawlers and users looking at exactly the same page — the whole point
 * of gating an experiment this way instead of deleting it.
 *
 * To flip one: `pnpm experiment-flag <name> off --reason "..."` (or `on`),
 * then commit `src/data/experiment-flags.json`. `.github/workflows/
 * minimax-demo-integration.yml` runs that same script unattended when the
 * demo's integration test goes red.
 */
import experiments from '../data/experiment-flags.json' with { type: 'json' };

/** Every experiment the site knows about. Add the key here and in the JSON. */
export type ExperimentName = 'minimaxH3Demo';

export interface ExperimentFlag {
  readonly enabled: boolean;
  /** ISO-8601 timestamp of the last flip. */
  readonly updatedAt: string;
  /** `manual`, or the workflow that flipped it (e.g. `ci:minimax-demo-integration`). */
  readonly updatedBy: string;
  /** Why it is in its current state — shown in the CI Slack message. */
  readonly reason: string;
}

export const experimentFlags: Readonly<Record<ExperimentName, ExperimentFlag>> = Object.freeze({
  minimaxH3Demo: Object.freeze(experiments.minimaxH3Demo),
});

/**
 * Local/preview override, so working on a disabled experiment does not require
 * dirtying a tracked file: `EXPERIMENT_MINIMAX_H3_DEMO=on pnpm dev`.
 *
 * Only ever consulted for a value of exactly `on` or `off`. Production builds
 * set nothing, so the committed JSON stays the single source of truth there.
 */
function envOverride(name: ExperimentName): boolean | null {
  const key = `EXPERIMENT_${name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase()}`;
  const raw = process.env[key] ?? import.meta.env?.[key];
  if (raw === 'on') return true;
  if (raw === 'off') return false;
  return null;
}

export function isExperimentEnabled(name: ExperimentName): boolean {
  return envOverride(name) ?? experimentFlags[name].enabled;
}
