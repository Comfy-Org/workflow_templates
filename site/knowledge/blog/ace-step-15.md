# ACE-Step 1.5 is Now Available in ComfyUI

**Date**: 2026-02-04
**Source**: https://blog.comfy.org/p/ace-step-15-is-now-available-in-comfyui
**Category**: model-release

## Key Facts

- Open-source music generation model with commercial-grade quality
- Generates full songs in under 10 seconds on consumer hardware
- Hybrid LM + DiT architecture: Language Model plans song structure, DiT handles audio synthesis
- Full 4-minute song in ~1 second on RTX 5090, under 10 seconds on RTX 3090
- 50+ language support with strong support for English, Chinese, Japanese, Korean, Spanish, German, French, Portuguese, Italian, Russian
- Chain-of-Thought planning for coherent long-form compositions
- Distribution Matching Distillation from Z-Image's DMD2
- Intrinsic Reinforcement Learning eliminates biases from external reward models
- Musical coherence score: 4.72

## Benchmarks

- RTX 5090: ~1 second for full 4-minute song
- RTX 3090: under 10 seconds for full song
- Musical coherence: 4.72

## Related Templates

- audio_ace_step_1_5_checkpoint
