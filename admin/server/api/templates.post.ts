import { promises as fs } from 'fs'
import { join, extname } from 'path'
import { createHash } from 'crypto'

interface TemplateSubmission {
  // Template metadata
  name: string
  title: string
  description: string
  category: string
  mediaType: string
  mediaSubtype: string
  thumbnailVariant?: string
  tutorialUrl?: string
  tags: string[]
  comfyuiVersion?: string
  
  // Models for embedding
  models: Array<{
    name: string
    url: string
    hash?: string
    directory: string
    displayName: string
  }>
  
  // File data (base64 encoded)
  workflowFile: {
    name: string
    content: string // base64
  }
  
  thumbnailFiles: Array<{
    name: string
    content: string // base64
    type: string
  }>
}

export default defineEventHandler(async (event) => {
  try {
    // Only allow POST requests
    if (event.node.req.method !== 'POST') {
      throw createError({
        statusCode: 405,
        statusMessage: 'Method not allowed'
      })
    }

    const body = await readBody(event) as TemplateSubmission
    
    // Validate required fields
    if (!body.name || !body.title || !body.description || !body.category) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }

    if (!body.workflowFile || !body.thumbnailFiles || body.thumbnailFiles.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing workflow or thumbnail files'
      })
    }

    // Validate template name format
    if (!/^[a-zA-Z0-9_]+$/.test(body.name)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Template name can only contain letters, numbers, and underscores'
      })
    }

    // Define paths
    const templatesDir = join(process.cwd(), 'templates')
    const templateDir = join(templatesDir, body.name)
    const bundlesPath = join(templatesDir, 'bundles.json')
    const indexPath = join(templatesDir, 'index.json')

    // Check if template already exists
    try {
      await fs.access(templateDir)
      throw createError({
        statusCode: 409,
        statusMessage: 'Template with this name already exists'
      })
    } catch (error: any) {
      if (error.statusCode === 409) throw error
      // Template doesn't exist, continue
    }

    // Create template directory
    await fs.mkdir(templateDir, { recursive: true })

    // Process workflow file
    const workflowContent = Buffer.from(body.workflowFile.content, 'base64').toString('utf-8')
    let workflowData
    
    try {
      workflowData = JSON.parse(workflowContent)
    } catch (error) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid workflow JSON file'
      })
    }

    // Embed models into workflow if provided
    if (body.models && body.models.length > 0) {
      workflowData = embedModelsIntoWorkflow(workflowData, body.models)
    }

    // Save processed workflow
    const workflowPath = join(templateDir, 'workflow.json')
    await fs.writeFile(workflowPath, JSON.stringify(workflowData, null, 2))

    // Process thumbnail files
    const processedThumbnails = []
    
    for (let i = 0; i < body.thumbnailFiles.length; i++) {
      const file = body.thumbnailFiles[i]
      const ext = extname(file.name) || getExtensionFromMimeType(file.type)
      const thumbnailName = `${body.name}-${i + 1}${ext}`
      const thumbnailPath = join(templateDir, thumbnailName)
      
      // Decode and save thumbnail
      const thumbnailBuffer = Buffer.from(file.content, 'base64')
      await fs.writeFile(thumbnailPath, thumbnailBuffer)
      
      processedThumbnails.push(thumbnailName)
    }

    // Calculate template size
    const templateStats = await getDirectorySize(templateDir)

    // Create template metadata
    const templateMetadata = {
      name: body.name,
      title: body.title,
      description: body.description,
      mediaType: body.mediaType,
      mediaSubtype: body.mediaSubtype,
      ...(body.thumbnailVariant && body.thumbnailVariant !== 'none' && { thumbnailVariant: body.thumbnailVariant }),
      ...(body.tutorialUrl && { tutorialUrl: body.tutorialUrl }),
      tags: body.tags,
      models: body.models.map(model => model.displayName).filter(Boolean),
      ...(body.comfyuiVersion && { comfyuiVersion: body.comfyuiVersion }),
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      size: templateStats.totalSize
    }

    // Update bundles.json
    await updateBundlesJson(bundlesPath, body.category, body.name)

    // Update index.json
    await updateIndexJson(indexPath, body.category, templateMetadata)

    // Update pyproject.toml version
    await bumpVersion()

    // Trigger GitHub integration if configured
    const shouldTriggerGitHub = process.env.GITHUB_TOKEN && process.env.GITHUB_REPO && process.env.GITHUB_OWNER
    let githubResult = null

    if (shouldTriggerGitHub) {
      try {
        console.log('Triggering GitHub workflow...')
        
        // Prepare files for GitHub
        const githubFiles = [
          {
            path: `templates/${body.name}/workflow.json`,
            content: body.workflowFile.content
          },
          ...body.thumbnailFiles.map((file, index) => ({
            path: `templates/${body.name}/${body.name}-${index + 1}${getExtensionFromMimeType(file.type)}`,
            content: file.content
          }))
        ]

        const githubPayload = {
          templateName: body.name,
          category: body.category,
          files: githubFiles,
          metadata: {
            title: body.title,
            description: body.description,
            tags: body.tags,
            models: body.models.map(m => m.displayName).filter(Boolean)
          }
        }

        // Call GitHub integration endpoint
        const githubResponse = await fetch(`${process.env.BASE_URL || 'http://localhost:3000'}/api/github-integration`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(githubPayload)
        })

        if (githubResponse.ok) {
          githubResult = await githubResponse.json()
          console.log('GitHub workflow triggered successfully')
        } else {
          console.error('Failed to trigger GitHub workflow:', await githubResponse.text())
        }
      } catch (githubError) {
        console.error('GitHub integration error:', githubError)
        // Don't fail the whole operation if GitHub fails
      }
    }

    return {
      success: true,
      message: 'Template created successfully',
      template: {
        name: body.name,
        path: templateDir,
        metadata: templateMetadata,
        thumbnails: processedThumbnails
      },
      github: githubResult || { message: 'GitHub integration not configured' }
    }

  } catch (error: any) {
    console.error('Template creation error:', error)
    
    // If it's already a createError, re-throw it
    if (error.statusCode) {
      throw error
    }
    
    // Otherwise, create a generic server error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error'
    })
  }
})

