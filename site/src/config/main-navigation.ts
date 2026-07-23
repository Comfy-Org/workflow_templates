import type { Locale } from '../i18n/config';
import { t } from '../i18n/ui';
import { navRoutes, navExternalLinks, navFeatured } from './nav-routes';

export type NavColumnItem = {
  label: string;
  href: string;
  badge?: 'new';
  external?: boolean;
};

export type NavColumn = {
  header: string;
  items: NavColumnItem[];
};

export type NavFeatured = {
  imageSrc: string;
  imageAlt?: string;
  title: string;
  cta: {
    label: string;
    ariaLabel?: string;
    href: string;
  };
};

export type NavItem =
  | { label: string; columns: NavColumn[]; featured?: NavFeatured; badge?: 'new'; href?: never }
  | { label: string; href: string; badge?: 'new'; columns?: never; featured?: never };

export function getMainNavigation(locale: Locale): NavItem[] {
  return [
    {
      label: t('nav.products', locale),
      badge: 'new',
      featured: {
        imageSrc: navFeatured.products.image,
        imageAlt: t('nav.featuredProductsAlt', locale),
        title: t('nav.featuredProductsTitle', locale),
        cta: {
          label: t('cta.getStarted', locale),
          ariaLabel: t('nav.featuredProductsCtaAria', locale),
          href: navFeatured.products.cta,
        },
      },
      columns: [
        {
          header: t('nav.products', locale),
          items: [
            { label: t('nav.comfyLocal', locale), href: navRoutes.download },
            { label: t('nav.comfyCloud', locale), href: navRoutes.cloud },
            { label: t('nav.comfyApi', locale), href: navRoutes.api, badge: 'new' },
            { label: t('nav.comfyEnterprise', locale), href: navRoutes.cloudEnterprise },
          ],
        },
        {
          header: t('nav.colFeatures', locale),
          items: [
            { label: t('nav.mcpServer', locale), href: navRoutes.mcp, badge: 'new' },
            { label: t('nav.launches', locale), href: navRoutes.launches, badge: 'new' },
            { label: t('nav.supportedModels', locale), href: navRoutes.models },
            { label: t('nav.docs', locale), href: navExternalLinks.docs, external: true },
          ],
        },
      ],
    },
    { label: t('nav.pricing', locale), href: navRoutes.cloudPricing },
    {
      label: t('nav.community', locale),
      badge: 'new',
      featured: {
        imageSrc: navFeatured.community.image,
        imageAlt: t('nav.featuredCommunityAlt', locale),
        title: t('nav.featuredCommunityTitle', locale),
        cta: {
          label: t('cta.watchDemo', locale),
          ariaLabel: t('nav.featuredCommunityCtaAria', locale),
          href: navFeatured.community.cta,
        },
      },
      columns: [
        {
          header: t('nav.colPrograms', locale),
          items: [
            { label: t('nav.comfyHub', locale), href: navExternalLinks.workflows },
            { label: t('nav.gallery', locale), href: navRoutes.gallery },
            { label: t('nav.affiliates', locale), href: navRoutes.affiliates, badge: 'new' },
            { label: t('nav.learning', locale), href: navRoutes.learning, badge: 'new' },
          ],
        },
        {
          header: t('nav.colConnect', locale),
          items: [
            { label: t('nav.discord', locale), href: navExternalLinks.discord, external: true },
            { label: t('nav.github', locale), href: navExternalLinks.github, external: true },
            { label: t('nav.youtube', locale), href: navExternalLinks.youtube, external: true },
            { label: t('nav.reddit', locale), href: navExternalLinks.reddit, external: true },
            { label: t('nav.x', locale), href: navExternalLinks.x, external: true },
            { label: t('nav.instagram', locale), href: navExternalLinks.instagram, external: true },
          ],
        },
      ],
    },
    {
      label: t('nav.company', locale),
      featured: {
        imageSrc: navFeatured.company.image,
        imageAlt: t('nav.featuredCompanyAlt', locale),
        title: t('nav.featuredCompanyTitle', locale),
        cta: {
          label: t('cta.watchNow', locale),
          ariaLabel: t('nav.featuredCompanyCtaAria', locale),
          href: navFeatured.company.cta,
        },
      },
      columns: [
        {
          header: t('nav.company', locale),
          items: [
            { label: t('nav.aboutUs', locale), href: navRoutes.about },
            { label: t('nav.careers', locale), href: navRoutes.careers },
            { label: t('nav.contact', locale), href: navRoutes.contact },
          ],
        },
        {
          header: t('nav.colMore', locale),
          items: [
            { label: t('nav.customerStories', locale), href: navRoutes.customers },
            { label: t('nav.blogs', locale), href: navExternalLinks.blog, external: true },
          ],
        },
      ],
    },
  ];
}
