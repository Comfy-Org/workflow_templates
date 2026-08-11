/**
 * Guards the one property of the translator model that is not about quality:
 * whether the installed CLI can size a request for it. See
 * `scripts/i18n/cli-context-windows.ts` for what goes wrong when it cannot.
 *
 * This covers the committed default. The env override is checked at run time by
 * `pnpm i18n:check`, which is the only place that sees the resolved value.
 */
import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';
import {
  readCliContextWindows,
  effectiveSplitToken,
} from '../../scripts/i18n/cli-context-windows';

const require = createRequire(import.meta.url);
const CONFIG_PATH = path.join(process.cwd(), '.i18nrc.cjs');

/** The committed config, read with any local env override removed. */
function committedConfig(): { modelName: string; splitToken: number } {
  const previous = process.env.HUB_I18N_MODEL;
  delete process.env.HUB_I18N_MODEL;
  try {
    delete require.cache[require.resolve(CONFIG_PATH)];
    return require(CONFIG_PATH);
  } finally {
    if (previous !== undefined) process.env.HUB_I18N_MODEL = previous;
  }
}

describe('translator model', () => {
  it('is one the installed CLI carries a context window for', () => {
    const { modelName } = committedConfig();
    const table = readCliContextWindows();

    // Sanity-check the parse first: an unreadable table would otherwise fail the
    // real assertion for the wrong reason.
    expect(
      table,
      'Could not read the context-window table from @lobehub/i18n-cli. Its internals have changed; re-verify how it sizes requests before trusting this test.'
    ).not.toBeNull();
    expect(table!['gpt-4.1']).toBeGreaterThan(0);

    expect(
      Object.keys(table!),
      `The translator is set to "${modelName}", which the installed @lobehub/i18n-cli has no context window for. It will batch one key per request instead of honouring splitToken. Pick a model the CLI knows, or upgrade it to a version that knows this one.`
    ).toContain(modelName);
  });

  it('leaves splitToken as the binding constraint, so batching stays as configured', () => {
    const { modelName, splitToken } = committedConfig();
    const limit = effectiveSplitToken(readCliContextWindows()![modelName], 8000, splitToken);
    expect(Number.isNaN(limit)).toBe(false);
    expect(limit).toBe(splitToken);
  });

  it('collapses to one key per chunk when the model is unknown', () => {
    // The failure this guard exists for, pinned so the reasoning stays honest:
    // an absent context window makes every size comparison false.
    const limit = effectiveSplitToken(undefined, 8000, 6000);
    expect(Number.isNaN(limit)).toBe(true);
    expect(100 <= limit).toBe(false);
  });
});
