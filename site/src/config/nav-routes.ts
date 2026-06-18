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
  customers: `${ORIGIN}/customers`,
  learning: `${ORIGIN}/learning`,
} as const;

export const navExternalLinks = {
  blog: 'https://blog.comfy.org/',
  cloud: 'https://cloud.comfy.org',
  discord: 'https://discord.com/invite/comfyorg',
  docs: 'https://docs.comfy.org/',
  github: 'https://github.com/Comfy-Org/ComfyUI',
  workflows: `${ORIGIN}/workflows`,
  youtube: 'https://www.youtube.com/@ComfyOrg',
} as const;
