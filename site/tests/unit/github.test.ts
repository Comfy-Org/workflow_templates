import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchGitHubStars, formatStarCount } from '../../src/lib/github';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function jsonResponse(body: unknown): Response {
  return { ok: true, json: async () => body } as unknown as Response;
}

describe('fetchGitHubStars', () => {
  it('returns the override when it is a valid non-negative integer', async () => {
    vi.stubEnv('WEBSITE_GITHUB_STARS_OVERRIDE', '1234');
    const fetchSpy = vi.fn();
    expect(await fetchGitHubStars('comfyanonymous', 'ComfyUI', fetchSpy as never)).toBe(1234);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('falls through to the live fetch on an invalid override instead of throwing', async () => {
    vi.stubEnv('WEBSITE_GITHUB_STARS_OVERRIDE', 'abc');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchImpl = vi.fn(async () => jsonResponse({ stargazers_count: 999 }));

    // Must NOT throw — the badge degrades gracefully per the file's contract.
    await expect(fetchGitHubStars('comfyanonymous', 'ComfyUI', fetchImpl as never)).resolves.toBe(
      999
    );
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('falls through on a negative or non-integer override', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ stargazers_count: 7 }));
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    for (const bad of ['-1', '1.5']) {
      fetchImpl.mockClear();
      vi.stubEnv('WEBSITE_GITHUB_STARS_OVERRIDE', bad);
      await expect(fetchGitHubStars('o', 'r', fetchImpl as never)).resolves.toBe(7);
    }
  });
});

describe('formatStarCount', () => {
  it('formats thousands and millions compactly', () => {
    expect(formatStarCount(950)).toBe('950');
    expect(formatStarCount(1500)).toBe('1.5K');
    expect(formatStarCount(12_300)).toBe('12K');
    expect(formatStarCount(1_500_000)).toBe('1.5M');
  });
});
