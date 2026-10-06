import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { verifyVercelRuntime } from '../../scripts/verify-vercel-runtime';

const temporaryDirectories: string[] = [];

async function outputWithRuntime(runtime: string) {
  const outputDirectory = await mkdtemp(path.join(tmpdir(), 'vercel-runtime-'));
  temporaryDirectories.push(outputDirectory);
  const functionDirectory = path.join(outputDirectory, 'functions', 'render.func');
  await mkdir(functionDirectory, { recursive: true });
  await writeFile(path.join(functionDirectory, '.vc-config.json'), JSON.stringify({ runtime }));
  return outputDirectory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true }))
  );
});

describe('verifyVercelRuntime', () => {
  it('accepts Node 24 function metadata', async () => {
    const outputDirectory = await outputWithRuntime('nodejs24.x');
    await expect(verifyVercelRuntime(outputDirectory)).resolves.toBe(1);
  });

  it('rejects discontinued Node function metadata', async () => {
    const outputDirectory = await outputWithRuntime('nodejs20.x');
    await expect(verifyVercelRuntime(outputDirectory)).rejects.toThrow(
      'Expected every Node.js function to use nodejs24.x'
    );
  });

  it('identifies malformed function metadata by file', async () => {
    const outputDirectory = await mkdtemp(path.join(tmpdir(), 'vercel-runtime-'));
    temporaryDirectories.push(outputDirectory);
    const configFile = path.join(outputDirectory, 'functions', 'render.func', '.vc-config.json');
    await mkdir(path.dirname(configFile), { recursive: true });
    await writeFile(configFile, '{invalid json');

    await expect(verifyVercelRuntime(outputDirectory)).rejects.toThrow(
      `Invalid Vercel function metadata in ${configFile}`
    );
  });

  it('fails when a build produces no Node function metadata', async () => {
    const outputDirectory = await mkdtemp(path.join(tmpdir(), 'vercel-runtime-'));
    temporaryDirectories.push(outputDirectory);
    await mkdir(path.join(outputDirectory, 'functions'), { recursive: true });
    await expect(verifyVercelRuntime(outputDirectory)).rejects.toThrow(
      'No Node.js Vercel function metadata found'
    );
  });
});
