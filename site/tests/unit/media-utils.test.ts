import { describe, expect, it } from 'vitest';
import { isAudioFile, isMediaFile, isVideoFile } from '../../src/lib/media-utils';

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
