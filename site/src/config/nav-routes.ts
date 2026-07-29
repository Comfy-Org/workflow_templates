/**
 * Marketing navbar routes — ported from the comfy.org frontend (ComfyUI_frontend
 * `apps/website/src/config/routes.ts`). These pages live on the main comfy.org
 * marketing site (a separate Framer/SPA deployment), NOT in this Astro repo, so
 * they are absolute URLs and intentionally NOT localized against this site's
 * locale prefix.
 */
const ORIGIN = 'https://comfy.org';

export const navRoutes = {
  home: `${ORIGIN}/`,
  download: `${ORIGIN}/download`,
  cloud: `${ORIGIN}/cloud`,
  cloudPricing: `${ORIGIN}/cloud/pricing`,
  cloudEnterprise: `${ORIGIN}/cloud/enterprise`,
  api: `${ORIGIN}/api`,
  gallery: `${ORIGIN}/gallery`,
  about: `${ORIGIN}/about`,
  careers: `${ORIGIN}/careers`,
  contact: `${ORIGIN}/contact`,
  customers: `${ORIGIN}/customers`,
  learning: `${ORIGIN}/learning`,
  affiliates: `${ORIGIN}/affiliates`,
  mcp: `${ORIGIN}/mcp`,
  launches: `${ORIGIN}/launches`,
  models: `${ORIGIN}/p/supported-models`,
} as const;

export const navExternalLinks = {
  blog: 'https://blog.comfy.org/',
  cloud: 'https://cloud.comfy.org',
  discord: 'https://discord.com/invite/comfyorg',
  docs: 'https://docs.comfy.org/',
  github: 'https://github.com/Comfy-Org/ComfyUI',
  workflows: `${ORIGIN}/workflows`,
  youtube: 'https://www.youtube.com/@ComfyOrg',
  reddit: 'https://www.reddit.com/r/comfyui/',
  x: 'https://x.com/ComfyUI',
  instagram: 'https://www.instagram.com/comfyui/',
} as const;

const MEDIA = 'https://media.comfy.org/website/nav';

/** Featured-card image + CTA target for each dropdown section. */
export const navFeatured = {
  products: {
    image: `${MEDIA}/mcp-card.webp`,
    cta: `${ORIGIN}/mcp`,
  },
  community: {
    image: `${MEDIA}/featured-demo-card.jpg`,
    cta: `${ORIGIN}/workflows/537cf7f1f745-537cf7f1f745/`,
  },
  company: {
    image: `${MEDIA}/customer-story-card.jpg`,
    cta: `${ORIGIN}/customers#hero-video`,
  },
} as const;
