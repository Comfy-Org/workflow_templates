import { describe, expect, it } from 'vitest';
import { heroTemplateFor, isAudioFile, isMediaFile, isVideoFile } from '../../src/lib/media-utils';

describe('isVideoFile', () => {
  it.for([
    ['clip.mp4', true],
    ['clip.mov', true],
    ['CLIP.MP4', true],
    ['Clip.Mov', true],
    ['https://cdn.example.com/clip.mp4?token=abc', true],
    ['https://cdn.example.com/clip.mp4#t=5', true],
    ['https://cdn.example.com/clip.mp4?x=1#t=5', true],
    ['https://cdn.example.com/image.webp?fallback=clip.mp4', false],
    ['thumb.webp', false],
    ['song.mp3', false],
  ] as [string, boolean][])('isVideoFile(%s) → %s', ([filename, expected]) => {
    expect(isVideoFile(filename)).toBe(expected);
  });
});

describe('isAudioFile', () => {
  it.for([
    ['song.mp3', true],
    ['song.webm', true],
    ['SONG.MP3', true],
    ['https://cdn.example.com/song.mp3?token=abc', true],
  ] as [string, boolean][])('isAudioFile(%s) → %s', ([filename, expected]) => {
    expect(isAudioFile(filename)).toBe(expected);
  });
});

describe('isMediaFile', () => {
  it.for([
    ['clip.mp4', true],
    ['song.mp3', true],
    ['thumb.webp', false],
    ['thumb.png', false],
  ] as [string, boolean][])('isMediaFile(%s) → %s', ([filename, expected]) => {
    expect(isMediaFile(filename)).toBe(expected);
  });
});

describe('heroTemplateFor', () => {
  it('returns a video-only lead so it fronts its own page', () => {
    const lead = { name: 'app', thumbnails: ['demo.mp4'] };
    const still = { name: 'still', thumbnails: ['thumb.webp'] };
    expect(heroTemplateFor([lead, still])).toBe(lead);
  });

  it('returns the lead when it already has a still', () => {
    const lead = { name: 'lead', thumbnails: ['thumb.webp'] };
    const other = { name: 'other', thumbnails: ['thumb2.webp'] };
    expect(heroTemplateFor([lead, other])).toBe(lead);
  });

  it('falls back to the first template with a still when the lead has neither', () => {
    const lead = { name: 'nomedia', thumbnails: [] };
    const still = { name: 'still', thumbnails: ['thumb.webp'] };
    expect(heroTemplateFor([lead, still])).toBe(still);
  });

  it('returns undefined for an empty list', () => {
    expect(heroTemplateFor([])).toBeUndefined();
  });
});
