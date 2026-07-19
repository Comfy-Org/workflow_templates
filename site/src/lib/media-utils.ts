const VIDEO_EXTENSIONS = ['.mp4', '.mov'];
const AUDIO_EXTENSIONS = ['.mp3', '.webm'];

// Strip query (?token=...) and hash (#t=5), then lowercase, so signed URLs
// and uppercased filenames classify correctly by extension.
function normalizeForExtCheck(filename: string): string {
  const queryIndex = filename.indexOf('?');
  const hashIndex = filename.indexOf('#');
  const cut = [queryIndex, hashIndex].filter((i) => i >= 0).sort((a, b) => a - b)[0];
  const base = cut === undefined ? filename : filename.slice(0, cut);
  return base.toLowerCase();
}

export function isVideoFile(filename: string): boolean {
  const f = normalizeForExtCheck(filename);
  return VIDEO_EXTENSIONS.some((ext) => f.endsWith(ext));
}

export function isAudioFile(filename: string): boolean {
  const f = normalizeForExtCheck(filename);
  return AUDIO_EXTENSIONS.some((ext) => f.endsWith(ext));
}

export function isMediaFile(filename: string): boolean {
  return isVideoFile(filename) || isAudioFile(filename);
}

/** First still (non-video/-audio) thumbnail, so a card never renders a video src. */
export function firstStillThumbnail(thumbnails?: string[]): string | null {
  return thumbnails?.find((thumb) => !isMediaFile(thumb)) ?? null;
}

/** Whether any thumbnail is a still image (usable as a card visual). */
export function hasStillThumbnail(thumbnails?: string[]): boolean {
  return thumbnails?.some((thumb) => !isMediaFile(thumb)) ?? false;
}

/**
 * First still thumbnail across a list of templates, in order — so a card falls
 * back to a later template's still when the lead template is video-only.
 */
export function firstStillAcross(templates: { thumbnails?: string[] }[]): string | null {
  for (const template of templates) {
    const still = firstStillThumbnail(template.thumbnails);
    if (still) return still;
  }
  return null;
}

/** First template with a usable still thumbnail — the shared hero pick, so a page's
 *  reserved-hero exclusion can't diverge from what LandingHero actually renders. */
export function firstTemplateWithStill<T extends { thumbnails?: string[] }>(
  templates: T[]
): T | undefined {
  return templates.find((template) => hasStillThumbnail(template.thumbnails));
}

/**
 * Hero pick that honors an optional pinned template name: a SEO page can force
 * a specific workflow as its featured hero, overriding the usage-sorted default.
 * Falls back to `firstTemplateWithStill` when the preferred name is absent from
 * the grid or has no still thumbnail yet, so a preference never leaves the
 * page heroless.
 */
export function pickHeroTemplate<T extends { name?: string; thumbnails?: string[] }>(
  templates: T[],
  preferredName?: string
): T | undefined {
  if (preferredName) {
    const preferred = templates.find(
      (template) => template.name === preferredName && hasStillThumbnail(template.thumbnails)
    );
    if (preferred) return preferred;
  }
  return firstTemplateWithStill(templates);
}
