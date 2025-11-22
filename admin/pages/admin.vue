<template>
  <div class="min-h-screen bg-background">
    <!-- Header -->
    <div class="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div class="container mx-auto px-4 py-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <Button variant="ghost" size="sm" @click="navigateTo('/')" class="flex items-center space-x-2">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </Button>
            <div class="h-6 w-px bg-border"></div>
            <div>
              <h1 class="text-2xl font-semibold tracking-tight">Add Template</h1>
              <p class="text-sm text-muted-foreground">Create a new ComfyUI workflow template</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="container mx-auto px-4 py-8">
      <div class="max-w-4xl mx-auto">
        <div class="grid gap-8 lg:grid-cols-3">
          <!-- Form Section -->
          <div class="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Template Details</CardTitle>
                <CardDescription>
                  Fill in the information about your ComfyUI workflow template
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form @submit.prevent="handleSubmit" class="space-y-8">
                  <!-- Basic Template Information -->
                  <div class="space-y-4">
                    <h3 class="text-lg font-medium border-b pb-2">Template Information</h3>
                    
                    <!-- Workflow JSON -->
                    <div class="space-y-2">
                      <Label for="workflowFile">Workflow JSON File</Label>
                      <Input
                        id="workflowFile"
                        type="file"
                        accept=".json"
                        required
                        @change="handleWorkflowFile"
                      />
                      <p class="text-xs text-muted-foreground">Upload the ComfyUI workflow JSON file</p>
                    </div>

                    <!-- Template Name (filename) -->
                    <div class="space-y-2">
                      <Label for="name">Template Filename</Label>
                      <Combobox v-model="form.name" :open="isNameDropdownOpen" @update:open="isNameDropdownOpen = $event">
                        <ComboboxAnchor>
                          <ComboboxInput
                            id="name"
                            placeholder="Click to see patterns or start typing..."
                            required
                            class="w-full"
                            :class="{ 'border-red-500': validationErrors.name }"
                            @focus="isNameDropdownOpen = true"
                          />
                        </ComboboxAnchor>
                        <ComboboxList class="max-h-48">
                          <ComboboxEmpty>No patterns found. Try typing!</ComboboxEmpty>
                          <ComboboxItem 
                            v-for="pattern in namePatterns" 
                            :key="pattern"
                            :value="pattern.replace('_*', '_my_template')"
                          >
                            <span class="text-muted-foreground text-sm">{{ pattern }}</span> 
                            <span class="ml-2">{{ pattern.replace('_*', '_my_template') }}</span>
                          </ComboboxItem>
                        </ComboboxList>
                      </Combobox>
                      <p v-if="validationErrors.name" class="text-xs text-red-500">{{ validationErrors.name }}</p>
                      <p class="text-xs text-muted-foreground">No spaces, dots, or special characters. Common patterns shown in dropdown.</p>
                    </div>

                    <!-- Display Title -->
                    <div class="space-y-2">
                      <Label for="title">Display Title</Label>
                      <Combobox v-model="form.title" :open="isTitleDropdownOpen" @update:open="isTitleDropdownOpen = $event">
                        <ComboboxAnchor>
                          <ComboboxInput
                            id="title"
                            placeholder="Text to Image Basic, Image Editing, etc..."
                            required
                            class="w-full"
                            :class="{ 'border-red-500': validationErrors.title }"
                            @focus="isTitleDropdownOpen = true"
                          />
                        </ComboboxAnchor>
                        <ComboboxList class="max-h-48">
                          <ComboboxEmpty>No title examples found</ComboboxEmpty>
                          <ComboboxItem 
                            v-for="title in existingTitles.slice(0, 20)" 
                            :key="title"
                            :value="title"
                          >
                            {{ title }}
                          </ComboboxItem>
                        </ComboboxList>
                      </Combobox>
                      <p class="text-xs text-muted-foreground">Human-readable title shown in the UI</p>
                    </div>

                    <!-- Description -->
                    <div class="space-y-2">
                      <Label for="description">Description</Label>
                      <Textarea
                        id="description"
                        v-model="form.description"
                        placeholder="Generate images from text prompts using advanced AI models. This workflow provides an easy way to create high-quality images with customizable parameters..."
                        required
                        class="min-h-[100px] resize-y"
                        :class="{ 'border-red-500': validationErrors.description }"
                      />
                      <div class="text-xs text-muted-foreground space-y-1">
                        <div>Brief description of what this workflow does</div>
                        <div class="text-blue-600">💡 Click examples below to use:</div>
                        <div class="flex flex-wrap gap-1">
                          <button 
                            v-for="description in existingDescriptions.slice(0, 5)" 
                            :key="description"
                            type="button"
                            @click="form.description = description"
                            class="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded border truncate max-w-[200px]"
                            :title="description"
                          >
                            {{ description }}
                          </button>
                        </div>
                      </div>
                    </div>

                    <!-- Bundle Category -->
                    <div class="space-y-2">
                      <Label for="category">Bundle Category</Label>
                      <Select v-model="form.category" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select bundle" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="media-api">Media API</SelectItem>
                          <SelectItem value="media-image">Media Image</SelectItem>
                          <SelectItem value="media-video">Media Video</SelectItem>
                          <SelectItem value="media-other">Media Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <p class="text-xs text-muted-foreground">Which media bundle should include this template</p>
                    </div>
                  </div>

                  <!-- Thumbnail Configuration -->
                  <div class="space-y-4">
                    <h3 class="text-lg font-medium border-b pb-2">Thumbnail Configuration</h3>
                    
                    <!-- Thumbnail Effect -->
                    <div class="space-y-2">
                      <Label for="thumbnailVariant">Thumbnail Effect (optional)</Label>
                      <Select v-model="form.thumbnailVariant">
                        <SelectTrigger>
                          <SelectValue placeholder="No special effect" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None (default)</SelectItem>
                          <SelectItem value="hoverDissolve">Hover Dissolve</SelectItem>
                          <SelectItem value="compareSlider">Compare Slider</SelectItem>
                          <SelectItem value="zoomHover">Zoom Hover</SelectItem>
                        </SelectContent>
                      </Select>
                      <p class="text-xs text-muted-foreground">Special hover effect for the thumbnail (requires multiple images for some effects)</p>
                    </div>

                    <!-- Dynamic Thumbnail Uploads -->
                    <div class="space-y-2">
                      <Label>{{ getThumbnailUploadLabel() }}</Label>
                      <div v-if="thumbnailUploadCount === 1" class="space-y-2">
                        <div>
                          <Label for="thumbnailFile1" class="text-xs">{{ getThumbnailLabel(1) }}</Label>
                          <Input
                            id="thumbnailFile1"
                            type="file"
                            accept="image/*,audio/*,video/*"
                            required
                            @change="(e: Event) => handleSingleThumbnailFile(e, 0)"
                          />
                        </div>
                      </div>
                      <div v-else class="space-y-2">
                        <div>
                          <Label for="thumbnailFile1" class="text-xs">{{ getThumbnailLabel(1) }}</Label>
                          <Input
                            id="thumbnailFile1"
                            type="file"
                            accept="image/*,audio/*,video/*"
                            required
                            @change="(e: Event) => handleSingleThumbnailFile(e, 0)"
                          />
                        </div>
                        <div>
                          <Label for="thumbnailFile2" class="text-xs">{{ getThumbnailLabel(2) }}</Label>
                          <Input
                            id="thumbnailFile2"
                            type="file"
                            accept="image/*,audio/*,video/*"
                            required
                            @change="(e: Event) => handleSingleThumbnailFile(e, 1)"
                          />
                        </div>
                      </div>
                      <p v-if="validationErrors.thumbnailFiles" class="text-xs text-red-500">{{ validationErrors.thumbnailFiles }}</p>
                      <p class="text-xs text-muted-foreground">{{ getThumbnailDescription() }}</p>
                    </div>

                    <!-- Auto-detected Media Type Info -->
                    <div class="space-y-2 bg-muted/50 p-4 rounded-lg">
                      <div class="flex items-center justify-between">
                        <Label class="text-sm font-medium">Detected Media Info</Label>
                        <span class="text-xs text-muted-foreground">Auto-detected</span>
                      </div>
                      <div class="grid gap-4 grid-cols-2 text-sm">
                        <div>
                          <span class="text-muted-foreground">Type:</span> 
                          <span class="font-medium ml-1">{{ detectedMediaType || 'Upload thumbnails' }}</span>
                        </div>
                        <div>
                          <span class="text-muted-foreground">Format:</span>
                          <span class="font-medium ml-1">{{ detectedMediaSubtype || 'N/A' }}</span>
                        </div>
                      </div>
                      <p class="text-xs text-muted-foreground">Media type and format are automatically determined from uploaded thumbnail files</p>
                    </div>
                  </div>

                  <!-- Additional Information -->
                  <div class="space-y-4">
                    <h3 class="text-lg font-medium border-b pb-2">Additional Information</h3>
                    
                    <!-- Tags -->
                    <div class="space-y-2">
                      <Label for="tags">Tags (optional)</Label>
                      <Combobox v-model="tagsInput" :open="isTagsDropdownOpen" @update:open="isTagsDropdownOpen = $event">
                        <ComboboxAnchor>
                          <ComboboxInput
                            id="tags"
                            placeholder="Click to see popular tags or start typing..."
                            class="w-full"
                            @focus="isTagsDropdownOpen = true"
                          />
                        </ComboboxAnchor>
                        <ComboboxList class="max-h-48">
                          <ComboboxEmpty>No tags found. Try typing!</ComboboxEmpty>
                          <ComboboxItem 
                            v-for="tag in popularTags.slice(0, 25)" 
                            :key="tag"
                            :value="addTagToInput(tag)"
                          >
                            {{ tag }}
                          </ComboboxItem>
                        </ComboboxList>
                      </Combobox>
                      <p class="text-xs text-muted-foreground">Comma-separated tags. Click dropdown to see popular options.</p>
                    </div>

                    <!-- Tutorial URL -->
                    <div class="space-y-2">
                      <Label for="tutorialUrl">Tutorial URL (optional)</Label>
                      <Combobox v-model="form.tutorialUrl" :open="isTutorialDropdownOpen" @update:open="isTutorialDropdownOpen = $event">
                        <ComboboxAnchor>
                          <ComboboxInput
                            id="tutorialUrl"
                            type="url"
                            placeholder="https://docs.comfy.org/tutorials/..."
                            class="w-full"
                            @focus="isTutorialDropdownOpen = true"
                          />
                        </ComboboxAnchor>
                        <ComboboxList class="max-h-48">
                          <ComboboxEmpty>No tutorial URL examples found</ComboboxEmpty>
                          <ComboboxItem 
                            v-for="url in existingTutorialUrls.slice(0, 15)" 
                            :key="url"
                            :value="url"
                          >
                            <div class="text-sm truncate">{{ url }}</div>
                          </ComboboxItem>
                        </ComboboxList>
                      </Combobox>
                      <p class="text-xs text-muted-foreground">Link to documentation or tutorial</p>
                    </div>

                    <!-- ComfyUI Version -->
                    <div class="space-y-2">
                      <Label for="comfyuiVersion">Minimum ComfyUI Version (optional)</Label>
                      <Combobox v-model="form.comfyuiVersion" :open="isComfyuiVersionDropdownOpen" @update:open="isComfyuiVersionDropdownOpen = $event">
                        <ComboboxAnchor>
                          <ComboboxInput
                            id="comfyuiVersion"
                            placeholder="0.3.26"
                            class="w-full"
                            @focus="isComfyuiVersionDropdownOpen = true"
                          />
                        </ComboboxAnchor>
                        <ComboboxList class="max-h-32">
                          <ComboboxEmpty>No version examples found</ComboboxEmpty>
                          <ComboboxItem 
                            v-for="version in existingComfyuiVersions.slice(0, 10)" 
                            :key="version"
                            :value="version"
                          >
                            {{ version }}
                          </ComboboxItem>
                        </ComboboxList>
                      </Combobox>
                      <p class="text-xs text-muted-foreground">Minimum ComfyUI version required for this template</p>
                    </div>
                  </div>

                  <!-- Model Dependencies -->
                  <div class="space-y-4">
                    <h3 class="text-lg font-medium border-b pb-2">Model Dependencies (optional)</h3>
                    <p class="text-sm text-muted-foreground">Models will be automatically embedded into your workflow JSON for one-click downloads</p>
                    
                    <div class="flex items-center justify-between">
                      <Label>Models to Embed</Label>
                      <Button type="button" variant="outline" size="sm" @click="addModel">
                        Add Model
                      </Button>
                    </div>
                    
                    <div v-for="(model, index) in form.models" :key="index" class="border rounded-lg p-4 space-y-3">
                      <div class="flex items-center justify-between">
                        <span class="font-medium">Model {{ index + 1 }}</span>
                        <Button type="button" variant="ghost" size="sm" @click="removeModel(index)">
                          ✕
                        </Button>
                      </div>
                      
                      <div class="grid gap-3 grid-cols-1 sm:grid-cols-2">
                        <div>
                          <Label :for="`model-${index}-name`" class="text-xs">Filename</Label>
                          <Combobox v-model="model.name" :open="openModelNameDropdowns[index]" @update:open="openModelNameDropdowns[index] = $event">
                            <ComboboxAnchor>
                              <ComboboxInput
                                :id="`model-${index}-name`"
                                placeholder="model.safetensors"
                                class="text-sm w-full"
                                @focus="openModelNameDropdowns[index] = true"
                              />
                            </ComboboxAnchor>
                            <ComboboxList class="max-h-32">
                              <ComboboxEmpty>No model names found</ComboboxEmpty>
                              <ComboboxItem 
                                v-for="name in existingModelNames.slice(0, 15)" 
                                :key="name"
                                :value="name"
                              >
                                {{ name }}
                              </ComboboxItem>
                            </ComboboxList>
                          </Combobox>
                        </div>
                        <div>
                          <Label :for="`model-${index}-directory`" class="text-xs">Directory</Label>
                          <Select v-model="model.directory">
                            <SelectTrigger class="text-sm">
                              <SelectValue placeholder="Select directory" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="checkpoints">checkpoints</SelectItem>
                              <SelectItem value="vae">vae</SelectItem>
                              <SelectItem value="text_encoders">text_encoders</SelectItem>
                              <SelectItem value="diffusion_models">diffusion_models</SelectItem>
                              <SelectItem value="unet">unet</SelectItem>
                              <SelectItem value="loras">loras</SelectItem>
                              <SelectItem value="controlnet">controlnet</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div>
                        <Label :for="`model-${index}-url`" class="text-xs">Download URL</Label>
                        <Combobox v-model="model.url" :open="openModelUrlDropdowns[index]" @update:open="openModelUrlDropdowns[index] = $event">
                          <ComboboxAnchor>
                            <ComboboxInput
                              :id="`model-${index}-url`"
                              type="url"
                              placeholder="https://huggingface.co/..."
                              class="text-sm w-full"
                              @focus="openModelUrlDropdowns[index] = true"
                            />
                          </ComboboxAnchor>
                          <ComboboxList class="max-h-32">
                            <ComboboxEmpty>No model URLs found</ComboboxEmpty>
                            <ComboboxItem 
                              v-for="url in existingModelUrls.slice(0, 15)" 
                              :key="url"
                              :value="url"
                            >
                              <div class="text-sm truncate">{{ url }}</div>
                            </ComboboxItem>
                          </ComboboxList>
                        </Combobox>
                      </div>
                      
                      <div class="grid gap-3 grid-cols-1 sm:grid-cols-2">
                        <div>
                          <Label :for="`model-${index}-hash`" class="text-xs">SHA256 Hash</Label>
                          <Input
                            :id="`model-${index}-hash`"
                            v-model="model.hash"
                            placeholder="2fc39d31359a4b0a64f5... (optional)"
                            class="text-sm font-mono"
                          />
                        </div>
                        <div>
                          <Label :for="`model-${index}-displayName`" class="text-xs">Display Name (for index.json)</Label>
                          <Combobox v-model="model.displayName" :open="openModelDropdowns[index]" @update:open="openModelDropdowns[index] = $event">
                            <ComboboxAnchor>
                              <ComboboxInput
                                :id="`model-${index}-displayName`"
                                placeholder="SD1.5, FLUX, etc..."
                                class="text-sm w-full"
                                @focus="openModelDropdowns[index] = true"
                              />
                            </ComboboxAnchor>
                            <ComboboxList class="max-h-32">
                              <ComboboxEmpty>No models found</ComboboxEmpty>
                              <ComboboxItem 
                                v-for="modelName in popularModels.slice(0, 15)" 
                                :key="modelName"
                                :value="modelName"
                              >
                                {{ modelName }}
                              </ComboboxItem>
                            </ComboboxList>
                          </Combobox>
                        </div>
                      </div>
                    </div>
                    
                    <div v-if="form.models.length === 0" class="text-center py-8 border-2 border-dashed border-muted rounded-lg">
                      <p class="text-muted-foreground text-sm">No models added yet</p>
                      <p class="text-xs text-muted-foreground mt-1">Models will be embedded into your workflow for automatic downloads</p>
                    </div>
                  </div>

                </form>
              </CardContent>
              <CardFooter class="flex flex-col sm:flex-row gap-2">
                <Button
                  type="submit"
                  :disabled="isSubmitting"
                  @click="handleSubmit"
                  class="flex-1"
                >
                  <svg v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {{ isSubmitting ? 'Creating Template...' : 'Create Template' }}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  @click="resetForm"
                >
                  Reset
                </Button>
              </CardFooter>
            </Card>
          </div>

          <!-- Preview Section -->
          <div class="lg:col-span-1">
            <div class="sticky top-8 space-y-4">
              <!-- Complete Template Preview -->
              <Card>
                <CardHeader>
                  <CardTitle>Template Preview</CardTitle>
                  <CardDescription>Live preview of how your template will appear in ComfyUI</CardDescription>
                </CardHeader>
                <CardContent>
                  <TemplateCardPreview
                    :title="form.title"
                    :description="form.description"
                    :thumbnail-images="form.thumbnailFiles"
                    :thumbnail-variant="form.thumbnailVariant"
                    :tags="form.tags"
                    :tutorial-url="form.tutorialUrl"
                    :filename="form.name"
                    :category="form.category"
                    :media-type="detectedMediaType"
                    :media-subtype="detectedMediaSubtype"
                    :has-workflow="!!form.workflowFile"
                    :model-count="form.models.length"
                    :comfyui-version="form.comfyuiVersion"
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Combobox, ComboboxAnchor, ComboboxInput, ComboboxEmpty, ComboboxList, ComboboxItem } from '~/components/ui/combobox'
import ThumbnailPreview from '~/components/ThumbnailPreview.vue'
import TemplateCardPreview from '~/components/TemplateCardPreview.vue'
import templatesIndex from '../../templates/index.json'

