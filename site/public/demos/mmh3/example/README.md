# Demo fixtures (local-only, gitignored)

The `/workflows/minimax-h3-multiref` page looks for these files and degrades
gracefully when they are absent — empty reference slots say "drop", and the
result panel says no example is configured.

```
keyframes/kf_1.png  kf_2.png  kf_3.png   thumbnails, and the default run inputs
example.mp4                              the example result
```

The three references are anchored at frames 1, 121 and 241 of a 15s clip
(0:00, 0:05 and 0:10), so they should read as a coherent progression.

**Do not commit anything here without confirming the subjects and renders are
cleared for publication** — this page is public once deployed.
