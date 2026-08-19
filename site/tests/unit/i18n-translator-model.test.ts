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
  readCliJsonModeSupport,
  cliSourceSupportsJsonMode,
  effectiveSplitToken,
} from '../../scripts/i18n/cli-context-windows';

const require = createRequire(import.meta.url);
const CONFIG_PATH = path.join(process.cwd(), '.i18nrc.cjs');

/** The committed config, read with any local env override removed. */
function committedConfig(): {
  modelName: string;
  splitToken: number;
  experimental?: { jsonMode?: boolean };
} {
  const previous = process.env.HUB_I18N_MODEL;
  delete process.env.HUB_I18N_MODEL;
  try {
    delete require.cache[require.resolve(CONFIG_PATH)];
    return require(CONFIG_PATH);
  } finally {
    if (previous !== undefined) process.env.HUB_I18N_MODEL = previous;
    // The config reads env at require time, so leaving it cached would hand the
    // next caller in this worker a config built with the override stripped.
    delete require.cache[require.resolve(CONFIG_PATH)];
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

describe('JSON mode wiring', () => {
  it('is set in the committed config', () => {
    // Without response_format json_object, gpt-5.2 appends a stray closing
    // brace that lobe rejects, which froze every locale from 2026-08-14 on.
    expect(committedConfig().experimental?.jsonMode).toBe(true);
  });

  it('is still honoured by the installed CLI', () => {
    expect(
      readCliJsonModeSupport(),
      'The installed @lobehub/i18n-cli no longer reads experimental.jsonMode or sends ' +
        'json_object. Translation would silently run in plain-text mode, where gpt-5.2 ' +
        'output is unparseable. Pin back or re-wire JSON mode before translating.'
    ).toBe(true);
  });

  it('detects a bundle that dropped the option', () => {
    // The silent-regression shape the assertion exists for: a CLI that neither
    // reads the flag nor sends the response format must fail the check.
    expect(cliSourceSupportsJsonMode('const t = await client.chat.completions.create({messages, model})')).toBe(false);
    // Reading the flag without forwarding it is equally broken.
    expect(cliSourceSupportsJsonMode('this.x=!!this.config?.experimental?.jsonMode')).toBe(false);
    expect(
      cliSourceSupportsJsonMode(
        'this.x=!!this.config?.experimental?.jsonMode;...this.x&&{response_format:{type:"json_object"}}'
      )
    ).toBe(true);
  });
});
