# Hub media pipeline

Regenerates the right-sized card media served from `media.comfy.org`, and the
manifests in `src/data/` that tell the site which assets have a copy.

Card media is delivered at its original encode, which for thumbnails means
multi-megabyte files: one measured **9.67 Mbps for a five second loop**, and 283
images shipped as raw PNG averaging ~2 MB into a box about 400 px wide.

## Requirements

`ffmpeg` (with `libvmaf`), `ffprobe`, and an authenticated `gcloud`. Not run in
CI: it is a maintenance task, like `refresh-ashby-snapshot`.

Both binaries are resolved from `PATH`. Set `FFMPEG` and `FFPROBE` to override,
which you will need if the `ffmpeg` on your `PATH` was built without `libvmaf`:

```sh
FFMPEG=/opt/homebrew/opt/ffmpeg/bin/ffmpeg node scripts/hub-media/encode-video.mjs ...
```

## Running

```sh
# 1. current catalog, since the site builds against the LIVE hub API
curl -s https://comfy.org/workflows/grid.json -o /tmp/grid.json

# 2. posters, and the manifest of ids step 3 works through
node scripts/hub-media/build-posters.mjs --grid=/tmp/grid.json --manifest=/tmp/media.json

# 3. video, quality-gated. The ONLY step that writes video/<id>.mp4.
node scripts/hub-media/encode-video.mjs \
  --grid=/tmp/grid.json --manifest=/tmp/media.json --report=/tmp/vmaf.json \
  --stage=/tmp/stage --floor=95 --min-saving=0.25 --jobs=8

# 4. images
node scripts/hub-media/encode-images.mjs \
  --grid=/tmp/grid.json --out=/tmp/img --manifest=/tmp/images.json
```

Then regenerate `src/data/hub-media-assets.json` (video ids that passed) and
`src/data/hub-media-images.json` (id to extension), and **diff the bucket against
the manifests**. An id in the manifest with no object behind it renders nothing
at all, which is worse than an unoptimised asset.

## Rules that exist because they were learned the hard way

**Quality is gated on VMAF, not SSIM.** SSIM under-penalises loss of
high-frequency detail, which is most of this corpus. It passed a file at 0.9665
that VMAF scored **78.8**, and that file was visibly degraded.

**The floor is 95, not 93.** Every file rejected on sight scored 91 to 93.3;
every file accepted scored 94.2 or better.

**Never downscale to fit the card.** The card box needs ~1044 device px, but the
same asset is the detail-page hero at up to **2044**. Downscaling to 1280 cost
3 to 4 VMAF points *at the same file size*, and on one file the native encode
was both better and 5.5 MB smaller.

**Keep the original when the saving is under 25%.** An already-compressed source
cannot be improved: one gave 42% off at VMAF 93.3, 22% at 96.2, and **0% at
97.5**. There was no version worth shipping.

**Animated WebP is deliberately not touched.** Re-encoding introduced visible
blocking in smooth gradients for ~3% of the total saving, and those files are
already `loading="lazy"`, so visibility was never their problem.

**Compare like with like.** Reset presentation timestamps (`setpts=PTS-STARTPTS`)
and match dimensions before scoring. An edit-list offset once made a fine file
read as 0.7966, and the repair step wasted bitrate "fixing" it.

**Nothing publishes a video before the gate has judged it.** `build-posters.mjs`
used to upload its own crf30 copy to `video/<id>.mp4` in step 2, which is the
path step 3's gated encode occupies. An interrupted run then left an ungated
file sitting where a judged one was meant to be. Step 3 is the only writer now.

**The VMAF floor is asserted, not assumed.** The crf ladder stops early when a
candidate clears the floor, so when *none* of them does it simply ends holding
the last one. Passing that to the byte-saving check shipped sub-floor files that
happened to be small enough. The floor is checked explicitly before upload; only
`reviewed-overrides.json` bypasses it.

**Regenerate immediately before shipping.** The site builds against the live hub
API, so a manifest built days earlier misses new assets. That once left the
carousel hero falling back to its 9.75 MB original.
