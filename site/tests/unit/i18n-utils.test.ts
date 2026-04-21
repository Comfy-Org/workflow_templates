import { describe, it, expect } from 'vitest';
import { getLocaleFromPath, localizeUrl, getAlternateUrls, isRTL } from '../../src/i18n/utils';

describe('getLocaleFromPath', () => {
  it('returns default locale for root path', () => {
    expect(getLocaleFromPath('/')).toBe('en');
  });

  it('returns default locale for English template path', () => {
    expect(getLocaleFromPath('/templates/some-template')).toBe('en');
  });

  it('detects locale prefix', () => {
    expect(getLocaleFromPath('/zh/templates/some-template')).toBe('zh');
    expect(getLocaleFromPath('/ja/templates/')).toBe('ja');
    expect(getLocaleFromPath('/ar/templates/test')).toBe('ar');
  });

  it('handles zh-TW locale', () => {
    expect(getLocaleFromPath('/zh-TW/templates/')).toBe('zh-TW');
  });

  it('handles pt-BR locale', () => {
    expect(getLocaleFromPath('/pt-BR/templates/')).toBe('pt-BR');
  });

  it('returns default for unknown locale prefix', () => {
    expect(getLocaleFromPath('/xx/templates/')).toBe('en');
  });

  it('returns default for empty path', () => {
    expect(getLocaleFromPath('')).toBe('en');
  });
});

describe('localizeUrl', () => {
  it('returns path unchanged for default locale', () => {
    expect(localizeUrl('/templates/', 'en')).toBe('/templates/');
  });

  it('prefixes path with locale', () => {
    expect(localizeUrl('/templates/', 'zh')).toBe('/zh/templates/');
    expect(localizeUrl('/templates/', 'ja')).toBe('/ja/templates/');
  });

  it('adds leading slash if missing', () => {
    expect(localizeUrl('templates/', 'zh')).toBe('/zh/templates/');
  });

  it('handles root path', () => {
    expect(localizeUrl('/', 'fr')).toBe('/fr/');
  });
});

describe('getAlternateUrls', () => {
  it('returns URLs for all locales', () => {
    const urls = getAlternateUrls('/templates/');
    expect(urls.length).toBeGreaterThan(0);

    const enUrl = urls.find((u) => u.locale === 'en');
    expect(enUrl?.url).toBe('/templates/');

    const zhUrl = urls.find((u) => u.locale === 'zh');
    expect(zhUrl?.url).toBe('/zh/templates/');
  });
});

describe('isRTL', () => {
  it('returns true for Arabic', () => {
    expect(isRTL('ar')).toBe(true);
  });

  it('returns false for LTR locales', () => {
    expect(isRTL('en')).toBe(false);
    expect(isRTL('zh')).toBe(false);
    expect(isRTL('ja')).toBe(false);
  });
});
