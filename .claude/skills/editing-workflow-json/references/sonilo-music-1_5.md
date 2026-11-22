# Sonilo Music 1.5 (`SoniloMusic15`): lyrics block and template note sizing

## Prompt shape

One `prompt` widget, 2000 characters total, holds both halves: the musical direction (genre, tempo, mood, instruments,
vocal type, how long the track should feel, where it will be used), then a literal `Lyrics:` line and the words under it.
The vendor's own FAQ wording for the direction is: mood, genre, tempo, instruments, duration, vocals, and the scene.

For a music bed rather than a song, the direction must say so: `instrumental`, `no vocals` or `lyric-free`.

Do **not** link the vendor page in a note (user rule): describe the format in the note, no URLs.

```
Warm indie folk at 104 BPM, fingerpicked guitar, brushed drums, upright bass, male vocal.

Lyrics:
[Verse]
Flour on the wooden board

[Chorus]
Roll it out, roll it thin
```

- Section tags (`[Verse]`, `[Chorus]`, `[Bridge]`) sit on their own line above the lines they cover; a section that comes
  back writes its tag again.
- No `Lyrics:` block: the model writes its own words from the direction alone.

## Duration and seed

- `duration` is a dynamic combo. `auto` fits the song to the lyrics. `custom` + `seconds` (10 to 360) forces a length:
  lyrics that do not fit are cut, short lyrics are repeated. The node caps at 360 s even though the vendor's web tool
  advertises up to 8 minutes: document the node's range, not the website's.
- `seed` only decides whether the node re-runs. The same seed returns a different song every run.

Measured: ~1100 characters of lyrics across six sections, inside a 1318-character prompt, came back as a 2:30 MP3
(44.1 kHz stereo, 240 kbps) through `SaveAudioAdvanced`.

## Template note sizing

A user-exported copy of this graph ships a `MarkdownNote` (id 3) at 316x333 whose widget is the placeholder `Note here:`.
Fill that widget (both `widgets_values` and `widgets_values_named.text`), then size the box to the copy: `1100x860` fits
about 2200 characters with the two workflow nodes untouched above it, and `extra.ds` `{"scale": 0.7, "offset": [-140.8,
-52]}` opens the template framed. Leaving the export's default box makes the note scroll, which reads as a broken template.

Verify the fit rather than eyeballing it: read the note widget's element and compare `scrollHeight` with `clientHeight`
(equal = nothing hidden).
