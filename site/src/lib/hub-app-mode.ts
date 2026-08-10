import appModeSnapshot from '../data/app-mode-workflows.snapshot.json' with { type: 'json' };

/**
 * Share ids of workflows published with the default view set to "app" rather
 * than "node graph".
 *
 * That choice lives on the workflow graph as `extra.linearMode`, which the
 * workflow index endpoint does not expose. Reading it costs one request per
 * workflow, too slow for a build, so it is captured into a committed snapshot
 * by `scripts/refresh-app-mode-snapshot.ts` (the same approach as
 * `refresh-feature-flags-snapshot.ts`). Run `pnpm app-mode:refresh-snapshot`
 * when workflows are published or converted to apps.
 */
const APP_MODE_SHARE_IDS: ReadonlySet<string> = new Set(
  appModeSnapshot.workflows.map((workflow) => workflow.shareId)
);

/**
 * Whether a catalog entry belongs under the "Comfy Apps" tab.
 *
 * Either signal alone is enough, and neither can veto the other.
 *
 * A hub `false` is not treated as authority. The hub column is written at
 * publish time, so every workflow published before it existed reads `false`
 * until the backfill runs. Letting that win would empty the tab during the
 * window between the field shipping and the backfill completing.
 *
 * The `.app` filename suffix is gone. It was the original guess and it is wrong
 * in both directions: it misses apps not named that way, and
 * `templates_all_in_one_image_edit_models.app` carries the suffix with
 * `linearMode: false`. The snapshot reads `extra.linearMode` from every
 * workflow, so it already covers everything the suffix caught, minus that one
 * false positive.
 */
export function resolveIsApp(entry: { isApp?: boolean; shareId?: string; name?: string }): boolean {
  return entry.isApp === true || APP_MODE_SHARE_IDS.has(entry.shareId ?? '');
}

export { APP_MODE_SHARE_IDS };
