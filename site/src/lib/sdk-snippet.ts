/**
 * Personalized Comfy SDK quickstart for a workflow detail page.
 *
 * Every template ships its graph JSON in the repo, so at build time we can
 * lift the real node IDs (prompt, image input, output) and the template's
 * own example prompt into the documented SDK quickstart shape
 * (https://docs.comfy.org/development/api-development/sdks). API-format exports
 * keep the same node IDs as the graph, so the IDs shown are the ones users
 * will address. Falls back to the generic documented snippet when the graph
 * is unavailable or has no recognizable output node.
 *
 * Pure by design: hub-sourced pages have no graph in this repo, so the same
 * builder runs in the browser once the payload the section already fetches
 * arrives. Graph loading lives in workflow-graph.ts (server only).
 */
interface WorkflowGraphNode {
  id: number | string;
  type: string;
  title?: string;
  widgets_values?: unknown[];
}

export interface WorkflowGraph {
  nodes?: WorkflowGraphNode[];
}

export interface SnippetNodes {
  promptNode?: { id: string; text?: string };
  imageNode?: { id: string };
  outputNode?: { id: string; type: string };
}

const MAX_EXAMPLE_PROMPT_LENGTH = 100;

function firstStringWidget(node: WorkflowGraphNode): string | undefined {
  const value = node.widgets_values?.[0];
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

export function extractSnippetNodes(graph: WorkflowGraph): SnippetNodes {
  const nodes = graph.nodes ?? [];

  const output = nodes.find((n) => n.type.startsWith('Save') || n.type === 'VHS_VideoCombine');

  const prompts = nodes.filter((n) => n.type.startsWith('CLIPTextEncode'));
  const promptNode =
    prompts.find((n) => (n.title ?? '').toLowerCase().includes('positive')) ??
    prompts.find((n) => firstStringWidget(n) !== undefined) ??
    prompts[0];

  const imageNode = nodes.find((n) => n.type === 'LoadImage');

  const result: SnippetNodes = {};
  if (output) result.outputNode = { id: String(output.id), type: output.type };
  if (promptNode) {
    const text = firstStringWidget(promptNode);
    result.promptNode = {
      id: String(promptNode.id),
      ...(text && text.length <= MAX_EXAMPLE_PROMPT_LENGTH ? { text } : {}),
    };
  }
  if (imageNode) result.imageNode = { id: String(imageNode.id) };
  return result;
}

const INSTALL_LINES = `# Install (beta)
pip install comfy-sdk        # Python
npm i @comfyorg/sdk          # TypeScript`;

export function buildSdkSnippet(opts: {
  title: string;
  templateName: string;
  nodes: SnippetNodes;
}): string {
  const { title, templateName, nodes } = opts;
  if (!nodes.outputNode) return buildGenericSdkSnippet();

  const lines = [
    INSTALL_LINES,
    '',
    `# Run "${title}" (Python)`,
    'from comfy_sdk import Comfy',
    '',
    'client = Comfy(api_key="comfyui-...")',
    '',
    '# This workflow, exported in API format (see note below)',
    `wf = client.workflows.from_file("${templateName}_api.json")`,
  ];

  if (nodes.imageNode) {
    lines.push(
      '',
      'asset = client.assets.from_file("input.png")',
      `wf.set_input("${nodes.imageNode.id}", "image", asset)  # LoadImage`
    );
  }
  if (nodes.promptNode) {
    // JSON string escaping is valid Python string syntax.
    const prompt = JSON.stringify(nodes.promptNode.text ?? 'your prompt here');
    lines.push('', `wf.set_input("${nodes.promptNode.id}", "text", ${prompt})  # CLIPTextEncode`);
  }

  lines.push(
    '',
    'job = client.run(wf)',
    `for output in job.get_outputs("${nodes.outputNode.id}"):  # ${nodes.outputNode.type}`,
    '    output.to_file(output.name)'
  );
  return lines.join('\n');
}

export function buildGenericSdkSnippet(): string {
  return `${INSTALL_LINES}

# Run this workflow (Python)
from comfy_sdk import Comfy

client = Comfy(api_key="comfyui-...")
wf = client.workflows.from_file("workflow_api.json")
job = client.run(wf)
for output in job.get_outputs("<output-node-id>"):
    output.to_file(output.name)`;
}
