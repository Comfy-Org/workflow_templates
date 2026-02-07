import { describe, it, expect } from 'vitest';
import {
  isBuiltinNode,
  getCustomNodeInfo,
  extractNodeTypes,
  identifyRequiredNodes,
} from '../../src/lib/node-registry';

describe('isBuiltinNode', () => {
  it('identifies core built-in nodes', () => {
    expect(isBuiltinNode('KSampler')).toBe(true);
    expect(isBuiltinNode('CLIPTextEncode')).toBe(true);
    expect(isBuiltinNode('VAEDecode')).toBe(true);
    expect(isBuiltinNode('LoadImage')).toBe(true);
    expect(isBuiltinNode('SaveImage')).toBe(true);
  });

  it('identifies UUID subgraphs as built-in', () => {
    expect(isBuiltinNode('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(true);
  });

  it('identifies all-caps type identifiers as built-in', () => {
    expect(isBuiltinNode('MODEL')).toBe(true);
    expect(isBuiltinNode('LATENT')).toBe(true);
    expect(isBuiltinNode('CLIP_VISION')).toBe(true);
  });

  it('returns false for custom nodes', () => {
    expect(isBuiltinNode('SimpleMath+')).toBe(false);
    expect(isBuiltinNode('FaceDetailer')).toBe(false);
    expect(isBuiltinNode('Florence2')).toBe(false);
  });
});

describe('getCustomNodeInfo', () => {
  it('returns info for registered custom nodes', () => {
    const info = getCustomNodeInfo('FaceDetailer');
    expect(info).toBeDefined();
    expect(info?.package).toBe('ComfyUI-Impact-Pack');
    expect(info?.url).toContain('github.com');
  });

  it('returns undefined for built-in nodes', () => {
    expect(getCustomNodeInfo('KSampler')).toBeUndefined();
    expect(getCustomNodeInfo('VAEDecode')).toBeUndefined();
  });

  it('returns undefined for unknown custom nodes', () => {
    expect(getCustomNodeInfo('SomeUnknownNode')).toBeUndefined();
  });
});

describe('extractNodeTypes', () => {
  it('extracts node types from workflow JSON', () => {
    const workflow = {
      nodes: [{ type: 'KSampler' }, { type: 'CLIPTextEncode' }, { type: 'VAEDecode' }],
    };
    const types = extractNodeTypes(workflow);
    expect(types).toContain('KSampler');
    expect(types).toContain('CLIPTextEncode');
    expect(types).toContain('VAEDecode');
  });

  it('deduplicates node types', () => {
    const workflow = {
      nodes: [{ type: 'KSampler' }, { type: 'KSampler' }],
    };
    const types = extractNodeTypes(workflow);
    expect(types).toHaveLength(1);
  });

  it('returns empty array for invalid input', () => {
    expect(extractNodeTypes(null)).toEqual([]);
    expect(extractNodeTypes(undefined)).toEqual([]);
    expect(extractNodeTypes('string')).toEqual([]);
    expect(extractNodeTypes({})).toEqual([]);
  });

  it('skips nodes without type', () => {
    const workflow = {
      nodes: [{ type: 'KSampler' }, { id: 1 }, { type: '' }],
    };
    const types = extractNodeTypes(workflow);
    expect(types).toEqual(['KSampler']);
  });

  it('returns sorted results', () => {
    const workflow = {
      nodes: [{ type: 'VAEDecode' }, { type: 'CLIPTextEncode' }, { type: 'KSampler' }],
    };
    const types = extractNodeTypes(workflow);
    expect(types).toEqual(['CLIPTextEncode', 'KSampler', 'VAEDecode']);
  });
});

describe('identifyRequiredNodes', () => {
  it('identifies custom nodes from workflow', () => {
    const workflow = {
      nodes: [{ type: 'KSampler' }, { type: 'FaceDetailer' }, { type: 'SAMLoader' }],
    };
    const required = identifyRequiredNodes(workflow);
    expect(required.length).toBeGreaterThan(0);
    expect(required.some((r) => r.info.package === 'ComfyUI-Impact-Pack')).toBe(true);
  });

  it('deduplicates by package', () => {
    const workflow = {
      nodes: [{ type: 'FaceDetailer' }, { type: 'SAMLoader' }, { type: 'DetailerForEach' }],
    };
    const required = identifyRequiredNodes(workflow);
    const impactPackEntries = required.filter((r) => r.info.package === 'ComfyUI-Impact-Pack');
    expect(impactPackEntries).toHaveLength(1);
  });

  it('returns empty for workflow with only built-in nodes', () => {
    const workflow = {
      nodes: [{ type: 'KSampler' }, { type: 'CLIPTextEncode' }, { type: 'VAEDecode' }],
    };
    const required = identifyRequiredNodes(workflow);
    expect(required).toHaveLength(0);
  });
});
