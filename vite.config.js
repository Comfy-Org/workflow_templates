import { defineConfig } from 'vite'
import { resolve } from 'path'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

/**
 * VITE BUILD CONFIGURATION - JSON-ONLY CONTENT HASHING
 *
 * Strategy:
 * 1. Hash JSON workflow files based on their content
 * 2. Rename ALL associated assets (webp, mp3, mp4) to match the JSON's hash
 * 3. Update name field in ALL index*.json files to include the hash
 *
 * Example:
 *   Before: default.json, default-1.webp
 *   After:  default-5f65f4da.json, default-5f65f4da-1.webp
 *   Index:  "name": "default-5f65f4da"
 *
 * This allows infinite caching with NO consumer code changes!
 */

export default defineConfig({
  build: {
    manifest: true,
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
      name: 'hash-templates-and-rename-assets',
      async buildStart() {
        console.log('🔍 Scanning templates directory...')
        console.log('📦 Strategy: Hash JSON, rename assets to match')
      },
      async generateBundle(options, bundle) {
        const templatesDir = resolve(process.cwd(), 'templates')
        const files = fs.readdirSync(templatesDir)

        // Step 1: Group files by template base name
        console.log('\n📂 Step 1: Grouping files by template...')
        const templateGroups = new Map() // basename -> {json, assets: []}

        for (const file of files) {
          const filePath = resolve(templatesDir, file)
          const stat = fs.statSync(filePath)

          if (!stat.isFile()) continue

          // Skip special files
          if (file === '.gitignore' || file.startsWith('index')) continue

          const ext = path.extname(file)
          const baseName = path.basename(file, ext)

          // Determine template base name
          let templateBaseName

          if (ext === '.json') {
            // This is a workflow file
            templateBaseName = baseName
          } else {
            // This is an asset file (pattern: basename-N.ext)
            const match = baseName.match(/^(.+)-(\d+)$/)
            if (match) {
              templateBaseName = match[1]
            } else {
              // Unusual pattern, skip or warn
              console.warn(`⚠️  Couldn't parse asset file: ${file}`)
              continue
            }
          }

          // Add to group
          if (!templateGroups.has(templateBaseName)) {
            templateGroups.set(templateBaseName, { json: null, assets: [] })
          }

          const group = templateGroups.get(templateBaseName)
          if (ext === '.json') {
            group.json = { file, path: filePath }
          } else {
            group.assets.push({ file, path: filePath, ext })
          }
        }

        console.log(`   Found ${templateGroups.size} template groups`)

        // Step 2: Hash JSON files and rename everything
        console.log('\n🔐 Step 2: Hashing JSON files and renaming assets...')
        const hashMapping = {} // original filename -> hashed filename
        let processedCount = 0

        for (const [baseName, group] of templateGroups.entries()) {
          if (!group.json) {
            console.warn(`⚠️  No JSON file found for template: ${baseName}`)
            continue
          }

          // Read and minify JSON
          let jsonContent = fs.readFileSync(group.json.path)
          try {
            const parsed = JSON.parse(jsonContent.toString())
            jsonContent = Buffer.from(JSON.stringify(parsed)) // Minify
          } catch (err) {
            console.warn(`⚠️  Failed to minify ${group.json.file}: ${err.message}`)
          }

          // Generate hash from JSON content
          const hash = crypto.createHash('sha256')
            .update(jsonContent)
            .digest('hex')
            .slice(0, 8)

          // Emit hashed JSON file
          const hashedJsonName = `${baseName}-${hash}.json`
          this.emitFile({
            type: 'asset',
            fileName: hashedJsonName,
            source: jsonContent
          })
          hashMapping[group.json.file] = hashedJsonName
          processedCount++

          // Emit renamed asset files (using same hash as JSON)
          for (const asset of group.assets) {
            const assetContent = fs.readFileSync(asset.path)
            const assetExt = path.extname(asset.file)
            const assetBaseName = path.basename(asset.file, assetExt)

            // Extract the suffix (e.g., "-1" from "default-1.webp")
            const match = assetBaseName.match(/^.+-(\d+)$/)
            const suffix = match ? `-${match[1]}` : ''

            // Rename asset to match JSON hash
            const hashedAssetName = `${baseName}-${hash}${suffix}${assetExt}`

            this.emitFile({
              type: 'asset',
              fileName: hashedAssetName,
              source: assetContent
            })
            hashMapping[asset.file] = hashedAssetName
            processedCount++
          }
        }

        console.log(`✅ Processed ${processedCount} files`)
        console.log(`📊 Created ${templateGroups.size} template groups with hashes`)

        // Store mapping for next plugin
        this.hashMapping = hashMapping
      }
    },
    {
      name: 'update-index-files',
      closeBundle() {
        const distDir = resolve(process.cwd(), 'dist')
        const templatesDir = resolve(process.cwd(), 'templates')

        console.log('\n📝 Step 3: Updating all index*.json files...')

        // Find all index files
        const indexFiles = fs.readdirSync(templatesDir)
          .filter(f => f.startsWith('index') && f.endsWith('.json') && f !== 'index.schema.json')

        console.log(`   Found ${indexFiles.length} index files to update`)

        // Build mapping of original basename -> hashed basename
        const distFiles = fs.readdirSync(distDir)
        const nameMapping = {} // "default" -> "default-5f65f4da"

        for (const file of distFiles) {
          if (!file.endsWith('.json')) continue
          if (file.startsWith('index')) continue

          // Extract original basename and hash
          const match = file.match(/^(.+)-([a-f0-9]{8})\.json$/)
          if (match) {
            const originalBase = match[1]
            const hash = match[2]
            nameMapping[originalBase] = `${originalBase}-${hash}`
          }
        }

        console.log(`   Created name mapping for ${Object.keys(nameMapping).length} templates`)

        // Update each index file
        for (const indexFile of indexFiles) {
          const indexPath = path.join(templatesDir, indexFile)
          const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))

          let updatedCount = 0

          // Update name fields in all templates
          for (const category of indexData) {
            if (!category.templates) continue

            for (const template of category.templates) {
              const originalName = template.name

              // Check if this name needs updating
              if (nameMapping[originalName]) {
                template.name = nameMapping[originalName]
                updatedCount++
              }
            }
          }

          // Write updated index file to dist
          const outputPath = path.join(distDir, indexFile)
          fs.writeFileSync(
            outputPath,
            JSON.stringify(indexData, null, 2)
          )

          console.log(`   ✓ ${indexFile}: Updated ${updatedCount} template names`)
        }

        // Write manifest for reference
        const manifestPath = path.join(distDir, 'manifest.json')
        fs.writeFileSync(
          manifestPath,
          JSON.stringify(nameMapping, null, 2)
        )

        console.log('\n✅ All index files updated with hashed names')
        console.log(`📄 Manifest saved to manifest.json`)
      }
    }
  ]
})
