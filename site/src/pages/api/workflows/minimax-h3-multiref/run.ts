export const prerender = false;

import type { APIRoute } from 'astro';
import path from 'node:path';
import { existsSync } from 'node:fs';
import graph from '@/lib/demos/mmh3/workflow-api.json';
import {
  DEFAULTS,
  INPUT_NODES,
  KEYFRAMES,
  KEYFRAMES_NODE,
  buildKeyframeState,
  maxFrameFor,
  validateSeconds,
  type DemoSettings,
} from '@/lib/demos/mmh3/config';
import { comfyClient, describeError, jsonResponse } from '@/lib/demos/mmh3/server';

/** Bundled sample references, used for any slot the caller didn't upload. */
const EXAMPLE_DIR = path.join(process.cwd(), 'public/demos/mmh3/example/keyframes');

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
    loraStrength: num(input.loraStrength, DEFAULTS.loraStrength),
    crop: str(input.crop, DEFAULTS.crop),
    enabledKeyframes: Array.isArray(input.enabledKeyframes)
      ? input.enabledKeyframes.filter((i) => KEYFRAMES.some((k) => k.index === i))
      : DEFAULTS.enabledKeyframes,
  };
}

export const POST: APIRoute = async ({ request }) => {
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

  if (!enabled.length) {
    return jsonResponse({ error: 'Keep at least one reference image.' }, 400);
  }

  // References are pinned to absolute frames; a clip shorter than the last one
  // fails deep inside the node, so refuse it here where we can explain why.
  const secondsError = validateSeconds(settings.seconds, maxFrameFor(enabled));
  if (secondsError) return jsonResponse({ error: secondsError }, 400);

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
    const node = (wf.json[KEYFRAMES_NODE] ?? {}) as { inputs?: Record<string, unknown> };
    const inputs = node.inputs ?? {};

    // Removing a reference renumbers the rest: the node pairs `positions[i]`
    // with `keyframe_image_{i+1}`, so stale image inputs have to go first.
    for (const key of Object.keys(inputs)) {
      if (key.startsWith('keyframe_image_')) delete inputs[key];
    }

    const kept = KEYFRAMES.filter((k) => enabled.includes(k.index));
    wf.setInput(KEYFRAMES_NODE, 'keyframe_state', buildKeyframeState(kept.map((k) => k.frame)));

    for (const [i, slot] of kept.entries()) {
      const field = form.get(`keyframe_${slot.index}`);
      let asset;

      if (field instanceof File && field.size > 0) {
        const bytes = new Uint8Array(await field.arrayBuffer());
        const ext = (field.name.split('.').pop() || 'png').toLowerCase();
        asset = client.assets.fromBytes(bytes, {
          filename: `mmh3_${stamp}_kf${slot.index}.${ext}`,
          contentType: field.type || 'image/png',
        });
      } else {
        const fallback = path.join(EXAMPLE_DIR, `kf_${slot.index}.webp`);
        if (!existsSync(fallback)) {
          return jsonResponse(
            { error: `Reference ${slot.index} was not supplied and no bundled example exists.` },
            400
          );
        }
        asset = client.assets.fromFile(fallback);
      }

      await asset.commit();
      // The LoadImage node holds the uploaded filename; the keyframes node takes
      // that node's IMAGE output (slot 0), which is what it expects.
      wf.setInput(slot.nodeId, 'image', asset.filePath);
      wf.setInput(KEYFRAMES_NODE, `keyframe_image_${i + 1}`, [slot.nodeId, 0]);
    }

    // Drop the loaders for removed references. They are unused, but the server
    // validates every LoadImage in the graph, so leaving one behind fails with
    // "does not match any uploaded asset" for its original filename.
    for (const slot of KEYFRAMES) {
      if (!enabled.includes(slot.index)) delete wf.json[slot.nodeId];
    }

    const job = await client.submit(wf);
    return jsonResponse({ jobId: job.id, status: job.status });
  } catch (err) {
    return jsonResponse({ error: describeError(err) }, 502);
  }
};
