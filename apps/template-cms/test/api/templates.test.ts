import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Template API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Model Embedding', () => {
    it('should embed models into workflow JSON', () => {
      const workflow = {
        nodes: [
          {
            id: 1,
            type: 'LoadCheckpoint',
            widgets_values: ['test_model.safetensors', 'positive', 'negative'],
            properties: undefined as any
          }
        ]
      }

      const models = [
        {
          name: 'test_model.safetensors',
          url: 'https://example.com/model.safetensors',
          directory: 'checkpoints',
          displayName: 'Test Model',
          hash: 'abc123' as string | undefined
        }
      ]

      const modelsByName = models.reduce((acc, model) => {
        acc[model.name] = {
          name: model.name,
          url: model.url,
          directory: model.directory,
          hash: model.hash,
          hash_type: 'SHA256'
        }
        return acc
      }, {} as any)

      // Simulate the embedding logic
      workflow.nodes.forEach((node: any) => {
        if (node.widgets_values) {
          const nodeModels = []
          for (const widgetValue of node.widgets_values) {
            if (typeof widgetValue === 'string' && modelsByName[widgetValue]) {
              nodeModels.push(modelsByName[widgetValue])
            }
          }
          if (nodeModels.length > 0) {
            if (!node.properties) node.properties = {}
            node.properties.models = nodeModels
          }
        }
      })

      expect(workflow.nodes[0].properties?.models).toBeDefined()
      expect(workflow.nodes[0].properties.models[0].name).toBe('test_model.safetensors')
      expect(workflow.nodes[0].properties.models[0].hash).toBe('abc123')
    })

    it('should handle models without hash', () => {
      const models = [
        {
          name: 'test_model.safetensors',
          url: 'https://example.com/model.safetensors',
          directory: 'checkpoints',
          displayName: 'Test Model'
          // No hash property
        } as { name: string; url: string; directory: string; displayName: string; hash?: string }
      ]

      const modelsByName = models.reduce((acc, model) => {
        acc[model.name] = {
          name: model.name,
          url: model.url,
          directory: model.directory,
          ...(model.hash && { hash: model.hash, hash_type: 'SHA256' })
        }
        return acc
      }, {} as any)

      expect(modelsByName['test_model.safetensors'].hash).toBeUndefined()
      expect(modelsByName['test_model.safetensors'].hash_type).toBeUndefined()
    })
  })

  describe('File Processing', () => {
    it('should determine correct file extensions from MIME types', () => {
      const getExtensionFromMimeType = (mimeType: string): string => {
        const mimeToExt: Record<string, string> = {
          'image/jpeg': '.jpg',
          'image/png': '.png',
          'image/webp': '.webp',
          'video/mp4': '.mp4',
          'audio/mp3': '.mp3'
        }
        return mimeToExt[mimeType] || '.bin'
      }

      expect(getExtensionFromMimeType('image/png')).toBe('.png')
      expect(getExtensionFromMimeType('video/mp4')).toBe('.mp4')
      expect(getExtensionFromMimeType('audio/mp3')).toBe('.mp3')
      expect(getExtensionFromMimeType('unknown/type')).toBe('.bin')
    })

    it('should validate template names', () => {
      const validateTemplateName = (name: string): boolean => {
        return /^[a-zA-Z0-9_]+$/.test(name)
      }

      expect(validateTemplateName('valid_template_name')).toBe(true)
      expect(validateTemplateName('ValidTemplate123')).toBe(true)
      expect(validateTemplateName('invalid-template')).toBe(false)
      expect(validateTemplateName('invalid template')).toBe(false)
      expect(validateTemplateName('invalid.template')).toBe(false)
    })
  })

  describe('Version Bumping', () => {
    it('should parse and increment version numbers correctly', () => {
      const parseAndIncrementVersion = (versionString: string): string | null => {
        const versionMatch = versionString.match(/version\s*=\s*"(\d+)\.(\d+)\.(\d+)"/)
        
        if (versionMatch) {
          const major = parseInt(versionMatch[1])
          const minor = parseInt(versionMatch[2]) 
          const patch = parseInt(versionMatch[3]) + 1
          return `${major}.${minor}.${patch}`
        }
        
        return null
      }

      expect(parseAndIncrementVersion('version = "1.2.3"')).toBe('1.2.4')
      expect(parseAndIncrementVersion('version = "0.1.99"')).toBe('0.1.100')
      expect(parseAndIncrementVersion('invalid version string')).toBe(null)
    })
  })
})