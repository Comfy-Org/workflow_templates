import { describe, expect, it } from 'vitest';
import {
  detached,
  getHtmlAttr,
  parseCanonical,
  parseMetaRefresh,
  parseNoindex,
} from '../../src/lib/html-directives';

describe('html-directives', () => {
  describe('getHtmlAttr', () => {
    it('extracts double-quoted attribute values', () => {
      expect(getHtmlAttr('<meta name="robots" content="noindex">', 'content')).toBe('noindex');
      expect(getHtmlAttr('<link rel="canonical" href="https://comfy.org/">', 'href')).toBe(
        'https://comfy.org/'
      );
    });

    it('extracts single-quoted attribute values', () => {
      expect(getHtmlAttr("<meta name='robots' content='none'>", 'content')).toBe('none');
    });

    it('extracts unquoted attribute values', () => {
      expect(getHtmlAttr('<meta http-equiv=refresh content="0; url=/">', 'http-equiv')).toBe(
        'refresh'
      );
    });

    it('does not match prefixed attribute names', () => {
      expect(getHtmlAttr('<meta data-content="noindex" content="index">', 'content')).toBe('index');
      expect(
        getHtmlAttr('<link data-href="https://wrong.org" href="https://correct.org">', 'href')
      ).toBe('https://correct.org');
      expect(getHtmlAttr('<meta data-content="noindex">', 'content')).toBeNull();
    });

    it('handles attribute names case-insensitively', () => {
      expect(getHtmlAttr('<META NAME="robots" CONTENT="noindex">', 'content')).toBe('noindex');
      expect(getHtmlAttr('<meta NAME="robots" content="noindex">', 'name')).toBe('robots');
    });

    it('returns null when attribute is missing', () => {
      expect(getHtmlAttr('<meta name="robots">', 'content')).toBeNull();
    });
  });

  describe('parseCanonical', () => {
    it('extracts canonical href from link tags', () => {
      const html = '<link rel="canonical" href="https://comfy.org/workflows/">';
      expect(parseCanonical(html)).toBe('https://comfy.org/workflows/');
    });

    it('finds canonical among multiple link tags', () => {
      const html = `
        <link rel="stylesheet" href="/style.css">
        <link rel="alternate" hreflang="es" href="https://comfy.org/es/">
        <link rel="canonical" href="https://comfy.org/">
      `;
      expect(parseCanonical(html)).toBe('https://comfy.org/');
    });

    it('returns null if rel does not include canonical', () => {
      const html = '<link rel="alternate" href="https://comfy.org/alt/">';
      expect(parseCanonical(html)).toBeNull();
    });

    it('does not trigger on data-rel="canonical"', () => {
      const html = '<link data-rel="canonical" rel="stylesheet" href="/style.css">';
      expect(parseCanonical(html)).toBeNull();
    });

    it('returns null if link has no href', () => {
      const html = '<link rel="canonical">';
      expect(parseCanonical(html)).toBeNull();
    });
  });

  describe('parseNoindex', () => {
    it('detects noindex in meta robots', () => {
      expect(parseNoindex('<meta name="robots" content="noindex, follow">')).toBe(true);
      expect(parseNoindex('<meta name="robots" content="noindex">')).toBe(true);
    });

    it('detects none in meta robots', () => {
      expect(parseNoindex('<meta name="robots" content="none">')).toBe(true);
    });

    it('detects noindex in googlebot', () => {
      expect(parseNoindex('<meta name="googlebot" content="noindex">')).toBe(true);
    });

    it('returns false for index, follow', () => {
      expect(parseNoindex('<meta name="robots" content="index, follow">')).toBe(false);
    });

    it('does not falsely trigger on max-image-preview:none or other token values', () => {
      expect(
        parseNoindex('<meta name="robots" content="index, follow, max-image-preview:none">')
      ).toBe(false);
    });

    it('does not trigger on data-content="noindex"', () => {
      expect(parseNoindex('<meta name="robots" data-content="noindex" content="index">')).toBe(
        false
      );
    });

    it('returns false when no robots meta is present', () => {
      expect(parseNoindex('<html><head><title>Test</title></head></html>')).toBe(false);
    });
  });

  describe('parseMetaRefresh', () => {
    it('detects meta refresh redirect', () => {
      expect(parseMetaRefresh('<meta http-equiv="refresh" content="0; url=/workflows/">')).toBe(
        true
      );
    });

    it('returns false for non-refresh http-equiv', () => {
      expect(parseMetaRefresh('<meta http-equiv="content-type" content="text/html">')).toBe(false);
    });

    it('returns false when no meta tags exist', () => {
      expect(parseMetaRefresh('<html><head></head></html>')).toBe(false);
    });
  });

  describe('detached', () => {
    it('copies string cleanly without retaining source slice', () => {
      const original = 'test-string';
      const result = detached(original);
      expect(result).toBe('test-string');
    });
  });
});
