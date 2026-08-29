/**
 * Flip an experiment flag in `src/data/experiment-flags.json`.
 *
 * Usage:
 *   pnpm experiment-flag minimaxH3Demo off --reason "integration test red"
 *   pnpm experiment-flag minimaxH3Demo on  --reason "verified green" --by manual
 *
 * Writes atomically and reports whether anything actually changed, so the
 * unattended CI caller can skip an empty commit when the flag is already in the
 * requested state. Never edits a flag it does not recognise — an unknown name
 * is a typo, and silently creating a flag nothing reads would make CI look like
 * it succeeded while the site kept serving the broken surface.
 */
import { renameSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { experimentFlags, type ExperimentName } from '../src/config/experimentFlags';

import current from '../src/data/experiment-flags.json' with { type: 'json' };

const flagsPath = fileURLToPath(new URL('../src/data/experiment-flags.json', import.meta.url));

function fail(message: string): never {
  console.error(`set-experiment-flag: ${message}`);
  process.exit(1);
}

function readOption(argv: readonly string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  if (index === -1) return undefined;
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('--')) fail(`${flag} needs a value`);
  return value;
}

const argv = process.argv.slice(2);
const [name, state] = argv;

const known = Object.keys(experimentFlags) as ExperimentName[];
if (!name || !known.includes(name as ExperimentName)) {
  fail(`unknown experiment "${name ?? ''}". Known: ${known.join(', ')}`);
}
if (state !== 'on' && state !== 'off') {
  fail(`expected "on" or "off" as the second argument, got "${state ?? ''}"`);
}

const enabled = state === 'on';
const reason = readOption(argv, '--reason') ?? `Set ${state} via set-experiment-flag`;
const updatedBy = readOption(argv, '--by') ?? (process.env.GITHUB_ACTIONS ? 'ci' : 'manual');

const flags: Record<string, unknown> = { ...current };
const existing = current[name as ExperimentName];
const changed = existing.enabled !== enabled;

// `updatedAt`/`reason` are only rewritten on a real state change. A no-op run
// that refreshed the timestamp would produce a commit on every scheduled build
// and bury the flips that matter in the file's history.
if (changed) {
  flags[name] = { enabled, updatedAt: new Date().toISOString(), updatedBy, reason };
  const tempPath = `${flagsPath}.tmp`;
  try {
    writeFileSync(tempPath, `${JSON.stringify(flags, null, 2)}\n`, 'utf8');
    renameSync(tempPath, flagsPath);
  } finally {
    // A crash between write and rename would otherwise leave an untracked
    // sibling of a tracked file behind in the checkout.
    rmSync(tempPath, { force: true });
  }
}

const summary = changed
  ? `${name}: ${existing.enabled ? 'on' : 'off'} -> ${state} (${reason})`
  : `${name}: already ${state}, nothing written`;
process.stdout.write(`${summary}\n`);

// Consumed by the workflow to decide whether to commit and notify. Only the
// boolean: the reason is free text from a server response and would need
// heredoc delimiting to survive GITHUB_OUTPUT's line-based format.
if (process.env.GITHUB_OUTPUT) {
  writeFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`, { flag: 'a' });
}
