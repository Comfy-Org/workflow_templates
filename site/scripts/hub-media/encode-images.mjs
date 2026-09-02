/**
 * Right-size the hub's card images. Companion to encode-video.mjs; the rules
 * behind the thresholds below are in README.md.
 *
 * Routes per file rather than per format, because the corpus is mixed:
 *   - animated WebP  -> skipped, needs a WebP encoder this ffmpeg build lacks
 *   - real alpha     -> skipped, JPEG would flatten transparency
 *   - everything else-> JPEG at its own native size, capped at 2048 wide
 *
 * 2048 is not arbitrary: the detail-page hero measures 1022x767 CSS at DPR 2,
 * so 2044 device px. Capping lower would visibly soften that page. The saving
 * comes from format, not from shrinking: one 2048x2048 PNG went 5,871 KB to
 * 827 KB at identical dimensions.
 *
 * Generates locally; uploading is a separate pass so a lapsed gcloud token
 * cannot waste an hour of encoding.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';

const run = promisify(execFile);
/** Resolved from PATH, so the task runs wherever ffmpeg is installed rather
 *  than only on an Apple-Silicon Homebrew box. Set FFMPEG/FFPROBE to point at a
 *  specific build. */
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FFPROBE = process.env.FFPROBE || 'ffprobe';
const PUBLIC_BASE = 'https://media.comfy.org/hub-media';
const MAX_WIDTH = 2048;
const JPEG_Q = 4;

const arg = (n) =>
  process.argv
    .slice(2)
    .find((a) => a.startsWith(`--${n}=`))
    ?.split('=')[1];
const gridPath = arg('grid'),
  outDir = arg('out'),
  manifestPath = arg('manifest');
const limit = Number(arg('limit') ?? Infinity);
if (!gridPath || !outDir || !manifestPath) throw new Error('--grid= --out= --manifest= required');
fs.mkdirSync(outDir, { recursive: true });

const isVideo = (u) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u);
const isImage = (u) => /\.(png|webp|jpe?g)(\?|$)/i.test(u);
const idOf = (u) => path.basename(new URL(u).pathname).replace(/\.[^.]+$/, '');

const grid = JSON.parse(fs.readFileSync(gridPath, 'utf8'));
const sources = new Map();
for (const t of grid)
  for (const u of t.thumbnails ?? []) if (!isVideo(u) && isImage(u)) sources.set(idOf(u), u);

const manifest = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  : {};
console.log(`${sources.size} image assets, ${Object.keys(manifest).length} already done`);

let done = 0,
  skipped = 0,
  animated = 0,
  transparent = 0,
  failed = 0,
  bIn = 0,
  bOut = 0;
const tmp = fs.mkdtempSync('/tmp/hub-img-');

for (const [id, url] of sources) {
  if (manifest[id]) {
    skipped++;
    continue;
  }
  if (done >= limit) break;
  const src = path.join(tmp, 'src');
  try {
    await run('curl', ['-sSL', '--max-time', '180', '--retry', '2', '-o', src, url]);
    const srcBytes = fs.statSync(src).size;

    const probe = JSON.parse(
      (
        await run(FFPROBE, [
          '-v',
          'error',
          '-select_streams',
          'v:0',
          '-show_entries',
          'stream=codec_name,width,height,pix_fmt',
          '-of',
          'json',
          src,
        ])
      ).stdout
    );
    const st = probe.streams?.[0];
    if (!st) throw new Error('no video stream');
    const { codec_name: codec, width: w, height: h, pix_fmt: pix } = st;

    if (/_anim$/.test(codec) || codec === 'gif') {
      manifest[id] = { skip: 'animated', codec, w, h, srcBytes };
      animated++;
      console.log(`  ${id.slice(0, 8)}  skip: animated ${w}x${h}`);
      continue;
    }

    // Only real transparency blocks JPEG, and an alpha channel is usually fully
    // opaque, so the picture has to be measured rather than inferred from the
    // pixel format. Ask ffmpeg instead of matching on the format's NAME, which
    // is what this used to do: `/a$|rgba|argb/` misses `yuva420p`, which is
    // exactly what a WebP carrying alpha decodes to, and also `gbrap`, `ya8` and
    // `pal8`. Those images skipped the check and were flattened onto black.
    //
    // Running it unconditionally is safe because `alphaextract` fails at filter
    // setup on a stream with no alpha plane, and that failure IS the "opaque"
    // answer: no YMIN is printed, so we fall through to the encode. Verified
    // both ways on this ffmpeg: rgba and yuva420p report YMIN, rgb24 and
    // yuvj420p fail without decoding the file.
    const alphaProbe = await run(
      FFMPEG,
      [
        '-hide_banner',
        '-i',
        src,
        '-vf',
        'alphaextract,signalstats,metadata=print:key=lavfi.signalstats.YMIN',
        '-f',
        'null',
        '-',
      ],
      { maxBuffer: 1 << 26 }
    ).catch((e) => ({ stderr: e.stderr ?? '' }));
    const min = /YMIN=(\d+)/.exec(alphaProbe.stderr ?? '')?.[1];
    if (min !== undefined && Number(min) < 255) {
      manifest[id] = { skip: 'transparent', pix, w, h, srcBytes };
      transparent++;
      console.log(`  ${id.slice(0, 8)}  skip: real transparency`);
      continue;
    }

    const outFile = path.join(outDir, `${id}.jpg`);
    const vf = w > MAX_WIDTH ? `scale=${MAX_WIDTH}:-2:flags=lanczos` : 'null';
    await run(FFMPEG, [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-i',
      src,
      '-vf',
      vf,
      '-q:v',
      String(JPEG_Q),
      '-pix_fmt',
      'yuvj420p',
      outFile,
    ]);

    const outBytes = fs.statSync(outFile).size;
    // Never ship a "smaller" file that is bigger than the original.
    if (outBytes >= srcBytes) {
      fs.rmSync(outFile, { force: true });
      manifest[id] = { skip: 'no-gain', srcBytes, outBytes };
      skipped++;
      console.log(`  ${id.slice(0, 8)}  skip: no gain`);
      continue;
    }

    manifest[id] = {
      image: `${PUBLIC_BASE}/images/${id}.jpg`,
      w: Math.min(w, MAX_WIDTH),
      srcBytes,
      outBytes,
    };
    bIn += srcBytes;
    bOut += outBytes;
    done++;
    console.log(
      `  ${id.slice(0, 8)}  ${w}x${h} ${(srcBytes / 1048576).toFixed(2)}MB -> ${(outBytes / 1024).toFixed(0)}KB  (${(100 - (outBytes * 100) / srcBytes).toFixed(1)}% off)`
    );
  } catch (err) {
    failed++;
    manifest[id] = { skip: 'error', note: String(err.message).slice(0, 100) };
    console.error(`  ${id.slice(0, 8)}  ERROR`);
  } finally {
    fs.rmSync(src, { force: true });
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  }
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(
  `\ndone=${done} animated=${animated} transparent=${transparent} skipped=${skipped} failed=${failed}` +
    (bIn
      ? `\n${(bIn / 1048576).toFixed(1)}MB in -> ${(bOut / 1048576).toFixed(1)}MB out (${(100 - (bOut * 100) / bIn).toFixed(1)}% off)`
      : '')
);
