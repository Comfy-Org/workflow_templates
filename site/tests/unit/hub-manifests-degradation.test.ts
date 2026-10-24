import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

/**
 * The degraded shape is "no hub-derived URLs and no model guards this build", and
 * that has to hold in a reused checkout too. An earlier successful run leaves all
 * three manifests behind, and astro.config.mjs reads whatever is on disk, so a
 * later failed refresh that returned without touching them would advertise the
 * previous build's tag and category URLs and validate the previous build's model
 * families as though this build had produced them.
 */
const siteDir = process.cwd();
const manifests = [
  path.join(siteDir, 'src/data/hub-tag-slugs.generated.json'),
  path.join(siteDir, 'src/data/hub-categories.generated.json'),
  path.join(siteDir, 'src/data/hub-model-catalog.generated.json'),
];

const saved = new Map<string, string | null>();

function seedStaleManifests(): void {
  mkdirSync(path.join(siteDir, 'src/data'), { recursive: true });
  for (const file of manifests) {
    saved.set(file, existsSync(file) ? readFileSync(file, 'utf-8') : null);
    writeFileSync(file, '["stale-from-the-last-successful-run"]\n');
  }
}

afterEach(() => {
  for (const [file, content] of saved) {
    if (content === null) rmSync(file, { force: true });
    else writeFileSync(file, content);
  }
  saved.clear();
});

/** Refuses immediately, so the failure is the hub being unreachable, not a timeout. */
const UNREACHABLE_HUB = 'http://127.0.0.1:1/';

describe('build-hub-manifests degradation', () => {
  it('removes every manifest when a configured hub fails', () => {
    seedStaleManifests();
    expect(manifests.every((file) => existsSync(file))).toBe(true);

    let failed = false;
    try {
      execFileSync('npx', ['tsx', 'scripts/build-hub-manifests.ts'], {
        cwd: siteDir,
        env: { ...process.env, PUBLIC_HUB_API_URL: UNREACHABLE_HUB },
        stdio: 'pipe',
      });
    } catch {
      // A configured hub that fails is a build failure, which is the contract.
      failed = true;
    }

    expect(failed, 'a configured hub that fails must fail the build').toBe(true);
    for (const file of manifests) {
      expect(existsSync(file), `${path.basename(file)} survived a failed refresh`).toBe(false);
    }
  }, 60_000);
});
