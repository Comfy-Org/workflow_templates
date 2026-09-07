import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const run = promisify(execFile);

const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FFPROBE = process.env.FFPROBE || 'ffprobe';
const BUCKET = 'gs://comfy-org-videos/hub-media';
const PUBLIC_BASE = 'https://media.comfy.org/hub-media';

const POSTER_WIDTH = 640;

const args = process.argv.slice(2);
function positiveInt(flag, raw, fallback) {
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1)
    throw new Error(`--${flag} must be a whole number of at least 1, got: ${raw}`);
  return n;
}

const limit = positiveInt(
  'limit',
  args.find((a) => a.startsWith('--limit='))?.split('=')[1],
  Infinity
);
const dryRun = args.includes('--dry-run');
const manifestPath = args.find((a) => a.startsWith('--manifest='))?.split('=')[1];
if (!manifestPath) throw new Error('--manifest=<path> is required');
const gridPath = args.find((a) => a.startsWith('--grid='))?.split('=')[1];
if (!gridPath) throw new Error('--grid=<path> is required');

const isVideo = (u) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u);
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
