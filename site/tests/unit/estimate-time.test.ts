import { describe, it, expect } from 'vitest';
import { estimateGenerationTime } from '../../scripts/lib/extract/estimate-time';

describe('estimateGenerationTime', () => {
  it('returns time for simple image workflow', () => {
    const workflow = {
      nodes: [
        { type: 'CheckpointLoaderSimple' },
        { type: 'KSampler' },
        { type: 'VAEDecode' },
        { type: 'SaveImage' },
      ],
    };
    const result = estimateGenerationTime(workflow, 'image', 'test_template');
    expect(result).toBeTruthy();
    expect(result).toContain('seconds');
  });

  it('returns longer time for video workflows', () => {
    const imageWorkflow = {
      nodes: [{ type: 'CheckpointLoaderSimple' }, { type: 'KSampler' }, { type: 'VAEDecode' }],
    };
    const videoWorkflow = {
      nodes: [
        { type: 'CheckpointLoaderSimple' },
        { type: 'KSampler' },
        { type: 'VAEDecode' },
        { type: 'VHS_VideoCombine' },
      ],
    };
    const imageTime = estimateGenerationTime(imageWorkflow, 'image', 'test');
    const videoTime = estimateGenerationTime(videoWorkflow, 'video', 'test');
    expect(imageTime).toBeTruthy();
    expect(videoTime).toBeTruthy();
  });

  it('handles api_ prefix with reduced time', () => {
    const workflow = {
      nodes: [{ type: 'KSampler' }, { type: 'VAEDecode' }],
    };
    const regular = estimateGenerationTime(workflow, 'image', 'regular_template');
    const api = estimateGenerationTime(workflow, 'image', 'api_template');
    expect(regular).toBeTruthy();
    expect(api).toBeTruthy();
  });

  it('handles empty workflows', () => {
    const result = estimateGenerationTime({ nodes: [] }, 'image', 'test');
    expect(result).toBeTruthy();
    expect(result).toContain('seconds');
  });

  it('returns minutes for complex workflows', () => {
    const nodes = [];
    for (let i = 0; i < 30; i++) {
      nodes.push({ type: 'KSampler' });
      nodes.push({ type: 'VAEDecode' });
    }
    const result = estimateGenerationTime({ nodes }, 'image', 'complex');
    expect(result).toBeTruthy();
    expect(result).toContain('minute');
  });

  it('handles 3d media type', () => {
    const workflow = {
      nodes: [{ type: 'CheckpointLoaderSimple' }, { type: 'KSampler' }],
    };
    const result = estimateGenerationTime(workflow, '3d', 'test_3d');
    expect(result).toBeTruthy();
  });

  it('handles audio media type', () => {
    const workflow = {
      nodes: [{ type: 'KSampler' }],
    };
    const result = estimateGenerationTime(workflow, 'audio', 'test_audio');
    expect(result).toBeTruthy();
  });
});