// Helper Functions

function embedModelsIntoWorkflow(workflow: any, models: TemplateSubmission['models']): any {
  // Create mapping of model names to metadata
  const modelsByName = models.reduce((acc, model) => {
    acc[model.name] = {
      name: model.name,
      url: model.url,
      directory: model.directory,
      ...(model.hash && { hash: model.hash, hash_type: 'SHA256' })
    }
    return acc
  }, {} as Record<string, any>)

  // Process nodes recursively
  const processNodes = (nodes: any[]) => {
    if (!Array.isArray(nodes)) return

    nodes.forEach((node: any) => {
      if (typeof node === 'object' && node.widgets_values) {
        const widgetValues = node.widgets_values || []
        const nodeModels = []

        // Check each widget value for model matches
        for (const widgetValue of widgetValues) {
          if (typeof widgetValue === 'string' && modelsByName[widgetValue]) {
            nodeModels.push(modelsByName[widgetValue])
          }
        }

        // Add models metadata to node if found
        if (nodeModels.length > 0) {
          if (!node.properties) node.properties = {}
          node.properties.models = nodeModels
        }
      }

      // Process subgraphs if they exist
      if (node.subgraph && Array.isArray(node.subgraph)) {
        processNodes(node.subgraph)
      }
    })
  }

  // Process main workflow and any subgraphs
  if (workflow.nodes && Array.isArray(workflow.nodes)) {
    processNodes(workflow.nodes)
  }

  return workflow
}

async function updateBundlesJson(bundlesPath: string, category: string, templateName: string) {
  let bundlesData: any = {}
  
  try {
    const bundlesContent = await fs.readFile(bundlesPath, 'utf-8')
    bundlesData = JSON.parse(bundlesContent)
  } catch (error) {
    // File doesn't exist, create new structure
    bundlesData = {}
  }

  // Initialize category if it doesn't exist
  if (!bundlesData[category]) {
    bundlesData[category] = []
  }

  // Add template if not already present
  if (!bundlesData[category].includes(templateName)) {
    bundlesData[category].push(templateName)
  }

  // Save updated bundles.json
  await fs.writeFile(bundlesPath, JSON.stringify(bundlesData, null, 2))
}

