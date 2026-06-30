/**
 * Engine test: feeds `content-rules.ts` broken fixtures, asserts each rule fires.
 * (Shipped copy lives in seo-content-shipped.test.ts — that proves content passes,
 * this proves the gate still works.)
 */
import { describe, expect, it } from 'vitest';
import {
  validateSeoContent,
  shingleSimilarity,
  type QualityContext,
} from '../../src/lib/seo/content-rules';
import { titleCaseKeyword, type SeoContent } from '../../src/lib/seo/schema';

const ctx: QualityContext = {
  keywords: {
    primary: 'ai headshot generator',
    secondary: ['professional headshot', 'linkedin photo', 'studio lighting'],
  },
  wordCount: { min: 120, max: 1200 },
  clusterModels: ['flux', 'instantid'],
  siblingIntros: [],
};

/** A clean page that satisfies every rule, used as the baseline. */
function goodContent(): SeoContent {
  return {
    subheading: 'Professional headshots from one photo.',
    extendedDescription:
      'The ai headshot generator workflows turn a single selfie into a polished professional headshot. ' +
      'They give you control over studio lighting, background, and skin detail so the result still looks like you. ' +
      'Run them on Comfy Cloud with no install, or locally in ComfyUI for full control over every step. ' +
      'Each one is open, so you can re-run a pass, adjust the framing, and produce a consistent linkedin photo set for a whole team.',
    styles: [
      {
        title: 'Studio relighting',
        description: 'Apply soft studio lighting to a flat phone photo.',
      },
      { title: 'Skin detail', description: 'Sharpen facial detail while keeping natural texture.' },
    ],
    howToUse: [
      'Pick a portrait workflow from the collection.',
      'Open it on Comfy Cloud or in local ComfyUI.',
      'Upload a clear, front-facing photo.',
      'Adjust lighting and background, then run it.',
    ],
    suggestedUseCases: [
      'Professional headshot for a linkedin photo',
      'Consistent team directory photos in one style',
    ],
    metaDescription:
      'Create a professional headshot with free, open ComfyUI ai headshot generator workflows. Control lighting and skin detail, no setup, no per-photo fees today.',
    faqItems: [
      {
        question: 'How good is an ai headshot generator for LinkedIn?',
        answer:
          'The workflows preserve natural skin texture and let you control lighting. That makes results look like a studio headshot rather than an obvious AI render.',
      },
      {
        question: 'Are these workflows free?',
        answer:
          'Yes, the workflows are open and free to run locally. You can also run them on Comfy Cloud with no setup required.',
      },
      {
        question: 'What photo should I upload?',
        answer:
          'Use a clear, front-facing photo with even lighting. Higher resolution gives the enhancement steps more detail to work with.',
      },
      {
        question: 'Can I make a matching set for my team?',
        answer:
          'Yes, run the same workflow with consistent settings for each person. That produces a cohesive set for a company directory.',
      },
      {
        question: 'Why does identity preservation matter?',
        answer:
          'It keeps your real features intact so the headshot still looks like you. Without it, AI portraits drift into a generic face.',
      },
      {
        question: 'Do I need a powerful GPU?',
        answer:
          'You can run locally if you have a capable GPU, but Comfy Cloud removes that requirement. It runs the same workflow in the browser.',
      },
    ],
  };
}

describe('validateSeoContent — good content passes', () => {
  it('returns ok with no failures', () => {
    const result = validateSeoContent(goodContent(), ctx);
    expect(result.failures).toEqual([]);
    expect(result.ok).toBe(true);
  });
});

