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
  const trimmed = social.trim();
  const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let hostname = '';
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return { label: 'Website', url };
  }

  const platform = PLATFORMS.find((p) =>
    p.match.some((host) => hostname === host || hostname.endsWith(`.${host}`))
  );
  return { label: platform?.label ?? 'Website', url };
}
