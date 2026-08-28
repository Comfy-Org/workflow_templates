/**
 * Re-encode the hub's card videos against a VMAF floor.
 *
 * The first pass used SSIM >= 0.96 and shipped crf30. That was wrong: SSIM
 * under-penalises loss of high-frequency detail, so files full of bubbles, hair
 * and water scored 0.966 while VMAF scored them 78. Sampling the shipped corpus
 * put most files in the mid-80s. VMAF correlates far better with what a viewer
 * actually sees, so it is the gate now.
 *
 * The cap is 1920, not 1280. 1280 was chosen from the card box (max 1044 device
 * px) and ignored that the same file is the detail-page hero at up to 2044.
 * Measured on two files: 1280@crf18 and 1920@crf23 come out the same size, and
 * native scores 3 to 4 VMAF points higher. Downscaling bought nothing.
 *
 * Both inputs are scaled to the SOURCE dimensions and have their timestamps
 * reset before scoring: mismatched size makes VMAF refuse, and an edit-list
 * offset makes it compare the wrong frames. Both bit this project already.
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
const MAX_WIDTH = 1920;
const FLOOR = Number(process.argv.slice(2).find((a) => a.startsWith('--floor='))?.split('=')[1] ?? 93);
/** Start where the old pass ended, then step down only as far as needed. */
const LADDER = [26, 23, 20, 18];
/** Below this, keeping the original beats shipping a second copy. */
const MIN_SAVING = Number(process.argv.slice(2).find((a) => a.startsWith('--min-saving='))?.split('=')[1] ?? 0.25);

/** Encoded files are kept here, not in a temp dir that vanishes. An upload can
 *  then be retried without paying for the encode again: a gcloud token expiring
 *  mid-run once cost 186 files' worth of CPU for nothing. */
const arg = (n) => process.argv.slice(2).find((a) => a.startsWith(`--${n}=`))?.split('=')[1];
const gridPath = arg('grid'), manifestPath = arg('manifest'), reportPath = arg('report');
const limit = Number(arg('limit') ?? Infinity);
const stageDir = arg('stage') ?? '/tmp/hub-video-stage';
fs.mkdirSync(stageDir, { recursive: true });
const uploadOnly = process.argv.includes('--upload-only');
if (!gridPath || !manifestPath || !reportPath) throw new Error('--grid --manifest --report required');

const srcOf = new Map();
for (const t of JSON.parse(fs.readFileSync(gridPath, 'utf8')))
  for (const u of t.thumbnails ?? [])
    if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(u))
      srcOf.set(u.split('?')[0].split('/').pop().replace(/\.[^.]+$/, ''), u);

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const report = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : {};

async function vmaf(candidate, source, w, h) {
  const r = await run(FFMPEG, ['-hide_banner', '-i', candidate, '-i', source, '-lavfi',
    `[0:v]scale=${w}:${h}:flags=lanczos,setpts=PTS-STARTPTS[a];[1:v]setpts=PTS-STARTPTS[b];[a][b]libvmaf=n_subsample=3`,
    '-f', 'null', '-'], { maxBuffer: 1 << 26 }).catch((e) => ({ stderr: e.stderr ?? '' }));
  const m = /VMAF score:\s*([0-9.]+)/.exec(r.stderr ?? '');
  return m ? Number(m[1]) : null;
}

const CONCURRENCY = Number(arg('jobs') ?? 4);
const ids = Object.keys(manifest);
console.log(`${ids.length} videos, floor VMAF ${FLOOR}, ${Object.keys(report).length} already done`);
let done = 0, kept = 0, failed = 0, bIn = 0, bOut = 0;
const queue = ids.filter((id) => !report[id]?.pass).slice(0, limit);
let cursor = 0;

/** One asset, start to finish. Each worker gets its own directory so the
 *  temp filenames cannot collide between concurrent jobs. */
