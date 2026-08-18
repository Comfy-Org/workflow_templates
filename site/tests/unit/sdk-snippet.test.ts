import { describe, expect, it } from 'vitest';

import {
  buildGenericSdkSnippet,
  buildSdkSnippet,
  extractSnippetNodes,
} from '../../src/lib/sdk-snippet';
import { loadWorkflowGraph } from '../../src/lib/workflow-graph';

const audioGraph = {
  nodes: [
    { id: 4, type: 'CheckpointLoaderSimple', widgets_values: ['ckpt.safetensors'] },
    { id: 6, type: 'CLIPTextEncode', widgets_values: ['heaven church electronic dance music'] },
    { id: 7, type: 'CLIPTextEncode', widgets_values: [''] },
    { id: 19, type: 'SaveAudioMP3', widgets_values: ['audio/ComfyUI', 'V0'] },
    { id: 18, type: 'MarkdownNote', widgets_values: ['## Model links'] },
  ],
};

describe('extractSnippetNodes', () => {
  it('finds the output node, skipping notes', () => {
    const nodes = extractSnippetNodes(audioGraph);
    expect(nodes.outputNode).toEqual({ id: '19', type: 'SaveAudioMP3' });
  });

  it('picks the prompt node with text over the empty negative', () => {
    const nodes = extractSnippetNodes(audioGraph);
    expect(nodes.promptNode).toEqual({
      id: '6',
      text: 'heaven church electronic dance music',
    });
  });

  it('prefers a node titled positive and finds LoadImage inputs', () => {
    const nodes = extractSnippetNodes({
      nodes: [
        { id: 1, type: 'CLIPTextEncode', widgets_values: ['wrong pick'] },
        { id: 2, type: 'CLIPTextEncode', title: 'Positive Prompt', widgets_values: ['right pick'] },
        { id: 3, type: 'LoadImage', widgets_values: ['example.png'] },
        { id: 9, type: 'VHS_VideoCombine' },
      ],
    });
    expect(nodes.promptNode?.id).toBe('2');
    expect(nodes.imageNode).toEqual({ id: '3' });
    expect(nodes.outputNode).toEqual({ id: '9', type: 'VHS_VideoCombine' });
  });

  it('omits over-long example prompts but keeps the node id', () => {
    const nodes = extractSnippetNodes({
      nodes: [
        { id: 5, type: 'CLIPTextEncode', widgets_values: ['x'.repeat(200)] },
        { id: 8, type: 'SaveImage' },
      ],
    });
    expect(nodes.promptNode?.id).toBe('5');
    expect(nodes.promptNode?.text).toBeUndefined();
  });
});

describe('buildSdkSnippet', () => {
  it('personalizes ids, prompt, and filename to the workflow', () => {
    const snippet = buildSdkSnippet({
      title: 'Stable Audio 1.0: Text to Audio',
      templateName: 'audio_stable_audio_example',
      nodes: extractSnippetNodes(audioGraph),
    });
    expect(snippet).toContain('# Run "Stable Audio 1.0: Text to Audio" (Python)');
    expect(snippet).toContain('from_file("audio_stable_audio_example_api.json")');
    expect(snippet).toContain('wf.set_input("6", "text", "heaven church electronic dance music")');
    expect(snippet).toContain('job.get_outputs("19"):  # SaveAudioMP3');
    expect(snippet).not.toContain('<output-node-id>');
  });

  it('escapes quotes and newlines in example prompts as valid Python strings', () => {
    const snippet = buildSdkSnippet({
      title: 'T',
      templateName: 't',
      nodes: {
        outputNode: { id: '1', type: 'SaveImage' },
        promptNode: { id: '2', text: 'say "hi"\nline two' },
      },
    });
    expect(snippet).toContain('wf.set_input("2", "text", "say \\"hi\\"\\nline two")');
  });

  it('keeps hostile metadata as data, not Python code', () => {
    const snippet = buildSdkSnippet({
      title: 'evil"\nprint("pwned")\n#',
      templateName: 'wf"; import os; os.system("rm -rf /") #',
      nodes: {
        outputNode: {
          id: '1"):\n    __import__("os").system("id")\nfor _ in []: #',
          type: 'Save\nprint("x")',
        },
        promptNode: { id: 'a\\b"c', text: 'hi' },
        imageNode: { id: '2"' },
      },
    });
    // Injection needs a new line to land a statement on, so the shape of the
    // snippet is the invariant: same line count, no line metadata could start.
    const lines = snippet.split('\n');
    expect(lines).toHaveLength(
      buildSdkSnippet({
        title: 'T',
        templateName: 't',
        nodes: {
          outputNode: { id: '1', type: 'SaveImage' },
          promptNode: { id: '2', text: 'hi' },
          imageNode: { id: '3' },
        },
      }).split('\n').length
    );
    expect(lines.filter((l) => /^\s*(print|import|__import__|os\.system)\b/.test(l))).toEqual([]);
    expect(snippet).toContain('# Run "evil" print("pwned") #" (Python)');
    expect(snippet).toContain(
      'from_file("wf\\"; import os; os.system(\\"rm -rf /\\") #_api.json")'
    );
    expect(snippet).toContain('wf.set_input("a\\\\b\\"c", "text", "hi")');
    expect(snippet).toContain('# Save print("x")');
  });

  it('survives a payload whose nodes are not the expected shape', () => {
    expect(() =>
      extractSnippetNodes({ nodes: [null, { id: 1 }, { id: 2, type: 5 }] as never })
    ).not.toThrow();
    expect(extractSnippetNodes({ nodes: 'nope' as never })).toEqual({});
  });

  it('falls back to the generic documented snippet without an output node', () => {
    const snippet = buildSdkSnippet({ title: 'T', templateName: 't', nodes: {} });
    expect(snippet).toBe(buildGenericSdkSnippet());
    expect(snippet).toContain('<output-node-id>');
  });
});

describe('loadWorkflowGraph', () => {
  it('loads a shipped workflow graph by template name', () => {
    const graph = loadWorkflowGraph('audio_stable_audio_example');
    expect(graph?.nodes?.length).toBeGreaterThan(0);
  });

  it('returns null for unknown templates', () => {
    expect(loadWorkflowGraph('does-not-exist')).toBeNull();
  });
});
