/**
 * End-to-end integration check for the MiniMax H3 multi-reference demo.
 *
 * Drives the same four calls the page makes, in the same order, against a
 * REAL deployment: queue readout -> submit three references -> poll -> cancel.
 * Nothing is mocked, because every regression this guards against lived in the
 * space between components that unit tests stub out:
 *
 *   - FE-1932: the edge router had no rule for `/api/workflows/*`, so the page
 *     rendered but every call landed on the marketing origin and 404'd. Both
 *     origins were individually healthy.
 *   - The CSRF follow-on: Astro compares `Origin` against its own computed
 *     origin, which behind the router is the proxied host, so a browser POST
 *     from comfy.org is rejected 403 unless `security.allowedDomains` names it.
 *   - workflow_templates#1208: the reference images 404'd on the CDN, so the
 *     page could not assemble an upload at all.
 *
 * Because of that this file MUST keep sending a browser-shaped request:
 * a real `Origin` header, real image bytes fetched from the CDN, and
 * `multipart/form-data`. Replacing any of those with a shortcut re-opens one of
 * the three bugs above.
 *
 * Runs against BASE_URL (default https://comfy.org — the origin users actually
 * hit, and the only one that exercises the router). Point it elsewhere to check
 * a preview:
 *
 *   DEMO_BASE_URL=https://workflow-templates.vercel.app pnpm test:integration
 */
import { afterAll, describe, expect, it } from 'vitest';

const BASE_URL = (process.env.DEMO_BASE_URL ?? 'https://comfy.org').replace(/\/+$/, '');
const API = `${BASE_URL}/api/workflows/minimax-h3-multiref`;
const PAGE = `${BASE_URL}/workflows/minimax-h3-multiref/`;
const EXAMPLE_ROOT = 'https://media.comfy.org/website/demos/mmh3/example';

const REQUEST_TIMEOUT_MS = 30_000;
const SUBMIT_TIMEOUT_MS = 90_000;
/** Long enough to see the job accepted and moving; not a wait for the render. */
const POLL_WINDOW_MS = 45_000;
const POLL_INTERVAL_MS = 5_000;

/** Statuses the deployment may legitimately report while we watch. */
const HEALTHY_STATUSES = ['queued', 'pending', 'running', 'completed', 'succeeded', 'success'];

/** A browser sends `Origin` on same-origin POSTs; the CSRF check depends on it. */
function browserHeaders(): Record<string, string> {
  return { origin: BASE_URL };
}

/**
 * Turn a status code into the actual operational cause, so a red build names
 * the thing to go fix instead of leaving the next person to rediscover it.
 */
function diagnose(status: number, path: string): string {
  const where = `${path} returned ${status}`;
  switch (status) {
    case 403:
      return `${where}. Astro's CSRF check rejected the request: its computed origin does not match the browser's "Origin: ${BASE_URL}". Behind the comfy.org router this needs security.allowedDomains in astro.config.mjs to include the proxied host.`;
    case 404:
      return `${where}. The request did not reach the hub app. The edge router (comfy-router) forwards /workflows/* but must also forward /api/workflows/* to the workflows origin — this is the FE-1932 failure exactly.`;
    case 502:
      return `${where}. The hub app was reached but the Comfy deployment behind it errored or is down. Expected while the dev platform is in private beta.`;
    case 413:
      return `${where}. The reference upload exceeded the serverless request size cap.`;
    default:
      return where;
  }
}

async function request(path: string, init: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await res.text();
  return { res, body, detail: `${diagnose(res.status, path)}\nBody: ${body.slice(0, 400)}` };
}

function parseJson(body: string, detail: string): Record<string, unknown> {
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    throw new Error(`Expected JSON but got a non-JSON body. ${detail}`);
  }
}

/** Job id shared across the ordered steps below, and cancelled in afterAll. */
let jobId: string | null = null;

