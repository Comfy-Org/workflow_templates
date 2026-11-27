/**
 * Validate every shipped workflow against the frontend's own zod schema
 * (`@comfyorg/graph-model` -> `validateComfyWorkflow`).
 *
 * The schema is NOT vendored here. The CI workflow fetches the frontend sources
 * named in FRONTEND_FILES below from GitHub raw at a chosen ref, installs the two
 * runtime dependencies next to them, and passes the directory in via
 * `--frontend-dir`. That keeps the gate pinned to the real frontend code while
 * avoiding a full clone (four files, ~45 KB) or a pnpm install of the monorepo.
 *
 * Usage:
 *   tsx scripts/validate/frontend_schema.mts --frontend-dir <dir> [--index <index.json>]
 *
 * The directory must contain `packages/graph-model/src/<the two schema entry
 * files>` and a `node_modules` with `zod` + `zod-validation-error`.
 *
 * Exit code: 0 = every template valid, 1 = at least one invalid, 2 = setup error.
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname, basename } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/** Runtime import closure of packages/graph-model/src/workflowSchema.ts. */
export const FRONTEND_FILES = [
  'workflowSchema.ts',
  'widgets.ts',
  'linkId.ts',
  'rerouteId.ts'
] as const

interface Args {
  frontendDir: string
  index: string
}

function parseArgs(argv: string[]): Args {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
  const args: Args = {
    frontendDir: process.env.FRONTEND_DIR ?? '',
    index: resolve(repoRoot, 'templates/index.json')
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--frontend-dir') args.frontendDir = argv[++i]
    else if (arg === '--index') args.index = resolve(argv[++i])
    else if (arg === '--help' || arg === '-h') {
      console.log(
        'usage: tsx scripts/validate/frontend_schema.mts --frontend-dir <dir> [--index <index.json>]'
      )
      process.exit(0)
    } else {
      console.error(`unknown argument: ${arg}`)
      process.exit(2)
    }
  }
  if (!args.frontendDir) {
    console.error('missing --frontend-dir (or FRONTEND_DIR)')
    process.exit(2)
  }
  return args
}

const args = parseArgs(process.argv.slice(2))
const srcDir = resolve(args.frontendDir, 'packages/graph-model/src')

for (const file of FRONTEND_FILES) {
  if (!existsSync(resolve(srcDir, file))) {
    console.error(`frontend sources incomplete: ${resolve(srcDir, file)} missing`)
    process.exit(2)
  }
}
if (!existsSync(resolve(args.frontendDir, 'node_modules/zod'))) {
  console.error(
    `frontend deps missing: ${resolve(args.frontendDir, 'node_modules/zod')} not found`
  )
  process.exit(2)
}

const schemaUrl = pathToFileURL(resolve(srcDir, 'workflowSchema.ts')).href
let validateComfyWorkflow: (
  data: unknown,
  onError?: (error: string) => void
) => Promise<unknown>
try {
  ;({ validateComfyWorkflow } = await import(schemaUrl))
} catch (error) {
  console.error(`cannot load ${schemaUrl}\n${error}`)
  process.exit(2)
}

interface Module {
  moduleName?: string
  templates?: { name: string }[]
}
const modules = JSON.parse(readFileSync(args.index, 'utf8')) as Module[]
const names = modules.flatMap((m) => (m.templates ?? []).map((t) => t.name))
if (names.length === 0) {
  console.error(`no templates listed in ${args.index}`)
  process.exit(2)
}

const templatesDir = resolve(dirname(args.index), '.')
let failed = 0
for (const name of names) {
  const file = resolve(templatesDir, `${name}.json`)
  if (!existsSync(file)) {
    console.log(`::error file=templates/${name}.json::listed in index.json but the file is missing`)
    failed++
    continue
  }
  let json: unknown
  try {
    json = JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    console.log(
      `::error file=templates/${name}.json::not valid JSON: ${(error as Error).message}`
    )
    failed++
    continue
  }

  let error: string | undefined
  const result = await validateComfyWorkflow(json, (detail: string) => {
    error = detail
  })
  if (result) continue

  failed++
  const detail = (error ?? 'validation failed').replace(/\n/g, ' ')
  console.log(`INVALID ${name}.json`)
  console.log(`  ${detail}`)
  console.log(`::error file=templates/${name}.json::${detail}`)
}

const total = names.length
if (failed > 0) {
  console.log(
    `\n${failed} of ${total} templates fail the frontend zod schema (${basename(args.index)}).`
  )
  process.exitCode = 1
} else {
  console.log(`All ${total} templates pass the frontend zod schema.`)
}
