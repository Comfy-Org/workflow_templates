import { getCollection } from 'astro:content';

import { loadSerializedTemplates } from '../hub-api';
import { buildFallbackPool } from './fallback-pool';
import { deriveModelGroups } from './model-groups';

/**
 * Per-process derivations shared by the two on-demand model routes.
 *
 * These have to live in a module. Astro compiles a component script into the
 * body of its render function, so a `let cache = null` written in page
 * frontmatter is re-initialised on every request and `??=` never hits. Verified
 * against the compiler output: `export const prerender` is hoisted to module
 * scope, the rest of the frontmatter is not.
 *
 * That matters because these routes are `prerender = false`. The hub fetch
 * itself is already cached inside `hub-api`, so what is saved here is the
 * repeated derivation over the ~600-entry catalog: the serialization, the group
 * grouping, and the fallback pool. Without this they run once per response,
 * which is the work the caching exists to keep out of the response path.
 *
 * The promise is cached rather than its result, so concurrent requests arriving
 * before the first resolves share one derivation instead of starting their own.
 */
function memoize<T>(build: () => Promise<T>): () => Promise<T> {
  let cache: Promise<T> | null = null;
  return () => (cache ??= build());
}

export const loadCatalog = memoize(() => loadSerializedTemplates(() => getCollection('templates')));

export const loadModelGroups = memoize(async () => deriveModelGroups(await loadCatalog()));

export const loadFallbackPool = memoize(async () => buildFallbackPool(await loadCatalog()));
