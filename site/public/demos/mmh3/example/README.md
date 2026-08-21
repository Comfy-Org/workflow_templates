# Demo assets

The `/workflows/minimax-h3-multiref` page ships with the workflow's own example
run, and falls back gracefully if these are missing — empty reference slots say
"drop", and the result panel says no example is configured.

```
keyframes/kf_1.webp  kf_2.webp  kf_3.webp   thumbnails, and the default run inputs
example.mp4                                 the example result
```

The references are anchored at frames 1, 121 and 241 of a 15s clip (0:00, 0:05
and 0:10), so they read as a progression. They are re-encoded for the web
(WebP q82 at 768px, H.264 CRF 26), which is why a default run does not
reproduce the example byte for byte.

Only the files named above are committed — see `.gitignore`. Anything else you
drop here while testing stays local, so unreleased renders and personal images
cannot be published by accident.
