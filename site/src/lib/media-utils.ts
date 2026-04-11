const VIDEO_EXTENSIONS = ['.mp4', '.mov'];
const AUDIO_EXTENSIONS = ['.mp3', '.webm'];

export function isVideoFile(filename: string): boolean {
  return VIDEO_EXTENSIONS.some((ext) => filename.endsWith(ext));
}

export function isAudioFile(filename: string): boolean {
  return AUDIO_EXTENSIONS.some((ext) => filename.endsWith(ext));
}

export function isMediaFile(filename: string): boolean {
  return isVideoFile(filename) || isAudioFile(filename);
}