describe('validateSeoContent — each rule fires', () => {
  it('flags an absent primary keyword', () => {
    const content = goodContent();
    content.extendedDescription = content.extendedDescription.replaceAll(
      'ai headshot generator',
      'this tool'
    );
    content.faqItems[0].question = 'How good is this tool for LinkedIn?';
    const codes = validateSeoContent(content, ctx).failures.map((f) => f.code);
    expect(codes).toContain('keyword-absent');
  });

  it('flags keyword stuffing', () => {
    const content = goodContent();
    content.extendedDescription = Array(40).fill('ai headshot generator').join(' ');
    const codes = validateSeoContent(content, ctx).failures.map((f) => f.code);
    expect(codes).toContain('keyword-stuffed');
  });

  it('flags too few FAQ items', () => {
    const content = goodContent();
    content.faqItems = content.faqItems.slice(0, 3);
    const codes = validateSeoContent(content, ctx).failures.map((f) => f.code);
    expect(codes).toContain('faq-count');
  });

  it('flags a non-question FAQ and a thin answer', () => {
    const content = goodContent();
    content.faqItems[0] = { question: 'LinkedIn headshots.', answer: 'Yes.' };
    const codes = validateSeoContent(content, ctx).failures.map((f) => f.code);
    expect(codes).toContain('faq-not-question');
    expect(codes).toContain('faq-thin-answer');
  });

  it('flags banned filler phrases', () => {
    const content = goodContent();
    content.extendedDescription += ' This is a seamless, game-changing experience.';
    const codes = validateSeoContent(content, ctx).failures.map((f) => f.code);
    expect(codes).toContain('banned-phrase');
  });

  it('flags em-dash overuse', () => {
    const content = goodContent();
    content.extendedDescription += ' One — two — three — four — five.';
    const codes = validateSeoContent(content, ctx).failures.map((f) => f.code);
    expect(codes).toContain('em-dash-overuse');
  });

  it('flags a near-duplicate sibling intro', () => {
    const content = goodContent();
    const codes = validateSeoContent(content, {
      ...ctx,
      siblingIntros: [content.extendedDescription],
    }).failures.map((f) => f.code);
    expect(codes).toContain('duplicate-skeleton');
  });

  it('flags low word count against the band', () => {
    const content = goodContent();
    const codes = validateSeoContent(content, {
      ...ctx,
      wordCount: { min: 5000, max: 9000 },
    }).failures.map((f) => f.code);
    expect(codes).toContain('word-count-low');
  });

  it('allows healthy depth above the tier target but flags genuinely excessive length', () => {
    const content = goodContent();
    // Body sits comfortably above a low max — not flagged (depth is fine).
    const okCodes = validateSeoContent(content, {
      ...ctx,
      wordCount: { min: 120, max: 260 },
    }).failures.map((f) => f.code);
    expect(okCodes).not.toContain('word-count-excessive');

    // Same body against a tiny max so it exceeds 1.6x — flagged as excessive.
    const tooLongCodes = validateSeoContent(content, {
      ...ctx,
      wordCount: { min: 120, max: 150 },
    }).failures.map((f) => f.code);
    expect(tooLongCodes).toContain('word-count-excessive');
  });

  it('flags weak secondary-keyword coverage', () => {
    const removeTwoOfThreeKeywords = (text: string) =>
      text
        .replaceAll('studio lighting', 'soft light')
        .replaceAll('linkedin photo', 'profile picture');

    const content = goodContent();
    content.extendedDescription = removeTwoOfThreeKeywords(content.extendedDescription);
    content.styles = content.styles!.map((style) => ({
      ...style,
      description: removeTwoOfThreeKeywords(style.description),
    }));
    content.suggestedUseCases = (content.suggestedUseCases ?? []).map(removeTwoOfThreeKeywords);

    const codes = validateSeoContent(content, ctx).failures.map((f) => f.code);
    expect(codes).toContain('secondary-coverage');
  });
});

describe('shingleSimilarity', () => {
  it('is 1 for identical text and 0 for disjoint text', () => {
    const a = 'the quick brown fox jumps over the lazy dog every morning';
    expect(shingleSimilarity(a, a)).toBeCloseTo(1, 5);
    expect(
      shingleSimilarity(a, 'completely different words here with nothing shared at all today')
    ).toBe(0);
  });
});

describe('titleCaseKeyword', () => {
  it('title-cases words and uppercases the AI initialism', () => {
    expect(titleCaseKeyword('ai headshot generator')).toBe('AI Headshot Generator');
    expect(titleCaseKeyword('restore old photos')).toBe('Restore Old Photos');
  });
});
