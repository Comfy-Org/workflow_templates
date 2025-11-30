interface GitHubIntegrationPayload {
  templateName: string
  category: string
  files: Array<{
    path: string
    content: string // base64
  }>
  metadata: {
    title: string
    description: string
    tags: string[]
    models: string[]
  }
}

export default defineEventHandler(async (event) => {
  try {
    if (event.node.req.method !== 'POST') {
      throw createError({
        statusCode: 405,
        statusMessage: 'Method not allowed'
      })
    }

    const body = await readBody(event) as GitHubIntegrationPayload
    
    // Validate required fields
    if (!body.templateName || !body.category || !body.files) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: templateName, category, or files'
      })
    }

    // Get GitHub configuration from environment
    const githubToken = process.env.GITHUB_TOKEN
    const githubRepo = process.env.GITHUB_REPO
    const githubOwner = process.env.GITHUB_OWNER
    
    if (!githubToken || !githubRepo || !githubOwner) {
      console.log('GitHub integration not configured - processing locally only')
      
      return {
        success: true,
        message: 'Template processed locally (GitHub integration not configured)',
        localProcessing: true
      }
    }

    // Trigger GitHub repository dispatch
    const dispatchUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/dispatches`
    
    const dispatchPayload = {
      event_type: 'template-submission',
      client_payload: {
        name: body.templateName,
        category: body.category,
        files: body.files,
        metadata: body.metadata,
        timestamp: new Date().toISOString()
      }
    }

    const response = await fetch(dispatchUrl, {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'ComfyUI-Template-Manager'
      },
      body: JSON.stringify(dispatchPayload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw createError({
        statusCode: response.status,
        statusMessage: `GitHub API error: ${errorText}`
      })
    }

    return {
      success: true,
      message: 'Template submission triggered GitHub workflow',
      dispatchTriggered: true,
      templateName: body.templateName,
      workflowUrl: `https://github.com/${githubOwner}/${githubRepo}/actions`
    }

  } catch (error: any) {
    console.error('GitHub integration error:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'GitHub integration failed'
    })
  }
})