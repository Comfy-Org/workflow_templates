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

  // Round the distance, not the signed difference, so the same gap reads the same
  // in both directions. Flooring while signed rounded future dates away from now:
  // 29 days and 23 hours ahead landed in the month lane as "in 1 month" while the
  // same gap in the past stayed "29 days ago", and a timestamp a few hours ahead
  // became "in 1 day" rather than today. Clock skew against the hub API is the
  // realistic way a reader ever sees a future date at all.
  const distanceDays = Math.floor(Math.abs(diffMs) / MS_PER_DAY);
  if (distanceDays === 0) return t('date.today', locale);

  const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'always' });
  // The unit comes from the distance; only the sign of the formatted value says
  // which side of now it falls on. Choosing the lane from the signed value put
  // every future date in the day lane, so a year ahead read "in 400 days".
  const direction = diffMs < 0 ? 1 : -1;
  if (distanceDays < 30) return relative.format(direction * distanceDays, 'day');

  const distanceMonths = Math.floor(distanceDays / 30);
  if (distanceMonths < 12) return relative.format(direction * distanceMonths, 'month');

  return relative.format(direction * Math.floor(distanceMonths / 12), 'year');
}
