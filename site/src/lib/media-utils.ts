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

/**
 * Asset IDs of the shared "no preview uploaded yet" placeholder clip the hub
 * serves as a workflow's video thumbnail until a real preview exists.
 *
 * The same file is embedded as a `<video>` on hundreds of workflow pages, so
 * Google cannot pick a canonical watch page for it and flags every one of those
 * pages with "Video isn't on a watch page". While the real preview is still
 * missing we render its poster frame instead of a `<video>` and opt the page out
 * of video indexing; a real preview classifies as a normal video and is
 * unaffected.
 */
const PLACEHOLDER_VIDEO_IDS = new Set(['850ff161-2547-4fce-a9c3-7835eeeedcce']);

/** Whether a thumbnail URL/filename is the hub's shared placeholder video. */
export function isPlaceholderVideo(url: string | null | undefined): boolean {
  if (!url) return false;
  const file = normalizeForExtCheck(url).split('/').pop() ?? '';
  const dot = file.lastIndexOf('.');
  const id = dot > 0 ? file.slice(0, dot) : file;
  return PLACEHOLDER_VIDEO_IDS.has(id);
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

/** Lead-aware visual for a template list: when the lead template (a curated
 *  page's pinned app) has no still at all, its video thumbnail represents the
 *  list rather than yielding the visual to a later template's still. */
export function firstVisualAcross(templates: { thumbnails?: string[] }[]): string | null {
  const lead = templates[0];
  if (lead && !hasStillThumbnail(lead.thumbnails)) {
    const video = lead.thumbnails?.find((thumb) => isVideoFile(thumb));
    if (video) return video;
  }
  return firstStillAcross(templates);
}

/** First template with a usable still thumbnail. */
export function firstTemplateWithStill<T extends { thumbnails?: string[] }>(
  templates: T[]
): T | undefined {
  return templates.find((template) => hasStillThumbnail(template.thumbnails));
}

/** The hero template a page renders and reserves: a curated page's video-only
 *  lead (Hub app thumbnails are often video-only) fronts its own page; otherwise
 *  the first template with a still. Shared by LandingHero and the pages' rail
 *  reservation so the reserved hero can't diverge from what actually renders. */
export function heroTemplateFor<T extends { thumbnails?: string[] }>(
  templates: T[]
): T | undefined {
  const lead = templates[0];
  if (lead && !hasStillThumbnail(lead.thumbnails) && lead.thumbnails?.some((thumb) => isVideoFile(thumb))) {
    return lead;
  }
  return firstTemplateWithStill(templates);
}
