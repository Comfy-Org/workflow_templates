/**
 * Key resolution shared by every curated per-workflow data file
 * (`workflow-entity-graphs.ts`, `workflow-copy.ts`).
 *
 * Curated data is keyed by the template's snake_case `name` — its
 * `templates/index.json` filename — because that is what a human editing these
 * files can recognise. The local content collection exposes exactly that, but
 * the hub API (`/api/hub/workflows/index`, the primary source in preview and
 * production builds) exposes the share id instead, so a bare lookup by `name`
 * misses on every deployed page. Map the share id back to the filename key here
 * so both indexes resolve to the same entry.
 */
const SHARE_ID_TO_KEY: Record<string, string> = {
  b37902cee452: 'video_ltx2_5_i2v',
  cd0c4f9f61a4: 'api_seedance2_5_r2v',
  a781503cf508: 'video_minimax_h3_i2v',
  '9394f9968da3': 'video_wan_animate2',
};

/**
 * The curated-data key for a workflow, given either its snake_case template
 * name or its hub share id. Unmapped values pass through unchanged, so a plain
 * template name still works and an unknown share id simply finds no entry.
 */
export function curatedKey(nameOrShareId: string): string {
  return SHARE_ID_TO_KEY[nameOrShareId] ?? nameOrShareId;
}
