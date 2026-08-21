/** Server-only helpers for the MiniMax-H3 demo. Never import from a component. */
import { Comfy } from '@comfyorg/sdk';

/**
 * The SDK reads its target from `process.env.COMFY_BASE_URL` at construction,
 * while Astro surfaces `.env` through `import.meta.env` — bridge the two so a
 * plain `.env` file works in `astro dev` without exporting shell variables.
 *
 * No API key is passed: the deployment this page targets is whitelisted, and
 * the SDK sends no credentials at all when `apiKey` is omitted.
 */
export function comfyBaseUrl(): string {
  const baseUrl = import.meta.env.COMFY_BASE_URL ?? process.env.COMFY_BASE_URL;
  if (!baseUrl) throw new Error('COMFY_BASE_URL is not set (see site/.env.example)');
  return baseUrl;
}

export function comfyClient(): Comfy {
  process.env.COMFY_BASE_URL = comfyBaseUrl();
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
