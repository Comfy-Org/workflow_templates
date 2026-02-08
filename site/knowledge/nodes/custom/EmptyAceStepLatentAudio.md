# EmptyAceStepLatentAudio

**Category**: latent/audio

**Display Name**: Empty Ace Step 1.0 Latent Audio

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/EmptyAceStepLatentAudio/en.md)

The EmptyAceStepLatentAudio node creates empty latent audio samples of a specified duration. It generates a batch of silent audio latents with zeros, where the length is calculated based on the input seconds and audio processing parameters. This node is useful for initializing audio processing workflows that require latent representations.

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
        length = int(seconds * 44100 / 512 / 8)
        latent = torch.zeros([batch_size, 8, 16, length], device=comfy.model_management.intermediate_device() | Latent |

**Source**: `comfy_extras/nodes_ace.py`

**Used in 2 template(s)**