/** Upload with a couple of retries, since a transient auth blip should not cost an encode. */
async function uploadStaged(id, file) {
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await run('gcloud', ['storage', 'cp', file, `${BUCKET}/video/${id}.mp4`,
        '--cache-control=public, max-age=31536000, immutable']);
      return;
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

async function processOne(id, dir) {
  // Already encoded on a previous run, just needs pushing.
  const staged = path.join(stageDir, `${id}.mp4`);
  if (uploadOnly || fs.existsSync(staged)) {
    if (fs.existsSync(staged)) {
      try {
        await uploadStaged(id, staged);
        const prev = report[id] ?? {};
        report[id] = { ...prev, pass: true, skip: undefined, outBytes: fs.statSync(staged).size };
        done++;
        console.log(`  ${id.slice(0, 8)}  uploaded from stage (${(fs.statSync(staged).size / 1024).toFixed(0)}KB)`);
      } catch {
        failed++;
        console.error(`  ${id.slice(0, 8)}  upload retry failed`);
      }
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
      return;
    }
    if (uploadOnly) return;
  }

  const src = path.join(dir, 'src.mp4');
  try {
    await run('curl', ['-sSL', '--max-time', '300', '--retry', '2', '-o', src, srcOf.get(id)]);
    const srcBytes = fs.statSync(src).size;
    const st = JSON.parse((await run(FFPROBE, ['-v', 'error', '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height', '-of', 'json', src])).stdout).streams[0];
    const vf = st.width > MAX_WIDTH
      ? `scale=${MAX_WIDTH}:-2:flags=lanczos`
      : 'scale=trunc(iw/2)*2:trunc(ih/2)*2';

    let chosen = null;
    for (const crf of LADDER) {
      const cand = path.join(dir, `c${crf}.mp4`);
      await run(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-vf', vf,
        '-c:v', 'libx264', '-crf', String(crf), '-preset', 'slow', '-profile:v', 'high',
        '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', cand], { maxBuffer: 1 << 26 });
      const score = await vmaf(cand, src, st.width, st.height);
      chosen = { crf, score, bytes: fs.statSync(cand).size, file: cand };
      if (score !== null && score >= FLOOR) break;
    }

    // A file whose source is already efficiently encoded cannot be improved
    // without visible loss: reaching the floor saves so little that we would be
    // trading quality for nothing, and adding an asset to maintain for nothing.
    // One measured case: 42% off at VMAF 93.3, but 22% at 96.2 and 0% at 97.5.
    if (chosen.bytes >= srcBytes * (1 - MIN_SAVING)) {
      report[id] = { pass: false, skip: 'no-gain', vmaf: chosen.score, crf: chosen.crf };
      kept++;
      console.log(`  ${id.slice(0, 8)}  keep original (only ${(100 - chosen.bytes * 100 / srcBytes).toFixed(0)}% off at VMAF ${chosen.score?.toFixed(1)})`);
      return;
    }

    const staged = path.join(stageDir, `${id}.mp4`);
    fs.copyFileSync(chosen.file, staged);
    try {
      await uploadStaged(id, staged);
    } catch {
      // Encode survives in stageDir; rerun with --upload-only to push it.
      report[id] = { pass: false, skip: 'upload-failed', vmaf: chosen.score, crf: chosen.crf, srcBytes, outBytes: chosen.bytes };
      console.log(`  ${id.slice(0, 8)}  ENCODED but upload failed, staged for retry`);
      return;
    }
    report[id] = { pass: true, vmaf: chosen.score, crf: chosen.crf, srcBytes, outBytes: chosen.bytes };
    bIn += srcBytes; bOut += chosen.bytes; done++;
    console.log(`  ${id.slice(0, 8)}  crf${chosen.crf}  VMAF ${chosen.score?.toFixed(1)}  ${(srcBytes / 1048576).toFixed(2)}MB -> ${(chosen.bytes / 1024).toFixed(0)}KB  (${(100 - chosen.bytes * 100 / srcBytes).toFixed(1)}% off)`);
  } catch (err) {
    failed++; report[id] = { pass: false, skip: 'error', note: String(err.message).slice(0, 90) };
    console.error(`  ${id.slice(0, 8)}  ERROR`);
  } finally {
    for (const f of fs.readdirSync(dir)) fs.rmSync(path.join(dir, f), { force: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  }
}

const roots = [];
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-vmaf-'));
  roots.push(dir);
  while (cursor < queue.length) await processOne(queue[cursor++], dir);
}));
for (const d of roots) fs.rmSync(d, { recursive: true, force: true });

console.log(`\ndone=${done} kept-original=${kept} failed=${failed}` +
  (bIn ? `  ${(bIn / 1048576).toFixed(0)}MB -> ${(bOut / 1048576).toFixed(0)}MB (${(100 - bOut * 100 / bIn).toFixed(1)}% off)` : ''));