const form = ref({
  name: '',
  title: '',
  description: '',
  category: '',
  mediaType: 'image',
  mediaSubtype: 'webp',
  thumbnailVariant: 'none',
  tutorialUrl: '',
  tags: [] as string[],
  models: [] as Array<{
    name: string
    url: string
    hash: string
    directory: string
    displayName: string
  }>,
  comfyuiVersion: '',
  workflowFile: null as File | null,
  thumbnailFiles: [] as File[]
})

const validationErrors = ref({
  name: '',
  title: '',
  description: '',
  thumbnailFiles: '',
  workflowFile: ''
})

const isSubmitting = ref(false)
const isNameDropdownOpen = ref(false)
const isTitleDropdownOpen = ref(false)
const isTutorialDropdownOpen = ref(false)
const isTagsDropdownOpen = ref(false)
const isComfyuiVersionDropdownOpen = ref(false)
const openModelDropdowns = ref<Record<number, boolean>>({})
const openModelNameDropdowns = ref<Record<number, boolean>>({})
const openModelUrlDropdowns = ref<Record<number, boolean>>({})

// Template data for suggestions
const { 
  fetchTemplateData,
  getExistingValues, 
  getNamePatterns, 
  getAllTags, 
  getAllModels,
  getAllTutorialUrls,
  getAllComfyuiVersions,
  getTemplateStats,
  existingTemplates
} = useTemplateData()

