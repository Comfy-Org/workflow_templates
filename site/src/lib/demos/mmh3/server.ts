/** Server-only helpers for the MiniMax-H3 demo. Never import from a component. */
import { Comfy } from '@comfyorg/sdk';
import { DEPLOYMENT_URL } from './config';

/**
 * A client pointed at this page's deployment.
 *
 * The SDK resolves its target from `process.env.COMFY_BASE_URL` at
 * construction and takes no base-URL argument, so the constant is assigned
 * there immediately beforehand. No API key is passed: the deployment is
 * whitelisted, and the SDK sends no credentials at all when `apiKey` is
 * omitted.
 */
export function comfyClient(): Comfy {
  process.env.COMFY_BASE_URL = DEPLOYMENT_URL;
  return new Comfy({ clientInfo: 'templates-site-demo' });
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
