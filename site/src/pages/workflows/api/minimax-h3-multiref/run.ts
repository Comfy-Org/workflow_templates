export const prerender = false;

import type { APIRoute } from 'astro';
import graph from '@/lib/demos/mmh3/workflow-api.json';
import {
  DEFAULTS,
  INPUT_NODES,
  KEYFRAMES,
  KEYFRAMES_NODE,
  type DemoSettings,
  type JobActionResponse,
} from '@/lib/demos/mmh3/config';
import { comfyClient, crossSiteRejection, describeError, jsonResponse } from '@/lib/demos/mmh3/server';

function coerceSettings(raw: unknown): DemoSettings {
  const input = (raw ?? {}) as Partial<DemoSettings>;
  const num = (v: unknown, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  const str = (v: unknown, fallback: string) => (typeof v === 'string' && v.length ? v : fallback);

  return {
    prompt: str(input.prompt, DEFAULTS.prompt),
    seconds: num(input.seconds, DEFAULTS.seconds),
    steps: Math.round(num(input.steps, DEFAULTS.steps)),
    seed: Math.round(num(input.seed, DEFAULTS.seed)),
    aspectRatio: str(input.aspectRatio, DEFAULTS.aspectRatio),
    megapixels: num(input.megapixels, DEFAULTS.megapixels),
    sampler: str(input.sampler, DEFAULTS.sampler),
    scheduler: str(input.scheduler, DEFAULTS.scheduler),
    crop: str(input.crop, DEFAULTS.crop),
    enabledKeyframes: Array.isArray(input.enabledKeyframes)
      ? input.enabledKeyframes.filter((i) => KEYFRAMES.some((k) => k.index === i))
      : DEFAULTS.enabledKeyframes,
  };
}

export const POST: APIRoute = async ({ request }) => {
  const rejected = crossSiteRejection(request);
  if (rejected) return rejected;

  let form: FormData;
  try {
    form = await request.formData();
  } catch (err) {
    return jsonResponse({ error: `Expected multipart/form-data: ${describeError(err)}` }, 400);
  }

  let settings: DemoSettings;
  try {
    settings = coerceSettings(JSON.parse((form.get('settings') as string) || '{}'));
  } catch (err) {
    return jsonResponse({ error: `Invalid settings payload: ${describeError(err)}` }, 400);
  }
  const enabled = settings.enabledKeyframes;

  if (KEYFRAMES.some((slot) => !enabled.includes(slot.index))) {
    return jsonResponse(
      { error: 'Add all three reference images before running the workflow.' },
      400
    );
  }

  if (!Number.isInteger(settings.seconds) || settings.seconds < 5 || settings.seconds > 15) {
    return jsonResponse({ error: 'Clip length must be a whole number from 5 to 15 seconds.' }, 400);
  }

  if (!Number.isInteger(settings.steps) || settings.steps < 4 || settings.steps > 12) {
    return jsonResponse({ error: 'Quality steps must be a whole number from 4 to 12.' }, 400);
  }

  let client;
  try {
    client = comfyClient();
  } catch (err) {
    return jsonResponse({ error: describeError(err) }, 500);
  }

  const wf = client.workflows.fromJson(structuredClone(graph) as Record<string, unknown>);

  for (const [key, target] of Object.entries(INPUT_NODES)) {
    const value = settings[key as keyof DemoSettings];
    // An empty prompt means "keep the prompt baked into the workflow".
    if (typeof value === 'string' && value.trim() === '') continue;
    wf.setInput(target.nodeId, target.field, value);
  }

  const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  try {
    for (const [i, slot] of KEYFRAMES.entries()) {
      // The page always sends real bytes, fetching its bundled examples for
      // any slot the user left untouched: this function has no filesystem
      // copy of `public/` to fall back to.
      const field = form.get(`keyframe_${slot.index}`);
      if (!(field instanceof File) || field.size === 0) {
        return jsonResponse(
          { error: `Reference ${slot.index} is missing from the upload. Reload and try again.` },
          400
        );
      }

      const bytes = new Uint8Array(await field.arrayBuffer());
      const ext = (field.name.split('.').pop() || 'png').toLowerCase();
      const asset = client.assets.fromBytes(bytes, {
        filename: `mmh3_${stamp}_kf${slot.index}.${ext}`,
        contentType: field.type || 'image/png',
      });

      await asset.commit();
      // The asset handle (not its filename) goes into LoadImage: submit()
      // substitutes it as a `core/ASSET` reference the server can resolve.
      // The keyframes node takes that node's IMAGE output (slot 0).
      wf.setInput(slot.nodeId, 'image', asset);
      wf.setInput(KEYFRAMES_NODE, `keyframe_image_${i + 1}`, [slot.nodeId, 0]);
    }

    const job = await client.submit(wf);
    return jsonResponse({ jobId: job.id, status: job.status } satisfies JobActionResponse);
  } catch (err) {
    return jsonResponse({ error: describeError(err) }, 502);
  }
};
