/**
 * A model URL must resolve to exactly one family.
 *
 * Both model routes look a request up by canonical slug first and by
 * `redirectFrom` second, taking the first family that matches. Ambiguous data
 * therefore does not error, it silently mis-serves one URL: a variant claimed
 * twice redirects to whichever family was derived first, and a variant that is
 * also another family's canonical slug never redirects at all because the
 * canonical lookup shadows it.
 *
 * The deleted `redirects` map in astro.config.mjs excluded that second case by
 * hand while it still owned the redirects. Now that the routes own them, the
 * guard has to live with the data.
 */
import { describe, expect, it } from 'vitest';
import { assertUniqueModelSlugs } from '../../src/lib/workflow-pages/model-groups';

const group = (slug: string, redirectFrom: string[] = []) => ({ slug, redirectFrom });

describe('assertUniqueModelSlugs', () => {
  it('accepts distinct canonical slugs with distinct variants', () => {
    expect(() =>
      assertUniqueModelSlugs([group('wan', ['wan2-5', 'wan2-2']), group('flux', ['flux-2'])])
    ).not.toThrow();
  });

  it('accepts a family with no variants at all', () => {
    expect(() => assertUniqueModelSlugs([group('wan'), group('flux')])).not.toThrow();
  });

  it('rejects two families deriving the same canonical slug', () => {
    expect(() => assertUniqueModelSlugs([group('wan'), group('wan')])).toThrow(
      /Duplicate model slug "wan"/
    );
  });

  it('rejects a variant claimed by two families, naming both', () => {
    expect(() =>
      assertUniqueModelSlugs([group('wan', ['shared']), group('flux', ['shared'])])
    ).toThrow(/"shared" is claimed by both "wan" and "flux"/);
  });

  it('rejects a variant that is another family’s canonical slug', () => {
    expect(() => assertUniqueModelSlugs([group('wan', ['flux']), group('flux')])).toThrow(
      /"flux" \(of "wan"\) is also a canonical family slug/
    );
  });

  it('catches the collision when the canonical family is derived last', () => {
    // The check needs two passes: a single pass that builds the canonical set as
    // it goes would not have seen "flux" yet when it inspected "wan".
    expect(() => assertUniqueModelSlugs([group('wan', ['flux']), group('flux')])).toThrow();
    expect(() => assertUniqueModelSlugs([group('flux'), group('wan', ['flux'])])).toThrow();
  });

  it('accepts an empty catalog, which is what a plain config load has', () => {
    expect(() => assertUniqueModelSlugs([])).not.toThrow();
  });
});
