# Breeze TTS 2 / Breeze voice nodes (partner audio family)

Source of truth: `comfy_api_nodes/nodes_breezeblue.py` (schema + limits), `comfy_api_nodes/apis/breezeblue.py`,
`the docs repo's `built-in-nodes/`Breeze<X>.mdx`, vendor docs `docs.breezeblue.ai`, model card
`huggingface.co/BreezeBlue/Breeze-TTS-2` (open weights, English + Chinese, released 2026-08).

Six nodes, category `partner/audio/Breeze`:

| node | api? | inputs → outputs |
|---|---|---|
| `BreezeVoiceSelector` | **no** (`is_api_node=False`, no credits) | `language` DynamicCombo (English / Chinese / Japanese / Korean / French / German / Portuguese / Spanish, each a featured-voice combo, or `custom` + `voice_id`) → `voice` (`BREEZE_VOICE`) |
| `BreezeTextToSpeech` | yes | `voice`, `text` (1–1000 chars), `language` (DynamicCombo; en/zh additionally expose `model`), `delivery` (`neutral` → `speaker_boost`; `directed` → `instructions` + `strength` 1–10), `speed` 0.5–2.0 (tempo only), `seed` → AUDIO |
| `BreezeVoiceClone` | yes | `audio` (**≥3 s**; only the first **60 s** are read, Breeze keeps the best ≤30 s normalised to −18 LUFS), `remove_background_noise`, `seed` → `voice` + `preview` |
| `BreezeVoiceDesign` | yes | `description` (3–500 chars), `preview_text` (1–500, **the voice is built from this line**), `language` + `model`, `strength` 1–10, `seed` → `voice` (named after the description) + `preview` |
| `BreezeVoiceRemix` | yes | `voice`, `change` (`custom` → prompt, or `preset` → 27 named presets), `strength` 1–10, `seed` → `voice` + `preview` |
| `BreezeVoiceLocalize` | yes | `voice`, `language` → a copy of the voice that speaks that language natively → `voice` (named `<voice> (<language>)`) + `preview` |

- Models: `Breeze TTS 2` = `breeze-tts-2` (English/Chinese only; either model is allowed for those two), every other
  language forces `breeze-tts-2-multilingual` = 51 languages. The node's `language` combo lists all 51.
- **Vocal events are performed, not read**: English `(sighs)`, `(laughs)`, `(whispers)`; Chinese brackets `[叹气]`, `[笑]`,
  `[咳嗽]`. 34 shared events across all 51 languages.
- Remix presets are 27, in 8 groups: age (4) · gender (2) · pitch (2) · pace (2) · energy (2) · emotion (8: excited,
  angry, sad, afraid, awkward, sarcastic, restrained grief, painful) · role-play (3) · delivery (4: laughing, crying,
  whispered, singing). Remix stays in the voice's own language — cross-language is Localize's job.
- `speaker_boost` is ignored when `instructions` is non-empty and `strength > 1`; `strength` = the API's `guidance_scale`.
- Custom voice ids must match `[A-Za-z0-9_-]+` (`voc_…`).

## Wiring pattern that shipped (all voice tools in one file)

`LoadAudio → BreezeVoiceClone → PreviewAny ("Preview as Text (voice id)") → BreezeVoiceSelector (custom) →
BreezeTextToSpeech → SaveAudioAdvanced`, with the id also going `PreviewAny → StringConcatenate (prefix) → SaveText`
so it can be reused in a later run. A second, unconnected `BreezeVoiceSelector` (a featured voice) sits in an
optional group as the alternative source; Remix and Design live in a bypassed "tools" group (select + `Ctrl+B`).

- **ComfyUI has no remote audio preview**: a `preview` output shows nothing until a `SaveAudioAdvanced` (or another
  audio-consuming node) is wired downstream. Say that in the note instead of letting users think the clone failed.
- Notes for this family must not carry pricing/credits language (see the skill's Note Copy Guidelines); the price
  badges on the nodes already show credits per run.
