/**
 * Sitewide `@graph` nodes (WebSite, Organization, ComfyUI SoftwareApplication)
 * shared by every workflow page that uses `buildWorkflowGraphJsonLd`. Values are
 * verbatim from the client-provided schema recommendation, not derived.
 */
import { SITE_ORIGIN } from '../config/site';

export const WEBSITE_ID = `${SITE_ORIGIN}/#website`;
export const ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`;
export const COMFYUI_ID = `${SITE_ORIGIN}/#comfyui`;

/** WebSite, Organization, and ComfyUI SoftwareApplication nodes, in that order. */
export function buildSiteEntityNodes(): Record<string, unknown>[] {
  return [
    {
      '@type': 'WebSite',
      '@id': WEBSITE_ID,
      name: 'Comfy',
      url: SITE_ORIGIN,
      publisher: { '@id': ORGANIZATION_ID },
      hasPart: [{ '@type': 'Blog', name: 'Comfy Blog', url: 'https://blog.comfy.org' }],
    },
    {
      '@type': 'Organization',
      '@id': ORGANIZATION_ID,
      name: 'Comfy Org',
      url: SITE_ORIGIN,
      logo: `${SITE_ORIGIN}/favicon-96x96.png`,
      sameAs: [
        'https://github.com/Comfy-Org',
        'https://discord.gg/comfyorg',
        'https://x.com/ComfyUI',
        'https://www.linkedin.com/company/comfyui',
        'https://www.instagram.com/comfyui',
        'https://www.youtube.com/@comfyorg',
      ],
      contactPoint: [
        {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: 'hello@comfy.org',
          url: 'https://support.comfy.org/',
        },
        { '@type': 'ContactPoint', contactType: 'press', email: 'press@comfy.org' },
      ],
    },
    {
      '@type': 'SoftwareApplication',
      '@id': COMFYUI_ID,
      name: 'ComfyUI',
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Windows, macOS, Linux',
      sameAs: [
        'https://en.wikipedia.org/wiki/ComfyUI',
        'https://github.com/Comfy-Org/ComfyUI',
        SITE_ORIGIN,
      ],
      softwareHelp: {
        '@type': 'CreativeWork',
        name: 'ComfyUI Docs',
        url: 'https://docs.comfy.org',
      },
    },
  ];
}
