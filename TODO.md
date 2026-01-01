# ComfyUI Template Manager - Development TODO

## Architecture: Nuxt 3 + Vercel + GitHub Integration

**Stack:** Vue 3, Nuxt 3, shadcn-vue, Tailwind, Vitest, Vite
**Hosting:** Vercel 
**Auth:** Nuxt Auth with GitHub OAuth
**Backend:** Nuxt server API routes (Vercel functions)
**Git:** GitHub REST API using user's token

---

## Phase 1: Project Setup & Base Structure

- [ ] Initialize Nuxt 3 project with TypeScript
- [ ] Install and configure Tailwind CSS
- [ ] Install and configure shadcn-vue components
- [ ] Set up Vitest for testing
- [ ] Configure Vite for optimal dev experience
- [ ] Create basic project structure and routing
- [ ] Set up ESLint + Prettier
- [ ] Create Vercel deployment configuration

## Phase 2: Authentication & GitHub Integration

- [ ] Install and configure Nuxt Auth (next-auth alternative)
- [ ] Set up GitHub OAuth provider
- [ ] Create GitHub app with required permissions:
  - `repo` (read/write repository contents)
  - `user:email` (get user email)
- [ ] Configure environment variables for auth
- [ ] Create protected route middleware
- [ ] Implement login/logout functionality
- [ ] Test GitHub API connectivity

## Phase 3: Core Admin Interface

- [ ] Design main admin layout with Vue 3 Composition API
- [ ] Create "Add Template" form with shadcn-vue components:
  - [ ] Template name input (with validation)
  - [ ] Title input
  - [ ] Description textarea
  - [ ] Media type select (image/video/audio/3d)
  - [ ] Bundle category select
  - [ ] Workflow JSON file upload
  - [ ] Primary thumbnail upload
  - [ ] Secondary thumbnail upload (optional)
  - [ ] Tags input (comma-separated)
  - [ ] Models input (comma-separated)
  - [ ] Tutorial URL input
- [ ] Add real-time form validation
- [ ] Create file upload preview functionality
- [ ] Add progress indicators and loading states

## Phase 4: Backend API Development

- [ ] Create Nuxt server API route: `/api/templates/add`
- [ ] Implement file processing logic:
  - [ ] Validate uploaded JSON workflow
  - [ ] Process and optimize uploaded images
  - [ ] Generate correct filenames (`name.json`, `name-1.webp`, `name-2.webp`)
- [ ] Create GitHub integration functions:
  - [ ] Read current `templates/index.json`
  - [ ] Read current `bundles.json`
  - [ ] Update JSON structures with new template
  - [ ] Commit multiple files to GitHub in single commit
- [ ] Add proper error handling and validation
- [ ] Implement template name conflict checking

## Phase 5: File Processing & Management

- [ ] Create utility functions for:
  - [ ] JSON structure validation
  - [ ] Image resizing/optimization (convert to WebP)
  - [ ] File naming sanitization
  - [ ] Template metadata extraction
- [ ] Update `templates/index.json` logic:
  - [ ] Find or create appropriate category
  - [ ] Remove template from other categories (update case)
  - [ ] Add template with all metadata
  - [ ] Preserve existing structure
- [ ] Update `bundles.json` logic:
  - [ ] Remove from all bundles (update case)
  - [ ] Add to specified bundle
  - [ ] Maintain array ordering

## Phase 6: GitHub API Integration

- [ ] Implement GitHub file operations:
  - [ ] Get file contents (for reading current JSONs)
  - [ ] Create/update file contents
  - [ ] Handle file encoding (base64 for binaries)
  - [ ] Batch multiple file changes in single commit
- [ ] Create commit message generation
- [ ] Add proper error handling for GitHub API
- [ ] Implement retry logic for API failures
- [ ] Test with rate limiting considerations

## Phase 7: User Experience & Polish

- [ ] Add success/error notifications (toast system)
- [ ] Create drag & drop file upload interface
- [ ] Add file validation feedback (JSON syntax, image formats)
- [ ] Implement template preview before submission
- [ ] Add form auto-save to localStorage
- [ ] Create responsive design for mobile/tablet
- [ ] Add keyboard shortcuts and accessibility

## Phase 8: Testing & Quality Assurance

- [ ] Write unit tests for utility functions (Vitest)
- [ ] Test GitHub API integration with mocked responses
- [ ] Test file processing with various input formats
- [ ] Test form validation edge cases
- [ ] Create integration tests for full workflow
- [ ] Test error handling scenarios
- [ ] Performance testing for file uploads

## Phase 9: Deployment & Production

- [ ] Configure Vercel environment variables
- [ ] Set up GitHub OAuth app for production
- [ ] Create deployment pipeline
- [ ] Set up domain (if needed)
- [ ] Configure error monitoring (Sentry?)
- [ ] Create production deployment
- [ ] Test end-to-end in production environment

## Phase 10: Documentation & Handoff

- [ ] Create user documentation for maintainers
- [ ] Document deployment and setup process
- [ ] Create troubleshooting guide
- [ ] Document environment variable requirements
- [ ] Create video walkthrough of the admin interface

---

## Environment Variables Required

```bash
# GitHub OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Auth Secret
NUXT_AUTH_SECRET=

# Base URL
NUXT_PUBLIC_AUTH_BASE_URL=https://your-admin.vercel.app
```

---

## File Structure

```
admin/                          # Nuxt 3 admin application
├── components/
│   ├── ui/                    # shadcn-vue components
│   ├── TemplateForm.vue       # Main template form
│   ├── FileUpload.vue         # File upload component
│   └── StatusNotification.vue # Success/error messages
├── pages/
│   ├── index.vue              # Landing page
│   ├── login.vue              # Login page
│   └── admin.vue              # Main admin interface
├── server/
│   └── api/
│       └── templates/
│           └── add.post.ts    # Template processing endpoint
├── composables/
│   ├── useGitHub.ts           # GitHub API integration
│   ├── useFileProcessing.ts   # File handling logic
│   └── useTemplateManager.ts  # Template management
├── utils/
│   ├── validation.ts          # Form and file validation
│   ├── fileProcessing.ts      # Image optimization, etc.
│   └── github.ts              # GitHub API helpers
├── types/
│   └── template.ts            # TypeScript interfaces
├── tests/
│   ├── components/            # Component tests
│   ├── utils/                 # Utility function tests
│   └── api/                   # API endpoint tests
├── nuxt.config.ts             # Nuxt configuration
├── tailwind.config.js         # Tailwind configuration
├── components.json            # shadcn-vue configuration
└── vercel.json                # Vercel deployment config
```

---

## Success Criteria

✅ **Maintainer Experience:**
- Single URL to visit
- Login with GitHub account
- One form with all fields
- Upload files via drag & drop
- See real-time validation
- Get immediate success confirmation

✅ **Technical Requirements:**
- All files placed correctly (`templates/name.json`, `templates/name-1.webp`)
- `index.json` updated with metadata
- `bundles.json` updated with categorization
- Single git commit with proper message
- No manual file management required

✅ **Production Ready:**
- Deployed on Vercel
- Secure GitHub OAuth
- Error handling and logging
- Mobile responsive
- Fast performance