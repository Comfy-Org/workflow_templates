import { defineConfig } from 'vite'
import { resolve } from 'path'
import fs from 'fs'
import path from 'path'

/**
 * MINIFY-ONLY BUILD MODE
 *
 * This config minifies JSON files while keeping original filenames.
 * No content hashing = no consumer changes needed.
 *
 * Trade-offs:
 * ✅ No frontend/server changes required
 * ✅ Reduces package size (JSON minification)
 * ✅ Drop-in replacement
 * ❌ No cache improvements (can't use immutable caching)
 * ❌ Still limited by PyPI 100MB limit
 */

export default defineConfig({
  build: {
    manifest: false, // Don't need manifest without hashing
    outDir: resolve(process.cwd(), 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(process.cwd(), 'templates/index.json')
    },
    assetsInlineLimit: 0,
    copyPublicDir: false
  },
  plugins: [
    {
      name: 'minify-templates',
      async buildStart() {
        console.log('🔍 Scanning templates directory...')
        console.log('📦 Mode: MINIFY-ONLY (no hashing)')
      },
      async generateBundle(options, bundle) {
        const templatesDir = resolve(process.cwd(), 'templates')
        const files = fs.readdirSync(templatesDir)
        let processedCount = 0
        let minifiedCount = 0

        // Process all template files
        for (const file of files) {
          const filePath = resolve(templatesDir, file)
          const stat = fs.statSync(filePath)

          if (stat.isFile() && file !== '.gitignore') {
            // Read file content
            let content = fs.readFileSync(filePath)
            let wasMinified = false

            const ext = path.extname(file)

            // Minify JSON files (including index.json)
            if (ext === '.json') {
              try {
                const parsed = JSON.parse(content.toString())
                content = Buffer.from(JSON.stringify(parsed)) // Remove all whitespace
                wasMinified = true
                minifiedCount++
              } catch (err) {
                console.warn(`⚠️  Failed to minify ${file}: ${err.message}`)
                // Keep original content if parsing fails
              }
            }

            // Emit with ORIGINAL filename (no hashing)
            this.emitFile({
              type: 'asset',
              fileName: file,
              source: content
            })

            processedCount++
          }
        }

        console.log(`✅ Processed ${processedCount} template files`)
        console.log(`✨ Minified ${minifiedCount} JSON files`)
      }
    }
  ]
})
