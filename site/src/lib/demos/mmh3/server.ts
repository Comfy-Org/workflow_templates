/** Server-only helpers for the MiniMax-H3 demo. Never import from a component. */
import { Comfy } from '@comfyorg/sdk';
import { DEPLOYMENT_URL } from './config';

/**
 * A client pointed at this page's deployment.
 *
 * The SDK resolves its target from `process.env.COMFY_BASE_URL` at
 * construction and takes no base-URL argument, so the constant is assigned
 * there for the duration of the constructor and restored afterwards — the
 * variable is process-wide, and other SDK consumers must not inherit this
 * page's deployment. No API key is passed: the deployment is whitelisted,
 * and the SDK sends no credentials at all when `apiKey` is omitted.
 */
export function comfyClient(): Comfy {
  const previous = process.env.COMFY_BASE_URL;
  process.env.COMFY_BASE_URL = DEPLOYMENT_URL;
  try {
    return new Comfy({ clientInfo: 'templates-site-demo' });
  } finally {
    if (previous === undefined) delete process.env.COMFY_BASE_URL;
    else process.env.COMFY_BASE_URL = previous;
  }
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    // These routes live under /workflows/ so the comfy.org proxy reaches them,
    // and that subtree is CDN-cached by vercel.json — job status and queue
    // answers must never be served stale.
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

/** Surface an SDK error as a readable string. */
export function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * Origin guard for the demo's mutating routes (POST /run, DELETE /job/[id]).
 *
 * Astro's built-in `security.checkOrigin` compares the Origin header against
 * the host the request arrived on, which can never match here: the page is
 * served through comfy.org's Framer rewrite, so browsers send
 * `Origin: https://comfy.org` while Astro receives the request addressed to
 * the Vercel deployment. That check is therefore disabled in astro.config.mjs
 * and replaced by this allowlist, which accepts the sites this demo actually
 * runs on and still keeps third-party pages from driving the GPU deployment
 * from their visitors' browsers.
 */
export function crossSiteRejection(request: Request): Response | null {
  const origin = request.headers.get('origin');
  // Non-browser clients (curl, server-to-server) send no Origin header; the
  // guard only exists to stop other *websites*, so let those through.
  if (!origin) return null;

  try {
    const host = new URL(origin).hostname;
    const allowed =
      host === 'comfy.org' ||
      host.endsWith('.comfy.org') ||
      host.endsWith('.vercel.app') || // preview + production deployments
      host === 'localhost' ||
      host === '127.0.0.1'; // local dev
    if (allowed) return null;
  } catch {
    // Malformed Origin header — treat as cross-site.
  }
  return jsonResponse({ error: 'Cross-site requests are not allowed.' }, 403);
}
