# VAEDecodeAudio

**Category**: latent/audio

**Display Name**: VAE Decode Audio

**Also known as**: latent to audio

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/VAEDecodeAudio/en.md)

The VAEDecodeAudio node converts latent representations back into audio waveforms using a Variational Autoencoder. It takes encoded audio samples and processes them through the VAE to reconstruct the original audio, applying normalization to ensure consistent output levels. The resulting audio is returned with a standard sample rate of 44100 Hz.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `samples` | LATENT | Yes | - | The encoded audio samples in latent space that will be decoded back to audio waveform |
| `vae` | VAE | Yes | - | The Variational Autoencoder model used to decode the latent samples into audio |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `AUDIO` | AUDIO | The decoded audio waveform with normalized volume and 44100 Hz sample rate |

**Source**: `comfy_extras/nodes_audio.py`

**Used in 7 template(s)**
