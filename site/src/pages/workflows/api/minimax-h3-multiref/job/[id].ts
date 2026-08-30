export const prerender = false;

import type { APIRoute } from 'astro';
import { ComfyLow } from '@comfyorg/sdk/low';
import {
  DEPLOYMENT_URL,
  type JobActionResponse,
  type JobOutput,
  type JobStatusResponse,
} from '@/lib/demos/mmh3/config';
import { comfyClient, crossSiteRejection, describeError, jsonResponse } from '@/lib/demos/mmh3/server';

export const DELETE: APIRoute = async ({ params, request }) => {
  const rejected = crossSiteRejection(request);
  if (rejected) return rejected;

  const id = params.id;
  if (!id) return jsonResponse({ error: 'Missing job id' }, 400);

  try {
    const job = await comfyClient().jobs.get(id);
    await job.cancel();
    return jsonResponse({ jobId: job.id, status: job.status } satisfies JobActionResponse);
  } catch (err) {
    return jsonResponse({ error: describeError(err) }, 502);
  }
};

export const GET: APIRoute = async ({ params }) => {
  const id = params.id;
  if (!id) return jsonResponse({ error: 'Missing job id' }, 400);

  try {
    const client = comfyClient();
    const job = await client.jobs.get(id);

    // Signed storage URLs let the browser stream the video straight from
    // storage instead of proxying tens of megabytes through this server.
    const outputs: JobOutput[] = await Promise.all(
      job.outputs.map(async (out) => ({
        name: out.name,
        nodeId: out.nodeId,
        contentType: out.contentType,
        sizeBytes: out.sizeBytes,
        url: (await out.getDownloadUrl()).url,
      }))
    );

    // `Job` exposes status/outputs but not queue position or progress, so read
    // those off the typed low-level record rather than its private state.
    // Both are nullable: a serving surface may never populate them.
    let queuePosition: number | null = null;
    let progress: { value: number; message?: string | null } | null = null;
    try {
      const raw = await new ComfyLow(DEPLOYMENT_URL).getJob(id);
      queuePosition = raw.queue_position;
      progress = raw.progress
        ? { value: raw.progress.value, message: raw.progress.message ?? null }
        : null;
    } catch {
      // Progress detail is an enhancement; the status above is authoritative.
    }

    const error = job.error
      ? typeof job.error === 'string'
        ? job.error
        : JSON.stringify(job.error)
      : null;

    return jsonResponse({
      jobId: job.id,
      status: job.status,
      outputs,
      error,
      queuePosition,
      progress,
    } satisfies JobStatusResponse);
  } catch (err) {
    return jsonResponse({ error: describeError(err) }, 502);
  }
};
