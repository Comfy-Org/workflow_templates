import type { Locale } from './config';
import en from './locales/en.json';
import zh from './locales/zh.json';
import zhTW from './locales/zh-TW.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import ru from './locales/ru.json';
import tr from './locales/tr.json';
import ar from './locales/ar.json';
import ptBR from './locales/pt-BR.json';
import it from './locales/it.json';

// UI string translations (static chrome text). One JSON file per locale under
// ./locales/ so the translation pipeline (lobe) can fill missing keys — English
// has more keys than the other locales today, and those gaps fall back to English
// via t() until translated. The t() signature is unchanged so all callers are
// untouched.
export const UI_STRINGS: Record<Locale, Record<string, string>> = {
  en,
  zh,
  'zh-TW': zhTW,
  ja,
  ko,
  es,
  fr,
  ru,
  tr,
  ar,
  'pt-BR': ptBR,
  // Seeded empty: the pipeline's chrome step fills it, and t() falls back to
  // English per key until it does, so a partial file is never a broken page.
  it,
};

// Get a translated string
export function t(key: string, locale: Locale): string {
  return UI_STRINGS[locale]?.[key] || UI_STRINGS.en[key] || key;
}
