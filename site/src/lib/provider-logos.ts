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

/** Resolve a provider/model name to a logo path under `/logos/`, or null if unknown. */
export function getLogoPath(name: string): string | null {
  const slug = MODEL_TO_LOGO[name];
  if (slug) return `/logos/${slug}.png`;
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(MODEL_TO_LOGO)) {
    if (lower.includes(key.toLowerCase())) return `/logos/${val}.png`;
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
