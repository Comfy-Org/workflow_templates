import { getCollection } from 'astro:content';
import { loadSerializedTemplates } from '../hub-api';
import { deriveModelGroups } from './model-groups';

// Same catalog + cache shape the localized model route uses, so the set of
// "pages that exist" is derived exactly like the pages themselves.
const buildSlugSet = async () =>
  new Set(
    deriveModelGroups(await loadSerializedTemplates(() => getCollection('templates'))).map(
      (group) => group.slug
    )
  );
let slugSetCache: Promise<Set<string>> | null = null;

/** Model-page slugs the model routes actually emit, cached per process. */
export const loadModelPageSlugs = () => (slugSetCache ??= buildSlugSet());
