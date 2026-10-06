import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const EXPECTED_RUNTIME = 'nodejs24.x';

async function findConfigFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findConfigFiles(entryPath)));
    } else if (entry.name === '.vc-config.json') {
      files.push(entryPath);
    }
  }

  return files;
}

export async function verifyVercelRuntime(outputDirectory: string): Promise<number> {
  const functionsDirectory = path.join(outputDirectory, 'functions');
  let configFiles: string[];

  try {
    configFiles = await findConfigFiles(functionsDirectory);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`Vercel functions directory is missing: ${functionsDirectory}`);
    }
    throw error;
  }

  const nodeFunctions: Array<{ configFile: string; runtime: string }> = [];
  for (const configFile of configFiles) {
    const config = JSON.parse(await readFile(configFile, 'utf8')) as { runtime?: unknown };
    if (typeof config.runtime === 'string' && config.runtime.startsWith('nodejs')) {
      nodeFunctions.push({ configFile, runtime: config.runtime });
    }
  }

  if (nodeFunctions.length === 0) {
    throw new Error(`No Node.js Vercel function metadata found under ${functionsDirectory}`);
  }

  const mismatches = nodeFunctions.filter(({ runtime }) => runtime !== EXPECTED_RUNTIME);
  if (mismatches.length > 0) {
    const details = mismatches
      .map(({ configFile, runtime }) => `${path.relative(outputDirectory, configFile)}: ${runtime}`)
      .join('\n');
    throw new Error(`Expected every Node.js function to use ${EXPECTED_RUNTIME}:\n${details}`);
  }

  return nodeFunctions.length;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const outputDirectory = path.resolve(process.argv[2] ?? '.vercel/output');
  try {
    const count = await verifyVercelRuntime(outputDirectory);
    console.log(`Verified ${count} Vercel Node.js function(s) use ${EXPECTED_RUNTIME}.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
