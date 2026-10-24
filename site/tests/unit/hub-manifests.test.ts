/**
 * The readers for the manifests prebuild writes from the hub index.
 *
 * All three degrade to nothing rather than to a guess, and the callers depend on
 * that: an absent tag or category manifest costs a sitemap URL, an absent model
 * catalog skips the build guards and drops the model URLs. What none of them may
 * do is hand back a plausible-looking list assembled from the repo's own
 * templates, because the routes serve the hub's catalog and advertising the
 * wrong one is what this whole change exists to stop.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  loadHubCategories,
  loadHubModelCatalog,
  loadHubTagSlugs,
} from '../../src/lib/hub-manifests';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-manifests-'));
const write = (name: string, value: unknown): string => {
  const file = path.join(tmp, name);
  fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value));
  return file;
};

describe('loadHubCategories', () => {
  it('returns nothing when prebuild has not written the manifest', () => {
    expect(loadHubCategories(path.join(tmp, 'absent.json'))).toEqual([]);
  });

  it('reads the category list a build wrote', () => {
    expect(loadHubCategories(write('cats.json', ['3d', 'image', 'video']))).toEqual([
      '3d',
      'image',
      'video',
    ]);
  });

  it('drops anything that is not a category the route serves', () => {
    // A type with no route would be a sitemap entry pointing at a 404.
    const file = write('unknown.json', ['image', 'text', 7, null, 'video']);

    expect(loadHubCategories(file)).toEqual(['image', 'video']);
  });

  it('degrades to nothing rather than throwing on a corrupt manifest', () => {
    expect(loadHubCategories(write('cats-corrupt.json', '{not json'))).toEqual([]);
  });
});

describe('loadHubTagSlugs', () => {
  it('returns nothing when prebuild has not written the manifest', () => {
    expect(loadHubTagSlugs(path.join(tmp, 'absent.json'))).toEqual([]);
  });

  it('reads the slug list a build wrote', () => {
    expect(loadHubTagSlugs(write('slugs.json', ['character', 'video']))).toEqual([
      'character',
      'video',
    ]);
  });

  it('degrades to nothing rather than throwing on a corrupt manifest', () => {
    expect(loadHubTagSlugs(write('tags-corrupt.json', '{not json'))).toEqual([]);
  });

  it('drops non-string and empty entries', () => {
    const file = write('mixed.json', ['character', '', 7, null, 'video']);

    expect(loadHubTagSlugs(file)).toEqual(['character', 'video']);
  });
});

describe('loadHubModelCatalog', () => {
  it('returns nothing when prebuild has not written the manifest', () => {
    // The guards are skipped and the model URLs leave the sitemap. Both are
    // recoverable; validating the repo's catalog instead of the hub's is not.
    expect(loadHubModelCatalog(path.join(tmp, 'absent.json'))).toEqual([]);
  });

  it('reads the fields deriveModelGroups needs', () => {
    const file = write('catalog.json', [
      { name: 'wan_t2v', models: ['Wan 2.5'], tags: ['Video'], usage: 1200 },
    ]);

    expect(loadHubModelCatalog(file)).toEqual([
      { name: 'wan_t2v', models: ['Wan 2.5'], tags: ['Video'], usage: 1200 },
    ]);
  });

  it('normalizes the arrays and usage the clustering reads', () => {
    // A malformed entry must not crash the config load; deriveModelGroups
    // iterates `models` and weighs `usage` against MIN_CLUSTER_USAGE.
    const file = write('sparse.json', [
      { name: 'no_models' },
      { name: 'bad_types', models: ['Flux', 7, null], tags: 'Video', usage: 'lots' },
    ]);

    expect(loadHubModelCatalog(file)).toEqual([
      { name: 'no_models', models: [], tags: [], usage: 0 },
      { name: 'bad_types', models: ['Flux'], tags: [], usage: 0 },
    ]);
  });

  it('drops entries with no name, which deriveModelGroups keys templates by', () => {
    const file = write('nameless.json', [{ models: ['Wan'] }, { name: '', models: ['Wan'] }, null]);

    expect(loadHubModelCatalog(file)).toEqual([]);
  });

  it('degrades to nothing rather than throwing on a corrupt manifest', () => {
    expect(loadHubModelCatalog(write('catalog-corrupt.json', '{not json'))).toEqual([]);
  });
});
