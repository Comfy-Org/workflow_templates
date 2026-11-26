/**
 * Validate ComfyUI workflow JSON against the frontend's own zod schema
 * (`@comfyorg/graph-model/workflowSchema` -> `validateComfyWorkflow`).
 *
 * Why: the template loader validates strictly and, on failure, silently falls back to legacy loading
 * (id + type per node). The repo's validate_templates.py does not run this schema, so a graph with e.g.
 * `"slot_index": null` passes CI and misbehaves in the app.
 *
 * Usage — tsx must come from the frontend checkout so zod / zod-validation-error resolve:
 *   cd /path/to/ComfyUI_frontend
 *   ./node_modules/.bin/tsx <this file> path/to/workflow.json [more.json ...]
 *
 * The frontend clone is found at $COMFYUI_FRONTEND, falling back to $HOME/ComfyUI_frontend.
 * Exit code: 0 = all valid, 1 = at least one invalid, 2 = bad usage.
 */
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const repo = process.env.COMFYUI_FRONTEND ?? `${process.env.HOME}/ComfyUI_frontend`
const schemaUrl = pathToFileURL(`${repo}/packages/graph-model/src/workflowSchema.ts`).href

let validateComfyWorkflow: (
  data: unknown,
  onError?: (error: string) => void
) => Promise<unknown>
try {
  ;({ validateComfyWorkflow } = await import(schemaUrl))
} catch (e) {
  console.error(`cannot load ${schemaUrl}\n${e}`)
  process.exit(2)
}

const files = process.argv.slice(2)
if (files.length === 0) {
  console.error('usage: tsx validate_workflow_schema.mts <workflow.json> ...')
  process.exit(2)
}

let failed = 0
for (const file of files) {
  let json: unknown
  try {
    json = JSON.parse(readFileSync(file, 'utf8'))
  } catch (e) {
    failed++
    console.log(`INVALID ${file}\n  not JSON: ${e}`)
    continue
  }

  let error: string | undefined
  const result = await validateComfyWorkflow(json, (detail: string) => {
    error = detail
  })
  if (result) {
    console.log(`VALID   ${file}`)
    continue
  }
  failed++
  console.log(`INVALID ${file}\n${error ?? 'validation failed'}`)
}

process.exitCode = failed > 0 ? 1 : 0
