#!/usr/bin/env node

// TinaCMS post-save hooks to automate workflow management

const fs = require('fs');
const path = require('path');

// Auto-rename thumbnails to match workflow naming convention
function renameThumbnails(workflowData, workflowPath) {
  const templateName = path.basename(workflowPath, '.json');
  
  if (workflowData.thumbnail1) {
    const ext = path.extname(workflowData.thumbnail1);
    const newName = `${templateName}-1${ext}`;
    const oldPath = path.join('templates', workflowData.thumbnail1);
    const newPath = path.join('templates', newName);
    
    if (fs.existsSync(oldPath) && oldPath !== newPath) {
      fs.renameSync(oldPath, newPath);
      console.log(`Renamed ${oldPath} → ${newPath}`);
    }
  }
  
  if (workflowData.thumbnail2) {
    const ext = path.extname(workflowData.thumbnail2);
    const newName = `${templateName}-2${ext}`;
    const oldPath = path.join('templates', workflowData.thumbnail2);
    const newPath = path.join('templates', newName);
    
    if (fs.existsSync(oldPath) && oldPath !== newPath) {
      fs.renameSync(oldPath, newPath);
      console.log(`Renamed ${oldPath} → ${newPath}`);
    }
  }
}

// Note: Bundle categorization is manual - maintainers use the Bundle Configuration UI

// Auto-update index.json with new template metadata
function updateTemplateIndex(workflowData, templateName) {
  const indexPath = 'templates/index.json';
  
  if (!fs.existsSync(indexPath)) return;
  
  const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  
  // Find appropriate category or create one
  let targetCategory = indexData.categories.find(cat => {
    if (workflowData.mediaType === 'image' && cat.type === 'image') return true;
    if (workflowData.mediaType === 'video' && cat.type === 'video') return true;
    if (templateName.startsWith('api_') && cat.moduleName === 'media-api') return true;
    return false;
  });
  
  if (!targetCategory) {
    // Create new category if needed
    targetCategory = {
      moduleName: `media-${workflowData.mediaType}`,
      title: `${workflowData.mediaType.charAt(0).toUpperCase() + workflowData.mediaType.slice(1)} Templates`,
      type: workflowData.mediaType,
      templates: []
    };
    indexData.categories.push(targetCategory);
  }
  
  // Remove from other categories
  indexData.categories.forEach(cat => {
    cat.templates = cat.templates.filter(tmpl => tmpl.name !== templateName);
  });
  
  // Add to target category
  const templateEntry = {
    name: templateName,
    title: workflowData.title || templateName,
    description: workflowData.description,
    mediaType: workflowData.mediaType,
    mediaSubtype: 'webp', // Default
    tags: workflowData.tags || [],
    models: workflowData.models || [],
    date: new Date().toISOString().split('T')[0],
    size: 0 // Will be calculated by other scripts
  };
  
  targetCategory.templates.push(templateEntry);
  
  fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
  console.log(`Updated index.json with ${templateName}`);
}

// Main hook function
function onWorkflowSave(workflowPath) {
  try {
    const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
    const templateName = path.basename(workflowPath, '.json');
    
    renameThumbnails(workflowData, workflowPath);
    // Bundle categorization is manual via CMS interface
    updateTemplateIndex(workflowData, templateName);
    
    console.log(`✅ Automated workflow management complete for ${templateName}`);
  } catch (error) {
    console.error(`❌ Error processing ${workflowPath}:`, error.message);
  }
}

// CLI usage
if (require.main === module) {
  const workflowPath = process.argv[2];
  if (workflowPath) {
    onWorkflowSave(workflowPath);
  } else {
    console.log('Usage: node tina-hooks.js <workflow-file.json>');
  }
}

module.exports = { onWorkflowSave };