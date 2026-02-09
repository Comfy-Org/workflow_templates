# VAEEncodeAudio

**Category**: latent/audio

**Display Name**: VAE Encode Audio

**Also known as**: audio to latent

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/VAEEncodeAudio/en.md)

The VAEEncodeAudio node converts audio data into a latent representation using a Variational Autoencoder (VAE). It takes audio input and processes it through the VAE to generate compressed latent samples that can be used for further audio generation or manipulation tasks. The node automatically resamples audio to 44100 Hz if needed before encoding.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `audio` | AUDIO | Yes | - | The audio data to encode, containing waveform and sample rate information |
| `vae` | VAE | Yes | - | The Variational Autoencoder model used to encode the audio into latent space |

**Note:** The audio input is automatically resampled to 44100 Hz if the original sample rate differs from this value.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `LATENT` | LATENT | The encoded audio representation in latent space, containing compressed samples |

**Source**: `comfy_extras/nodes_audio.py`

**Used in 1 template(s)**
