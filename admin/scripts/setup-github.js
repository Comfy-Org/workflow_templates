#!/usr/bin/env node

import { promises as fs } from 'fs'
import { join } from 'path'
import { createInterface } from 'readline'

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
})

const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve))

async function setupGitHub() {
  console.log('🚀 ComfyUI Template Manager - GitHub Integration Setup\n')
  
  try {
    // Check if .env exists
    const envPath = join(process.cwd(), '.env')
    let envContent = ''
    
    try {
      envContent = await fs.readFile(envPath, 'utf-8')
    } catch {
      // .env doesn't exist, we'll create it
    }

    console.log('To set up GitHub integration, you need:')
    console.log('1. GitHub Personal Access Token with repo permissions')
    console.log('2. GitHub repository owner/username')
    console.log('3. GitHub repository name\n')

    const githubToken = await question('GitHub Personal Access Token: ')
    const githubOwner = await question('GitHub Repository Owner/Username: ')
    const githubRepo = await question('GitHub Repository Name: ')

    console.log('\nOptional Vercel Setup (for automatic deployment):')
    const setupVercel = await question('Set up Vercel integration? (y/n): ')
    
    let vercelToken = '', vercelOrgId = '', vercelProjectId = ''
    if (setupVercel.toLowerCase() === 'y') {
      vercelToken = await question('Vercel Token: ')
      vercelOrgId = await question('Vercel Org ID: ')
      vercelProjectId = await question('Vercel Project ID: ')
    }

    // Update or create .env file
    const envVars = [
      `GITHUB_TOKEN=${githubToken}`,
      `GITHUB_OWNER=${githubOwner}`,
      `GITHUB_REPO=${githubRepo}`,
      ...(vercelToken ? [`VERCEL_TOKEN=${vercelToken}`] : []),
      ...(vercelOrgId ? [`VERCEL_ORG_ID=${vercelOrgId}`] : []),
      ...(vercelProjectId ? [`VERCEL_PROJECT_ID=${vercelProjectId}`] : []),
      'BASE_URL=http://localhost:3000',
      'NUXT_DEVTOOLS_ENABLED=true'
    ]

    await fs.writeFile(envPath, envVars.join('\n') + '\n')

    console.log('\n✅ GitHub integration configured!')
    console.log(`📝 Environment variables saved to .env`)
    console.log(`\nNext steps:`)
    console.log(`1. Add GitHub Secrets to your repository:`)
    console.log(`   - VERCEL_TOKEN (if using Vercel)`)
    console.log(`   - VERCEL_ORG_ID (if using Vercel)`)
    console.log(`   - VERCEL_PROJECT_ID (if using Vercel)`)
    console.log(`2. Commit and push the GitHub workflows:`)
    console.log(`   git add .github/workflows/`)
    console.log(`   git commit -m "Add GitHub Actions workflows"`)
    console.log(`   git push`)
    console.log(`\n🎉 Template Manager will now automatically integrate with GitHub!`)

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message)
    process.exit(1)
  } finally {
    rl.close()
  }
}

setupGitHub()