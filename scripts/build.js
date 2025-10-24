#!/usr/bin/env node

/**
 * Build script for ComfyUI workflow templates
 *
 * This script uses Vite to:
 * 1. Copy all template files (JSON, WebP, etc.)
 * 2. Generate content-hashed filenames for cache busting
 * 3. Create a manifest mapping original → hashed names
 * 4. Rewrite index.json to reference hashed filenames
 */

import { build } from 'vite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🚀 Starting ComfyUI Templates Build...\n')

async function buildTemplates() {
  const startTime = Date.now()

  try {
    // Measure input size
    console.log('📊 Measuring input size...')
    const templatesDir = path.join(rootDir, 'templates')
    const inputSize = await getDirectorySize(templatesDir)
    console.log(`   Input size: ${formatBytes(inputSize)}\n`)

    // Run Vite build
    console.log('🔨 Running Vite build...\n')
    await build({
      configFile: path.join(rootDir, 'vite.config.js'),
      logLevel: 'info'
    })

    // Measure output size
    console.log('\n📊 Measuring output size...')
    const distDir = path.join(rootDir, 'dist')
    const outputSize = await getDirectorySize(distDir)
    console.log(`   Output size: ${formatBytes(outputSize)}`)

    // Calculate reduction
    const reduction = ((inputSize - outputSize) / inputSize * 100).toFixed(1)
    console.log(`   Size reduction: ${reduction}%\n`)

    // Validate output
    console.log('✅ Validating output...')
    await validateOutput(distDir)

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`\n✨ Build completed successfully in ${duration}s!`)

    // Generate report
    await generateReport({
      inputSize,
      outputSize,
      reduction,
      duration
    })

  } catch (error) {
    console.error('❌ Build failed:', error)
    process.exit(1)
  }
}

/**
 * Calculate directory size recursively
 */
async function getDirectorySize(dir) {
  let size = 0

  try {
    const files = fs.readdirSync(dir)

    for (const file of files) {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)

      if (stat.isDirectory()) {
        // Skip node_modules and hidden directories
        if (file === 'node_modules' || file.startsWith('.')) {
          continue
        }
        size += await getDirectorySize(filePath)
      } else {
        size += stat.size
      }
    }
  } catch (error) {
    // Directory might not exist
    return 0
  }

  return size
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Validate build output
 */
async function validateOutput(distDir) {
  const checks = []

  // Check index.json exists
  const indexPath = path.join(distDir, 'index.json')
  if (fs.existsSync(indexPath)) {
    console.log('   ✓ index.json exists')
    checks.push(true)

    // Validate it's valid JSON
    try {
      const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))
      console.log(`   ✓ index.json is valid (${index.length} categories)`)
      checks.push(true)
    } catch (error) {
      console.log('   ✗ index.json is invalid JSON')
      checks.push(false)
    }
  } else {
    console.log('   ✗ index.json missing')
    checks.push(false)
  }

  // Check manifest exists
  const manifestPath = path.join(distDir, 'manifest.json')
  if (fs.existsSync(manifestPath)) {
    console.log('   ✓ manifest.json exists')
    checks.push(true)

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
      console.log(`   ✓ manifest.json is valid (${Object.keys(manifest).length} entries)`)
      checks.push(true)
    } catch (error) {
      console.log('   ✗ manifest.json is invalid JSON')
      checks.push(false)
    }
  } else {
    console.log('   ✗ manifest.json missing')
    checks.push(false)
  }

  // Check that files exist
  const files = fs.readdirSync(distDir)
  const jsonFiles = files.filter(f => f.endsWith('.json'))
  const webpFiles = files.filter(f => f.endsWith('.webp'))
  const mp4Files = files.filter(f => f.endsWith('.mp4'))
  const mp3Files = files.filter(f => f.endsWith('.mp3'))

  console.log(`   ✓ Found ${jsonFiles.length} JSON files`)
  console.log(`   ✓ Found ${webpFiles.length} WebP files`)
  if (mp4Files.length > 0) console.log(`   ✓ Found ${mp4Files.length} MP4 files`)
  if (mp3Files.length > 0) console.log(`   ✓ Found ${mp3Files.length} MP3 files`)

  // Check for content hashes in filenames
  const hashedFiles = files.filter(f => /-[a-f0-9]{8,}\./i.test(f))
  if (hashedFiles.length > 0) {
    console.log(`   ✓ ${hashedFiles.length} files have content hashes`)
    checks.push(true)
  } else {
    console.log('   ⚠️  No files have content hashes')
    checks.push(false)
  }

  if (checks.every(c => c)) {
    console.log('   ✅ All validation checks passed')
  } else {
    console.log('   ⚠️  Some validation checks failed')
  }
}

/**
 * Generate build report
 */
async function generateReport(stats) {
  const report = `# Vite Build Report

**Generated:** ${new Date().toISOString()}
**Build Duration:** ${stats.duration}s

## Size Metrics

- **Input Size:** ${formatBytes(stats.inputSize)}
- **Output Size:** ${formatBytes(stats.outputSize)}
- **Size Reduction:** ${stats.reduction}%
- **Bytes Saved:** ${formatBytes(stats.inputSize - stats.outputSize)}

## Output Structure

\`\`\`
dist/
├── manifest.json          # Mapping of original → hashed filenames
├── index.json            # Rewritten with hashed references
├── *-[hash].json         # Content-hashed workflow files
└── *-[hash].webp         # Content-hashed thumbnails
\`\`\`

## Next Steps

1. Review the dist/ directory to verify output
2. Test loading templates with the new structure
3. Run validation: \`npm run validate\`
4. Compare performance with baseline

## Notes

- Content hashes enable infinite caching (max-age=31536000, immutable)
- No more special cache rules needed for index files
- All files can be cached indefinitely with automatic freshness guarantee
`

  const reportPath = path.join(rootDir, 'BUILD_REPORT.md')
  fs.writeFileSync(reportPath, report)
  console.log(`\n📄 Build report saved to BUILD_REPORT.md`)
}

// Run build
buildTemplates().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
