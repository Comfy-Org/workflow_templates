/**
 * Fails a deploy before upload when a built function targets a Node runtime other
 * than the one `.nvmrc` pins.
 *
 * `@astrojs/vercel` stamps the build machine's Node major into each function's
 * `.vc-config.json`, and `vercel deploy --prebuilt` ships that verbatim. Vercel
 * rejects a discontinued runtime only after the full upload, and newer CLIs report
 * it as a bare "fetch failed", so a drifted runner Node surfaces here instead.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { SITE_DIR } from './lib/paths';

export interface FunctionRuntime {
  config: string;
  runtime: string;
}

/** Maps `.nvmrc` contents ("24", "v24.21.0") to Vercel's runtime id ("nodejs24.x"). */
export function runtimeFromNvmrc(contents: string): string {
  const major = contents.trim().match(/^v?(\d+)(?:\.\d+){0,2}$/)?.[1];
  if (!major) throw new Error(`.nvmrc must pin a numeric Node version, got "${contents.trim()}"`);
  return `nodejs${major}.x`;
}

/** Node runtimes of every function under `<outputDir>/functions`; edge functions are skipped. */
export async function collectNodeRuntimes(outputDir: string): Promise<FunctionRuntime[]> {
  const functionsDir = path.join(outputDir, 'functions');
  const entries = await readdir(functionsDir, { recursive: true });
  const runtimes: FunctionRuntime[] = [];

  for (const entry of entries) {
    if (path.basename(entry) !== '.vc-config.json') continue;
    const config = path.join(functionsDir, entry);
    const { runtime } = JSON.parse(await readFile(config, 'utf8')) as { runtime?: unknown };
    if (typeof runtime === 'string' && runtime.startsWith('nodejs')) {
      runtimes.push({ config: path.relative(outputDir, config), runtime });
    }
  }

  return runtimes;
}

export function findRuntimeMismatches(
  runtimes: FunctionRuntime[],
  expected: string
): FunctionRuntime[] {
  // An empty list means the output path is wrong, not that the build is clean.
  if (runtimes.length === 0) throw new Error('No Node.js functions found in the Vercel output');
  return runtimes.filter(({ runtime }) => runtime !== expected);
}

async function main(): Promise<void> {
  const outputDir = path.resolve(process.argv[2] ?? path.join(SITE_DIR, '.vercel', 'output'));
  const expected = runtimeFromNvmrc(await readFile(path.join(SITE_DIR, '.nvmrc'), 'utf8'));
  const runtimes = await collectNodeRuntimes(outputDir);
  const mismatches = findRuntimeMismatches(runtimes, expected);

  if (mismatches.length > 0) {
    console.error(`Expected every Node.js function to target ${expected} (from site/.nvmrc):`);
    for (const { config, runtime } of mismatches) console.error(`  ${config}: ${runtime}`);
    process.exit(1);
  }
  console.log(`✓ ${runtimes.length} Vercel function(s) target ${expected}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
