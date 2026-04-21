import { describe, expect, it } from 'vitest';
import { isAudioFile, isMediaFile, isVideoFile } from '../../src/lib/media-utils';

describe('isVideoFile', () => {
  it('detects .mp4 and .mov', () => {
    expect(isVideoFile('clip.mp4')).toBe(true);
    expect(isVideoFile('clip.mov')).toBe(true);
  });

  it('ignores extension case', () => {
    expect(isVideoFile('CLIP.MP4')).toBe(true);
    expect(isVideoFile('Clip.Mov')).toBe(true);
  });

  it('ignores query strings and hash fragments on signed URLs', () => {
    expect(isVideoFile('https://cdn.example.com/clip.mp4?token=abc')).toBe(true);
    expect(isVideoFile('https://cdn.example.com/clip.mp4#t=5')).toBe(true);
    expect(isVideoFile('https://cdn.example.com/clip.mp4?x=1#t=5')).toBe(true);
  });

  it('does not match when the extension only appears in the query string', () => {
    expect(isVideoFile('https://cdn.example.com/image.webp?fallback=clip.mp4')).toBe(false);
  });

  it('returns false for non-video files', () => {
    expect(isVideoFile('thumb.webp')).toBe(false);
    expect(isVideoFile('song.mp3')).toBe(false);
  });
});

describe('isAudioFile', () => {
  it('detects .mp3 and .webm', () => {
    expect(isAudioFile('song.mp3')).toBe(true);
    expect(isAudioFile('song.webm')).toBe(true);
  });

  it('ignores case and query strings', () => {
    expect(isAudioFile('SONG.MP3')).toBe(true);
    expect(isAudioFile('https://cdn.example.com/song.mp3?token=abc')).toBe(true);
  });
});

describe('isMediaFile', () => {
  it('returns true for video or audio', () => {
    expect(isMediaFile('clip.mp4')).toBe(true);
    expect(isMediaFile('song.mp3')).toBe(true);
  });

  it('returns false for images', () => {
    expect(isMediaFile('thumb.webp')).toBe(false);
    expect(isMediaFile('thumb.png')).toBe(false);
  });
});
