import { promises as fs } from 'fs'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  try {
    // Read the index.json from the repository root templates directory
    const templatesPath = join(process.cwd(), 'templates', 'index.json')
    
    try {
      const content = await fs.readFile(templatesPath, 'utf-8')
      const templatesData = JSON.parse(content)
      
      return {
        success: true,
        data: templatesData
      }
    } catch (error) {
      console.error('Error reading templates index:', error)
      
      // Return fallback empty data structure
      return {
        success: false,
        data: {
          categories: []
        },
        error: 'Templates index file not found'
      }
    }
    
  } catch (error: any) {
    console.error('API error:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to load templates data'
    })
  }
})