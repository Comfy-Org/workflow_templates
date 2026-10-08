/**
 * check-config — fails the build if the i18n pipeline is mis-wired.
 * Run: `pnpm i18n:check`. This is the check that would have caught the abandoned
 * .i18nrc.cjs whose entry file never existed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { assertLocaleSets } from '../../src/lib/i18n/locales';
import {
  readCliContextWindows,
  readCliJsonModeSupport,
  effectiveSplitToken,
} from './cli-context-windows';

const require = createRequire(import.meta.url);

/** Only the fields this check reads; `.i18nrc.cjs` carries many more. */
interface I18nConfig {
  modelName: string;
  splitToken: number;
  experimental?: { jsonMode?: boolean };
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
//
// That holds only while the workflow step passes `HUB_I18N_MODEL` through. Without
// it this reads the committed default, passes, and the translator runs on the
// override anyway, so the check would pass precisely when it should not. Keep the
// env block on "Check pipeline config" in step with the translate step's.
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
  const { modelName, splitToken } = require(path.join(process.cwd(), '.i18nrc.cjs')) as I18nConfig;
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

// 4. JSON mode must stay wired end to end. Without response_format json_object,
// gpt-5.2 appends a stray closing brace that lobe rejects, which froze every
// locale's translation run from 2026-08-14 on. The option is experimental in
// lobe, so an upgrade that renames or drops it degrades SILENTLY back to that
// path (an ignored config key does not 400 the way a rejected response_format
// would) — so both halves are asserted here, before any spend.
const { experimental } = require(path.join(process.cwd(), '.i18nrc.cjs')) as I18nConfig;
if (experimental?.jsonMode !== true) {
  errors.push(
    '.i18nrc.cjs no longer sets experimental.jsonMode — without OpenAI JSON mode the ' +
      'translator returns unparseable chunks (the stray-brace freeze). Restore the option.'
  );
}
const cliJsonMode = readCliJsonModeSupport();
if (cliJsonMode === null) {
  // Same stance as the context-window table: an unreadable bundle says nothing
  // about the option, so be loud without blocking.
  console.warn(
    '[i18n] config check: could not read the @lobehub/i18n-cli bundle to verify jsonMode ' +
      'support. Re-verify the option is still honoured before trusting a dependency bump.'
  );
} else if (!cliJsonMode) {
  errors.push(
    'the installed @lobehub/i18n-cli no longer honours experimental.jsonMode / json_object. ' +
      'Translation would silently run in plain-text mode, where gpt-5.2 output is unparseable. ' +
      'Pin back to a version that supports it, or re-wire JSON mode before translating.'
  );
}

if (errors.length > 0) {
  for (const e of errors) console.error(`[i18n] config check: ${e}`);
  process.exit(1);
}
console.log(
  '[i18n] config check: entry present, locale sets valid, translator model sizable, JSON mode wired.'
);
