import type { SerializedTemplate } from '../hub-api';
import { firstStillThumbnail } from '../media-utils';
import { workflowDetailPath, resolveAbsoluteThumbnail } from '../routes';
import { absoluteUrl } from '../../config/site';
import type { ItemListEntry } from '../structured-data';

/**
 * `ItemList` entries for a landing page's CollectionPage — one per template,
 * linking to its detail page. Enumerates the page's full catalog on purpose:
 * the grid lazy-loads past the first 30, but the structured data is the complete
 * machine-readable set. Templates with no derivable detail URL are skipped.
 */
export function buildTemplateItemListEntries(
  templates: SerializedTemplate[],
  locale?: string
): ItemListEntry[] {
  return templates.flatMap((tpl) => {
    const path = workflowDetailPath(tpl.name, tpl.shareId, locale);
    if (!path) return [];
    return [
      {
        name: tpl.title,
        url: absoluteUrl(path),
        image: resolveAbsoluteThumbnail(firstStillThumbnail(tpl.thumbnails)),
      },
    ];
  });
}