// Load template data on mount
onMounted(async () => {
  console.log('Component mounted, fetching template data...')
  const result = await fetchTemplateData()
  console.log('Fetch result:', result)
  console.log('Name patterns:', namePatterns.value)
  console.log('Popular tags:', popularTags.value.slice(0, 5))
  console.log('Combobox should be visible with', namePatterns.value.length, 'patterns')
})

// Computed properties for suggestions
const templateStats = computed(() => getTemplateStats())
const namePatterns = computed(() => getNamePatterns())
const existingMediaTypes = computed(() => getExistingValues('mediaType'))
const existingMediaSubtypes = computed(() => getExistingValues('mediaSubtype'))
const popularTags = computed(() => getAllTags())
const popularModels = computed(() => getAllModels())
const existingTitles = computed(() => getExistingValues('title'))
const existingDescriptions = computed(() => getExistingValues('description'))
const existingTutorialUrls = computed(() => getAllTutorialUrls())
const existingComfyuiVersions = computed(() => getAllComfyuiVersions())
const existingModelNames = computed(() => getExistingValues('modelName'))
const existingModelUrls = computed(() => getExistingValues('modelUrl'))
const existingModelDisplayNames = computed(() => getExistingValues('modelDisplayName'))

// Auto-detect media type and subtype from thumbnails
const detectedMediaType = computed(() => {
  if (form.value.thumbnailFiles.length === 0) return ''
  
  const firstFile = form.value.thumbnailFiles[0]
  if (firstFile.type.startsWith('image/')) return 'image'
  if (firstFile.type.startsWith('video/')) return 'video'
  if (firstFile.type.startsWith('audio/')) return 'audio'
  return 'image'
})

