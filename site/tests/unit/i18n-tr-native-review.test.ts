/**
 * The Turkish native review, encoded so it keeps applying.
 *
 * The reviewer's corrections cannot be applied as content patches: every field
 * they reviewed carried a critical or major finding, so `enforce` had already
 * pruned it and the text they corrected is not in the repo. What survives a
 * retranslation is the glossary, which is injected into the prompt and enforced
 * by the validator, so that is where their verdicts belong.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { PRESERVE_TERMS } from '../../scripts/i18n/sync-glossary';
import { collectViolations } from '../../scripts/i18n/validate-translations';
import type { WorkflowContent } from '../../src/lib/i18n/schema';

const trOverrides = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'i18n', 'glossary', 'overrides', 'tr.json'), 'utf-8')
) as Record<string, string>;

describe('Turkish curated glossary', () => {
  it('carries the terms the reviewer approved', () => {
    // "Queue Prompt" is a ComfyUI button label: the hub has to name it the way
    // the app does or the step cannot be followed. "Contact Sheet" is the
    // photography term, mistranslated as "İletişim Tablosu" (communication
    // table). "Lineart" had become "Çizgi Film", which means cartoon.
    expect(trOverrides).toMatchObject({
      'Queue Prompt': 'İstemi Kuyruğa Al',
      'Contact Sheet': 'Kontak Baskı',
      Lineart: 'Çizgi Sanatı',
    });
  });

  it('makes the validator reject the wording the reviewer rejected', () => {
    const english = { title: 'Video to Lineart / Canny' } as unknown as WorkflowContent;
    const rejected = { title: 'Videodan Çizgi Filme / Canny' };

    const violations = collectViolations('sid', 'tr', english, rejected, [], trOverrides);

    expect(violations.map((v) => v.kind)).toContain('glossary');
    expect(violations[0].detail).toContain('Çizgi Sanatı');
  });

  it('accepts the reviewer wording', () => {
    const english = { title: 'Video to Lineart / Canny' } as unknown as WorkflowContent;
    const accepted = { title: 'Videodan Çizgi Sanatına / Canny' };

    expect(collectViolations('sid', 'tr', english, accepted, [], trOverrides)).toEqual([]);
  });
});

describe('task-type acronyms', () => {
  // A Turkish reviewer found "t2i" rendered as "m2g" (an abbreviation of the
  // translated phrase). 'T2I' was listed but matching is case-sensitive, and the
  // titles use lowercase, so nothing shielded it. Its siblings were unlisted in
  // every casing.
  it.each(['t2i', 'i2v', 't2v', 'v2v', 'flf2v'])('protects %s exactly as written', (acronym) => {
    expect(PRESERVE_TERMS).toContain(acronym);
  });

  it('keeps the uppercase form too, since both appear in workflow names', () => {
    expect(PRESERVE_TERMS).toContain('T2I');
  });
});
