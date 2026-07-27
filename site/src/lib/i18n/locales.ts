/**
 * The three locale sets for hub localization (GTM-291), per the approved design.
 * Discovery is not activation — each set is a deliberate narrowing of the last:
 *
 *   AVAILABLE_APP_LOCALES  ⊇  SUPPORTED_HUB_LOCALES  ⊇  INDEXABLE_LOCALES
 *
 * - AVAILABLE_APP_LOCALES: discovered from the ComfyUI app's locale registry (a
 *   committed snapshot, refreshed by the glossary sync). A candidate menu only;
 *   a new app locale widens it and nothing else.
 * - SUPPORTED_HUB_LOCALES: the locales the hub deliberately builds and serves.
 *   CI asserts this is a subset of AVAILABLE_APP_LOCALES (you cannot support a
 *   hub locale the app cannot supply UI strings for).
 * - INDEXABLE_LOCALES: the reviewed subset whose canonicals/sitemap/hreflang are
 *   flipped on. Starts empty; each language is added in its own one-line PR after
 *   its native-review wave. Per-page gating still applies on top (see predicate).
 *
 * No `import.meta.env` here, so `astro.config.mjs` can import these at build.
 */
import { LOCALES, type Locale } from '../../i18n/config';

/**
 * Snapshot of the app's locale registry. Kept in sync with ComfyUI_frontend's
 * `src/locales` by `scripts/i18n/sync-glossary.ts`; committed so the hub's CI
 * (which does not check out the frontend repo) can assert the subset invariant.
 * The app currently ships these plus `fa`/`he`, which the hub does not serve.
 */
export const AVAILABLE_APP_LOCALES = [
  'en',
  'zh',
  'zh-TW',
  'ja',
  'ko',
  'es',
  'fr',
  'ru',
  'tr',
  'ar',
  'pt-BR',
] as const satisfies readonly Locale[];

/** Locales the hub deliberately builds + serves. Currently all configured ones. */
export const SUPPORTED_HUB_LOCALES: readonly Locale[] = LOCALES;

/**
 * Reviewed locales whose pages may be indexed. EMPTY until a language completes
 * its native-review wave, at which point it is added here in a one-line PR.
 * Per-page freshness/completeness/review gating applies on top (see predicate).
 */
export const INDEXABLE_LOCALES: readonly Locale[] = [];

/**
 * Assert SUPPORTED ⊆ AVAILABLE (and INDEXABLE ⊆ SUPPORTED). Called from CI; throws
 * with the offending locales so a config drift fails the build, not production.
 */
export function assertLocaleSets(): void {
  const available = new Set<string>(AVAILABLE_APP_LOCALES);
  const unsupportable = SUPPORTED_HUB_LOCALES.filter((l) => !available.has(l));
  if (unsupportable.length > 0) {
    throw new Error(
      `SUPPORTED_HUB_LOCALES not a subset of AVAILABLE_APP_LOCALES: ${unsupportable.join(', ')}. ` +
        `The app cannot supply UI strings for these — add them to the app or drop them from the hub.`
    );
  }
  const supported = new Set<string>(SUPPORTED_HUB_LOCALES);
  const unsupported = INDEXABLE_LOCALES.filter((l) => !supported.has(l));
  if (unsupported.length > 0) {
    throw new Error(
      `INDEXABLE_LOCALES not a subset of SUPPORTED_HUB_LOCALES: ${unsupported.join(', ')}.`
    );
  }
}
