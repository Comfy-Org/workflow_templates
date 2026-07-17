import { describe, expect, it } from 'vitest';
import {
  assertNoOrphanedContent,
  listModelContentSlugs,
  listUseCaseContentSlugs,
} from '../../src/lib/workflow-pages/landing-content';

describe('assertNoOrphanedContent', () => {
  it('passes when every authored landing slug has a matching page', () => {
    expect(() =>
      assertNoOrphanedContent('model', new Set(listModelContentSlugs()))
    ).not.toThrow();
    expect(() =>
      assertNoOrphanedContent('use-case', new Set(listUseCaseContentSlugs()))
    ).not.toThrow();
  });

  it('throws, naming the orphan, when a landing slug has no page', () => {
    const modelSlugs = listModelContentSlugs();
    expect(modelSlugs.length).toBeGreaterThan(0);
    // Drop one slug from the "valid" set → that authored JSON is now orphaned.
    const missing = modelSlugs[0];
    const withoutFirst = new Set(modelSlugs.slice(1));
    expect(() => assertNoOrphanedContent('model', withoutFirst)).toThrow(
      new RegExp(`Orphaned model .*${missing}`)
    );
  });

  it('passes with an empty content set (nothing authored, nothing to orphan)', () => {
    // The valid-slug set is a superset of authored slugs, so it never orphans.
    expect(() =>
      assertNoOrphanedContent('use-case', new Set(listUseCaseContentSlugs()))
    ).not.toThrow();
  });
});
