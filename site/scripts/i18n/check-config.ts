/**
 * check-config — fails the build if the i18n pipeline is mis-wired.
 * Run: `pnpm i18n:check`. This is the check that would have caught the abandoned
 * .i18nrc.cjs whose entry file never existed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { assertLocaleSets } from '../../src/lib/i18n/locales';
import { readCliContextWindows, effectiveSplitToken } from './cli-context-windows';

const require = createRequire(import.meta.url);

/** Only the two fields this check reads; `.i18nrc.cjs` carries many more. */
interface I18nConfig {
  modelName: string;
  splitToken: number;
}

/**
 * Generous allowance for the reference prompt, which carries the glossary and,
 * in single-locale runs, that locale's terminology block on top. Deliberately
 * high: the point is to reject a context window too small to be workable, not to
 * predict the exact prompt size.
 */
const PROMPT_TOKEN_ALLOWANCE = 8000;

const errors: string[] = [];

// 1. The lobe entry (the English content-of-record) must exist before translating.
const entry = path.join(process.cwd(), 'src', 'i18n', 'content', 'en.json');
if (!fs.existsSync(entry)) {
  errors.push(`lobe entry missing: ${entry} — run \`pnpm i18n:build-source\` first.`);
}

// 2. Locale sets must satisfy SUPPORTED ⊆ AVAILABLE and INDEXABLE ⊆ SUPPORTED.
try {
  assertLocaleSets();
} catch (err) {
  errors.push(err instanceof Error ? err.message : String(err));
}

// 3. The model actually about to be used must be one the CLI can size requests
// for. The unit test covers the committed default, but the model is also
// settable from a repo variable that overrides it at run time, and a wrong value
// there degrades silently: batching collapses to one key per request while every
// call still succeeds. This is the only place that sees the resolved value, so
// it is the only place that can catch it. Checked before translating, so a bad
// override costs one failed step rather than a night of oversized bills.
const contextWindows = readCliContextWindows();
if (!contextWindows) {
  // Unreadable table means the CLI's bundle changed shape, which says nothing
  // about the model. Blocking the pipeline on a parsing heuristic would be worse
  // than the risk it guards, so this is loud but not fatal.
  console.warn(
    '[i18n] config check: could not read the context-window table from @lobehub/i18n-cli. ' +
      'Request sizing is unverified; re-check how the CLI batches before trusting a model change.'
  );
} else {
  const { modelName, splitToken } = require(
    path.join(process.cwd(), '.i18nrc.cjs')
  ) as I18nConfig;
  // Own keys only. `in` would also match everything on Object.prototype, so a
  // model literally named `toString` or `constructor` would pass the lookup and
  // then yield a function as its context window.
  const contextWindow = Object.hasOwn(contextWindows, modelName)
    ? contextWindows[modelName]
    : undefined;
  const limit = effectiveSplitToken(contextWindow, PROMPT_TOKEN_ALLOWANCE, splitToken);
  if (contextWindow === undefined) {
    errors.push(
      `translator model "${modelName}" has no context window in the installed @lobehub/i18n-cli. ` +
        'It would batch one key per request instead of honouring splitToken. Pick a model the CLI ' +
        'knows, or upgrade it to a version that knows this one.'
    );
  } else if (!Number.isFinite(limit) || limit < 1) {
    // Tested for finiteness rather than `< 1`: a non-finite limit is the exact
    // shape of the bug being guarded, and `NaN < 1` is false, so a bare
    // comparison would wave it through.
    errors.push(
      `translator model "${modelName}" has a context window of ${contextWindow}, too small to ` +
        'leave room for the reference prompt. Requests would be split past the point of use.'
    );
  }
}

if (errors.length > 0) {
  for (const e of errors) console.error(`[i18n] config check: ${e}`);
  process.exit(1);
}
console.log('[i18n] config check: entry present, locale sets valid, translator model sizable.');
