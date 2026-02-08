# TextEncodeAceStepAudio1.5

**Category**: conditioning

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/TextEncodeAceStepAudio1.5/en.md)

The TextEncodeAceStepAudio1.5 node prepares text and audio-related metadata for use with the AceStepAudio 1.5 model. It takes descriptive tags, lyrics, and musical parameters, then uses a CLIP model to convert them into a conditioning format suitable for audio generation.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| clip | Clip | — |  |
| tags | String | — |  |
| lyrics | String | — |  |
| seed | Int | 0 |  |
| bpm | Int | 120 |  |
| duration | Float | 120.0 |  |
| timesignature | Combo | — |  |
| language | Combo | — |  |
| keyscale | Combo | — |  |
| generate_audio_codes | Boolean | True | Enable the LLM that generates audio codes. This can be slow but will increase the quality of the generated audio. Turn this off if you are giving the model an audio reference. |
| cfg_scale | Float | 2.0 |  |
| temperature | Float | 0.85 |  |
| top_p | Float | 0.9 |  |
| top_k | Int | 0 |  |

## Outputs

| Output | Type |
|--------|------|
| )],
        )

    @classmethod
    def execute(cls, clip, tags, lyrics, seed, bpm, duration, timesignature, language, keyscale, generate_audio_codes, cfg_scale, temperature, top_p, top_k) -> io.NodeOutput:
        tokens = clip.tokenize(tags, lyrics=lyrics, bpm=bpm, duration=duration, timesignature=int(timesignature), language=language, keyscale=keyscale, seed=seed, generate_audio_codes=generate_audio_codes, cfg_scale=cfg_scale, temperature=temperature, top_p=top_p, top_k=top_k)
        conditioning = clip.encode_from_tokens_scheduled(tokens)
        return io.NodeOutput(conditioning | Conditioning |

**Source**: `comfy_extras/nodes_ace.py`

**Used in 3 template(s)**
