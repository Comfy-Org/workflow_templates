/**
 * The Spanish `Video` retraction, encoded so it keeps applying.
 *
 * The harvest cannot see when the app's own UI contradicts itself. `buildMirror`
 * skips identity pairs, so wherever the Spanish app locale leaves a term
 * untranslated the pair is dropped as uninformative and only a divergent outlier
 * survives. For `video` the surviving pair is the accented one, harvested from a
 * standalone label, while twelve phrases in the same file leave it unaccented:
 *
 *   'Video'             -> 'Vídeo'      <- harvested, rank 5 of 200
 *   'VIDEO'             -> 'VÍDEO'      <- harvested, rank 6 of 200
 *   'Download video'    -> 'Descargar video'
 *   'Upload a video'    -> 'Subir un video'
 *   'Generating video…' -> 'Generando video…'
 *   'Seek video'        -> 'Buscar en el video'
 *   ... 8 more, all unaccented
 *
 * The reviewer was handed those two pairs as required terminology and filed 401
 * major terminology findings against fields using the spelling the app itself
 * uses everywhere else. `enforce` pruned them to English: 827 of 4312 fields,
 * 19.2% of the locale, over the 15% systemic threshold, which failed the nightly
 * run of 2026-08-24. Dropping these two pairs takes the same review data to 381
 * fields, 8.8%.
 *
 * Retraction, not a curated override to the unaccented form. An override is
 * enforced deterministically by `collectViolations` with no model in the loop, so
 * asserting `Video -> video` would prune every field that used the accent. We do
 * not have a native reviewer's answer on vídeo (Spain) versus video (Latin
 * America), and both are correct Spanish, so the honest position is to enforce
 * neither and let the translator choose.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  applyOverrides,
  enforceableOverrides,
  selectGlossary,
  type GlossaryOverrides,
} from '../../scripts/i18n/sync-glossary';
import { collectViolations } from '../../scripts/i18n/validate-translations';
import type { WorkflowContent } from '../../src/lib/i18n/schema';

const readOverrides = (locale: string) =>
  JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), 'i18n', 'glossary', 'overrides', `${locale}.json`),
      'utf-8'
    )
  ) as GlossaryOverrides;

const esOverrides = readOverrides('es');

describe('the Spanish overrides file', () => {
  it('retracts both casings of the harvested video pair', () => {
    // Both are in the top 200, so retracting only one leaves the other enforcing
    // the same accent.
    expect(esOverrides).toEqual({ Video: null, VIDEO: null });
  });

  it('asserts no replacement wording of its own', () => {
    expect(enforceableOverrides(esOverrides)).toEqual({});
  });
});

describe('a retraction at the glossary boundary', () => {
  const corpus = JSON.stringify({
    a: { title: 'Video to video workflow', description: 'Upload a video, then queue it' },
  });
  const mirror = { Video: 'Vídeo', VIDEO: 'VÍDEO', Workflow: 'Flujo de trabajo' };

  it('drops the retracted pairs from the selected glossary', () => {
    const selected = selectGlossary(mirror, esOverrides, corpus);

    expect(selected).toEqual({ Workflow: 'Flujo de trabajo' });
  });

  it('is purely subtractive: retracting never promotes another term past the cap', () => {
    // The guard on the design decision. Retracting by filtering the mirror BEFORE
    // ranking would free slots at the cap and pull unvetted terms in; measured on
    // the real es mirror those were `Top -> Arriba` and `Number of Frames ->
    // Número de fotogramas`. Applying overrides after the cap cannot do that.
    const capped = selectGlossary(mirror, {}, corpus, 2);
    const retracted = selectGlossary(mirror, esOverrides, corpus, 2);

    expect(Object.keys(retracted).length).toBeLessThan(Object.keys(capped).length);
    expect(Object.keys(retracted).every((term) => term in capped)).toBe(true);
  });

  it('deletes from the raw-mirror fallback rather than leaving a null behind', () => {
    // The fallback both the translator config and the reviewer use when
    // effective/ has not been built. A plain spread would keep the key with a
    // null value and render `- Video → null` into the prompt.
    const fallback = applyOverrides(mirror, esOverrides);

    expect(fallback).toEqual({ Workflow: 'Flujo de trabajo' });
    expect('Video' in fallback).toBe(false);
  });
});

describe('a retraction at the enforcement boundary', () => {
  // These run the deterministic checker, so they fail if a retraction ever
  // reaches it as a requirement — the failure that would prune every field for
  // not rendering the literal `null`.
  const english = {
    title: 'Wan 2.2 Video to Video',
    description: 'Upload a video and queue the workflow to restyle it.',
  } as unknown as WorkflowContent;

  it('lets the unaccented spelling through', () => {
    const translated = {
      title: 'Wan 2.2 video a video',
      description: 'Sube un video y pon en cola el flujo de trabajo para reestilizarlo.',
    };

    expect(
      collectViolations('sid', 'es', english, translated, [], enforceableOverrides(esOverrides))
    ).toEqual([]);
  });

  it('lets the accented spelling through too, since neither is enforced', () => {
    const translated = {
      title: 'Wan 2.2 vídeo a vídeo',
      description: 'Sube un vídeo y pon en cola el flujo de trabajo para reestilizarlo.',
    };

    expect(
      collectViolations('sid', 'es', english, translated, [], enforceableOverrides(esOverrides))
    ).toEqual([]);
  });
});

describe('other locales', () => {
  it('keeps the Turkish curated terms enforceable', () => {
    // The only populated overrides file besides es. Retraction must not have
    // changed how a normal curated term is read.
    expect(enforceableOverrides(readOverrides('tr'))).toMatchObject({
      'Queue Prompt': 'İstemi Kuyruğa Al',
      'Contact Sheet': 'Kontak Baskı',
      Lineart: 'Çizgi Sanatı',
    });
  });

  it('leaves every other locale asserting nothing', () => {
    for (const locale of ['zh', 'zh-TW', 'ja', 'ko', 'fr', 'ru', 'ar', 'pt-BR']) {
      expect(readOverrides(locale)).toEqual({});
    }
  });
});
