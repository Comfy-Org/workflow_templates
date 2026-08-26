/**
 * The glossary override layer: ONE implementation, in CommonJS.
 *
 * Both sides of the pipeline need it and they cannot share a TypeScript module.
 * `.i18nrc.cjs` is the @lobehub/i18n-cli config, which node `require`s directly,
 * so it can only load CommonJS; the scripts under `scripts/i18n` are TypeScript
 * run through tsx. A `.cjs` file is the one shape both can load, and JSDoc types
 * give the TypeScript side real types (`allowJs` is on) without a second copy of
 * the logic to keep in step.
 *
 * Keep it a single module. Two copies of these rules is exactly the bug #1173
 * existed to fix: the translator's prompt quietly enforcing different terms than
 * the reviewer and the validator.
 */

/**
 * The on-disk shape of `i18n/glossary/overrides/{locale}.json`.
 *
 * A string is the curated translation a term MUST use. `null` is a RETRACTION:
 * it says the harvested mirror pair for that term is wrong and must not be
 * enforced by anyone. Retraction is the only way to drop a bad harvested pair,
 * because the mirror is regenerated from the app's locale files on every run and
 * hand-edits to it would not survive.
 *
 * Needed because the harvest cannot see when the app's own UI contradicts
 * itself. `buildMirror` skips identity pairs, so where the Spanish UI leaves a
 * term untranslated the pair is dropped as uninformative and only a divergent
 * outlier survives: es harvested `Video -> Vídeo` from one standalone label
 * while `Descargar video`, `Subir un video` and ten other phrases in the same
 * file leave it unaccented. The reviewer then flagged 401 fields for using the
 * spelling the app itself uses everywhere else, and `enforce` pruned them to
 * English, 19.2% of the locale, over the 15% systemic threshold.
 *
 * @typedef {Record<string, string | null>} GlossaryOverrides
 */

/**
 * Lay the curated override layer over a set of harvested pairs: a string wins
 * over the harvested value, a `null` retracts the harvested pair entirely, and a
 * blank string stays ignored (an accident, not a deliberate retraction).
 *
 * Every consumer that merges overrides into a glossary must go through here.
 * Merging the override object over the mirror instead (`{...mirror, ...overrides}`)
 * silently gets retraction wrong: the retracted key survives as an explicit
 * `null`, and the translator prompt renders `- Video → null`.
 *
 * @param {Record<string, string>} base harvested pairs, not mutated
 * @param {GlossaryOverrides} overrides
 * @returns {Record<string, string>}
 */
function applyOverrides(base, overrides) {
  const result = { ...base };
  for (const [en, localized] of Object.entries(overrides)) {
    if (localized === null) {
      delete result[en];
      continue;
    }
    if (typeof localized === 'string' && localized.trim()) result[en] = localized;
  }
  return result;
}

/**
 * The subset of an overrides file that may be ENFORCED: curated translations,
 * with retractions dropped.
 *
 * Every consumer that checks content against the override layer must read it
 * through here. `collectViolations` treats an override as a hard requirement
 * ("term X must be rendered as Y") with no model in the loop, so a raw `null`
 * reaching it would demand that fields render as the literal `null`.
 *
 * @param {GlossaryOverrides} overrides
 * @returns {Record<string, string>}
 */
function enforceableOverrides(overrides) {
  return applyOverrides({}, overrides);
}

module.exports = { applyOverrides, enforceableOverrides };
