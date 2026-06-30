/**
 * Data test: runs every shipped use-case + model JSON through the quality +
 * brand-safety contract, so a bad hand edit fails CI before it can be indexed.
 * (Engine test is seo-content-rules.test.ts.) Articles come from the shared
 * loadSeoArticles loader, so this and scripts/validate-seo-content.ts agree.
 */
import { describe, expect, it } from 'vitest';
import { validateSeoContent } from '../../src/lib/seo/content-rules';
import { checkBrandSafety } from '../../src/lib/seo/governance';
import { loadSeoArticles } from '../../src/lib/seo/load-articles';

const articles = loadSeoArticles();

/**
 * The "Only on Comfy Cloud" reason row is a fixed editorial block: every page's
 * Why-ComfyUI section carries exactly one `cloudOnly` row, and its title is always
 * this literal string (only the description varies per page). Codified so a future
 * edit cannot rename or drop it.
 */
const CLOUD_ONLY_TITLE = 'Pick your variant and settings';

describe('shipped SEO content', () => {
  it('has articles to validate', () => {
    expect(articles.length).toBeGreaterThan(0);
  });

  // No "free" cost claim may ship: Comfy Cloud is paid, so it is inaccurate copy.
  it.each(articles)('$label makes no "free" cost claim', ({ content }) => {
    expect(JSON.stringify(content).toLowerCase()).not.toContain('free');
  });

  it.each(articles)('$label passes the quality contract', ({ content, ctx }) => {
    const result = validateSeoContent(content, ctx);
    expect(result.failures).toEqual([]);
  });

  it.each(articles)('$label is brand-safe', ({ safety }) => {
    const hits = [safety.slug, safety.primaryKeyword, safety.title].flatMap(checkBrandSafety);
    expect(hits).toEqual([]);
  });

  // Every page renders the authored Why-ComfyUI section, with exactly one
  // "Only on Comfy Cloud" row carrying the fixed title.
  it.each(articles)('$label has an authored whyComfy section', ({ content }) => {
    expect(content.whyComfy?.length, 'whyComfy must be authored, not left to the fallback').toBeTruthy();
  });

  it.each(articles)(`$label has one cloudOnly row titled "${CLOUD_ONLY_TITLE}"`, ({ content }) => {
    const cloudRows = (content.whyComfy ?? []).filter((row) => row.cloudOnly);
    expect(cloudRows).toHaveLength(1);
    expect(cloudRows[0]?.title).toBe(CLOUD_ONLY_TITLE);
  });
});
