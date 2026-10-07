import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  collectNodeRuntimes,
  findRuntimeMismatches,
  runtimeFromNvmrc,
} from '../../scripts/verify-vercel-runtime';

const dirs: string[] = [];

async function vercelOutput(functions: Record<string, object>): Promise<string> {
  const outputDir = await mkdtemp(path.join(tmpdir(), 'vercel-output-'));
  dirs.push(outputDir);
  await mkdir(path.join(outputDir, 'functions'));
  for (const [name, config] of Object.entries(functions)) {
    const funcDir = path.join(outputDir, 'functions', name);
    await mkdir(funcDir, { recursive: true });
    await writeFile(path.join(funcDir, '.vc-config.json'), JSON.stringify(config));
  }
  return outputDir;
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('runtimeFromNvmrc', () => {
  it.each([
    ['24\n', 'nodejs24.x'],
    ['v24', 'nodejs24.x'],
    ['24.21.0', 'nodejs24.x'],
    [' v22.1 \n', 'nodejs22.x'],
  ])('maps %j to %s', (contents, runtime) => {
    expect(runtimeFromNvmrc(contents)).toBe(runtime);
  });

  it.each(['lts/*', 'node', '', '24.x'])('rejects the non-numeric pin %j', (contents) => {
    expect(() => runtimeFromNvmrc(contents)).toThrow('.nvmrc must pin a numeric Node version');
  });

  it('resolves the committed site pin', async () => {
    const nvmrc = await readFile(path.resolve(__dirname, '../../.nvmrc'), 'utf8');
    expect(runtimeFromNvmrc(nvmrc)).toMatch(/^nodejs\d+\.x$/);
  });
});

describe('collectNodeRuntimes', () => {
  it('reads nested Node functions and skips edge functions', async () => {
    const outputDir = await vercelOutput({
      '_render.func': { runtime: 'nodejs24.x', handler: 'entry.mjs' },
      'workflows/og.png.func': { runtime: 'nodejs20.x' },
      '_middleware.func': { runtime: 'edge', entrypoint: 'middleware.mjs' },
    });

    const runtimes = await collectNodeRuntimes(outputDir);

    expect(runtimes.map((r) => r.runtime).sort()).toEqual(['nodejs20.x', 'nodejs24.x']);
    expect(runtimes.map((r) => r.config)).toContain(
      path.join('functions', 'workflows', 'og.png.func', '.vc-config.json')
    );
  });

  it('fails loudly when the functions directory is missing', async () => {
    const outputDir = await mkdtemp(path.join(tmpdir(), 'vercel-output-'));
    dirs.push(outputDir);
    await expect(collectNodeRuntimes(outputDir)).rejects.toThrow(/ENOENT/);
  });
});

describe('findRuntimeMismatches', () => {
  const fn = (runtime: string) => ({ config: `functions/${runtime}/.vc-config.json`, runtime });

  it('passes when every function matches the pin', () => {
    expect(findRuntimeMismatches([fn('nodejs24.x')], 'nodejs24.x')).toEqual([]);
  });

  it('reports only the functions on a different runtime', () => {
    expect(findRuntimeMismatches([fn('nodejs24.x'), fn('nodejs20.x')], 'nodejs24.x')).toEqual([
      fn('nodejs20.x'),
    ]);
  });

  it('treats an output with no Node functions as a broken path, not a pass', () => {
    expect(() => findRuntimeMismatches([], 'nodejs24.x')).toThrow('No Node.js functions found');
  });
});