const detectedMediaSubtype = computed(() => {
  if (form.value.thumbnailFiles.length === 0) return ''
  
  const firstFile = form.value.thumbnailFiles[0]
  const extension = firstFile.name.split('.').pop()?.toLowerCase()
  
  // Common image formats
  if (['jpg', 'jpeg'].includes(extension || '')) return 'jpg'
  if (['png'].includes(extension || '')) return 'png'
  if (['webp'].includes(extension || '')) return 'webp'
  if (['gif'].includes(extension || '')) return 'gif'
  
  // Video formats
  if (['mp4'].includes(extension || '')) return 'mp4'
  if (['webm'].includes(extension || '')) return 'webm'
  if (['mov'].includes(extension || '')) return 'mov'
  
  // Audio formats
  if (['mp3'].includes(extension || '')) return 'mp3'
  if (['wav'].includes(extension || '')) return 'wav'
  if (['ogg'].includes(extension || '')) return 'ogg'
  
  return extension || 'webp'
})

// Auto-update form values when thumbnails change
watch(detectedMediaType, (newType) => {
  if (newType) form.value.mediaType = newType
})

watch(detectedMediaSubtype, (newSubtype) => {
  if (newSubtype) form.value.mediaSubtype = newSubtype
})

useHead({
  title: 'Add Template - ComfyUI Template Manager'
})

