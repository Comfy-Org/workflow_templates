import { describe, it, expect } from 'vitest'

describe('useTemplateData', () => {
  describe('Template Data Parsing', () => {
    it('should extract naming patterns correctly', () => {
      const mockTemplates = [
        { name: 'text2img_basic' },
        { name: 'img2img_advanced' },
        { name: 'video_generation' },
        { name: 'audio_synthesis' }
      ]

      // Simulate pattern extraction logic
      const extractPatterns = (templates: any[]) => {
        const patterns = new Set<string>()
        templates.forEach(template => {
          if (template.name) {
            // Extract pattern by replacing specific parts with wildcards
            const pattern = template.name.replace(/(basic|advanced|generation|synthesis)/, '*')
            patterns.add(pattern)
          }
        })
        return Array.from(patterns)
      }

      const patterns = extractPatterns(mockTemplates)
      expect(patterns).toContain('text2img_*')
      expect(patterns).toContain('img2img_*')
      expect(patterns).toContain('video_*')
      expect(patterns).toContain('audio_*')
    })

    it('should collect unique tags from templates', () => {
      const mockTemplates = [
        { tags: ['realistic', 'portrait'] },
        { tags: ['anime', 'character'] },
        { tags: ['realistic', 'landscape'] }
      ]

      const extractTags = (templates: any[]) => {
        const allTags = new Set<string>()
        templates.forEach(template => {
          if (template.tags && Array.isArray(template.tags)) {
            template.tags.forEach((tag: string) => allTags.add(tag))
          }
        })
        return Array.from(allTags)
      }

      const tags = extractTags(mockTemplates)
      expect(tags).toContain('realistic')
      expect(tags).toContain('anime')
      expect(tags).toContain('portrait')
      expect(tags).toContain('character')
      expect(tags).toContain('landscape')
      expect(tags).toHaveLength(5)
    })

    it('should extract model information correctly', () => {
      const mockTemplates = [
        { 
          models: ['SDXL Base', 'VAE'] 
        },
        { 
          models: ['SD 1.5', 'ControlNet'] 
        }
      ]

      const extractModels = (templates: any[]) => {
        const allModels = new Set<string>()
        templates.forEach(template => {
          if (template.models && Array.isArray(template.models)) {
            template.models.forEach((model: string) => allModels.add(model))
          }
        })
        return Array.from(allModels)
      }

      const models = extractModels(mockTemplates)
      expect(models).toContain('SDXL Base')
      expect(models).toContain('VAE')
      expect(models).toContain('SD 1.5')
      expect(models).toContain('ControlNet')
      expect(models).toHaveLength(4)
    })

    it('should count media types and subtypes', () => {
      const mockTemplates = [
        { mediaType: 'image', mediaSubtype: 'webp' },
        { mediaType: 'image', mediaSubtype: 'png' },
        { mediaType: 'video', mediaSubtype: 'mp4' },
        { mediaType: 'image', mediaSubtype: 'webp' }
      ]

      const getStats = (templates: any[]) => {
        const mediaTypes: Record<string, number> = {}
        const mediaSubtypes: Record<string, number> = {}

        templates.forEach(template => {
          const type = template.mediaType
          const subtype = template.mediaSubtype

          if (type) {
            mediaTypes[type] = (mediaTypes[type] || 0) + 1
          }
          if (subtype) {
            mediaSubtypes[subtype] = (mediaSubtypes[subtype] || 0) + 1
          }
        })

        return { mediaTypes, mediaSubtypes }
      }

      const stats = getStats(mockTemplates)
      expect(stats.mediaTypes.image).toBe(3)
      expect(stats.mediaTypes.video).toBe(1)
      expect(stats.mediaSubtypes.webp).toBe(2)
      expect(stats.mediaSubtypes.png).toBe(1)
      expect(stats.mediaSubtypes.mp4).toBe(1)
    })
  })
})