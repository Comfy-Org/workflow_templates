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

import { AGENT_PROMPT_URL, exampleKeyframeUrl } from '../../src/lib/demos/mmh3/config';

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

/** Astro names the island after the component, so this appears iff it shipped. */
const DEMO_COMPONENT = 'MiniMaxH3Demo';

/**
 * What the deployed page should be serving, read from the committed flag by the
 * workflow. Null when run by hand without it: the page assertion is then skipped
 * rather than guessed at, because both answers are legitimate locally.
 */
const EXPECTED_ENABLED: boolean | null =
  process.env.DEMO_EXPECTED_ENABLED === undefined
    ? null
    : process.env.DEMO_EXPECTED_ENABLED === 'true';

/** Filled by the queue step, quoted by the poll step when a job never starts. */
let queueReadout = 'not read';

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

function tryParseJson(body: string): Record<string, unknown> | null {
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseJson(body: string, detail: string): Record<string, unknown> {
  const json = tryParseJson(body);
  if (!json) throw new Error(`Expected JSON but got a non-JSON body. ${detail}`);
  return json;
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
  it('serves the demo page in the state the flag asks for', { retry: 2 }, async () => {
    const res = await fetch(PAGE, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    expect(res.status, diagnose(res.status, PAGE, 'page')).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');

    // A 200 alone cannot tell a working demo from the static fallback, so the
    // island is checked against what the flag says should be deployed. Both
    // directions are worth catching: a missing island means the runner failed
    // to build, and a present one means the gate leaked a runner that the
    // committed flag says nobody should see.
    const html = await res.text();
    const island = html.includes(DEMO_COMPONENT);
    if (EXPECTED_ENABLED === null) return;
    expect(
      island,
      EXPECTED_ENABLED
        ? `the flag says the demo is on, but ${PAGE} carries no ${DEMO_COMPONENT} island — the page is serving its static fallback, so every API check below is testing a runner users cannot reach.`
        : `the flag says the demo is off, but ${PAGE} still carries a ${DEMO_COMPONENT} island — the build-time gate leaked.`
    ).toBe(EXPECTED_ENABLED);
  });

  it('reaches the API at the path the page actually requests', { retry: 2 }, async () => {
    // Every other check here drives the slashed form (see `endpoint`), which
    // is the second hop. The page requests the first, so nothing else would
    // notice it dying — /queue/ answering 200 while /queue 404s is FE-1932
    // again, one redirect over.
    const res = await fetch(`${API}/queue`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (res.status >= 300 && res.status < 400) {
      const target = new URL(res.headers.get('location') ?? '', `${API}/queue`).href;
      expect(
        target,
        `${API}/queue redirected to ${target}, which is not the form the rest of this check drives.`
      ).toBe(`${API}/queue/`);
      return;
    }

    expect(
      res.status,
      `${API}/queue is what the page requests, and it neither answered nor redirected to ${API}/queue/. ${diagnose(res.status, '/queue')}`
    ).toBeLessThan(300);
  });

  it('serves the reference images the page uploads, with CORS', { retry: 2 }, async () => {
    // The page has no filesystem copy of these: it re-fetches them from the CDN
    // and posts the bytes. A 404 here fails Run Workflow before it starts.
    //
    // Sent with an Origin, and the allow-origin header asserted, because the
    // page reads these bodies cross-origin from comfy.org. Node does not
    // enforce CORS, so without this the bytes arrive here and the check passes
    // while the browser refuses them and Run Workflow dies before submit.
    const urls = [
      exampleKeyframeUrl(1),
      exampleKeyframeUrl(2),
      exampleKeyframeUrl(3),
      AGENT_PROMPT_URL,
    ];
    const results = await Promise.all(
      urls.map(async (url) => {
        const res = await fetch(url, {
          headers: browserHeaders(),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        return {
          url,
          status: res.status,
          allowOrigin: res.headers.get('access-control-allow-origin'),
          bytes: (await res.arrayBuffer()).byteLength,
        };
      })
    );

    for (const r of results) {
      expect(r.status, `${r.url} returned ${r.status}`).toBe(200);
      expect(r.bytes, `${r.url} was empty`).toBeGreaterThan(0);
      expect(
        r.allowOrigin && (r.allowOrigin === '*' || r.allowOrigin === BASE_URL),
        `${r.url} does not allow ${BASE_URL} to read it (access-control-allow-origin: ${r.allowOrigin ?? 'absent'}). The bytes are reachable from a server but a browser would refuse them.`
      ).toBe(true);
    }
  });

  it('answers the queue readout as JSON', { retry: 2 }, async () => {
    // The cheapest end-to-end signal there is: a GET that must reach the hub
    // app. This is the single assertion that would have caught FE-1932.
    const { res, body, detail } = await request('/queue');
    expect(res.status, detail).toBe(200);

    const json = parseJson(body, detail);
    expect(typeof json.available, `queue.available should be a boolean. ${detail}`).toBe('boolean');

    // Kept for the poll step's failure message: "the job never started" reads
    // very differently next to a deployment reporting no ready workers.
    queueReadout = body.slice(0, 200);
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

    // Claim the job id before asserting anything at all. Every assertion below
    // throws, and a job id captured after one of them would leave a live GPU
    // job on a single-deployment demo with nothing left to cancel it — the
    // afterAll hook can only release what it has been told about.
    const submitted = tryParseJson(body);
    if (typeof submitted?.jobId === 'string') jobId = submitted.jobId;

    // Before the status, not after: a redirect is the cause and the 400 it
    // produces is only the symptom, so asserting status first hides it.
    expect(res.redirected, `the multipart submit was redirected to ${res.url}. ${detail}`).toBe(
      false
    );

    expect(res.status, detail).toBe(200);

    const json = parseJson(body, detail);
    expect(typeof json.jobId, `submit should return a jobId. ${detail}`).toBe('string');
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
    let started = false;
    let lastSeen = 'nothing';
    const positions = new Set<string>();

    // Poll like the page does. We are proving the job is accepted and moving,
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
      lastSeen = `status=${String(json.status)} queuePosition=${String(json.queuePosition ?? 'none')}`;
      positions.add(lastSeen);

      if (json.status !== 'queued') {
        started = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    expect(seen, 'the poll endpoint was never successfully read').toBeGreaterThan(0);

    // `queued` is in HEALTHY_STATUSES, so without this a job that is accepted
    // and then never runs satisfies every assertion above and the whole check
    // reports green — which is exactly what a deployment with no live worker
    // looks like, and the most likely way this demo breaks. Movement counts as
    // well as starting: a shrinking queue position is a real backlog, not a
    // stall, and failing that would go red on a busy-but-working deployment.
    expect(
      started || positions.size > 1,
      `the job never left "queued" in ${POLL_WINDOW_MS / 1000}s and its place in the queue never moved (last saw ${lastSeen}). The submit was accepted but nothing is running it — a user would be watching a spinner. Queue readout at the time: ${queueReadout}`
    ).toBe(true);
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

    // A 200 is the control plane saying it accepted the request, not that the
    // job stopped. Both terminal-ward states count: `canceling` is the normal
    // answer for a job already on a worker, `canceled` for one still queued.
    // Anything else — `running`, `queued` — means the GPU is still busy.
    expect(
      ['canceling', 'canceled'],
      `cancel returned 200 but the job is not stopping. ${detail}`
    ).toContain(json.status);

    // Only now: releasing this earlier would disarm the afterAll hook on the
    // exact runs where the job is still alive and most needs releasing.
    jobId = null;
  });
});