const tagsInput = ref('')

// Update form.tags when input changes
watch(tagsInput, (value) => {
  form.value.tags = value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
})

// Model management functions
const addModel = () => {
  form.value.models.push({
    name: '',
    url: '',
    hash: '',
    directory: '',
    displayName: ''
  })
}

const removeModel = (index: number) => {
  form.value.models.splice(index, 1)
}

// Create object URL for file preview
const getFileUrl = (file: File) => {
  return URL.createObjectURL(file)
}

// Helper functions for applying suggestions
const suggestNameFromPattern = (pattern: string) => {
  const base = pattern.replace('_*', '')
  form.value.name = base + '_my_template'
}

const addTagFromExample = (tag: string) => {
  const currentTags = tagsInput.value ? tagsInput.value.split(',').map(t => t.trim()) : []
  if (!currentTags.includes(tag)) {
    currentTags.push(tag)
    tagsInput.value = currentTags.join(', ')
  }
}

// Helper for combobox - adds tag to existing tags
const addTagToInput = (tag: string) => {
  const currentTags = tagsInput.value ? tagsInput.value.split(',').map(t => t.trim()).filter(t => t) : []
  if (!currentTags.includes(tag)) {
    currentTags.push(tag)
  }
  return currentTags.join(', ')
}

// Effect descriptions
const getEffectDescription = (variant: string): string => {
  switch (variant) {
    case 'hoverDissolve':
      return 'Hover to dissolve between images'
    case 'compareSlider':
      return 'Move mouse to compare before/after'
    case 'zoomHover':
      return 'Hover to zoom in'
    default:
      return ''
  }
}

