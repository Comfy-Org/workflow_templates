/**
 * Rebuild the partner-node snapshot.
 *
 * A workflow that calls a paid partner node must not advertise a free run, but
 * the hub list endpoint carries no such field and the workflow JSON does not
 * mark its nodes either: the only signal is a node's `type`, cross-referenced
 * against the set of API-backed node classes. That cross-reference needs one
 * request per workflow, far too slow for every build, so it runs here and the
 * result is committed.
 *
 * The node list comes from `scripts/data/mcp/api_node_model_options.json`, which
 * `scripts/mcp/scan_api_nodes.py` generates from ComfyUI's `object_info.json`
 * (`api_node: true`). That file is itself a committed snapshot and goes stale, so
 * a newly shipped vendor is missed until it is regenerated. Detection therefore
 * fails open on unknown node types, which is why the `API` tag stays the other
 * half of the signal. The durable fix is the hub deriving the tag at publish
 * time, where the classifier already lives.
 *
 * Usage: pnpm partner-nodes:refresh-snapshot
 */
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { getWorkflow, listWorkflowIndex } from '../src/lib/hub-api';

const CONCURRENCY = 10;

const snapshotPath = fileURLToPath(
  new URL('../src/data/partner-node-workflows.snapshot.json', import.meta.url)
);
const nodeListPath = fileURLToPath(
  new URL('../../scripts/data/mcp/api_node_model_options.json', import.meta.url)
);

const nodeList = JSON.parse(readFileSync(nodeListPath, 'utf8')) as {
  nodes: Record<string, unknown>;
};
const apiNodes = new Set(Object.keys(nodeList.nodes ?? {}));

if (apiNodes.size === 0) {
  console.error(`Refusing to write a snapshot: no API node classes in ${nodeListPath}.`);
  process.exit(1);
}

interface GraphNode {
  type?: string;
}
interface Graph {
  nodes?: GraphNode[];
}

/**
 * Every node in a workflow, including those inside subgraph definitions.
 *
 * A subgraph appears in the top-level `nodes` array as a UUID type, with its
 * real contents under `definitions.subgraphs[].nodes`. Reading only the top
 * level therefore misses the API node entirely: "MiniMax H3: Text to Video"
 * looks like four innocuous nodes until the subgraph is opened.
 */
function allNodes(workflowJson: Record<string, unknown>): GraphNode[] {
  const root = (workflowJson?.nodes ?? []) as GraphNode[];
  const subgraphs = ((workflowJson?.definitions as { subgraphs?: Graph[] } | undefined)?.subgraphs ??
    []) as Graph[];
  return [...root, ...subgraphs.flatMap((sub) => sub?.nodes ?? [])];
}

function partnerNodesIn(workflowJson: Record<string, unknown>): string[] {
  const hits = new Set<string>();
  for (const node of allNodes(workflowJson)) {
    if (node?.type && apiNodes.has(node.type)) hits.add(node.type);
  }
  return [...hits];
}

const entries = await listWorkflowIndex();
const shareIds = entries.map((e) => e.shareId).filter((id): id is string => Boolean(id));

if (shareIds.length === 0) {
  console.error('Refusing to write a snapshot: the hub index returned no workflows.');
  process.exit(1);
}

const withPartnerNodes: string[] = [];
let cursor = 0;

// A read failure aborts the whole run. Skipping a workflow would silently
// restore the free claim on one that charges credits, which is the bug this
// snapshot exists to prevent.
async function worker(): Promise<void> {
  while (cursor < shareIds.length) {
    const shareId = shareIds[cursor++];
    const detail = await getWorkflow(shareId);
    if (partnerNodesIn(detail.workflow_json).length > 0) withPartnerNodes.push(shareId);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const snapshot = {
  fetchedAt: new Date().toISOString(),
  apiNodeCount: apiNodes.size,
  shareIds: withPartnerNodes.sort(),
};

const tempPath = `${snapshotPath}.tmp`;
writeFileSync(tempPath, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
renameSync(tempPath, snapshotPath);
process.stdout.write(
  `Wrote partner-node snapshot to ${snapshotPath}: ` +
    `${snapshot.shareIds.length} of ${shareIds.length} workflows call a partner node\n`
);
