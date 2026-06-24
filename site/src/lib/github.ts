/**
 * GitHub star count fetch + formatting — ported from the comfy.org frontend
 * (`apps/website/src/utils/github.ts`). Used at build time in Astro frontmatter
 * to show the live ComfyUI star count in the navbar. Returns null on any error
 * so the badge can be hidden gracefully.
 */
const inflight = new Map<string, Promise<number | null>>();

export async function fetchGitHubStars(
  owner: string,
  repo: string,
  fetchImpl: typeof fetch = fetch
): Promise<number | null> {
  const override = readGitHubStarsOverride();
  if (override !== undefined) return override;

  const key = `${owner}/${repo}`;
  const cached = inflight.get(key);
  if (cached) return cached;

  const request = doFetch(owner, repo, fetchImpl).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, request);
  return request;
}

async function doFetch(
  owner: string,
  repo: string,
  fetchImpl: typeof fetch
): Promise<number | null> {
  try {
    const res = await fetchImpl(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    return readStargazerCount(data);
  } catch {
    return null;
  }
}

function readStargazerCount(data: unknown): number | null {
  if (data === null || typeof data !== 'object') return null;
  if (!('stargazers_count' in data)) return null;
  const count = data.stargazers_count;
  return typeof count === 'number' ? count : null;
}

export function formatStarCount(count: number): string {
  if (count >= 1_000_000) {
    const m = count / 1_000_000;
    return `${m >= 10 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (count >= 1_000) {
    const k = count / 1_000;
    return `${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, '')}K`;
  }
  return count.toString();
}

function readGitHubStarsOverride(): number | undefined {
  const rawCount = import.meta.env.WEBSITE_GITHUB_STARS_OVERRIDE;
  if (rawCount === undefined || rawCount === '') return undefined;

  const count = Number(rawCount);
  if (!Number.isSafeInteger(count) || count < 0) {
    // Honor the file's graceful-degradation contract: a bad override must not
    // throw (the only caller is un-guarded and renders on every route, so a
    // throw fails the whole build). Warn and fall through to the live fetch.
    console.warn(
      `Ignoring invalid WEBSITE_GITHUB_STARS_OVERRIDE=${rawCount}; expected a non-negative integer`
    );
    return undefined;
  }

  return count;
}