// Computed properties for thumbnail uploads
const thumbnailUploadCount = computed(() => {
  if (form.value.thumbnailVariant === 'hoverDissolve' || form.value.thumbnailVariant === 'compareSlider') {
    return 2
  }
  return 1
})

const getThumbnailUploadLabel = () => {
  if (form.value.thumbnailVariant === 'hoverDissolve' || form.value.thumbnailVariant === 'compareSlider') {
    return 'Thumbnail Files (2 required)'
  }
  return 'Thumbnail File'
}

const getThumbnailLabel = (index: number) => {
  if (form.value.thumbnailVariant === 'hoverDissolve') {
    return index === 1 ? 'Base Image' : 'Hover Image'
  } else if (form.value.thumbnailVariant === 'compareSlider') {
    return index === 1 ? 'Before Image' : 'After Image'
  } else {
    return 'Thumbnail'
  }
}

const getThumbnailDescription = () => {
  if (form.value.thumbnailVariant === 'hoverDissolve') {
    return 'Base image shows normally, hover image appears on hover'
  } else if (form.value.thumbnailVariant === 'compareSlider') {
    return 'Before and after images for slider comparison'
  } else {
    return 'Single thumbnail image showing workflow output'
  }
}

// Validation functions
const validateFilename = async () => {
  validationErrors.value.name = ''
  
  if (!form.value.name) {
    validationErrors.value.name = 'Template name is required'
    return false
  }
  
  // Check for valid filename characters
  if (!/^[a-zA-Z0-9_]+$/.test(form.value.name)) {
    validationErrors.value.name = 'Only letters, numbers, and underscores allowed'
    return false
  }
  
  // Check uniqueness against existing templates
  const allExistingNames = new Set<string>()
  
  // Parse through categories to get all template names
  templatesIndex.categories.forEach((category: any) => {
    category.templates?.forEach((template: any) => {
      if (template.name) {
        allExistingNames.add(template.name)
      }
    })
  })
  
  if (allExistingNames.has(form.value.name)) {
    validationErrors.value.name = 'This template name already exists. Please choose a unique name.'
    return false
  }
  
  return true
}

