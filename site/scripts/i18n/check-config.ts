/**
 * check-config — fails the build if the i18n pipeline is mis-wired (GTM-291).
 * Run: `pnpm i18n:check`. This is the check that would have caught the abandoned
 * .i18nrc.cjs whose entry file never existed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { assertLocaleSets } from '../../src/lib/i18n/locales';

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

if (errors.length > 0) {
  for (const e of errors) console.error(`[i18n] config check: ${e}`);
  process.exit(1);
}
console.log('[i18n] config check: entry present, locale sets valid.');
