/**
 * Local CLI quality gate over authored SEO-page content. Runs every use-case
 * and model article through the same `validateSeoContent` + `checkBrandSafety`
 * contract the CI test uses (both share `loadSeoArticles`), and prints a
 * per-article PASS/FAIL report with metrics so hand-edited copy can be eyeballed
 * before pushing.
 *
 *   pnpm exec tsx scripts/validate-seo-content.ts
 *
 * Exit 1 if any article fails, so it can also gate CI if wired in.
 */
import { validateSeoContent } from '../src/lib/seo/content-rules';
import { checkBrandSafety } from '../src/lib/seo/governance';
import { loadSeoArticles } from '../src/lib/seo/load-articles';

function main(): void {
  const articles = loadSeoArticles();
  let failed = 0;

  console.log(`Running quality contract over ${articles.length} SEO articles\n`);

  for (const article of articles) {
    const result = validateSeoContent(article.content, article.ctx);
    const brandHits = [
      ...new Set(
        [article.safety.slug, article.safety.primaryKeyword, article.safety.title].flatMap(
          checkBrandSafety
        )
      ),
    ];
    const { metrics } = result;
    const ok = result.ok && brandHits.length === 0;

    const status = ok ? '✓ PASS' : '✗ FAIL';
    console.log(
      `${status}  ${article.label}  ` +
        `[${metrics.bodyWordCount}w, kw×${metrics.primaryKeywordCount}, ` +
        `faq ${metrics.faqCount}, sim ${(metrics.maxSiblingSimilarity * 100).toFixed(0)}%]`
    );

    if (!ok) {
      failed++;
      for (const f of result.failures) console.log(`        - [${f.code}] ${f.message}`);
      if (brandHits.length)
        console.log(`        - [brand-safety] denied term(s): ${brandHits.join(', ')}`);
    }
  }

  console.log(`\n${articles.length - failed}/${articles.length} passed.`);
  if (failed > 0) process.exit(1);
}

main();
