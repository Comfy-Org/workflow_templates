/**
 * Reads the model -> context-window table out of the installed @lobehub/i18n-cli.
 *
 * The CLI sizes every translation request from this table, deriving the chunk
 * limit as `(contextWindow[modelName] - promptTokens) / 3` and applying the
 * configured `splitToken` only when that value is larger. A model the table does
 * not carry makes the lookup `undefined` and the limit `NaN`, and because every
 * comparison against `NaN` is false, the JSON splitter stops batching: it emits a
 * leading empty chunk and then one key per request. Nothing throws and no call
 * fails, so the only symptom is call volume and rate limiting.
 *
 * The table is read from the CLI's own bundle rather than copied here, so that
 * bumping the dependency re-checks the configured model against whatever the new
 * version actually supports instead of against a snapshot that has drifted.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);

/**
 * The CLI's context windows, or `null` when the table cannot be located.
 *
 * `null` means the bundle's shape changed, not that the model is bad, so callers
 * should say so rather than treat it as a failed lookup.
 */
export function readCliContextWindows(): Record<string, number> | null {
  let source: string;
  try {
    const entry = require.resolve('@lobehub/i18n-cli');
    source = fs.readFileSync(path.join(path.dirname(entry), 'cli.js'), 'utf-8');
  } catch {
    return null;
  }

  // The bundle is minified, so anchor on a stable key rather than a variable
  // name. The table holds only numbers, so the first brace after it closes it.
  const anchor = source.indexOf('"gpt-3.5-turbo"');
  if (anchor === -1) return null;

  const table: Record<string, number> = {};
  for (const [, key, value] of source
    .slice(source.lastIndexOf('{', anchor), source.indexOf('}', anchor))
    .matchAll(/"?([\w.-]+)"?\s*:\s*(\d+(?:\.\d+)?(?:e\+?\d+)?)/gi)) {
    table[key] = Number(value);
  }
  return Object.keys(table).length > 0 ? table : null;
}

/** The chunk limit the CLI derives, in the same order it derives it. */
export function effectiveSplitToken(
  contextWindow: number | undefined,
  promptTokens: number,
  splitToken: number
): number {
  let limit = ((contextWindow as number) - promptTokens) / 3;
  if (splitToken && splitToken < limit) limit = splitToken;
  return Math.floor(limit);
}
