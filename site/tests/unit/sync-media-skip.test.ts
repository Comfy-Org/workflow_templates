import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import {
  isLocalMediaCopySkipped,
  copyDetailImages,
  DETAIL_IMAGES_DIR,
} from '../../scripts/lib/filesystem';

describe('isLocalMediaCopySkipped', () => {
  it('keeps the copy when no hub API is configured (dev, CI, e2e)', () => {
    expect(isLocalMediaCopySkipped({})).toBe(false);
    expect(isLocalMediaCopySkipped({ PUBLIC_HUB_API_URL: '' })).toBe(false);
    expect(isLocalMediaCopySkipped({ PUBLIC_HUB_API_URL: '  ' })).toBe(false);
  });

  it('skips the copy for hub-backed builds (production, preview, cron)', () => {
    expect(isLocalMediaCopySkipped({ PUBLIC_HUB_API_URL: 'https://hub.example.com' })).toBe(true);
  });

  it('lets SYNC_LOCAL_MEDIA=true force the copy', () => {
    expect(
      isLocalMediaCopySkipped({
        PUBLIC_HUB_API_URL: 'https://hub.example.com',
        SYNC_LOCAL_MEDIA: 'true',
      })
    ).toBe(false);
  });
});

describe('copyDetailImages when the copy is skipped', () => {
  it('returns no detail images and writes nothing', () => {
    const previous = process.env.PUBLIC_HUB_API_URL;
    const existedBefore = fs.existsSync(DETAIL_IMAGES_DIR);
    process.env.PUBLIC_HUB_API_URL = 'https://hub.example.com';
    try {
      expect(copyDetailImages(['input/does-not-exist.png'])).toEqual([]);
      expect(fs.existsSync(DETAIL_IMAGES_DIR)).toBe(existedBefore);
    } finally {
      if (previous === undefined) delete process.env.PUBLIC_HUB_API_URL;
      else process.env.PUBLIC_HUB_API_URL = previous;
    }
  });
});
