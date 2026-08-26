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

// Workflow metadata reaches this module from shipped graphs and, on hub-sourced
// pages, from a fetched payload — so titles, names, node ids and node types are
// data, never code. JSON string syntax is a valid subset of both Python's and
// TypeScript's, so quotes, backslashes and newlines are safe in either literal.
function quoted(value: string): string {
  return JSON.stringify(value);
}

// Generated comments have to stay on their own line for the same reason.
function commentSafe(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function firstStringWidget(node: WorkflowGraphNode): string | undefined {
  const value = node.widgets_values?.[0];
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

// A node is only usable if it can be addressed: an id that survives String()
// as something a caller could pass to the SDK, and a type to recognize it by.
function isAddressable(node: WorkflowGraphNode | null | undefined): node is WorkflowGraphNode {
  if (!node || typeof node.type !== 'string') return false;
  const { id } = node;
  return (
    (typeof id === 'number' && Number.isFinite(id)) || (typeof id === 'string' && id.trim() !== '')
  );
}

export function extractSnippetNodes(graph: WorkflowGraph): SnippetNodes {
  // A hub payload is whatever the endpoint returns, so the shape is checked here.
  const nodes = (Array.isArray(graph.nodes) ? graph.nodes : []).filter(isAddressable);

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

export type SnippetLang = 'python' | 'typescript';

// One install line per tab: showing pip under the TypeScript snippet (or npm
// under Python) would be wrong the moment the reader copies it.
const INSTALL: Record<SnippetLang, string> = {
  python: '# Install (beta)\npip install comfy-sdk',
  typescript: '// Install (beta)\nnpm i @comfyorg/sdk',
};

export function buildSdkSnippet(opts: {
  title: string;
  templateName: string;
  nodes: SnippetNodes;
  lang?: SnippetLang;
}): string {
  const { title, templateName, nodes, lang = 'python' } = opts;
  if (!nodes.outputNode) return buildGenericSdkSnippet(lang);
  if (lang === 'typescript') return buildTypeScriptSnippet({ title, templateName, nodes });

  const lines = [
    INSTALL.python,
    '',
    `# Run "${commentSafe(title)}" (Python)`,
    'from comfy_sdk import Comfy',
    '',
    'client = Comfy(api_key="comfyui-...")',
    '',
    '# This workflow, exported in API format (see note below)',
    `wf = client.workflows.from_file(${quoted(`${templateName}_api.json`)})`,
  ];

  if (nodes.imageNode) {
    lines.push(
      '',
      'asset = client.assets.from_file("input.png")',
      `wf.set_input(${quoted(nodes.imageNode.id)}, "image", asset)  # LoadImage`
    );
  }
  if (nodes.promptNode) {
    const prompt = quoted(nodes.promptNode.text ?? 'your prompt here');
    lines.push(
      '',
      `wf.set_input(${quoted(nodes.promptNode.id)}, "text", ${prompt})  # CLIPTextEncode`
    );
  }

  lines.push(
    '',
    'job = client.run(wf)',
    `for output in job.get_outputs(${quoted(nodes.outputNode.id)}):  # ${commentSafe(nodes.outputNode.type)}`,
    '    output.to_file(output.name)'
  );
  return lines.join('\n');
}

// Mirrors the documented TypeScript quickstart: `workflows.fromFile` and `run`
// are awaited, `assets.fromFile` is not, and outputs are indexed rather than
// iterated (https://docs.comfy.org/development/api-development/sdks).
function buildTypeScriptSnippet(opts: {
  title: string;
  templateName: string;
  nodes: SnippetNodes;
}): string {
  const { title, templateName, nodes } = opts;
  if (!nodes.outputNode) return buildGenericSdkSnippet('typescript');

  const lines = [
    INSTALL.typescript,
    '',
    `// Run "${commentSafe(title)}" (TypeScript)`,
    `import { Comfy } from "@comfyorg/sdk";`,
    '',
    `const client = new Comfy({ apiKey: "comfyui-..." });`,
    '',
    '// This workflow, exported in API format (see note below)',
    `const wf = await client.workflows.fromFile(${quoted(`${templateName}_api.json`)});`,
  ];

  if (nodes.imageNode) {
    lines.push(
      '',
      `const asset = client.assets.fromFile("input.png");`,
      `wf.setInput(${quoted(nodes.imageNode.id)}, "image", asset);  // LoadImage`
    );
  }
  if (nodes.promptNode) {
    const prompt = quoted(nodes.promptNode.text ?? 'your prompt here');
    lines.push(
      '',
      `wf.setInput(${quoted(nodes.promptNode.id)}, "text", ${prompt});  // CLIPTextEncode`
    );
  }

  lines.push(
    '',
    'const job = await client.run(wf);',
    `await job.getOutputs(${quoted(nodes.outputNode.id)})[0].toFile("output.png");  // ${commentSafe(nodes.outputNode.type)}`
  );
  return lines.join('\n');
}

export function buildGenericSdkSnippet(lang: SnippetLang = 'python'): string {
  if (lang === 'typescript') {
    return `${INSTALL.typescript}

// Run this workflow (TypeScript)
import { Comfy } from "@comfyorg/sdk";

const client = new Comfy({ apiKey: "comfyui-..." });
const wf = await client.workflows.fromFile("workflow_api.json");
const job = await client.run(wf);
await job.getOutputs("<output-node-id>")[0].toFile("output.png");`;
  }

  return `${INSTALL.python}

# Run this workflow (Python)
from comfy_sdk import Comfy

client = Comfy(api_key="comfyui-...")
wf = client.workflows.from_file("workflow_api.json")
job = client.run(wf)
for output in job.get_outputs("<output-node-id>"):
    output.to_file(output.name)`;
}
