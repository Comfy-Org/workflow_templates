import { describe, expect, it } from 'vitest';
import { formatRelativeDate } from '../../src/lib/relative-date';
import { LOCALES, type Locale } from '../../src/i18n/config';
import { t } from '../../src/i18n/ui';

const NOW = new Date('2026-08-26T12:00:00Z');
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysBefore(days: number): string {
  return new Date(NOW.getTime() - days * MS_PER_DAY).toISOString();
}

/** The hard-coded English strings this replaced, kept as the reference output. */
function previousImplementation(dateStr: string): string {
  const diffMs = NOW.getTime() - new Date(dateStr).getTime();
  const diffDays = Math.floor(diffMs / MS_PER_DAY);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return '1 month ago';
  if (diffMonths < 12) return `${diffMonths} months ago`;
  const diffYears = Math.floor(diffMonths / 12);
  if (diffYears === 1) return '1 year ago';
  return `${diffYears} years ago`;
}

describe('English output is unchanged', () => {
  // Every bucket and both sides of every boundary.
  const offsets = [0, 1, 2, 15, 29, 30, 31, 59, 60, 359, 360, 364, 720, 1080, 3650];

  it.each(offsets)('matches the previous hard-coded string at %i days', (days) => {
    const dateStr = daysBefore(days);
    expect(formatRelativeDate(dateStr, 'en', NOW)).toBe(previousImplementation(dateStr));
  });
});

describe('other locales are actually translated', () => {
  const offsets = [0, 1, 5, 45, 400];

  it.each(LOCALES.filter((locale) => locale !== 'en'))(
    'renders no English for %s',
    (locale: Locale) => {
      for (const days of offsets) {
        const dateStr = daysBefore(days);
        const localized = formatRelativeDate(dateStr, locale, NOW);
        expect(localized, `${locale} at ${days} days`).not.toBe(
          formatRelativeDate(dateStr, 'en', NOW)
        );
        expect(localized).not.toMatch(/\b(ago|Today)\b/);
        expect(localized.length).toBeGreaterThan(0);
      }
    }
  );

  it('has a translated same-day string in every locale, not the English fallback', () => {
    for (const locale of LOCALES) {
      const value = t('date.today', locale);
      expect(value, locale).toBeTruthy();
      // t() silently falls back to English, so a missing key looks like a
      // working translation. Only English may equal English.
      if (locale !== 'en') expect(value, locale).not.toBe('Today');
    }
  });
});

describe('plural forms a single template cannot produce', () => {
  it('picks the right Russian form for 1, 2 and 5 days', () => {
    const forms = [1, 2, 5].map((n) => formatRelativeDate(daysBefore(n), 'ru', NOW));
    expect(forms).toEqual(['1 день назад', '2 дня назад', '5 дней назад']);
  });

  it('uses the Arabic dual for two days', () => {
    expect(formatRelativeDate(daysBefore(2), 'ar', NOW)).toBe('قبل يومين');
    expect(formatRelativeDate(daysBefore(5), 'ar', NOW)).toBe('قبل 5 أيام');
  });
});

describe('edge cases', () => {
  it('renders nothing for an unparseable date', () => {
    // The previous implementation rendered "NaN years ago" to the reader.
    expect(formatRelativeDate('not a date', 'en', NOW)).toBe('');
    expect(formatRelativeDate('', 'ja', NOW)).toBe('');
  });

  it('does not claim a future date is in the past', () => {
    const tomorrow = new Date(NOW.getTime() + 2 * MS_PER_DAY).toISOString();
    // The previous implementation returned "-2 days ago".
    expect(formatRelativeDate(tomorrow, 'en', NOW)).toBe('in 2 days');
  });

  it('picks the unit by distance, so a future date leaves the day lane', () => {
    // Testing the signed difference sent every future date down the day lane,
    // which reported a year ahead as "in 400 days".
    const ahead = (days: number) =>
      formatRelativeDate(new Date(NOW.getTime() + days * MS_PER_DAY).toISOString(), 'en', NOW);
    expect(ahead(45)).toBe('in 1 month');
    expect(ahead(400)).toBe('in 1 year');
    expect(ahead(1080)).toBe('in 3 years');
  });

  it('localizes future dates too', () => {
    const ahead = new Date(NOW.getTime() + 400 * MS_PER_DAY).toISOString();
    expect(formatRelativeDate(ahead, 'ja', NOW)).toBe('1 年後');
    expect(formatRelativeDate(ahead, 'ru', NOW)).toBe('через 1 год');
  });

  it('uses the same-day string for a date earlier today', () => {
    const earlierToday = new Date(NOW.getTime() - 3 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeDate(earlierToday, 'ko', NOW)).toBe('오늘');
  });
});
