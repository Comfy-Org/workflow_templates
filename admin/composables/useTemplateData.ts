export const useTemplateData = () => {
  // Parse the real template data from API
  const parseTemplateData = (templatesIndex: any) => {
    const allTemplates: any[] = []
    const allTags = new Set<string>()
    const allModels = new Set<string>()
    const allMediaTypes = new Set<string>()
    const allMediaSubtypes = new Set<string>()
    const allTitles = new Set<string>()
    const allDescriptions = new Set<string>()
    const allTutorialUrls = new Set<string>()
    const allComfyuiVersions = new Set<string>()
    const allModelNames = new Set<string>()
    const allModelUrls = new Set<string>()
    const allModelDisplayNames = new Set<string>()
    const namePatterns = new Set<string>()
    const mediaTypeCounts: Record<string, number> = {}
    const mediaSubtypeCounts: Record<string, number> = {}

    // Parse through all categories and templates
    templatesIndex.categories.forEach((category: any) => {
      category.templates?.forEach((template: any) => {
        allTemplates.push(template)
        
        // Collect media types
        if (template.mediaType) {
          allMediaTypes.add(template.mediaType)
          mediaTypeCounts[template.mediaType] = (mediaTypeCounts[template.mediaType] || 0) + 1
        }
        
        // Collect media subtypes
        if (template.mediaSubtype) {
          allMediaSubtypes.add(template.mediaSubtype)
          mediaSubtypeCounts[template.mediaSubtype] = (mediaSubtypeCounts[template.mediaSubtype] || 0) + 1
        }
        
        // Collect tags
        if (template.tags && Array.isArray(template.tags)) {
          template.tags.forEach((tag: string) => allTags.add(tag))
        }
        
        // Collect models
        if (template.models && Array.isArray(template.models)) {
          template.models.forEach((model: string) => allModels.add(model))
        }
        
        // Collect tutorial URLs
        if (template.tutorialUrl && template.tutorialUrl.trim()) {
          allTutorialUrls.add(template.tutorialUrl.trim())
        }
        
        // Collect ComfyUI versions if any
        if (template.comfyuiVersion && template.comfyuiVersion.trim()) {
          allComfyuiVersions.add(template.comfyuiVersion.trim())
        }
        
        // Collect titles and descriptions
        if (template.title && template.title.trim()) {
          allTitles.add(template.title.trim())
        }
        if (template.description && template.description.trim()) {
          allDescriptions.add(template.description.trim())
        }
        
        // Extract naming patterns
        if (template.name) {
          const parts = template.name.split('_')
          if (parts.length >= 2) {
            namePatterns.add(parts[0] + '_*')
            namePatterns.add(parts[0] + '_' + parts[1] + '_*')
          }
          if (parts.length >= 3) {
            namePatterns.add(parts[0] + '_' + parts[1] + '_' + parts[2] + '_*')
          }
        }
      })
    })

    return {
      totalTemplates: allTemplates.length,
      allTemplateNames: Array.from(new Set(allTemplates.map(t => t.name).filter(Boolean))).sort(),
      namePatterns: Array.from(namePatterns).sort(),
      popularTags: Array.from(allTags).sort(),
      mediaTypes: Array.from(allMediaTypes).sort(),
      mediaSubtypes: Array.from(allMediaSubtypes).sort(),
      models: Array.from(allModels).sort(),
      titles: Array.from(allTitles).sort(),
      descriptions: Array.from(allDescriptions).sort(),
      tutorialUrls: Array.from(allTutorialUrls).sort(),
      comfyuiVersions: Array.from(allComfyuiVersions).sort(),
      modelNames: Array.from(allModelNames).sort(),
      modelUrls: Array.from(allModelUrls).sort(),
      modelDisplayNames: Array.from(allModelDisplayNames).sort(),
      mediaTypeCounts,
      mediaSubtypeCounts
    }
  }

  const existingTemplates = ref<any>(null)
  const isLoading = ref(false)

  const fetchTemplateData = async () => {
    isLoading.value = true
    
    try {
      // Fetch from our API endpoint
      const response = await fetch('/api/templates-data')
      const result = await response.json()
      
      if (result.success) {
        const parsedData = parseTemplateData(result.data)
        existingTemplates.value = parsedData
        return parsedData
      } else {
        console.error('Failed to fetch templates:', result.error)
        // Return empty data structure
        const emptyData = parseTemplateData({ categories: [] })
        existingTemplates.value = emptyData
        return emptyData
      }
    } catch (error) {
      console.error('Error fetching template data:', error)
      // Return empty data structure
      const emptyData = parseTemplateData({ categories: [] })
      existingTemplates.value = emptyData
      return emptyData
    } finally {
      isLoading.value = false
    }
  }

  // Get all existing values for a specific field
  const getExistingValues = (fieldName: string): string[] => {
    if (!existingTemplates.value) return []
    
    if (fieldName === 'mediaType') return existingTemplates.value.mediaTypes
    if (fieldName === 'mediaSubtype') return existingTemplates.value.mediaSubtypes
    if (fieldName === 'title') return existingTemplates.value.titles
    if (fieldName === 'description') return existingTemplates.value.descriptions
    if (fieldName === 'tutorialUrl') return existingTemplates.value.tutorialUrls
    if (fieldName === 'comfyuiVersion') return existingTemplates.value.comfyuiVersions
    if (fieldName === 'modelName') return existingTemplates.value.modelNames
    if (fieldName === 'modelUrl') return existingTemplates.value.modelUrls
    if (fieldName === 'modelDisplayName') return existingTemplates.value.modelDisplayNames
    return []
  }

  // Get naming patterns for template names
  const getNamePatterns = (): string[] => {
    return existingTemplates.value?.namePatterns || []
  }

  // Get category titles
  const getCategoryTitles = (): string[] => {
    return existingTemplates.value?.categories?.map((cat: any) => cat.title).filter(Boolean).sort() || []
  }

  // Get all existing tags
  const getAllTags = (): string[] => {
    return existingTemplates.value?.popularTags || []
  }

  // Get all existing models
  const getAllModels = (): string[] => {
    return existingTemplates.value?.models || []
  }
  
  // Get all existing template names
  const getAllTemplateNames = (): string[] => {
    return existingTemplates.value?.allTemplateNames || []
  }
  
  // Get tutorial URLs
  const getAllTutorialUrls = (): string[] => {
    return existingTemplates.value?.tutorialUrls || []
  }
  
  // Get ComfyUI versions
  const getAllComfyuiVersions = (): string[] => {
    return existingTemplates.value?.comfyuiVersions || []
  }

  // Get stats about existing templates
  const getTemplateStats = () => {
    return {
      totalTemplates: existingTemplates.value?.totalTemplates || 0,
      mediaTypes: existingTemplates.value?.mediaTypeCounts || {},
      mediaSubtypes: existingTemplates.value?.mediaSubtypeCounts || {}
    }
  }

  return {
    existingTemplates: readonly(existingTemplates),
    isLoading: readonly(isLoading),
    fetchTemplateData,
    getExistingValues,
    getNamePatterns,
    getCategoryTitles,
    getAllTags,
    getAllModels,
    getAllTemplateNames,
    getAllTutorialUrls,
    getAllComfyuiVersions,
    getTemplateStats
  }
}