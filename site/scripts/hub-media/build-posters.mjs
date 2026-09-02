/**
 * Generate poster frames for the hub's card videos, upload them to GCS, and emit
 * the manifest of asset ids that `encode-video.mjs` then works through.
 *
 * Posters only. This script used to also encode and upload a crf30, 1280-wide
 * copy of every video, which was wrong twice over: those settings were gated on
 * SSIM, which `encode-video.mjs` replaced with VMAF after SSIM passed a file at
 * 0.9665 that VMAF scored 78.8 and that was visibly degraded; and downscaling to
 * the card box ignored that the same asset is the detail-page hero at up to
 * 2044 px. It also published to `video/<id>.mp4` before any quality gate had
 * run, so an interrupted pipeline left an ungated encode sitting at the path the
 * gated one is meant to occupy. Video is encoded, judged and uploaded in exactly
 * one place now.
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

/** Resolved from PATH, so the task runs wherever ffmpeg is installed rather
 *  than only on an Apple-Silicon Homebrew box. Set FFMPEG/FFPROBE to point at a
 *  specific build. */
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FFPROBE = process.env.FFPROBE || 'ffprobe';
const BUCKET = 'gs://comfy-org-videos/hub-media';
const PUBLIC_BASE = 'https://media.comfy.org/hub-media';

/** The poster is a placeholder that a playing video replaces within a moment,
 *  so it is sized for the crop, not for pixel-perfect stills. */
const POSTER_WIDTH = 640;

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

console.log(
  `${sources.length} distinct video assets, ${Object.keys(manifest).length} already in manifest`
);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-media-'));
let done = 0,
  skipped = 0,
  failed = 0;
let bytesIn = 0,
  bytesOut = 0;

for (const url of sources) {
  const id = assetId(url);
  if (manifest[id]) {
    skipped++;
    continue;
  }
  if (done >= limit) break;

  const src = path.join(tmp, `${id}.src`);
  const poster = path.join(tmp, `${id}.jpg`);

  try {
    // Probe and poster both read the same local copy, so fetch it once.
    await run('curl', ['-sSL', '--max-time', '300', '-o', src, url]);
    const srcBytes = fs.statSync(src).size;

    const probe = await run(FFPROBE, [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=width,height:format=duration',
      '-of',
      'json',
      src,
    ]);
    const meta = JSON.parse(probe.stdout);
    const { width: w, height: h } = meta.streams[0];
    const duration = Number(meta.format?.duration ?? 0);

    // A 1s seek lands past most fade-ins, but a very short clip has no 1s mark.
    const seek = duration > 1.5 ? '1' : '0';

    await run(FFMPEG, [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-ss',
      seek,
      '-i',
      src,
      '-frames:v',
      '1',
      '-vf',
      `scale='min(${POSTER_WIDTH},iw)':-2:flags=lanczos`,
      '-q:v',
      '4',
      poster,
    ]);

    const posterBytes = fs.statSync(poster).size;

    if (!dryRun) {
      await run('gcloud', [
        'storage',
        'cp',
        poster,
        `${BUCKET}/posters/${id}.jpg`,
        '--cache-control=public, max-age=31536000, immutable',
      ]);
    }

    // Source dimensions, recorded for the runbook's bucket-vs-manifest diff. No
    // video URL: `encode-video.mjs` decides whether a gated copy exists at all,
    // and the site reads that decision from `hub-media-assets.json`, never from
    // this intermediate manifest.
    manifest[id] = {
      poster: `${PUBLIC_BASE}/posters/${id}.jpg`,
      width: w,
      height: h,
    };

    bytesIn += srcBytes;
    bytesOut += posterBytes;
    done++;
    console.log(
      `  ${id}  ${w}x${h} ${(srcBytes / 1048576).toFixed(2)}MB` +
        ` -> poster ${(posterBytes / 1024).toFixed(0)}KB`
    );
  } catch (err) {
    failed++;
    console.error(`  FAILED ${id}: ${String(err.message).split('\n')[0]}`);
  } finally {
    for (const f of [src, poster]) fs.rmSync(f, { force: true });
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(
  `\ndone=${done} skipped=${skipped} failed=${failed}` +
    (bytesIn
      ? `  ${(bytesIn / 1048576).toFixed(1)}MB of source -> ${(bytesOut / 1024).toFixed(0)}KB of posters`
      : '')
);
