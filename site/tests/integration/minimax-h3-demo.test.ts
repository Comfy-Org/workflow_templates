/**
 * End-to-end integration check for the MiniMax H3 multi-reference demo.
 *
 * Drives the same four calls the page makes, in the same order, against a
 * REAL deployment: queue readout -> submit three references -> poll -> cancel.
 * Nothing is mocked, because every regression this guards against lived in the
 * space between components that unit tests stub out:
 *
 *   - FE-1932: the edge router had no rule for the demo's API path, so the page
 *     rendered but every call landed on the marketing origin and 404'd. Both
 *     origins were individually healthy. #1213 fixed it by moving the routes
 *     under `/workflows/api/*`, which the router's existing `/workflows/*` rule
 *     already forwards — so what needs guarding now is that they stay there.
 *   - The CSRF follow-on (#1215): behind the router Astro computes its origin
 *     from the Vercel host it was addressed as, while the browser sends
 *     `Origin: https://comfy.org`, so the built-in check can never pass. It is
 *     switched off, and the mutating routes run their own origin allowlist in
 *     `src/lib/demos/mmh3/server.ts` instead.
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

import { exampleKeyframeUrl } from '../../src/lib/demos/mmh3/config';

const BASE_URL = (process.env.DEMO_BASE_URL ?? 'https://comfy.org').replace(/\/+$/, '');
const API = `${BASE_URL}/workflows/api/minimax-h3-multiref`;
const PAGE = `${BASE_URL}/workflows/minimax-h3-multiref/`;

/**
 * The trailing slash is load-bearing. comfy.org redirects the slashless form to
 * this one (301 on GET, 308 on POST/DELETE), and Node's fetch does not re-send
 * the multipart `Content-Type` boundary across that redirect — the submit
 * arrives unparseable and the origin answers `400 Expected multipart/form-data`.
 * Browsers replay the body correctly, so dropping the slash reports a healthy
 * demo as broken, and this check switches the demo off when it goes red.
 */
const endpoint = (path: string) => `${API}${path}/`;

const REQUEST_TIMEOUT_MS = 30_000;
const SUBMIT_TIMEOUT_MS = 90_000;
/** Long enough to see the job accepted and moving; not a wait for the render. */
const POLL_WINDOW_MS = 45_000;
const POLL_INTERVAL_MS = 5_000;

/**
 * The subset of the SDK's `JobStatus` union that means "accepted and progressing".
 * The full vocabulary is queued | running | succeeded | canceling | canceled |
 * failed | expired; the four omitted here are all states this check should go
 * red on, so listing extras would quietly accept a broken deployment.
 */
const HEALTHY_STATUSES = ['queued', 'running', 'succeeded'];

/** A browser sends `Origin` on same-origin POSTs; the CSRF check depends on it. */
function browserHeaders(): Record<string, string> {
  return { origin: BASE_URL };
}

/**
 * Turn a status code into the actual operational cause, so a red build names
 * the thing to go fix instead of leaving the next person to rediscover it.
 *
 * The API and page routes fail for different reasons, so they get different
 * explanations: only the API path is forwarded by a router rule, and only its
 * unsafe methods pass through Astro's CSRF check.
 */
function diagnose(status: number, path: string, kind: 'api' | 'page' = 'api'): string {
  const where = `${path} returned ${status}`;
  if (status === 404) {
    return kind === 'api'
      ? `${where}. The request did not reach the hub app. These routes live under /workflows/api/* precisely so the router's existing /workflows/* rule forwards them (#1213); a 404 means either they moved back out of that prefix, or that rule stopped forwarding to the workflows origin — the FE-1932 failure again.`
      : `${where}. The page itself is missing from the deployed site — check that it built, and that the router still forwards /workflows/* here.`;
  }
  if (kind === 'page') return where;

  switch (status) {
    case 403:
      return `${where}. The origin allowlist rejected "Origin: ${BASE_URL}". These routes do not use Astro's built-in CSRF check — it cannot pass behind the router, so astro.config.mjs sets security.checkOrigin: false and crossSiteRejection() in src/lib/demos/mmh3/server.ts guards the mutating routes instead. Add the host there (#1215).`;
    case 400:
      return `${where}. The origin reached the route but could not read the request. If the body says "Expected multipart/form-data", the request was redirected on the way in and lost its Content-Type boundary — see the trailing-slash note on \`endpoint\` above.`;
    case 502:
      return `${where}. The hub app was reached but the Comfy deployment behind it errored or is down. Expected while the dev platform is in private beta.`;
    case 413:
      return `${where}. The reference upload exceeded the serverless request size cap.`;
    default:
      return where;
  }
}

async function request(path: string, init: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const res = await fetch(endpoint(path), {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await res.text();
  const hop = res.redirected ? `\nRedirected to ${res.url} instead of being served directly.` : '';
  return { res, body, detail: `${diagnose(res.status, path)}${hop}\nBody: ${body.slice(0, 400)}` };
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
    await fetch(endpoint(`/job/${jobId}`), {
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
    expect(res.status, diagnose(res.status, PAGE, 'page')).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
  });

  it('serves the reference images the page uploads', async () => {
    // The page has no filesystem copy of these: it re-fetches them from the CDN
    // and posts the bytes. A 404 here fails Run Workflow before it starts.
    const results = await Promise.all(
      [1, 2, 3].map(async (i) => {
        const url = exampleKeyframeUrl(i);
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
      const res = await fetch(exampleKeyframeUrl(i), {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const blob = await res.blob();
      form.append(`keyframe_${i}`, new File([blob], `kf_${i}.webp`, { type: 'image/webp' }));
    }

    // No explicit content-type: fetch sets multipart/form-data with the
    // boundary, which is the shape the route's FormData parser requires.
    const { res, body, detail } = await request(
      '/run',
      { method: 'POST', headers: browserHeaders(), body: form },
      SUBMIT_TIMEOUT_MS
    );

    // Before the status, not after: a redirect is the cause and the 400 it
    // produces is only the symptom, so asserting status first hides it.
    expect(res.redirected, `the multipart submit was redirected to ${res.url}. ${detail}`).toBe(
      false
    );

    expect(res.status, detail).toBe(200);

    const json = parseJson(body, detail);
    expect(typeof json.jobId, `submit should return a jobId. ${detail}`).toBe('string');

    // Recorded before the status assertion, not after: an unexpected status
    // throws, and a job id captured only on the happy path would leave a live
    // GPU job running with nothing left to cancel it.
    jobId = json.jobId as string;

    expect(HEALTHY_STATUSES, `unexpected submit status. ${detail}`).toContain(json.status);
  });

  it('reports status for the submitted job', async (ctx) => {
    // Skipped rather than failed when submit did not get that far. A cascade of
    // "there is nothing to poll" failures buries the real error, and CI reads
    // the first error line out of this log to decide what to report and what to
    // record as the reason the demo was switched off.
    if (!jobId) ctx.skip();

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

      if (json.status !== 'queued') break;
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    expect(seen, 'the poll endpoint was never successfully read').toBeGreaterThan(0);
  });

  it('cancels the submitted job', async (ctx) => {
    if (!jobId) ctx.skip();

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
