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
