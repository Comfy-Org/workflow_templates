import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';

import MiniMaxPromo from '../../src/components/hub/MiniMaxPromo.astro';
import {
  experimentFlags,
  isExperimentEnabled,
  type ExperimentName,
} from '../../src/config/experimentFlags';

const OVERRIDE_KEY = 'EXPERIMENT_MINIMAX_H3_DEMO';

afterEach(() => {
  delete process.env[OVERRIDE_KEY];
  delete process.env.VERCEL_ENV;
});

describe('experiment flags', () => {
  it('gives every declared experiment a usable entry', () => {
    for (const [name, flag] of Object.entries(experimentFlags)) {
      expect(typeof flag.enabled, `${name}.enabled`).toBe('boolean');
      expect(Number.isNaN(Date.parse(flag.updatedAt)), `${name}.updatedAt`).toBe(false);
      // The CI flip writes both, and the Slack alert quotes `reason` — an empty
      // one turns the alert into "the demo went off, no idea why".
      expect(flag.updatedBy.length, `${name}.updatedBy`).toBeGreaterThan(0);
      expect(flag.reason.length, `${name}.reason`).toBeGreaterThan(0);
    }
  });

  it('reads the committed JSON by default', () => {
    expect(isExperimentEnabled('minimaxH3Demo')).toBe(experimentFlags.minimaxH3Demo.enabled);
  });

  it('derives the override variable name from the camelCase flag name', () => {
    // The regex that produces EXPERIMENT_MINIMAX_H3_DEMO from minimaxH3Demo has
    // to split on both letter->capital and digit->capital boundaries. Get it
    // wrong and the override silently never applies, which looks exactly like
    // "the flag is stuck" to whoever is debugging the demo locally.
    process.env[OVERRIDE_KEY] = 'on';
    expect(isExperimentEnabled('minimaxH3Demo')).toBe(true);

    process.env[OVERRIDE_KEY] = 'off';
    expect(isExperimentEnabled('minimaxH3Demo')).toBe(false);
  });

  it('ignores an override that is not exactly on or off', () => {
    for (const value of ['', 'true', '1', 'ON', 'yes']) {
      process.env[OVERRIDE_KEY] = value;
      expect(isExperimentEnabled('minimaxH3Demo'), `override "${value}"`).toBe(
        experimentFlags.minimaxH3Demo.enabled
      );
    }
  });

  it('ignores the override entirely in a production build', () => {
    // Otherwise a stray variable in Vercel project settings silently outranks
    // the committed JSON, and CI's kill switch reports success while the next
    // production build keeps serving the broken experiment.
    process.env.VERCEL_ENV = 'production';
    process.env[OVERRIDE_KEY] = 'on';
    expect(isExperimentEnabled('minimaxH3Demo')).toBe(experimentFlags.minimaxH3Demo.enabled);

    process.env.VERCEL_ENV = 'preview';
    expect(isExperimentEnabled('minimaxH3Demo')).toBe(true);
  });

  it('exposes a frozen object so nothing can flip a flag at runtime', () => {
    const name: ExperimentName = 'minimaxH3Demo';
    expect(Object.isFrozen(experimentFlags)).toBe(true);
    expect(Object.isFrozen(experimentFlags[name])).toBe(true);
  });
});

describe('experiment entry points are measurable', () => {
  // PostHog runs with `autocapture: false` and tracks only via delegation on
  // specific hooks (see PostHogAnalytics.astro), so a plain <a> is invisible.
  // The demo originally shipped exactly that way, which is why nobody could
  // say how much traffic it diverted off the hub's browse flow.
  it('gives the hub promo CTA the hook PostHog delegates on', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(MiniMaxPromo, {
      props: { locale: 'en' },
      request: new Request('https://comfy.org/workflows/'),
    });

    const cta = /<a\b[^>]*data-experiment="minimaxH3Demo"[^>]*>/.exec(html)?.[0];
    expect(cta, 'the promo CTA carries no data-experiment hook').toBeDefined();
    expect(cta).toContain('data-location="hub_index_promo"');
    // The Cloud-CTA class would report this internal navigation as a signup CTA.
    expect(cta).not.toContain('run-cloud-btn');
  });

  it('ships no HTML comments to the browser', async () => {
    // Astro emits <!-- --> verbatim; only {/* */} is stripped. The notes in
    // this component explain internal analytics wiring and have no business
    // being in a page anyone can view-source.
    const container = await AstroContainer.create();
    const html = await container.renderToString(MiniMaxPromo, {
      props: { locale: 'en' },
      request: new Request('https://comfy.org/workflows/'),
    });

    expect(html).not.toContain('<!--');
  });
});