async function updateIndexJson(indexPath: string, category: string, templateMetadata: any) {
  let indexData: any = { categories: [] }
  
  try {
    const indexContent = await fs.readFile(indexPath, 'utf-8')
    indexData = JSON.parse(indexContent)
  } catch (error) {
    // File doesn't exist, create new structure
    indexData = { categories: [] }
  }

  // Find or create category
  let categoryData = indexData.categories.find((cat: any) => cat.moduleName === category)
  
  if (!categoryData) {
    // Create new category
    categoryData = {
      moduleName: category,
      title: getCategoryTitle(category),
      type: templateMetadata.mediaType,
      templates: []
    }
    indexData.categories.push(categoryData)
  }

  // Add template to category (replace if exists)
  const existingIndex = categoryData.templates.findIndex((template: any) => template.name === templateMetadata.name)
  
  if (existingIndex >= 0) {
    categoryData.templates[existingIndex] = templateMetadata
  } else {
    categoryData.templates.push(templateMetadata)
  }

  // Save updated index.json
  await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2))
}

function getCategoryTitle(category: string): string {
  const categoryTitles: Record<string, string> = {
    'media-api': 'Media API',
    'media-image': 'Media Image', 
    'media-video': 'Media Video',
    'media-other': 'Media Other',
    'default': 'Default Templates'
  }
  
  return categoryTitles[category] || category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'audio/mp3': '.mp3',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'audio/ogg': '.ogg'
  }
  
  return mimeToExt[mimeType] || '.bin'
}

async function getDirectorySize(dirPath: string): Promise<{ totalSize: number, fileCount: number }> {
  let totalSize = 0
  let fileCount = 0
  
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true })
    
    for (const file of files) {
      const filePath = join(dirPath, file.name)
      
      if (file.isDirectory()) {
        const subDirStats = await getDirectorySize(filePath)
        totalSize += subDirStats.totalSize
        fileCount += subDirStats.fileCount
      } else {
        const stats = await fs.stat(filePath)
        totalSize += stats.size
        fileCount++
      }
    }
  } catch (error) {
    console.error('Error calculating directory size:', error)
  }
  
  return { totalSize, fileCount }
}

async function bumpVersion() {
  try {
    // Try pyproject.toml first (Python projects)
    const pyprojectPath = join(process.cwd(), 'pyproject.toml')
    
    try {
      const content = await fs.readFile(pyprojectPath, 'utf-8')
      
      // Simple version bumping - increment patch version
      const versionMatch = content.match(/version\s*=\s*"(\d+)\.(\d+)\.(\d+)"/)
      
      if (versionMatch) {
        const major = parseInt(versionMatch[1])
        const minor = parseInt(versionMatch[2]) 
        const patch = parseInt(versionMatch[3]) + 1
        
        const newVersion = `${major}.${minor}.${patch}`
        const newContent = content.replace(
          /version\s*=\s*"\d+\.\d+\.\d+"/,
          `version = "${newVersion}"`
        )
        
        await fs.writeFile(pyprojectPath, newContent)
        console.log(`Version bumped to ${newVersion} in pyproject.toml`)
        return newVersion
      }
    } catch (error) {
      // Try package.json instead (Node.js projects)
      try {
        const packagePath = join(process.cwd(), 'package.json')
        const packageContent = await fs.readFile(packagePath, 'utf-8')
        const packageJson = JSON.parse(packageContent)
        
        if (packageJson.version) {
          const versionParts = packageJson.version.split('.').map(Number)
          if (versionParts.length === 3) {
            versionParts[2]++ // Increment patch version
            const newVersion = versionParts.join('.')
            
            packageJson.version = newVersion
            await fs.writeFile(packagePath, JSON.stringify(packageJson, null, 2))
            console.log(`Version bumped to ${newVersion} in package.json`)
            return newVersion
          }
        }
      } catch (packageError) {
        console.log('Neither pyproject.toml nor package.json found with version')
      }
    }
  } catch (error) {
    console.error('Error bumping version:', error)
    // Don't fail the whole operation if version bumping fails
  }
  
  return null
}