# EmptyAceStep1.5LatentAudio

**Category**: latent/audio

**Display Name**: Empty Ace Step 1.5 Latent Audio

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/EmptyAceStep1.5LatentAudio/en.md)

The Empty Ace Step 1.5 Latent Audio node creates an empty latent tensor designed for audio processing. It generates a silent audio latent of a specified duration and batch size, which can be used as a starting point for audio generation workflows in ComfyUI. The node calculates the latent length based on the input seconds and a fixed sample rate.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| seconds | Float | 120.0 |  |
| batch_size | Int | 1 | The number of latent images in the batch. |

## Outputs

| Output | Type |
|--------|------|
| )],
        )

    @classmethod
    def execute(cls, seconds, batch_size) -> io.NodeOutput:
        length = round((seconds * 48000 / 1920))
        latent = torch.zeros([batch_size, 64, length], device=comfy.model_management.intermediate_device() | Latent |

**Source**: `comfy_extras/nodes_ace.py`

**Used in 3 template(s)**
