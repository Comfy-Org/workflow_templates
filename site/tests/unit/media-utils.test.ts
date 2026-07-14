import { describe, expect, it } from 'vitest';
import { isAudioFile, isMediaFile, isVideoFile, pickHeroTemplate } from '../../src/lib/media-utils';

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

describe('pickHeroTemplate', () => {
  const stillA = { name: 'a', thumbnails: ['a.webp'] };
  const videoOnly = { name: 'v', thumbnails: ['v.mp4'] };
  const stillB = { name: 'b', thumbnails: ['b.png'] };
  const noThumbs = { name: 'n' };

  it('returns the first template with a still thumbnail when no preference is set', () => {
    expect(pickHeroTemplate([videoOnly, stillA, stillB])).toBe(stillA);
  });

  it('honors preferredName when the named template has a still thumbnail', () => {
    expect(pickHeroTemplate([videoOnly, stillA, stillB], 'b')).toBe(stillB);
  });

  it('falls back to the auto-pick when preferredName is unknown', () => {
    expect(pickHeroTemplate([videoOnly, stillA, stillB], 'ghost')).toBe(stillA);
  });

  it('falls back to the auto-pick when the preferred template lacks a still thumbnail', () => {
    expect(pickHeroTemplate([videoOnly, stillA], 'v')).toBe(stillA);
  });

  it('falls back to the auto-pick when the preferred template has no thumbnails at all', () => {
    expect(pickHeroTemplate([noThumbs, stillA], 'n')).toBe(stillA);
  });

  it('returns undefined when no template has a still thumbnail', () => {
    expect(pickHeroTemplate([videoOnly, noThumbs], 'v')).toBeUndefined();
  });

  it('returns undefined for an empty grid', () => {
    expect(pickHeroTemplate([], 'anything')).toBeUndefined();
  });
});