afterAll(async () => {
  // Always give the GPU job back, including when an assertion above failed
  // mid-flight. A leaked job would keep occupying the demo's single deployment.
  if (!jobId) return;
  try {
    await fetch(`${API}/job/${jobId}`, {
      method: 'DELETE',
      headers: browserHeaders(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    // Best effort: the run is already over, and the job ages out on its own.
  }
});

describe(`MiniMax H3 demo integration (${BASE_URL})`, () => {
  it('serves the demo page', async () => {
    const res = await fetch(PAGE, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    expect(res.status, diagnose(res.status, PAGE)).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
  });

  it('serves the reference images the page uploads', async () => {
    // The page has no filesystem copy of these: it re-fetches them from the CDN
    // and posts the bytes. A 404 here fails Run Workflow before it starts.
    const results = await Promise.all(
      [1, 2, 3].map(async (i) => {
        const url = `${EXAMPLE_ROOT}/keyframes/kf_${i}.webp`;
        const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
        return { url, status: res.status, bytes: (await res.arrayBuffer()).byteLength };
      })
    );

    for (const r of results) {
      expect(r.status, `${r.url} returned ${r.status}`).toBe(200);
      expect(r.bytes, `${r.url} was empty`).toBeGreaterThan(0);
    }
  });

  it('answers the queue readout as JSON', async () => {
    // The cheapest end-to-end signal there is: a GET that must reach the hub
    // app. This is the single assertion that would have caught FE-1932.
    const { res, body, detail } = await request('/queue');
    expect(res.status, detail).toBe(200);

    const json = parseJson(body, detail);
    expect(typeof json.available, `queue.available should be a boolean. ${detail}`).toBe('boolean');
  });

  it('accepts a three-reference submission', async () => {
    const form = new FormData();
    form.append('settings', JSON.stringify({ seconds: 5, steps: 4, enabledKeyframes: [1, 2, 3] }));

    for (const i of [1, 2, 3]) {
      const res = await fetch(`${EXAMPLE_ROOT}/keyframes/kf_${i}.webp`, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const blob = await res.blob();
      form.append(`keyframe_${i}`, new File([blob], `kf_${i}.webp`, { type: 'image/webp' }));
    }

    // No explicit content-type: fetch sets multipart/form-data with the
    // boundary, which is exactly the shape the CSRF check inspects.
    const { res, body, detail } = await request(
      '/run',
      { method: 'POST', headers: browserHeaders(), body: form },
      SUBMIT_TIMEOUT_MS
    );

    expect(res.status, detail).toBe(200);

    const json = parseJson(body, detail);
    expect(typeof json.jobId, `submit should return a jobId. ${detail}`).toBe('string');
    expect(HEALTHY_STATUSES, `unexpected submit status. ${detail}`).toContain(json.status);

    jobId = json.jobId as string;
  });

  it('reports status for the submitted job', async () => {
    expect(jobId, 'no job was submitted, so there is nothing to poll').not.toBeNull();

    const deadline = Date.now() + POLL_WINDOW_MS;
    let seen = 0;

    // Poll like the page does. We are proving the job is accepted and tracked,
    // not waiting for a finished video — a full render costs GPU minutes and
    // would make this check too slow and too expensive to run on a schedule.
    while (Date.now() < deadline) {
      const { res, body, detail } = await request(`/job/${jobId}`);
      expect(res.status, detail).toBe(200);

      const json = parseJson(body, detail);
      expect(json.jobId, `poll returned a different job. ${detail}`).toBe(jobId);
      expect(HEALTHY_STATUSES, `job reported an unhealthy status. ${detail}`).toContain(
        json.status
      );
      expect(json.error, `job reported an error. ${detail}`).toBeFalsy();
      seen++;

      if (json.status !== 'queued' && json.status !== 'pending') break;
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    expect(seen, 'the poll endpoint was never successfully read').toBeGreaterThan(0);
  });

  it('cancels the submitted job', async () => {
    expect(jobId, 'no job was submitted, so there is nothing to cancel').not.toBeNull();

    const { res, body, detail } = await request(`/job/${jobId}`, {
      method: 'DELETE',
      headers: browserHeaders(),
    });

    expect(res.status, detail).toBe(200);
    const json = parseJson(body, detail);
    expect(json.jobId, detail).toBe(jobId);

    // Cancelled cleanly, so the afterAll hook has nothing left to release.
    jobId = null;
  });
});
