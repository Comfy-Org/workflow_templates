import { describe, it } from 'vitest'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import type { ISerialisedGraph } from '@/lib/litegraph/src/types/serialisation'

import { fixBadLinks } from './linkFixer'

// Runs the frontend's real link validator over every template in AUDIT_DIR and
// writes a per-file report to /tmp/linkfix_audit.txt.
//
//   cp scripts/linkfixer_audit.test.ts the ComfyUI frontend checkout/src/utils/
//   cd the ComfyUI frontend checkout
//   env -u PYTHONPATH AUDIT_DIR=this repo/templates \
//     npx vitest run src/utils/linkfixer_audit.test.ts
//
// Pass condition: "AUDIT files=N withIssues=0 patched=0".
// fix:false only reports (safe on a worktree); fix:true also proves the fix is
// idempotent and throws when two links claim one slot.
const DIR =
  process.env.AUDIT_DIR ??
  './templates'
const FIX = process.env.AUDIT_FIX === '1'

describe('audit workflow templates with the real linkFixer', () => {
  it('reports funky links per template', () => {
    const files = readdirSync(DIR).filter(
      (f) =>
        f.endsWith('.json') &&
        !f.startsWith('index') &&
        !f.endsWith('.mcp.json')
    )
    const report: string[] = []
    let filesWithIssues = 0
    let totalPatched = 0
    for (const f of files) {
      const path = join(DIR, f)
      let graph: ISerialisedGraph
      try {
        graph = JSON.parse(readFileSync(path, 'utf-8')) as ISerialisedGraph
      } catch (e) {
        report.push(`${f}: PARSE FAIL ${String(e)}`)
        continue
      }
      if (typeof graph !== 'object' || graph === null || !('nodes' in graph))
        continue
      const logs: string[] = []
      const res = fixBadLinks(graph, {
        fix: FIX,
        logger: { log: (...a: unknown[]) => logs.push(a.join(' ')) }
      })
      if (logs.length) {
        filesWithIssues++
        totalPatched += res.patched
        report.push(
          `${f} patched=${res.patched} deleted=${res.deleted}\n    ` +
            logs.join('\n    ')
        )
      }
    }
    const out =
      `AUDIT dir=${DIR} fix=${FIX} files=${files.length} ` +
      `withIssues=${filesWithIssues} patched=${totalPatched}\n` +
      report.join('\n')
    // eslint-disable-next-line no-console
    console.log(out)
    writeFileSync('/tmp/linkfix_audit.txt', out)
  })
})
