/**
 * Model / provider → logo resolution. One map + one matcher, plus the
 * template-shaped helpers the hub card and SEO/landing surfaces consume.
 * Used by HubWorkflowCard.vue, FeaturedCarousel.vue, and the workflow-pages.
 */

const MODEL_TO_LOGO: Record<string, string> = {
  Grok: 'grok',
  OpenAI: 'openai',
  Stability: 'stability',
  'Stable Diffusion': 'stability',
  SDXL: 'stability',
  'SDXL-Inpainting': 'stability',
  'SD1.5': 'stability',
  'SD3.5': 'stability',
  SD3: 'stability',
  'Stable Audio': 'stability',
  Wan: 'wan',
  Flux: 'bfl',
  LTX: 'lightricks',
  LTXV: 'lightricks',
  Google: 'google',
  Gemini: 'google',
  'Nano Banana': 'google',
  Veo: 'google',
  'GPT-Image': 'openai',
  Runway: 'runway',
  Luma: 'luma',
  Kling: 'kling',
  Hunyuan: 'hunyuan',
  ByteDance: 'bytedance',
  Seedance: 'bytedance',
  Seedream: 'bytedance',
  HitPaw: 'hitpaw',
  Recraft: 'recraft',
  Topaz: 'topaz',
  Vidu: 'vidu',
  WaveSpeed: 'wavespeed',
  Mochi: 'mochi',
  Pika: 'pika',
  Sora: 'sora',
  Minimax: 'minimax',
  Lightricks: 'lightricks',
  Ideogram: 'ideogram',
  Magnific: 'magnific',
  Rodin: 'rodin',
  Tripo: 'tripo',
  TripoSplat: 'tripo',
  PixVerse: 'pixverse',
  Bria: 'bria',
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Key at a word start, followed only by a version (digit/dot/space) or end, so a
// family matches its variants ("wan2.2") but not a longer word ("swan", "waning").
const LOGO_MATCHERS: [RegExp, string][] = Object.entries(MODEL_TO_LOGO).map(([key, slug]) => [
  new RegExp(`(?:^|[^a-z0-9])${escapeRegex(key.toLowerCase())}(?![a-z])`),
  slug,
]);

/** Resolve a provider/model name to a logo path under `/logos/`, or null if unknown. */
export function getLogoPath(name: string): string | null {
  const normalized = name.trim();
  const slug = MODEL_TO_LOGO[normalized];
  if (slug) return `/logos/${slug}.png`;
  const lower = normalized.toLowerCase();
  for (const [pattern, val] of LOGO_MATCHERS) {
    if (pattern.test(lower)) return `/logos/${val}.png`;
  }
  return null;
}

/**
 * The primary provider name from a template's `logos`, or null when absent.
 * `provider` may be a single string or an array (multi-provider); we take the
 * first. Shared so every consumer unwraps it the same way.
 */
export function providerName(logos?: { provider: string | string[] }[]): string | null {
  const p = logos?.[0]?.provider;
  return Array.isArray(p) ? (p[0] ?? null) : (p ?? null);
}

/**
 * Distinct providers from `logos`, in order, deduped by resolved logo — so alias
 * pairs like "Google" + "Gemini" (same asset) yield a single badge, not two.
 */
export function providerLogos(
  logos?: { provider: string | string[] }[]
): { name: string; logoPath: string }[] {
  const names = (logos ?? []).flatMap((l) =>
    Array.isArray(l.provider) ? l.provider : [l.provider]
  );
  const seen = new Set<string>();
  const out: { name: string; logoPath: string }[] = [];
  for (const name of names) {
    if (!name) continue;
    const logoPath = getLogoPath(name);
    if (!logoPath || seen.has(logoPath)) continue;
    seen.add(logoPath);
    out.push({ name, logoPath });
  }
  return out;
}

/** A resolved badge: the logo asset plus the provider name for alt/title text. */
export interface ModelBadge {
  src: string;
  name: string;
}

/**
 * Distinct provider badges for a template, in order. Prefers the structured
 * `logos` (already deduped by `providerLogos`); falls back to the `models` list
 * via `getLogoPath`. Shared by the landing hero, About cards, and the
 * model/use-case index cards so every surface resolves badges the same way.
 */
export function resolveTemplateLogos(input: {
  models?: string[];
  logos?: { provider: string | string[] }[];
}): ModelBadge[] {
  if (input.logos?.length) {
    return providerLogos(input.logos).map((logo) => ({ src: logo.logoPath, name: logo.name }));
  }
  const out: ModelBadge[] = [];
  for (const model of input.models ?? []) {
    const src = getLogoPath(model);
    if (src && !out.some((badge) => badge.src === src)) out.push({ src, name: model });
  }
  return out;
}