const validateThumbnails = () => {
  validationErrors.value.thumbnailFiles = ''
  
  const requiredCount = thumbnailUploadCount.value
  
  if (form.value.thumbnailFiles.length !== requiredCount) {
    validationErrors.value.thumbnailFiles = `${requiredCount} thumbnail file(s) required for ${form.value.thumbnailVariant} effect`
    return false
  }
  
  return true
}

const validateForm = async () => {
  const nameValid = await validateFilename()
  const thumbnailsValid = validateThumbnails()
  
  return nameValid && thumbnailsValid
}

// File upload handlers
const handleWorkflowFile = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    form.value.workflowFile = file
    validationErrors.value.workflowFile = ''
  }
}

const handleSingleThumbnailFile = (event: Event, index: number) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    // Ensure array has enough slots
    while (form.value.thumbnailFiles.length <= index) {
      form.value.thumbnailFiles.push(null as any)
    }
    form.value.thumbnailFiles[index] = file
    
    // Remove null entries and ensure correct length
    form.value.thumbnailFiles = form.value.thumbnailFiles.filter(f => f !== null)
    
    validationErrors.value.thumbnailFiles = ''
  }
}

// Watch thumbnail variant changes to reset files
watch(() => form.value.thumbnailVariant, () => {
  form.value.thumbnailFiles = []
  validationErrors.value.thumbnailFiles = ''
})

const suggestModelFromExample = (modelName: string) => {
  // Add as displayName suggestion for the first model if one exists
  if (form.value.models.length > 0) {
    form.value.models[0].displayName = modelName
  } else {
    addModel()
    form.value.models[0].displayName = modelName
  }
}

// Helper functions for counting usage in existing templates
const getMediaTypeCount = (type: string) => {
  const stats = getTemplateStats()
  return stats?.mediaTypes[type] || 0
}

const getMediaSubtypeCount = (subtype: string) => {
  const stats = getTemplateStats()
  return stats?.mediaSubtypes[subtype] || 0
}

const getSubtypeLabel = (subtype: string) => {
  const labels: Record<string, string> = {
    webp: 'WebP',
    png: 'PNG', 
    jpg: 'JPEG',
    mp4: 'MP4 (Video)',
    mp3: 'MP3 (Audio)',
    wav: 'WAV (Audio)'
  }
  return labels[subtype] || subtype.toUpperCase()
}

// Custom filter function for combobox that shows all patterns when empty
const filterPatterns = (list: any[], term: string) => {
  // If no search term, show all patterns
  if (!term || term.trim() === '') {
    return namePatterns.value
  }
  // Otherwise filter patterns that match the term
  return namePatterns.value.filter(pattern => 
    pattern.toLowerCase().includes(term.toLowerCase()) ||
    pattern.replace('_*', '_my_template').toLowerCase().includes(term.toLowerCase())
  )
}

// Computed filtered patterns
const filteredPatterns = computed(() => {
  return namePatterns.value
})

