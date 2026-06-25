/**
 * Provider logo resolution — maps a model/provider name to its logo asset.
 * Shared by HubWorkflowCard.vue and FeaturedCarousel.vue.
 */

const MODEL_TO_LOGO: Record<string, string> = {
  Grok: 'grok',
  OpenAI: 'openai',
  Stability: 'stability',
  'Stable Diffusion': 'stability',
  SDXL: 'stability',
  Wan: 'wan',
  Flux: 'bfl',
  Google: 'google',
  Runway: 'runway',
  Luma: 'luma',
  Kling: 'kling',
  Hunyuan: 'hunyuan',
  ByteDance: 'bytedance',
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
  PixVerse: 'pixverse',
  Bria: 'bria',
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Word-boundary matchers built once; `getLogoPath` runs per card per render.
const LOGO_MATCHERS: [RegExp, string][] = Object.entries(MODEL_TO_LOGO).map(([key, slug]) => [
  new RegExp(`(?:^|[^a-z0-9])${escapeRegex(key.toLowerCase())}(?:$|[^a-z0-9])`),
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

/** All distinct, logo-resolvable providers from `logos`, in order (deduped). */
export function providerLogos(
  logos?: { provider: string | string[] }[]
): { name: string; logoPath: string }[] {
  const names = (logos ?? []).flatMap((l) =>
    Array.isArray(l.provider) ? l.provider : [l.provider]
  );
  const seen = new Set<string>();
  const out: { name: string; logoPath: string }[] = [];
  for (const name of names) {
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const logoPath = getLogoPath(name);
    if (logoPath) out.push({ name, logoPath });
  }
  return out;
}
