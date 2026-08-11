/**
 * Guards the one property of the translator model that is not about quality:
 * whether the installed CLI can size a request for it.
 *
 * lobe-i18n ships a model -> context-window table and derives the chunk limit as
 * `(contextWindow[modelName] - promptTokens) / 3`, applying the configured
 * `splitToken` only when that value is larger. For a model the table does not
 * carry, the lookup is `undefined`, the limit is `NaN`, and every `<=` inside the
 * splitter is false, so it emits a leading empty chunk followed by one key per
 * request instead of the intended batches. Nothing throws and no request fails,
 * so this is invisible until the call volume and the rate limiting show up.
 *
 * These tests read the real table out of the installed CLI rather than a copy of
 * it, so bumping the dependency re-checks the model against whatever the new
 * version actually supports.
 */
import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);

/** The configured translator model, read the way the pipeline reads it. */
function configuredModel(): string {
  const configPath = path.join(process.cwd(), '.i18nrc.cjs');
  // The config reads env at require time, so drop any local override and reload
  // to assert on the committed default rather than on whatever the shell has set.
  const previous = process.env.HUB_I18N_MODEL;
  delete process.env.HUB_I18N_MODEL;
  try {
    delete require.cache[require.resolve(configPath)];
    return (require(configPath) as { modelName: string }).modelName;
  } finally {
    if (previous !== undefined) process.env.HUB_I18N_MODEL = previous;
  }
}

/**
 * The CLI's context-window table, parsed out of its bundle.
 *
 * The bundle is minified, so the table is located by a stable key rather than by
 * variable name, then read to its closing brace. It holds only numbers, so the
 * first brace closes it. Failing to find it is itself reported, because that
 * means the CLI's internals moved and this guard needs re-verifying rather than
 * silently passing.
 */
function cliContextWindows(): Record<string, number> {
  const entry = require.resolve('@lobehub/i18n-cli');
  const bundle = path.join(path.dirname(entry), 'cli.js');
  const source = fs.readFileSync(bundle, 'utf-8');

  const anchor = source.indexOf('"gpt-3.5-turbo"');
  expect(
    anchor,
    `Could not find the context-window table in ${bundle}. The CLI's internals have changed; re-verify how it sizes requests before trusting this test.`
  ).toBeGreaterThan(-1);

  const start = source.lastIndexOf('{', anchor);
  const end = source.indexOf('}', anchor);
  const table: Record<string, number> = {};
  for (const [, key, value] of source
    .slice(start, end)
    .matchAll(/"?([\w.-]+)"?\s*:\s*(\d+(?:\.\d+)?(?:e\+?\d+)?)/gi)) {
    table[key] = Number(value);
  }
  return table;
}

/** The chunk limit lobe-i18n derives, in the same order it derives it. */
function effectiveSplitToken(
  contextWindow: number | undefined,
  promptTokens: number,
  splitToken: number
): number {
  let limit = ((contextWindow as number) - promptTokens) / 3;
  if (splitToken && splitToken < limit) limit = splitToken;
  return Math.floor(limit);
}

describe('translator model', () => {
  it('is one the installed CLI carries a context window for', () => {
    const model = configuredModel();
    const table = cliContextWindows();

    // Sanity-check the parse before drawing any conclusion from it: an empty or
    // broken table would otherwise fail the real assertion for the wrong reason.
    expect(Object.keys(table).length).toBeGreaterThan(10);
    expect(table['gpt-4.1']).toBeGreaterThan(0);

    expect(
      Object.keys(table),
      `The translator is set to "${model}", which the installed @lobehub/i18n-cli has no context window for. It will batch one key per request instead of honouring splitToken. Pick a model the CLI knows, or upgrade it to a version that knows this one.`
    ).toContain(model);
  });

  it('leaves splitToken as the binding constraint, so batching stays as configured', () => {
    const model = configuredModel();
    const { splitToken } = require(path.join(process.cwd(), '.i18nrc.cjs')) as {
      splitToken: number;
    };
    const contextWindow = cliContextWindows()[model];

    // A generous prompt allowance: the reference prompt carries the glossary and,
    // in single-locale runs, that locale's terminology block on top.
    const limit = effectiveSplitToken(contextWindow, 8000, splitToken);
    expect(Number.isNaN(limit)).toBe(false);
    expect(limit).toBe(splitToken);
  });

  it('collapses to one key per chunk when the model is unknown', () => {
    // The failure this guard exists for, pinned so the reasoning above stays
    // honest: an absent context window makes every size comparison false.
    const limit = effectiveSplitToken(undefined, 8000, 6000);
    expect(Number.isNaN(limit)).toBe(true);
    expect(100 <= limit).toBe(false);
  });
});