// Function to embed models into workflow JSON
const embedModelsIntoWorkflow = async (workflowFile: File, models: typeof form.value.models): Promise<any> => {
  try {
    const workflowText = await workflowFile.text()
    const workflow = JSON.parse(workflowText)
    
    // Create a mapping of model names to model metadata for quick lookup
    const modelsByName = models.reduce((acc, model) => {
      acc[model.name] = model
      return acc
    }, {} as Record<string, (typeof models)[0]>)
    
    // Function to process nodes recursively (handles both top-level and subgraph nodes)
    const processNodes = (nodes: any[]) => {
      if (!Array.isArray(nodes)) return
      
      nodes.forEach((node: any) => {
        if (typeof node === 'object' && node.widgets_values) {
          const widgetValues = node.widgets_values || []
          const nodeModels = []
          
          // Check each widget value to see if it matches a model name
          for (const widgetValue of widgetValues) {
            if (typeof widgetValue === 'string' && modelsByName[widgetValue]) {
              const model = modelsByName[widgetValue]
              const modelMetadata: any = {
                name: model.name,
                url: model.url,
                directory: model.directory
              }
              
              // Only add hash if provided
              if (model.hash && model.hash.trim()) {
                modelMetadata.hash = model.hash
                modelMetadata.hash_type = 'SHA256'
              }
              
              nodeModels.push(modelMetadata)
            }
          }
          
          // Add models metadata to the node properties if any models found
          if (nodeModels.length > 0) {
            if (!node.properties) node.properties = {}
            node.properties.models = nodeModels
            console.log(`Embedded ${nodeModels.length} model(s) into node ${node.id} (${node.type})`)
          }
        }
      })
    }
    
    // Process top-level nodes
    if (workflow.nodes) {
      processNodes(workflow.nodes)
    }
    
    // Process subgraph nodes (some workflows have nodes in definitions.subgraphs[].nodes)
    if (workflow.definitions?.subgraphs) {
      workflow.definitions.subgraphs.forEach((subgraph: any) => {
        if (subgraph.nodes) {
          processNodes(subgraph.nodes)
        }
      })
    }
    
    return workflow
  } catch (error) {
    console.error('Error embedding models into workflow:', error)
    throw new Error('Failed to process workflow file')
  }
}

const handleThumbnailFiles = (event: Event) => {
  const target = event.target as HTMLInputElement
  form.value.thumbnailFiles = Array.from(target.files || [])
}

const handleSubmit = async () => {
  if (isSubmitting.value) return
  
  const isValid = await validateForm()
  if (!isValid) {
    return
  }
  
  isSubmitting.value = true
  
  try {
    console.log('Submitting template:', form.value)
    
    if (!form.value.workflowFile) {
      throw new Error('No workflow file selected')
    }
    
    // Process workflow with embedded models
    let processedWorkflow = null
    if (form.value.models.length > 0) {
      console.log('Embedding models into workflow...')
      processedWorkflow = await embedModelsIntoWorkflow(form.value.workflowFile, form.value.models)
    } else {
      // If no models to embed, just parse the original workflow
      const workflowText = await form.value.workflowFile.text()
      processedWorkflow = JSON.parse(workflowText)
    }
    
    // Convert files to base64 for API transmission
    const workflowFileData = {
      name: form.value.workflowFile.name,
      content: await fileToBase64(form.value.workflowFile)
    }
    
    const thumbnailFilesData = await Promise.all(
      form.value.thumbnailFiles.map(async (file, index) => ({
        name: file.name,
        content: await fileToBase64(file),
        type: file.type
      }))
    )
    
    // Create API payload
    const apiPayload = {
      name: form.value.name,
      title: form.value.title,
      description: form.value.description,
      category: form.value.category,
      mediaType: form.value.mediaType,
      mediaSubtype: form.value.mediaSubtype,
      thumbnailVariant: form.value.thumbnailVariant === 'none' ? undefined : form.value.thumbnailVariant,
      tutorialUrl: form.value.tutorialUrl || undefined,
      tags: form.value.tags,
      comfyuiVersion: form.value.comfyuiVersion || undefined,
      models: form.value.models,
      workflowFile: workflowFileData,
      thumbnailFiles: thumbnailFilesData
    }
    
    console.log('Sending template to API...', { name: form.value.name, category: form.value.category })
    
    // Send to backend API
    const response = await fetch('/api/templates', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(apiPayload)
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    console.log('Template created successfully:', result)
    
    alert(`Template "${form.value.title}" created successfully!\n\nFiles saved to: ${result.template.path}`)
    resetForm()
  } catch (error) {
    console.error('Error submitting template:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    alert(`Error submitting template: ${errorMessage}`)
  } finally {
    isSubmitting.value = false
  }
}

// Helper function to convert File to base64 string
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1]) // Remove data:mime;base64, prefix
    }
    reader.onerror = reject
  })
}

const resetForm = () => {
  form.value = {
    name: '',
    title: '',
    description: '',
    category: '',
    mediaType: 'image',
    mediaSubtype: 'webp',
    thumbnailVariant: 'none',
    tutorialUrl: '',
    tags: [],
    models: [],
    comfyuiVersion: '',
    workflowFile: null,
    thumbnailFiles: []
  }
  
  tagsInput.value = ''
  
  // Reset file inputs
  const workflowInput = document.getElementById('workflowFile') as HTMLInputElement
  const thumbnailInput = document.getElementById('thumbnailFiles') as HTMLInputElement
  if (workflowInput) workflowInput.value = ''
  if (thumbnailInput) thumbnailInput.value = ''
}
</script>