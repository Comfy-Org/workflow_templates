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
 * An `isApp` from the hub takes precedence, so the snapshot stops being
 * consulted once the API returns the field. The `.app` name suffix is a legacy
 * naming convention retained for templates uploaded before the snapshot.
 */
export function resolveIsApp(entry: { isApp?: boolean; shareId?: string; name?: string }): boolean {
  return (
    entry.isApp ??
    (APP_MODE_SHARE_IDS.has(entry.shareId ?? '') || Boolean(entry.name?.endsWith('.app')))
  );
}

export { APP_MODE_SHARE_IDS };
