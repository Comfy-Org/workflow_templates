export const prerender = false;

import type { APIRoute } from 'astro';
import { DEPLOYMENT_URL, type QueueState } from '@/lib/demos/mmh3/config';
import { describeError, jsonResponse } from '@/lib/demos/mmh3/server';

/** Serverless deployments are addressed as `dep-<uuid>.run.comfy.app`. */
function deploymentIdFromBaseUrl(baseUrl: string): string | null {
  try {
    const host = new URL(baseUrl).hostname;
    const match = /^dep-([0-9a-f-]{36})\./i.exec(host);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export const GET: APIRoute = async () => {
  // Only the deploy control plane may need a credential; the deployment itself
  // is whitelisted. Omitted when unset, rather than sent empty.
  const apiKey = import.meta.env.COMFY_DEPLOY_API_KEY ?? process.env.COMFY_DEPLOY_API_KEY ?? '';
  const deployApi = (
    import.meta.env.COMFY_DEPLOY_API_URL ??
    process.env.COMFY_DEPLOY_API_URL ??
    ''
  ).replace(/\/$/, '');

  // The page works fine without a queue readout, so every failure below is
  // reported as "unavailable" rather than as an error the user has to act on.
  const unavailable = (reason: string): Response =>
    jsonResponse({ available: false, reason } satisfies QueueState);

  if (!deployApi) return unavailable('COMFY_DEPLOY_API_URL is not set');

  const id = deploymentIdFromBaseUrl(DEPLOYMENT_URL);
  if (!id) return unavailable('Could not derive a deployment id');

  try {
    const res = await fetch(`${deployApi}/v1/deployments/${id}`, {
      headers: {
        accept: 'application/json',
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return unavailable(`Deploy API returned ${res.status}`);

    const body = (await res.json()) as {
      serving?: { jobsInQueue?: number; workers?: QueueState['workers']; sampledAt?: string };
    };
    // `serving` is null before a deployment holds compute, and once it stops.
    if (!body.serving) return unavailable('Deployment is not serving');

    return jsonResponse({
      available: true,
      jobsInQueue: body.serving.jobsInQueue,
      workers: body.serving.workers,
      sampledAt: body.serving.sampledAt,
    } satisfies QueueState);
  } catch (err) {
    return unavailable(describeError(err));
  }
};
