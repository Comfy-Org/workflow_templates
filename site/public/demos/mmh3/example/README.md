# Demo assets

The `/workflows/minimax-h3-multiref` page ships with the workflow's own example
run. The page references these paths unconditionally, so keep every file listed
below committed; a missing file shows as broken media, not as an empty state.

```
keyframes/kf_1.webp  kf_2.webp  kf_3.webp   thumbnails, and the default run inputs
example.mp4                                 the example result
```

The page pins the three references at the first, middle and final frame of the
clip (frames 1, 181 and 362 of a 15s run), so they read as a progression. The
assets are re-encoded for the web (WebP q82 at 768px, H.264 CRF 26), which is
why a default run does not reproduce the example byte for byte.

Only the files named above are committed — see `.gitignore`. Anything else you
drop here while testing stays local, so unreleased renders and personal images
cannot be published by accident.
