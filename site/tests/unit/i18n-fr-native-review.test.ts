/**
 * The French native review, encoded so the correction cannot silently regress.
 *
 * Unlike Turkish, this one IS applicable as a content override: the reviewer
 * covered all five elements of one field, so the array can be rebuilt whole,
 * which is what an override has to supply. The field is currently absent from
 * the French machine layer (pruned for the finding below) and renders English.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { collectViolations } from '../../scripts/i18n/validate-translations';
import type { WorkflowContent } from '../../src/lib/i18n/schema';

const SHARE_ID = '4f8b62bfd681'; // ACE Step v1 M2M Editing, a music workflow

const overrides = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'src', 'i18n', 'overrides', 'fr.json'), 'utf-8')
) as Record<string, Partial<WorkflowContent>>;

const english = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'src', 'i18n', 'content', 'en.json'), 'utf-8')
) as Record<string, WorkflowContent>;

describe('French override for the ACE Step use cases', () => {
  it('replaces the whole field, which is what the resolver serves', () => {
    // A partial array would render a French list with English holes.
    const cases = overrides[SHARE_ID]?.suggestedUseCases;
    expect(cases).toHaveLength(english[SHARE_ID].suggestedUseCases.length);
  });

  it('is about music, not 3D', () => {
    // The finding: the machine layer had pasted 3D-modelling copy into a music
    // workflow's use cases. Every element the reviewer approved is on-topic.
    const cases = overrides[SHARE_ID]!.suggestedUseCases as string[];
    expect(cases.some((c) => /3D|modélisation/i.test(c))).toBe(false);
    expect(cases.filter((c) => /musi|chanson|morceaux|pistes|jazz/i.test(c))).toHaveLength(
      cases.length
    );
  });

  it('passes the validator against its English source', () => {
    const violations = collectViolations(
      SHARE_ID,
      'fr',
      english[SHARE_ID],
      { suggestedUseCases: overrides[SHARE_ID]!.suggestedUseCases },
      [],
      {}
    );

    expect(violations).toEqual([]);
  });
});
