# ComfyUI Template Manager

A modern, comprehensive admin interface for managing ComfyUI workflow templates with automated file processing, GitHub integration, and deployment workflows.

![ComfyUI Template Manager](https://img.shields.io/badge/ComfyUI-Template%20Manager-blue) ![Nuxt 3](https://img.shields.io/badge/Nuxt-3-green) ![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue) ![Vue 3](https://img.shields.io/badge/Vue-3-green)

## ✨ Features

### 🎯 **Complete Template Management**
- **Intuitive Form Interface**: Single-page form with live preview
- **Smart Autocomplete**: All text inputs show existing patterns from templates
- **Real-time Validation**: Filename uniqueness, format checking, comprehensive validation
- **Live Preview**: Exactly how your template will appear in ComfyUI

### 🔧 **Advanced Functionality**
- **Model Embedding**: Automatically embeds model metadata into workflow JSON
- **Thumbnail Effects**: Support for hover dissolve, compare slider, zoom effects, audio
- **File Processing**: Automatic bundles.json and index.json updates
- **Version Bumping**: Auto-increment version in pyproject.toml or package.json

### 🚀 **Automation & Integration**
- **GitHub Actions**: Automated workflows for deployment and template processing
- **Vercel Integration**: One-click deployment with environment configuration
- **Repository Dispatch**: Trigger GitHub workflows from template submissions
- **Test Suite**: Comprehensive testing with Vitest and TypeScript

## 🛠️ Tech Stack

- **Frontend**: Nuxt 3, Vue 3, TypeScript
- **UI**: shadcn/vue, Tailwind CSS, Lucide Icons
- **Testing**: Vitest, Vue Test Utils, Happy DOM
- **Deployment**: Vercel, GitHub Actions
- **API**: Nuxt Server API with file processing

## 📁 Project Structure

```
admin/
├── components/
│   ├── ui/                    # shadcn/vue components
│   ├── ThumbnailPreview.vue   # ComfyUI-accurate thumbnail effects
│   └── TemplateCardPreview.vue # Live template preview
├── composables/
│   └── useTemplateData.ts     # Template data parsing and suggestions
├── pages/
│   ├── index.vue              # Landing page
│   └── admin.vue              # Main template form
├── server/api/
│   ├── templates.post.ts      # Main template processing
│   └── github-integration.post.ts # GitHub workflow triggers
├── scripts/
│   └── setup-github.js        # GitHub integration setup
├── test/                      # Test suites
└── .github/workflows/         # CI/CD workflows
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. **Clone and Install**
   ```bash
   cd admin
   npm install
   ```

2. **Set up Environment** (Optional)
   ```bash
   cp .env.example .env
   # Edit .env with your GitHub/Vercel credentials
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000`

## ⚙️ Configuration

### GitHub Integration (Optional)

For automatic repository commits and workflows:

```bash
npm run setup:github
```

Or manually set environment variables:
```env
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_OWNER=your-username
GITHUB_REPO=workflow-templates
```

### Vercel Deployment (Optional)

```env
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id
```

## 🔄 Workflow

### Template Creation Process

1. **Upload Files**: Workflow JSON and thumbnail images
2. **Template Information**: Name, title, description with autocomplete
3. **Thumbnail Configuration**: Effect selection and preview
4. **Model Dependencies**: Optional model embedding with URLs
5. **Validation**: Real-time validation and uniqueness checking
6. **Processing**: API processes files and updates repository
7. **GitHub Integration**: Automatic commits and version bumping

### Model Embedding Logic

The system automatically embeds model metadata into workflow JSON:

```typescript
// Matches widget values to model filenames
node.widgets_values.forEach(value => {
  if (modelsByName[value]) {
    node.properties.models.push({
      name: model.name,
      url: model.url,
      directory: model.directory,
      hash: model.hash,      // Optional
      hash_type: 'SHA256'
    })
  }
})
```

## 🧪 Testing

```bash
# Run tests
npm run test

# Type checking
npm run type-check

# Linting
npm run lint
```

Test coverage includes:
- Model embedding logic
- Template data parsing
- File processing utilities
- Version bumping functions

## 📦 Deployment

### Manual Deployment

```bash
npm run build
npm run preview
```

### Automatic Deployment

Push to main branch triggers:
1. **Testing**: TypeScript checking, build verification
2. **Deployment**: Automatic Vercel deployment
3. **GitHub Actions**: Template processing workflows

## 🎨 UI Components

### Form Interface
- **Grouped Sections**: Logical organization of fields
- **Combobox Inputs**: All text inputs with autocomplete
- **File Uploads**: Drag-and-drop with validation
- **Live Validation**: Real-time error feedback

### Preview System
- **Template Card**: Exactly matches ComfyUI interface
- **Thumbnail Effects**: Live preview of hover/compare effects
- **Technical Details**: Comprehensive form progress tracking
- **Completion Progress**: Visual progress indicator

### Thumbnail Effects Support
- **None**: Standard image display
- **Hover Dissolve**: Fade between two images on hover
- **Compare Slider**: Draggable before/after comparison
- **Zoom Hover**: Scale image on hover
- **Audio**: MP3 audio player with custom styling

## 🔧 API Endpoints

### POST /api/templates
Main template creation endpoint:
- Processes workflow JSON
- Embeds model metadata
- Saves files to template directory
- Updates bundles.json and index.json
- Triggers version bumping
- Integrates with GitHub (if configured)

### POST /api/github-integration
GitHub workflow trigger:
- Creates repository dispatch events
- Triggers automated workflows
- Handles file processing in GitHub Actions

## 🔄 GitHub Actions

### Deploy Workflow (`.github/workflows/deploy.yml`)
- Runs on push to main
- TypeScript checking and build testing
- Automatic Vercel deployment

### Template Update Workflow (`.github/workflows/template-update.yml`)
- Triggered by repository dispatch
- Processes template files
- Updates repository files
- Creates commits with proper attribution
- Handles version bumping

## 📋 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GITHUB_TOKEN` | GitHub Personal Access Token | Optional |
| `GITHUB_OWNER` | GitHub username/organization | Optional |
| `GITHUB_REPO` | Repository name | Optional |
| `VERCEL_TOKEN` | Vercel deployment token | Optional |
| `VERCEL_ORG_ID` | Vercel organization ID | Optional |
| `VERCEL_PROJECT_ID` | Vercel project ID | Optional |
| `BASE_URL` | API base URL | Auto-detected |

## 🔍 Features Deep Dive

### Smart Autocomplete System
- Parses existing templates from `templates/index.json`
- Extracts naming patterns, titles, descriptions, tags
- Shows usage statistics and popular choices
- Helps maintain consistency across templates

### Model Embedding
- Matches widget values to model filenames (not node types)
- Supports optional hash values for verification
- Embeds complete download metadata
- Enables one-click model downloads in ComfyUI

### File Processing
- Base64 encoding for API transmission
- Automatic file naming and directory creation
- Template size calculation
- Thumbnail optimization

### Validation System
- Filename format validation (letters, numbers, underscores only)
- Uniqueness checking against existing templates
- Required field validation
- File format verification

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Run tests: `npm run test`
4. Commit changes: `git commit -m 'Add amazing feature'`
5. Push to branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for the ComfyUI community
- Uses shadcn/vue design system
- Inspired by modern admin interfaces
- Powered by Nuxt 3 and Vue 3

---

**Ready to streamline your ComfyUI template management? Get started in minutes!** 🚀