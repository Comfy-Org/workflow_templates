import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const run = promisify(execFile);
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FFPROBE = process.env.FFPROBE || 'ffprobe';
const BUCKET = 'gs://comfy-org-videos/hub-media';
const MAX_WIDTH = 1920;
function threshold(flag, value, min, max) {
  if (!Number.isFinite(value) || value < min || value > max)
    throw new Error(`--${flag} must be a number between ${min} and ${max}, got: ${value}`);
  return value;
}

const FLOOR = threshold(
  'floor',
  Number(
    process.argv
      .slice(2)
      .find((a) => a.startsWith('--floor='))
      ?.split('=')[1] ?? 95
  ),
  0,
  100
);
const LADDER = [26, 23, 20, 18];
const MIN_SAVING = threshold(
  'min-saving',
  Number(
    process.argv
      .slice(2)
      .find((a) => a.startsWith('--min-saving='))
      ?.split('=')[1] ?? 0.25
  ),
  0,
  1
);

const arg = (n) =>
  process.argv
    .slice(2)
    .find((a) => a.startsWith(`--${n}=`))
    ?.split('=')[1];
const gridPath = arg('grid'),
  manifestPath = arg('manifest'),
  reportPath = arg('report');
function positiveInt(flag, raw, fallback) {
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1)
    throw new Error(`--${flag} must be a whole number of at least 1, got: ${raw}`);
  return n;
}

const limit = positiveInt('limit', arg('limit'), Infinity);
const CONCURRENCY = positiveInt('jobs', arg('jobs'), 4);
const stageDir = arg('stage') ?? '/tmp/hub-video-stage';
fs.mkdirSync(stageDir, { recursive: true });
const uploadOnly = process.argv.includes('--upload-only');
if (!gridPath || !manifestPath || !reportPath)
  throw new Error('--grid --manifest --report required');

const srcOf = new Map();
for (const t of JSON.parse(fs.readFileSync(gridPath, 'utf8')))
  for (const u of t.thumbnails ?? [])
    if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(u))
      srcOf.set(
        u
          .split('?')[0]
          .split('/')
          .pop()
          .replace(/\.[^.]+$/, ''),
        u
      );

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const overridePath = new URL('./reviewed-overrides.json', import.meta.url);
const overrides = JSON.parse(fs.readFileSync(overridePath, 'utf8')).keep ?? {};
const report = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : {};

async function vmaf(candidate, source, w, h) {
  const r = await run(
    FFMPEG,
    [
      '-hide_banner',
      '-i',
      candidate,
      '-i',
      source,
      '-lavfi',
      `[0:v]scale=${w}:${h}:flags=lanczos,setpts=PTS-STARTPTS[a];[1:v]setpts=PTS-STARTPTS[b];[a][b]libvmaf=n_subsample=3`,
      '-f',
      'null',
      '-',
    ],
    { maxBuffer: 1 << 26 }
  ).catch((e) => ({ stderr: e.stderr ?? '' }));
  const m = /VMAF score:\s*([0-9.]+)/.exec(r.stderr ?? '');
  return m ? Number(m[1]) : null;
}

const ids = Object.keys(manifest);
console.log(
  `${ids.length} videos, floor VMAF ${FLOOR}, ${Object.keys(report).length} already done`
);
let done = 0,
  kept = 0,
  failed = 0,
  bIn = 0,
  bOut = 0;
const queue = ids.filter((id) => !report[id]?.pass).slice(0, limit);
let cursor = 0;

