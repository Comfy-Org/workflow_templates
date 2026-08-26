import type { Locale } from '../i18n/config';
import { t } from '../i18n/ui';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * The "2 days ago" stamp on a workflow, in the reader's language.
 *
 * Built on Intl rather than a `{count} days ago` template because plural
 * morphology is not a suffix in most of the locales we ship: Russian needs
 * день/дня/дней by count, and Arabic has a distinct dual form (يومين for two).
 * A single interpolated string is wrong in both, and CLDR already knows the
 * rules.
 *
 * `numeric: 'always'` keeps the English output byte-identical to the hard-coded
 * strings this replaces ("1 day ago", not "yesterday"), so no English copy
 * changes. Only the same-day case has no relative form to reuse, so it comes
 * from the UI dictionary.
 *
 * `now` is injectable so the buckets can be tested without freezing the clock.
 */
export function formatRelativeDate(
  dateStr: string,
  locale: Locale,
  now: Date = new Date()
): string {
  const diffMs = now.getTime() - new Date(dateStr).getTime();
  // An unparseable date yields NaN, which Intl rejects with a RangeError. The
  // previous implementation rendered "NaN years ago" instead; show nothing.
  if (Number.isNaN(diffMs)) return '';

  const diffDays = Math.floor(diffMs / MS_PER_DAY);
  if (diffDays === 0) return t('date.today', locale);

  const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'always' });
  if (diffDays < 30) return relative.format(-diffDays, 'day');

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return relative.format(-diffMonths, 'month');

  return relative.format(-Math.floor(diffMonths / 12), 'year');
}
