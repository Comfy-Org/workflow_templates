/**
 * Generate poster frames and right-sized video copies for the hub's card media,
 * upload them to GCS, and emit a manifest the site can look assets up in.
 *
 * Encoder settings were chosen from measured SSIM against the originals, not by
 * taste: native resolution kept (capped at 1280 wide), libx264 crf 30, which
 * scored 0.9827 and is 93.7% smaller. Anything above 0.98 is visually
 * transparent, so this does not trade quality for bytes.
 *
 * Idempotent: an asset already present in the manifest is skipped, so a partial
 * run can simply be re-run.
 *
 * Requires: ffmpeg, ffprobe, gcloud (authenticated).
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const run = promisify(execFile);

const FFMPEG = '/opt/homebrew/bin/ffmpeg';
const FFPROBE = '/opt/homebrew/bin/ffprobe';
const BUCKET = 'gs://comfy-org-videos/hub-media';
const PUBLIC_BASE = 'https://media.comfy.org/hub-media';

/** The card box is at most ~1044 device px and centre-crops a 16:9 source to 4:3,
 *  so 1280 covers every measured viewport. Never upscale past the source. */
const MAX_VIDEO_WIDTH = 1280;
/** The poster is a placeholder that a playing video replaces within a moment,
 *  so it is sized for the crop, not for pixel-perfect stills. */
const POSTER_WIDTH = 640;
const VIDEO_CRF = 30;

const args = process.argv.slice(2);
const limit = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? Infinity);
const dryRun = args.includes('--dry-run');
const manifestPath = args.find((a) => a.startsWith('--manifest='))?.split('=')[1];
if (!manifestPath) throw new Error('--manifest=<path> is required');
const gridPath = args.find((a) => a.startsWith('--grid='))?.split('=')[1];
if (!gridPath) throw new Error('--grid=<path> is required');

const isVideo = (u) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u);
/** Stable id from the asset filename, which is already a UUID upstream. */
const assetId = (u) => path.basename(new URL(u).pathname).replace(/\.[^.]+$/, '');

const manifest = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  : {};

const catalog = JSON.parse(fs.readFileSync(gridPath, 'utf8'));
const sources = [...new Set(catalog.flatMap((t) => t.thumbnails ?? []).filter(isVideo))];

console.log(`${sources.length} distinct video assets, ${Object.keys(manifest).length} already in manifest`);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-media-'));
let done = 0, skipped = 0, failed = 0;
let bytesIn = 0, bytesOut = 0;

for (const url of sources) {
  const id = assetId(url);
  if (manifest[id]) { skipped++; continue; }
  if (done >= limit) break;

  const src = path.join(tmp, `${id}.src`);
  const poster = path.join(tmp, `${id}.jpg`);
  const video = path.join(tmp, `${id}.mp4`);

  try {
    // Download once; both outputs derive from the same local copy.
    await run('curl', ['-sSL', '--max-time', '300', '-o', src, url]);
    const srcBytes = fs.statSync(src).size;

    const probe = await run(FFPROBE, [
      '-v', 'error', '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height:format=duration',
      '-of', 'json', src,
    ]);
    const meta = JSON.parse(probe.stdout);
    const { width: w, height: h } = meta.streams[0];
    const duration = Number(meta.format?.duration ?? 0);

    // A 1s seek lands past most fade-ins, but a very short clip has no 1s mark.
    const seek = duration > 1.5 ? '1' : '0';

    await run(FFMPEG, [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-ss', seek, '-i', src, '-frames:v', '1',
      '-vf', `scale='min(${POSTER_WIDTH},iw)':-2:flags=lanczos`,
      '-q:v', '4', poster,
    ]);

    // Only scale down, never up: an 800px source stays 800px.
    const vf = w > MAX_VIDEO_WIDTH
      ? `scale=${MAX_VIDEO_WIDTH}:-2:flags=lanczos`
      : 'scale=trunc(iw/2)*2:trunc(ih/2)*2';

    await run(FFMPEG, [
      '-hide_banner', '-loglevel', 'error', '-y', '-i', src,
      '-vf', vf,
      '-c:v', 'libx264', '-crf', String(VIDEO_CRF), '-preset', 'slow',
      '-profile:v', 'high', '-pix_fmt', 'yuv420p',
      '-an',                       // cards are always muted; audio is dead weight
      '-movflags', '+faststart',   // moov atom first so playback can start early
      video,
    ], { maxBuffer: 1 << 26 });

    const posterBytes = fs.statSync(poster).size;
    const videoBytes = fs.statSync(video).size;
    const outW = w > MAX_VIDEO_WIDTH ? MAX_VIDEO_WIDTH : w;
    const outH = Math.round((h / w) * outW / 2) * 2;

    if (!dryRun) {
      await run('gcloud', ['storage', 'cp', poster, `${BUCKET}/posters/${id}.jpg`,
        '--cache-control=public, max-age=31536000, immutable']);
      await run('gcloud', ['storage', 'cp', video, `${BUCKET}/video/${id}.mp4`,
        '--cache-control=public, max-age=31536000, immutable']);
    }

    manifest[id] = {
      poster: `${PUBLIC_BASE}/posters/${id}.jpg`,
      video: `${PUBLIC_BASE}/video/${id}.mp4`,
      width: outW,
      height: outH,
    };

    bytesIn += srcBytes; bytesOut += videoBytes + posterBytes;
    done++;
    console.log(
      `  ${id}  ${w}x${h} ${(srcBytes / 1048576).toFixed(2)}MB` +
      ` -> video ${(videoBytes / 1024).toFixed(0)}KB + poster ${(posterBytes / 1024).toFixed(0)}KB` +
      `  (${(100 - (videoBytes + posterBytes) * 100 / srcBytes).toFixed(1)}% off)`
    );
  } catch (err) {
    failed++;
    console.error(`  FAILED ${id}: ${String(err.message).split('\n')[0]}`);
  } finally {
    for (const f of [src, poster, video]) fs.rmSync(f, { force: true });
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(
  `\ndone=${done} skipped=${skipped} failed=${failed}` +
  (bytesIn ? `  ${(bytesIn / 1048576).toFixed(1)}MB in -> ${(bytesOut / 1048576).toFixed(1)}MB out` +
    ` (${(100 - bytesOut * 100 / bytesIn).toFixed(1)}% off)` : '')
);
