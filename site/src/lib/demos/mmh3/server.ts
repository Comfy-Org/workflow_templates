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
    headers: { 'content-type': 'application/json' },
  });
}

/** Surface an SDK error as a readable string. */
export function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
