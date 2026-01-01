const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('.'));
app.use(express.json());

// Serve the admin interface
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// API endpoint to add new template
app.post('/api/add-template', upload.fields([
    { name: 'workflowFile', maxCount: 1 },
    { name: 'thumbnail1', maxCount: 1 },
    { name: 'thumbnail2', maxCount: 1 }
]), async (req, res) => {
    try {
        const {
            templateName,
            title,
            description,
            mediaType,
            category,
            tags,
            models,
            tutorialUrl
        } = req.body;

        console.log(`📝 Adding template: ${templateName}`);

        // Validate required fields
        if (!templateName || !description || !mediaType) {
            return res.status(400).send('Missing required fields');
        }

        // Sanitize template name
        const safeName = templateName.toLowerCase().replace(/[^a-z0-9_]/g, '_');

        // 1. Save workflow JSON file
        if (req.files.workflowFile) {
            const workflowPath = path.join('templates', `${safeName}.json`);
            await fs.copyFile(req.files.workflowFile[0].path, workflowPath);
            console.log(`✅ Saved workflow: ${workflowPath}`);
        }

        // 2. Save and rename thumbnails
        if (req.files.thumbnail1) {
            const thumb1Path = path.join('templates', `${safeName}-1.webp`);
            await fs.copyFile(req.files.thumbnail1[0].path, thumb1Path);
            console.log(`✅ Saved thumbnail 1: ${thumb1Path}`);
        }

        if (req.files.thumbnail2) {
            const thumb2Path = path.join('templates', `${safeName}-2.webp`);
            await fs.copyFile(req.files.thumbnail2[0].path, thumb2Path);
            console.log(`✅ Saved thumbnail 2: ${thumb2Path}`);
        }

        // 3. Update index.json
        await updateIndexJson({
            name: safeName,
            title: title || safeName,
            description,
            mediaType,
            tags: tags ? tags.split(',').map(t => t.trim()) : [],
            models: models ? models.split(',').map(m => m.trim()) : [],
            tutorialUrl: tutorialUrl || undefined,
            date: new Date().toISOString().split('T')[0],
            size: 0 // Will be calculated later
        });

        // 4. Update bundles.json
        await updateBundlesJson(safeName, category);

        // 5. Clean up uploaded files
        if (req.files.workflowFile) await fs.unlink(req.files.workflowFile[0].path);
        if (req.files.thumbnail1) await fs.unlink(req.files.thumbnail1[0].path);
        if (req.files.thumbnail2) await fs.unlink(req.files.thumbnail2[0].path);

        // 6. Commit to git
        try {
            execSync('git add .');
            execSync(`git commit -m "Add template: ${safeName}

🎨 Added via Template Manager
- Workflow: ${safeName}.json
- Thumbnails: ${req.files.thumbnail1 ? '✅' : '❌'} primary, ${req.files.thumbnail2 ? '✅' : '❌'} secondary  
- Category: ${category}
- Type: ${mediaType}"`);
            console.log('✅ Committed to git');
        } catch (gitError) {
            console.warn('⚠️ Git commit failed:', gitError.message);
            // Don't fail the request if git fails
        }

        res.json({ 
            success: true, 
            message: `Template "${safeName}" added successfully!`,
            files: {
                workflow: `${safeName}.json`,
                thumbnail1: req.files.thumbnail1 ? `${safeName}-1.webp` : null,
                thumbnail2: req.files.thumbnail2 ? `${safeName}-2.webp` : null
            }
        });

    } catch (error) {
        console.error('❌ Error adding template:', error);
        res.status(500).send(error.message);
    }
});

// Update index.json with new template
async function updateIndexJson(templateData) {
    const indexPath = 'templates/index.json';
    
    let indexData;
    try {
        const rawData = await fs.readFile(indexPath, 'utf8');
        indexData = JSON.parse(rawData);
    } catch (error) {
        console.error('Error reading index.json:', error);
        return;
    }

    // Find or create appropriate category
    let targetCategory = indexData.categories.find(cat => {
        if (templateData.mediaType === 'image' && cat.type === 'image') return true;
        if (templateData.mediaType === 'video' && cat.type === 'video') return true;
        if (templateData.mediaType === 'audio' && cat.moduleName === 'media-other') return true;
        if (templateData.mediaType === '3d' && cat.moduleName === 'media-other') return true;
        return false;
    });

    if (!targetCategory) {
        // Create new category
        targetCategory = {
            moduleName: `media-${templateData.mediaType}`,
            title: `${templateData.mediaType.charAt(0).toUpperCase() + templateData.mediaType.slice(1)} Templates`,
            type: templateData.mediaType,
            templates: []
        };
        indexData.categories.push(targetCategory);
    }

    // Remove from other categories (in case of updates)
    indexData.categories.forEach(cat => {
        cat.templates = cat.templates.filter(tmpl => tmpl.name !== templateData.name);
    });

    // Add to target category
    const templateEntry = {
        name: templateData.name,
        title: templateData.title,
        description: templateData.description,
        mediaType: templateData.mediaType,
        mediaSubtype: 'webp',
        tags: templateData.tags,
        models: templateData.models,
        date: templateData.date,
        size: templateData.size
    };

    if (templateData.tutorialUrl) {
        templateEntry.tutorialUrl = templateData.tutorialUrl;
    }

    targetCategory.templates.push(templateEntry);

    // Save updated index.json
    await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2));
    console.log(`✅ Updated index.json with ${templateData.name}`);
}

// Update bundles.json with new template
async function updateBundlesJson(templateName, category) {
    const bundlesPath = 'bundles.json';
    
    let bundlesData;
    try {
        const rawData = await fs.readFile(bundlesPath, 'utf8');
        bundlesData = JSON.parse(rawData);
    } catch (error) {
        console.error('Error reading bundles.json:', error);
        return;
    }

    // Remove from all categories first
    Object.keys(bundlesData).forEach(key => {
        bundlesData[key] = bundlesData[key].filter(name => name !== templateName);
    });

    // Add to specified category
    if (bundlesData[category]) {
        bundlesData[category].push(templateName);
        console.log(`✅ Added ${templateName} to ${category} bundle`);
    }

    // Save updated bundles.json
    await fs.writeFile(bundlesPath, JSON.stringify(bundlesData, null, 2));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
🎨 ComfyUI Template Manager running on http://localhost:${PORT}

Ready to add templates! 🚀
    `);
});

module.exports = app;