async function uploadStaged(id, file) {
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await run('gcloud', [
        'storage',
        'cp',
        file,
        `${BUCKET}/video/${id}.mp4`,
        '--cache-control=public, max-age=31536000, immutable',
      ]);
      return;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

function stagedGateFailure(id, bytes) {
  if (overrides[id]) return null;

  const prev = report[id];
  if (!prev) return 'no report entry, so nothing says what it scored';
  if (prev.outBytes !== bytes)
    return `size ${bytes} does not match the judged encode (${prev.outBytes})`;
  if (typeof prev.vmaf !== 'number') return 'no recorded VMAF';
  if (prev.vmaf < FLOOR) return `VMAF ${prev.vmaf.toFixed(1)} below the current floor ${FLOOR}`;
  if (!(prev.srcBytes > 0)) return 'no recorded source size, so the saving cannot be checked';
  if (bytes >= prev.srcBytes * (1 - MIN_SAVING))
    return `saves only ${(100 - (bytes * 100) / prev.srcBytes).toFixed(0)}%, under the current ${(MIN_SAVING * 100).toFixed(0)}%`;
  return null;
}

async function processOne(id, dir) {
  const staged = path.join(stageDir, `${id}.mp4`);
  if (fs.existsSync(staged)) {
    const stagedBytes = fs.statSync(staged).size;
    const ungated = stagedGateFailure(id, stagedBytes);
    if (ungated) {
      report[id] = { ...(report[id] ?? {}), pass: false, skip: 'stage-unverified', note: ungated };
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
      console.warn(
        `  ${id.slice(0, 8)}  staged file not verifiable: ${ungated}` +
          (uploadOnly ? ', skipped' : ', re-encoding')
      );
      if (uploadOnly) return;
    } else {
      try {
        await uploadStaged(id, staged);
        const prev = report[id] ?? {};
        report[id] = {
          ...prev,
          pass: true,
          skip: undefined,
          note: undefined,
          outBytes: stagedBytes,
        };
        done++;
        console.log(
          `  ${id.slice(0, 8)}  uploaded from stage (VMAF ${prev.vmaf?.toFixed(1) ?? 'reviewed'}, ${(stagedBytes / 1024).toFixed(0)}KB)`
        );
      } catch {
        failed++;
        console.error(`  ${id.slice(0, 8)}  upload retry failed`);
      }
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
      return;
    }
  } else if (uploadOnly) {
    return;
  }

  const src = path.join(dir, 'src.mp4');
  try {
    await run('curl', ['-sSL', '--max-time', '300', '--retry', '2', '-o', src, srcOf.get(id)]);
    const srcBytes = fs.statSync(src).size;
    const st = JSON.parse(
      (
        await run(FFPROBE, [
          '-v',
          'error',
          '-select_streams',
          'v:0',
          '-show_entries',
          'stream=width,height',
          '-of',
          'json',
          src,
        ])
      ).stdout
    ).streams[0];
    const vf =
      st.width > MAX_WIDTH
        ? `scale=${MAX_WIDTH}:-2:flags=lanczos`
        : 'scale=trunc(iw/2)*2:trunc(ih/2)*2';

    let chosen = null;
    for (const crf of LADDER) {
      const cand = path.join(dir, `c${crf}.mp4`);
      await run(
        FFMPEG,
        [
          '-hide_banner',
          '-loglevel',
          'error',
          '-y',
          '-i',
          src,
          '-vf',
          vf,
          '-c:v',
          'libx264',
          '-crf',
          String(crf),
          '-preset',
          'slow',
          '-profile:v',
          'high',
          '-pix_fmt',
          'yuv420p',
          '-an',
          '-movflags',
          '+faststart',
          cand,
        ],
        { maxBuffer: 1 << 26 }
      );
      const score = await vmaf(cand, src, st.width, st.height);
      chosen = { crf, score, bytes: fs.statSync(cand).size, file: cand };
      if (score !== null && score >= FLOOR) break;
    }

    if (overrides[id]) {
      const staged = path.join(stageDir, `${id}.mp4`);
      fs.copyFileSync(chosen.file, staged);
      await uploadStaged(id, staged);
      report[id] = {
        pass: true,
        vmaf: chosen.score,
        crf: chosen.crf,
        srcBytes,
        outBytes: chosen.bytes,
        reviewed: true,
      };
      done++;
      console.log(
        `  ${id.slice(0, 8)}  crf${chosen.crf}  VMAF ${chosen.score?.toFixed(1)}  REVIEWED OVERRIDE, shipped`
      );
      return;
    }

    if (chosen.score === null || chosen.score < FLOOR) {
      report[id] = { pass: false, skip: 'below-floor', vmaf: chosen.score, crf: chosen.crf };
      kept++;
      console.log(
        `  ${id.slice(0, 8)}  keep original (best VMAF ${chosen.score?.toFixed(1) ?? 'n/a'} < floor ${FLOOR})`
      );
      return;
    }

    if (chosen.bytes >= srcBytes * (1 - MIN_SAVING)) {
      report[id] = { pass: false, skip: 'no-gain', vmaf: chosen.score, crf: chosen.crf };
      kept++;
      console.log(
        `  ${id.slice(0, 8)}  keep original (only ${(100 - (chosen.bytes * 100) / srcBytes).toFixed(0)}% off at VMAF ${chosen.score?.toFixed(1)})`
      );
      return;
    }

    const staged = path.join(stageDir, `${id}.mp4`);
    fs.copyFileSync(chosen.file, staged);
    try {
      await uploadStaged(id, staged);
    } catch {
      report[id] = {
        pass: false,
        skip: 'upload-failed',
        vmaf: chosen.score,
        crf: chosen.crf,
        srcBytes,
        outBytes: chosen.bytes,
      };
      console.log(`  ${id.slice(0, 8)}  ENCODED but upload failed, staged for retry`);
      return;
    }
    report[id] = {
      pass: true,
      vmaf: chosen.score,
      crf: chosen.crf,
      srcBytes,
      outBytes: chosen.bytes,
    };
    bIn += srcBytes;
    bOut += chosen.bytes;
    done++;
    console.log(
      `  ${id.slice(0, 8)}  crf${chosen.crf}  VMAF ${chosen.score?.toFixed(1)}  ${(srcBytes / 1048576).toFixed(2)}MB -> ${(chosen.bytes / 1024).toFixed(0)}KB  (${(100 - (chosen.bytes * 100) / srcBytes).toFixed(1)}% off)`
    );
  } catch (err) {
    failed++;
    report[id] = { pass: false, skip: 'error', note: String(err.message).slice(0, 90) };
    console.error(`  ${id.slice(0, 8)}  ERROR`);
  } finally {
    for (const f of fs.readdirSync(dir)) fs.rmSync(path.join(dir, f), { force: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  }
}

const roots = [];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-vmaf-'));
    roots.push(dir);
    while (cursor < queue.length) await processOne(queue[cursor++], dir);
  })
);
for (const d of roots) fs.rmSync(d, { recursive: true, force: true });

console.log(
  `\ndone=${done} kept-original=${kept} failed=${failed}` +
    (bIn
      ? `  ${(bIn / 1048576).toFixed(0)}MB -> ${(bOut / 1048576).toFixed(0)}MB (${(100 - (bOut * 100) / bIn).toFixed(1)}% off)`
      : '')
);
