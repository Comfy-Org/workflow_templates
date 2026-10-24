import { describe, expect, it } from 'vitest';
import { getVideoFrameUrl } from '../../src/lib/video-thumbnail';

describe('getVideoFrameUrl', () => {
  it('transforms engcomfy.com video URL to frame extraction URL', () => {
    const url =
      'https://comfy-hub-assets-test.engcomfy.com/uploads/356962cc-08c7-46d2-8fd0-611fc0ad6b4c.mp4';
    expect(getVideoFrameUrl(url)).toBe(
      'https://comfy-hub-assets-test.engcomfy.com/cdn-cgi/media/mode=frame,time=1s/uploads/356962cc-08c7-46d2-8fd0-611fc0ad6b4c.mp4'
    );
  });

  it('uses custom time offset', () => {
    const url = 'https://comfy-hub-assets.engcomfy.com/uploads/video.mp4';
    expect(getVideoFrameUrl(url, 3)).toBe(
      'https://comfy-hub-assets.engcomfy.com/cdn-cgi/media/mode=frame,time=3s/uploads/video.mp4'
    );
  });

  it('extracts a frame for the production hub asset host', () => {
    // The bug this fixes: the live hub serves its uploads from
    // comfy-hub-assets.comfy.org, which was not on the allowlist, so every
    // poster resolved to null and the carousel rendered bare <video> elements.
    const url =
      'https://comfy-hub-assets.comfy.org/uploads/306cccad-6557-40d5-9bea-db46db4ab789.mp4';
    expect(getVideoFrameUrl(url)).toBe(
      'https://comfy-hub-assets.comfy.org/cdn-cgi/media/mode=frame,time=1s/uploads/306cccad-6557-40d5-9bea-db46db4ab789.mp4'
    );
  });

  it('returns null for media.comfy.org, which answers frame URLs with 404', () => {
    // Same apex domain, different service: a blanket comfy.org rule would put a
    // broken poster on every marketing video.
    expect(getVideoFrameUrl('https://media.comfy.org/website/clip.mp4')).toBeNull();
  });

  it('matches hosts by suffix, not substring', () => {
    // `includes('engcomfy.com')` also accepted a lookalike domain.
    expect(getVideoFrameUrl('https://engcomfy.com.example.net/uploads/v.mp4')).toBeNull();
    expect(getVideoFrameUrl('https://notcomfy-hub-assets.comfy.org.evil.net/v.mp4')).toBeNull();
  });

  it('returns null for relative paths', () => {
    expect(getVideoFrameUrl('template-name-1.mp4')).toBeNull();
    expect(getVideoFrameUrl('/workflows/thumbnails/video.mp4')).toBeNull();
  });

  it('returns null for non-engcomfy.com domains', () => {
    expect(getVideoFrameUrl('https://example.com/video.mp4')).toBeNull();
    expect(getVideoFrameUrl('https://cdn.vercel.com/uploads/video.mp4')).toBeNull();
  });

  it('preserves nested paths', () => {
    const url = 'https://comfy-hub-assets.engcomfy.com/a/b/c/video.mp4';
    expect(getVideoFrameUrl(url)).toBe(
      'https://comfy-hub-assets.engcomfy.com/cdn-cgi/media/mode=frame,time=1s/a/b/c/video.mp4'
    );
  });

  it('handles URLs with query strings and hash fragments', () => {
    const url = 'https://comfy-hub-assets.engcomfy.com/uploads/video.mp4?token=abc#t=5';
    const result = getVideoFrameUrl(url);
    expect(result).toBe(
      'https://comfy-hub-assets.engcomfy.com/cdn-cgi/media/mode=frame,time=1s/uploads/video.mp4'
    );
  });

  it('handles zero time offset', () => {
    const url = 'https://comfy-hub-assets.engcomfy.com/uploads/video.mp4';
    expect(getVideoFrameUrl(url, 0)).toBe(
      'https://comfy-hub-assets.engcomfy.com/cdn-cgi/media/mode=frame,time=0s/uploads/video.mp4'
    );
  });

  it('handles production and test subdomains', () => {
    const test = getVideoFrameUrl('https://comfy-hub-assets-test.engcomfy.com/uploads/v.mp4');
    const prod = getVideoFrameUrl('https://comfy-hub-assets.engcomfy.com/uploads/v.mp4');
    expect(test).toContain('comfy-hub-assets-test.engcomfy.com');
    expect(prod).toContain('comfy-hub-assets.engcomfy.com');
    expect(test).toContain('cdn-cgi/media/mode=frame');
    expect(prod).toContain('cdn-cgi/media/mode=frame');
  });
});
