import { describe, it, expect } from 'vitest';
import { extractWorkflowModels } from '../../scripts/lib/extract/model-metadata';

describe('extractWorkflowModels', () => {
  it('extracts checkpoint loader models', () => {
    const workflow = {
      nodes: [{ type: 'CheckpointLoaderSimple', widgets_values: ['sd_xl_base_1.0.safetensors'] }],
    };
    const result = extractWorkflowModels(workflow);
    expect(result).toEqual([
      {
        kind: 'checkpoint',
        filename: 'sd_xl_base_1.0.safetensors',
        nodeType: 'CheckpointLoaderSimple',
      },
    ]);
  });

  it('extracts multiple model types', () => {
    const workflow = {
      nodes: [
        { type: 'UNETLoader', widgets_values: ['flux1-dev.safetensors'] },
        { type: 'VAELoader', widgets_values: ['ae.safetensors'] },
        { type: 'CLIPLoader', widgets_values: ['clip_l.safetensors'] },
        { type: 'LoraLoader', widgets_values: ['my_lora.safetensors', 1.0, 1.0] },
      ],
    };
    const result = extractWorkflowModels(workflow);
    expect(result).toHaveLength(4);
    expect(result.find((m) => m.kind === 'unet')?.filename).toBe('flux1-dev.safetensors');
    expect(result.find((m) => m.kind === 'vae')?.filename).toBe('ae.safetensors');
    expect(result.find((m) => m.kind === 'clip')?.filename).toBe('clip_l.safetensors');
    expect(result.find((m) => m.kind === 'lora')?.filename).toBe('my_lora.safetensors');
  });

  it('deduplicates by kind+filename', () => {
    const workflow = {
      nodes: [
        { type: 'CLIPLoader', widgets_values: ['clip_l.safetensors'] },
        { type: 'CLIPLoader', widgets_values: ['clip_l.safetensors'] },
      ],
    };
    const result = extractWorkflowModels(workflow);
    expect(result).toHaveLength(1);
  });

  it('ignores non-model strings', () => {
    const workflow = {
      nodes: [
        { type: 'UNETLoader', widgets_values: ['flux1-dev.safetensors', 'fp8_e4m3fn', true] },
      ],
    };
    const result = extractWorkflowModels(workflow);
    expect(result).toHaveLength(1);
    expect(result[0].filename).toBe('flux1-dev.safetensors');
  });

  it('ignores unknown node types', () => {
    const workflow = {
      nodes: [
        { type: 'KSampler', widgets_values: [42, 'euler', 'normal'] },
        { type: 'SaveImage', widgets_values: ['ComfyUI'] },
      ],
    };
    const result = extractWorkflowModels(workflow);
    expect(result).toHaveLength(0);
  });

  it('handles missing nodes gracefully', () => {
    expect(extractWorkflowModels({})).toEqual([]);
    expect(extractWorkflowModels({ nodes: [] })).toEqual([]);
  });

  it('handles object-form widgets_values', () => {
    const workflow = {
      nodes: [{ type: 'VAELoader', widgets_values: { model: 'vae.safetensors', other: 123 } }],
    };
    const result = extractWorkflowModels(workflow);
    expect(result).toHaveLength(1);
    expect(result[0].filename).toBe('vae.safetensors');
  });
});
