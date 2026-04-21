/**
 * Build profiler - runs the full build pipeline with detailed timing information.
 *
 * Usage: pnpm run build:profile
 */

import { spawn, ChildProcess } from 'child_process';
import { readdir, stat } from 'fs/promises';
import path from 'path';
import os from 'os';

interface PhaseResult {
  name: string;
  duration: number;
  success: boolean;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = ((ms % 60000) / 1000).toFixed(1);
  return `${mins}m ${secs}s`;
}

async function runPhase(name: string, command: string, args: string[]): Promise<PhaseResult> {
  const startTime = Date.now();
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`▶ ${name}`);
  console.log(`${'─'.repeat(60)}`);

  return new Promise((resolve) => {
    const proc: ChildProcess = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
    });

    proc.on('close', (code) => {
      const duration = Date.now() - startTime;
      resolve({
        name,
        duration,
        success: code === 0,
      });
    });

    proc.on('error', (err) => {
      const duration = Date.now() - startTime;
      console.error(`Error: ${err.message}`);
      resolve({
        name,
        duration,
        success: false,
      });
    });
  });
}

async function countFiles(dir: string): Promise<number> {
  let count = 0;
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        count += await countFiles(path.join(dir, entry.name));
      } else {
        count++;
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }
  return count;
}

async function getDirSize(dir: string): Promise<number> {
  let size = 0;
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        size += await getDirSize(fullPath);
      } else {
        const fileStat = await stat(fullPath);
        size += fileStat.size;
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }
  return size;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function main(): Promise<void> {
  const totalStart = Date.now();

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║              BUILD PROFILER                              ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\n📍 Started at: ${new Date().toISOString()}`);
  console.log(
    `💻 System: ${os.cpus().length} CPUs, ${(os.totalmem() / (1024 * 1024 * 1024)).toFixed(1)} GB RAM`
  );
  console.log(`🔧 Node: ${process.version}`);

  const phases: PhaseResult[] = [];

  // Phase 1: Prebuild
  phases.push(await runPhase('Prebuild (sync + generate)', 'pnpm', ['run', 'prebuild']));
  if (!phases[phases.length - 1].success) {
    console.error('\n❌ Prebuild failed. Stopping.');
    process.exit(1);
  }

  // Count content files
  const templateCount = await countFiles('src/content/templates');
  console.log(`\n📊 Content: ${templateCount} template files`);

  // Phase 2: Astro Build
  phases.push(await runPhase('Astro Build', 'pnpm', ['run', 'astro', 'build']));

  // Final statistics
  const totalDuration = Date.now() - totalStart;
  const distFileCount = await countFiles('dist');
  const distSize = await getDirSize('dist');

  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                    BUILD SUMMARY                         ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('📊 Phase Timing:');
  console.log('┌────────────────────────────────────────┬────────────┬────────┐');
  console.log('│ Phase                                  │ Duration   │ Status │');
  console.log('├────────────────────────────────────────┼────────────┼────────┤');

  for (const phase of phases) {
    const name = phase.name.padEnd(38);
    const duration = formatDuration(phase.duration).padStart(10);
    const status = phase.success ? '  ✓   ' : '  ✗   ';
    console.log(`│ ${name} │ ${duration} │${status}│`);
  }

  console.log('├────────────────────────────────────────┼────────────┼────────┤');
  const totalLabel = 'TOTAL'.padEnd(38);
  const totalTime = formatDuration(totalDuration).padStart(10);
  const allSuccess = phases.every((p) => p.success);
  const totalStatus = allSuccess ? '  ✓   ' : '  ✗   ';
  console.log(`│ ${totalLabel} │ ${totalTime} │${totalStatus}│`);
  console.log('└────────────────────────────────────────┴────────────┴────────┘');

  console.log('');
  console.log('📦 Output:');
  console.log(`   Files: ${distFileCount}`);
  console.log(`   Size:  ${formatBytes(distSize)}`);

  console.log('');
  console.log(`📍 Finished at: ${new Date().toISOString()}`);

  if (!allSuccess) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
