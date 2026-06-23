export interface SocialLink {
  label: string;
  url: string;
}

const PLATFORMS: { match: string[]; label: string }[] = [
  { match: ['x.com', 'twitter.com'], label: 'X' },
  { match: ['instagram.com'], label: 'Instagram' },
  { match: ['youtube.com', 'youtu.be'], label: 'YouTube' },
  { match: ['tiktok.com'], label: 'TikTok' },
  { match: ['linkedin.com'], label: 'LinkedIn' },
  { match: ['github.com'], label: 'GitHub' },
  { match: ['facebook.com'], label: 'Facebook' },
  { match: ['threads.net', 'threads.com'], label: 'Threads' },
];

/** Resolve a creator's social URL to a display label, defaulting to "Website". */
export function getSocialDisplay(social: string): SocialLink {
  const url = /^https?:\/\//.test(social) ? social : `https://${social}`;
  const platform = PLATFORMS.find((p) => p.match.some((host) => social.includes(host)));
  return { label: platform?.label ?? 'Website', url };
}
