/**
 * Curated `DefinedTerm`/`DefinedTermSet` entity data for `buildWorkflowGraphJsonLd`
 * (see ../lib/structured-data.ts), keyed by the template's snake_case `name`
 * (its `templates/index.json` filename). Look these up via `getWorkflowEntityGraph`,
 * which also accepts the hub share id (see `SHARE_ID_TO_KEY` at the bottom).
 * Transcribed verbatim from the client-provided schema recommendation — do not
 * add entries by automatic detection or extrapolation. `id` values are local
 * `@graph` fragment identifiers, resolved against the page's own canonical URL
 * at build time (e.g. `{canonicalUrl}#e-api`).
 */

export interface WorkflowEntityCoreTopic {
  id: string;
  name: string;
  sameAs: string;
}

export interface WorkflowEntityTerm {
  id: string;
  name: string;
  sameAs: string;
  /** Id of the DefinedTermSet this term belongs to, or omitted for a standalone mention. */
  categoryId?: string;
}

export interface WorkflowEntityCategory {
  id: string;
  name: string;
}

export interface WorkflowEntityGraph {
  /** Node/model identifier surfaced as the workflow node's `identifier`, if given. */
  identifier?: string;
  keywords?: string;
  /**
   * `datePublished` for the workflow and WebPage nodes when the client schema
   * pins a specific date. Overrides the value derived from the hub index so the
   * emitted graph matches the recommendation verbatim; omit to use the page date.
   */
  datePublished?: string;
  isRelatedTo?: { name: string; url: string }[];
  /** Topic-level DefinedTerms referenced directly under `about` (not in a DefinedTermSet). */
  coreTopics: WorkflowEntityCoreTopic[];
  categories: WorkflowEntityCategory[];
  /**
   * All DefinedTerms — both categorized and standalone. This array's order is
   * the order DefinedTerm nodes are emitted and the order they appear in each
   * `DefinedTermSet.hasDefinedTerm`; keep entries grouped by category.
   */
  entities: WorkflowEntityTerm[];
  /**
   * Explicit `@id` order for the WebPage `mentions` array, when the client
   * schema lists mentions in a different order than the DefinedTermSet grouping
   * above. Each string is a `WorkflowEntityTerm.id`. Any entity omitted here is
   * appended in `entities` order; unknown ids are ignored. Omit to fall back to
   * `entities` order.
   */
  mentionsOrder?: string[];
}

export const WORKFLOW_ENTITY_GRAPHS: Record<string, WorkflowEntityGraph> = {
  // LTX-2.5: Image to Video
  video_ltx2_5_i2v: {
    identifier: '6e397a2b-68f7-48f6-8930-f3a5491a163c',
    keywords: 'Image Generation, Image to Video, LTX-2.5, ComfyUI Workflow',
    datePublished: '2026-08-12',
    isRelatedTo: [
      { name: 'Image Generation Workflows', url: 'https://comfy.org/workflows/category/image/' },
      { name: 'Image to Video Workflows', url: 'https://comfy.org/workflows/tag/image-to-video/' },
    ],
    // WebPage `mentions` order from the client schema — grouped differently than
    // the DefinedTermSet membership below (software terms lead footage/camera,
    // image-format trails the business group).
    mentionsOrder: [
      'e-ltx2-5',
      'e-api',
      'e-open-source',
      'e-codec',
      'e-data',
      'e-accessibility',
      'e-hdr',
      'e-motion-interp',
      'e-hardware',
      'e-gpu',
      'e-prompt-eng',
      'e-library',
      'e-load',
      'e-footage',
      'e-camera',
      'e-rendering',
      'e-quality',
      'e-manufacturing',
      'e-image-format',
      'e-display-res',
      'e-pixel',
      'e-frame-rate',
      'e-aspect-ratio',
      'e-subtitles',
      'e-sound',
      'e-1080p',
      'e-motion-blur',
      'e-mpeg4',
    ],
    coreTopics: [
      { id: 'e-video', name: 'Video', sameAs: 'https://en.wikipedia.org/wiki/Video' },
      { id: 'e-image', name: 'Image', sameAs: 'https://en.wikipedia.org/wiki/Image' },
    ],
    categories: [
      { id: 'cat-technology', name: 'Technology' },
      { id: 'cat-business', name: 'Business & Production' },
      { id: 'cat-software', name: 'Software & Development' },
      { id: 'cat-audiovideo', name: 'Audio & Video' },
    ],
    entities: [
      {
        id: 'e-ltx2-5',
        name: 'LTX-2.5',
        sameAs: 'https://github.com/Lightricks/LTX-Video',
        categoryId: 'cat-technology',
      },
      {
        id: 'e-api',
        name: 'API',
        sameAs: 'https://en.wikipedia.org/wiki/API',
        categoryId: 'cat-technology',
      },
      {
        id: 'e-open-source',
        name: 'Open-source software',
        sameAs: 'https://en.wikipedia.org/wiki/Open-source_software',
        categoryId: 'cat-technology',
      },
      {
        id: 'e-codec',
        name: 'Codec',
        sameAs: 'https://en.wikipedia.org/wiki/Codec',
        categoryId: 'cat-technology',
      },
      {
        id: 'e-data',
        name: 'Data',
        sameAs: 'https://en.wikipedia.org/wiki/Data',
        categoryId: 'cat-technology',
      },
      {
        id: 'e-accessibility',
        name: 'Accessibility',
        sameAs: 'https://en.wikipedia.org/wiki/Accessibility',
        categoryId: 'cat-technology',
      },
      {
        id: 'e-hdr',
        name: 'High Dynamic Range',
        sameAs: 'https://en.wikipedia.org/wiki/High_dynamic_range',
        categoryId: 'cat-technology',
      },
      {
        id: 'e-motion-interp',
        name: 'Motion Interpolation',
        sameAs: 'https://en.wikipedia.org/wiki/Motion_interpolation',
        categoryId: 'cat-technology',
      },
      {
        id: 'e-image-format',
        name: 'Image File Format',
        sameAs: 'https://en.wikipedia.org/wiki/Image_file_format',
        categoryId: 'cat-technology',
      },
      {
        id: 'e-footage',
        name: 'Footage',
        sameAs: 'https://en.wikipedia.org/wiki/Footage',
        categoryId: 'cat-business',
      },
      {
        id: 'e-camera',
        name: 'Camera',
        sameAs: 'https://en.wikipedia.org/wiki/Camera',
        categoryId: 'cat-business',
      },
      {
        id: 'e-rendering',
        name: 'Rendering (Computer Graphics)',
        sameAs: 'https://en.wikipedia.org/wiki/Rendering_(computer_graphics)',
        categoryId: 'cat-business',
      },
      {
        id: 'e-quality',
        name: 'Quality (Business)',
        sameAs: 'https://en.wikipedia.org/wiki/Quality_(business)',
        categoryId: 'cat-business',
      },
      {
        id: 'e-manufacturing',
        name: 'Manufacturing',
        sameAs: 'https://en.wikipedia.org/wiki/Manufacturing',
        categoryId: 'cat-business',
      },
      {
        id: 'e-prompt-eng',
        name: 'Prompt Engineering',
        sameAs: 'https://en.wikipedia.org/wiki/Prompt_engineering',
        categoryId: 'cat-software',
      },
      {
        id: 'e-library',
        name: 'Library (Computing)',
        sameAs: 'https://en.wikipedia.org/wiki/Library_(computing)',
        categoryId: 'cat-software',
      },
      {
        id: 'e-hardware',
        name: 'Computer Hardware',
        sameAs: 'https://en.wikipedia.org/wiki/Computer_hardware',
        categoryId: 'cat-software',
      },
      {
        id: 'e-gpu',
        name: 'Graphics Processing Unit',
        sameAs: 'https://en.wikipedia.org/wiki/Graphics_processing_unit',
        categoryId: 'cat-software',
      },
      {
        id: 'e-load',
        name: 'Load (Computing)',
        sameAs: 'https://en.wikipedia.org/wiki/Load_(computing)',
        categoryId: 'cat-software',
      },
      {
        id: 'e-display-res',
        name: 'Display Resolution',
        sameAs: 'https://en.wikipedia.org/wiki/Display_resolution',
        categoryId: 'cat-audiovideo',
      },
      {
        id: 'e-pixel',
        name: 'Pixel',
        sameAs: 'https://en.wikipedia.org/wiki/Pixel',
        categoryId: 'cat-audiovideo',
      },
      {
        id: 'e-frame-rate',
        name: 'Frame Rate',
        sameAs: 'https://en.wikipedia.org/wiki/Frame_rate',
        categoryId: 'cat-audiovideo',
      },
      {
        id: 'e-aspect-ratio',
        name: 'Display Aspect Ratio',
        sameAs: 'https://en.wikipedia.org/wiki/Display_aspect_ratio',
        categoryId: 'cat-audiovideo',
      },
      {
        id: 'e-subtitles',
        name: 'Subtitles',
        sameAs: 'https://en.wikipedia.org/wiki/Subtitles',
        categoryId: 'cat-audiovideo',
      },
      {
        id: 'e-sound',
        name: 'Sound',
        sameAs: 'https://en.wikipedia.org/wiki/Sound',
        categoryId: 'cat-audiovideo',
      },
      {
        id: 'e-1080p',
        name: '1080p',
        sameAs: 'https://en.wikipedia.org/wiki/1080p',
        categoryId: 'cat-audiovideo',
      },
      {
        id: 'e-motion-blur',
        name: 'Motion Blur',
        sameAs: 'https://en.wikipedia.org/wiki/Motion_blur',
        categoryId: 'cat-audiovideo',
      },
      {
        id: 'e-mpeg4',
        name: 'MPEG-4',
        sameAs: 'https://en.wikipedia.org/wiki/MPEG-4',
        categoryId: 'cat-audiovideo',
      },
    ],
  },

  // Seedance 2.5: Reference to Video
  api_seedance2_5_r2v: {
    keywords:
      'Image Generation, Partner Nodes, Video, Reference to Video, Seedance 2.5, ComfyUI Workflow',
    datePublished: '2026-08-08',
    isRelatedTo: [
      { name: 'Image Generation Workflows', url: 'https://comfy.org/workflows/category/image/' },
      { name: 'Partner Node Workflows', url: 'https://comfy.org/workflows/tag/partner-nodes/' },
      { name: 'Video Workflows', url: 'https://comfy.org/workflows/tag/video/' },
      { name: 'Image to Video Workflows', url: 'https://comfy.org/workflows/tag/image-to-video/' },
    ],
    coreTopics: [
      { id: 'e-reference', name: 'Reference', sameAs: 'https://en.wikipedia.org/wiki/Citation' },
      { id: 'e-video', name: 'Video', sameAs: 'https://en.wikipedia.org/wiki/Video' },
    ],
    categories: [
      { id: 'cat-audiovideo', name: 'Audio & Video' },
      { id: 'cat-business', name: 'Business & Production' },
      { id: 'cat-technology', name: 'Technology' },
      { id: 'cat-marketing', name: 'Marketing & Commerce' },
    ],
    entities: [
      // Standalone mentions (no DefinedTermSet)
      { id: 'e-audio', name: 'Audio', sameAs: 'https://en.wikipedia.org/wiki/Sound' },
      { id: 'e-motion', name: 'Motion', sameAs: 'https://en.wikipedia.org/wiki/Motion_(physics)' },
      {
        id: 'e-style',
        name: 'Visual Style',
        sameAs: 'https://en.wikipedia.org/wiki/Style_(visual_arts)',
      },
      { id: 'e-rhythm', name: 'Rhythm', sameAs: 'https://en.wikipedia.org/wiki/Rhythm' },
      { id: 'e-ecommerce', name: 'E-commerce', sameAs: 'https://en.wikipedia.org/wiki/E-commerce' },
      {
        id: 'e-product',
        name: 'Product',
        sameAs: 'https://en.wikipedia.org/wiki/Product_(business)',
      },
      {
        id: 'e-advertising',
        name: 'Brand Advertising',
        sameAs: 'https://en.wikipedia.org/wiki/Advertising',
      },
      // Audio & Video
      {
        id: 'e-video-editing',
        name: 'Video Editing',
        sameAs: 'https://en.wikipedia.org/wiki/Video_editing',
        categoryId: 'cat-audiovideo',
      },
      {
        id: 'e-sound-effect',
        name: 'Sound Effect',
        sameAs: 'https://en.wikipedia.org/wiki/Sound_effect',
        categoryId: 'cat-audiovideo',
      },
      {
        id: 'e-cinematic',
        name: 'Cinematic Techniques',
        sameAs: 'https://en.wikipedia.org/wiki/Cinematic_techniques',
        categoryId: 'cat-audiovideo',
      },
      {
        id: 'e-1080p',
        name: '1080p',
        sameAs: 'https://en.wikipedia.org/wiki/1080p',
        categoryId: 'cat-audiovideo',
      },
      {
        id: 'e-motion-blur',
        name: 'Motion Blur',
        sameAs: 'https://en.wikipedia.org/wiki/Motion_blur',
        categoryId: 'cat-audiovideo',
      },
      {
        id: 'e-microphone',
        name: 'Microphone',
        sameAs: 'https://en.wikipedia.org/wiki/Microphone',
        categoryId: 'cat-audiovideo',
      },
      // Business & Production
      {
        id: 'e-camera',
        name: 'Camera',
        sameAs: 'https://en.wikipedia.org/wiki/Camera',
        categoryId: 'cat-business',
      },
      {
        id: 'e-footage',
        name: 'Footage',
        sameAs: 'https://en.wikipedia.org/wiki/Footage',
        categoryId: 'cat-business',
      },
      {
        id: 'e-quality',
        name: 'Quality (Business)',
        sameAs: 'https://en.wikipedia.org/wiki/Quality_(business)',
        categoryId: 'cat-business',
      },
      {
        id: 'e-business-process',
        name: 'Business Process',
        sameAs: 'https://en.wikipedia.org/wiki/Business_process',
        categoryId: 'cat-business',
      },
      // Technology
      {
        id: 'e-seedance2-5',
        name: 'Seedance 2.5',
        sameAs: 'https://www.bytedance.com/',
        categoryId: 'cat-technology',
      },
      {
        id: 'e-display-res',
        name: 'Display Resolution',
        sameAs: 'https://en.wikipedia.org/wiki/Display_resolution',
        categoryId: 'cat-technology',
      },
      {
        id: 'e-aspect-ratio',
        name: 'Display Aspect Ratio',
        sameAs: 'https://en.wikipedia.org/wiki/Display_aspect_ratio',
        categoryId: 'cat-technology',
      },
      {
        id: 'e-image-stabilization',
        name: 'Image Stabilization',
        sameAs: 'https://en.wikipedia.org/wiki/Image_stabilization',
        categoryId: 'cat-technology',
      },
      {
        id: 'e-frame-rate',
        name: 'Frame Rate',
        sameAs: 'https://en.wikipedia.org/wiki/Frame_rate',
        categoryId: 'cat-technology',
      },
      {
        id: 'e-4k',
        name: '4K Resolution',
        sameAs: 'https://en.wikipedia.org/wiki/4K_resolution',
        categoryId: 'cat-technology',
      },
      // Marketing & Commerce
      {
        id: 'e-branding',
        name: 'Branding',
        sameAs: 'https://en.wikipedia.org/wiki/Brand',
        categoryId: 'cat-marketing',
      },
      {
        id: 'e-personalization',
        name: 'Personalization',
        sameAs: 'https://en.wikipedia.org/wiki/Personalization',
        categoryId: 'cat-marketing',
      },
      {
        id: 'e-product-demo',
        name: 'Product Demonstration',
        sameAs: 'https://en.wikipedia.org/wiki/Product_demonstration',
        categoryId: 'cat-marketing',
      },
      {
        id: 'e-digital-marketing',
        name: 'Digital Marketing',
        sameAs: 'https://en.wikipedia.org/wiki/Digital_marketing',
        categoryId: 'cat-marketing',
      },
      {
        id: 'e-target-market',
        name: 'Target Market',
        sameAs: 'https://en.wikipedia.org/wiki/Target_market',
        categoryId: 'cat-marketing',
      },
      {
        id: 'e-distribution',
        name: 'Distribution',
        sameAs: 'https://en.wikipedia.org/wiki/Distribution_(marketing)',
        categoryId: 'cat-marketing',
      },
    ],
  },

  // MiniMax H3: Image to Video
  video_minimax_h3_i2v: {
    keywords: 'Image Generation, Video, Image to Video, MiniMax H3, ComfyUI Workflow',
    datePublished: '2026-08-03',
    isRelatedTo: [
      { name: 'Image Generation Workflows', url: 'https://comfy.org/workflows/category/image/' },
      { name: 'Video Workflows', url: 'https://comfy.org/workflows/tag/video/' },
      { name: 'Image to Video Workflows', url: 'https://comfy.org/workflows/tag/image-to-video/' },
    ],
    coreTopics: [
      { id: 'e-workflow', name: 'Workflow', sameAs: 'https://en.wikipedia.org/wiki/Workflow' },
      { id: 'e-video', name: 'Video', sameAs: 'https://en.wikipedia.org/wiki/Video' },
      { id: 'e-image', name: 'Image', sameAs: 'https://en.wikipedia.org/wiki/Image' },
    ],
    categories: [
      { id: 'cat-audiovideo', name: 'Audio & Video' },
      { id: 'cat-technology', name: 'Technology' },
      { id: 'cat-business', name: 'Business' },
      { id: 'cat-files', name: 'Files & Storage' },
    ],
    entities: [
      // Standalone mentions (no DefinedTermSet)
      { id: 'e-audio', name: 'Audio', sameAs: 'https://en.wikipedia.org/wiki/Sound' },
      {
        id: 'e-resolution',
        name: 'Resolution',
        sameAs: 'https://en.wikipedia.org/wiki/Display_resolution',
      },
      { id: 'e-mp4', name: 'MP4', sameAs: 'https://en.wikipedia.org/wiki/MPEG-4' },
      { id: 'e-clip', name: 'Clip', sameAs: 'https://en.wikipedia.org/wiki/Video_clip' },
      { id: 'e-model', name: 'Model', sameAs: 'https://en.wikipedia.org/wiki/Model' },
      { id: 'e-input', name: 'Input', sameAs: 'https://en.wikipedia.org/wiki/Information' },
      { id: 'e-reference', name: 'Reference', sameAs: 'https://en.wikipedia.org/wiki/Citation' },
      // Audio & Video
      {
        id: 'e-video-editing',
        name: 'Video Editing',
        sameAs: 'https://en.wikipedia.org/wiki/Video_editing',
        categoryId: 'cat-audiovideo',
      },
      {
        id: 'e-1080p',
        name: '1080p',
        sameAs: 'https://en.wikipedia.org/wiki/1080p',
        categoryId: 'cat-audiovideo',
      },
      {
        id: 'e-motion-graphics',
        name: 'Motion Graphics',
        sameAs: 'https://en.wikipedia.org/wiki/Motion_graphics',
        categoryId: 'cat-audiovideo',
      },
      {
        id: 'e-digital-audio',
        name: 'Digital Audio',
        sameAs: 'https://en.wikipedia.org/wiki/Digital_audio',
        categoryId: 'cat-audiovideo',
      },
      {
        id: 'e-stereo-sound',
        name: 'Stereophonic Sound',
        sameAs: 'https://en.wikipedia.org/wiki/Stereophonic_sound',
        categoryId: 'cat-audiovideo',
      },
      {
        id: 'e-aspect-ratio',
        name: 'Display Aspect Ratio',
        sameAs: 'https://en.wikipedia.org/wiki/Display_aspect_ratio',
        categoryId: 'cat-audiovideo',
      },
      // Technology
      {
        id: 'e-minimax-h3',
        name: 'MiniMax H3',
        sameAs: 'https://hailuoai.video/',
        categoryId: 'cat-technology',
      },
      {
        id: 'e-api',
        name: 'API',
        sameAs: 'https://en.wikipedia.org/wiki/API',
        categoryId: 'cat-technology',
      },
      {
        id: 'e-point-click',
        name: 'Point and Click',
        sameAs: 'https://en.wikipedia.org/wiki/Point_and_click',
        categoryId: 'cat-technology',
      },
      {
        id: 'e-data',
        name: 'Data',
        sameAs: 'https://en.wikipedia.org/wiki/Data',
        categoryId: 'cat-technology',
      },
      {
        id: 'e-infosec',
        name: 'Information Security',
        sameAs: 'https://en.wikipedia.org/wiki/Information_security',
        categoryId: 'cat-technology',
      },
      {
        id: 'e-pixel',
        name: 'Pixel',
        sameAs: 'https://en.wikipedia.org/wiki/Pixel',
        categoryId: 'cat-technology',
      },
      {
        id: 'e-frame-rate',
        name: 'Frame Rate',
        sameAs: 'https://en.wikipedia.org/wiki/Frame_rate',
        categoryId: 'cat-technology',
      },
      {
        id: 'e-4k',
        name: '4K Resolution',
        sameAs: 'https://en.wikipedia.org/wiki/4K_resolution',
        categoryId: 'cat-technology',
      },
      // Business
      {
        id: 'e-webcam',
        name: 'Webcam',
        sameAs: 'https://en.wikipedia.org/wiki/Webcam',
        categoryId: 'cat-business',
      },
      {
        id: 'e-website',
        name: 'Website',
        sameAs: 'https://en.wikipedia.org/wiki/Website',
        categoryId: 'cat-business',
      },
      // Files & Storage
      {
        id: 'e-jpeg',
        name: 'JPEG',
        sameAs: 'https://en.wikipedia.org/wiki/JPEG',
        categoryId: 'cat-files',
      },
      {
        id: 'e-png',
        name: 'PNG',
        sameAs: 'https://en.wikipedia.org/wiki/PNG',
        categoryId: 'cat-files',
      },
      {
        id: 'e-download',
        name: 'Download',
        sameAs: 'https://en.wikipedia.org/wiki/Download',
        categoryId: 'cat-files',
      },
      {
        id: 'e-url',
        name: 'URL',
        sameAs: 'https://en.wikipedia.org/wiki/URL',
        categoryId: 'cat-files',
      },
      {
        id: 'e-data-center',
        name: 'Data Center',
        sameAs: 'https://en.wikipedia.org/wiki/Data_center',
        categoryId: 'cat-files',
      },
      {
        id: 'e-file-system',
        name: 'File System',
        sameAs: 'https://en.wikipedia.org/wiki/File_system',
        categoryId: 'cat-files',
      },
    ],
  },

  // Wan Animate 2: Motion Transfer
  video_wan_animate2: {
    keywords:
      'Image Generation, Motion Control, Video, Motion Transfer, Wan Animate 2, ComfyUI Workflow',
    datePublished: '2026-08-08',
    isRelatedTo: [
      { name: 'Image Generation Workflows', url: 'https://comfy.org/workflows/category/image/' },
      { name: 'Motion Control Workflows', url: 'https://comfy.org/workflows/tag/motion-control/' },
      { name: 'Video Workflows', url: 'https://comfy.org/workflows/tag/video/' },
    ],
    coreTopics: [
      { id: 'e-motion', name: 'Motion', sameAs: 'https://en.wikipedia.org/wiki/Motion_(physics)' },
    ],
    categories: [
      { id: 'cat-computervision', name: 'Computer Vision & Rendering' },
      { id: 'cat-business', name: 'Production & Business' },
      { id: 'cat-audiovideo', name: 'Audio & Video' },
    ],
    entities: [
      // Standalone mentions (no DefinedTermSet)
      {
        id: 'e-wan-animate2',
        name: 'Wan Animate 2',
        sameAs: 'https://github.com/Wan-Video/Wan2.1',
      },
      {
        id: 'e-character',
        name: 'Character',
        sameAs: 'https://en.wikipedia.org/wiki/Character_(arts)',
      },
      { id: 'e-camera', name: 'Camera', sameAs: 'https://en.wikipedia.org/wiki/Camera' },
      {
        id: 'e-extraction',
        name: 'Pose Extraction',
        sameAs: 'https://en.wikipedia.org/wiki/Pose_estimation',
      },
      { id: 'e-frames', name: 'Video Frames', sameAs: 'https://en.wikipedia.org/wiki/Film_frame' },
      {
        id: 'e-skeleton',
        name: 'Skeletal Preprocessing',
        sameAs: 'https://en.wikipedia.org/wiki/Skeletal_animation',
      },
      { id: 'e-reference', name: 'Reference', sameAs: 'https://en.wikipedia.org/wiki/Citation' },
      {
        id: 'e-identity',
        name: 'Identity',
        sameAs: 'https://en.wikipedia.org/wiki/Identity_(social_science)',
      },
      // Computer Vision & Rendering
      {
        id: 'e-computer-vision',
        name: 'Computer Vision',
        sameAs: 'https://en.wikipedia.org/wiki/Computer_vision',
        categoryId: 'cat-computervision',
      },
      {
        id: 'e-rendering',
        name: 'Rendering (Computer Graphics)',
        sameAs: 'https://en.wikipedia.org/wiki/Rendering_(computer_graphics)',
        categoryId: 'cat-computervision',
      },
      {
        id: 'e-gpu',
        name: 'Graphics Processing Unit',
        sameAs: 'https://en.wikipedia.org/wiki/Graphics_processing_unit',
        categoryId: 'cat-computervision',
      },
      {
        id: 'e-image-stabilization',
        name: 'Image Stabilization',
        sameAs: 'https://en.wikipedia.org/wiki/Image_stabilization',
        categoryId: 'cat-computervision',
      },
      {
        id: 'e-display-res',
        name: 'Display Resolution',
        sameAs: 'https://en.wikipedia.org/wiki/Display_resolution',
        categoryId: 'cat-computervision',
      },
      // Production & Business
      {
        id: 'e-workflow',
        name: 'Workflow',
        sameAs: 'https://en.wikipedia.org/wiki/Workflow',
        categoryId: 'cat-business',
      },
      {
        id: 'e-footage',
        name: 'Footage',
        sameAs: 'https://en.wikipedia.org/wiki/Footage',
        categoryId: 'cat-business',
      },
      {
        id: 'e-quality',
        name: 'Quality (Business)',
        sameAs: 'https://en.wikipedia.org/wiki/Quality_(business)',
        categoryId: 'cat-business',
      },
      {
        id: 'e-communication',
        name: 'Communication',
        sameAs: 'https://en.wikipedia.org/wiki/Communication',
        categoryId: 'cat-business',
      },
      {
        id: 'e-control',
        name: 'Control (Management)',
        sameAs: 'https://en.wikipedia.org/wiki/Control_(management)',
        categoryId: 'cat-business',
      },
      // Audio & Video
      {
        id: 'e-sound',
        name: 'Sound',
        sameAs: 'https://en.wikipedia.org/wiki/Sound',
        categoryId: 'cat-audiovideo',
      },
      {
        id: 'e-surround-sound',
        name: 'Surround Sound',
        sameAs: 'https://en.wikipedia.org/wiki/Surround_sound',
        categoryId: 'cat-audiovideo',
      },
      {
        id: 'e-high-fidelity',
        name: 'High Fidelity',
        sameAs: 'https://en.wikipedia.org/wiki/High_fidelity',
        categoryId: 'cat-audiovideo',
      },
      {
        id: 'e-video-editing',
        name: 'Video Editing',
        sameAs: 'https://en.wikipedia.org/wiki/Video_editing',
        categoryId: 'cat-audiovideo',
      },
      {
        id: 'e-frame-rate',
        name: 'Frame Rate',
        sameAs: 'https://en.wikipedia.org/wiki/Frame_rate',
        categoryId: 'cat-audiovideo',
      },
    ],
  },
};

/**
 * The `@graph` builder is called with the workflow's `name` from whichever index
 * the build used. The local content collection (`templates/index.json`) exposes
 * the snake_case filename, but the hub API (`/api/hub/workflows/index`, the
 * primary source in preview/prod builds) exposes the share id instead — so a
 * bare `WORKFLOW_ENTITY_GRAPHS[name]` lookup misses on deployed pages. Map the
 * share id back to the filename key here so both indexes resolve.
 */
const SHARE_ID_TO_KEY: Record<string, string> = {
  b37902cee452: 'video_ltx2_5_i2v',
  cd0c4f9f61a4: 'api_seedance2_5_r2v',
  a781503cf508: 'video_minimax_h3_i2v',
  '9394f9968da3': 'video_wan_animate2',
};

export function getWorkflowEntityGraph(nameOrShareId: string): WorkflowEntityGraph | undefined {
  return (
    WORKFLOW_ENTITY_GRAPHS[nameOrShareId] ?? WORKFLOW_ENTITY_GRAPHS[SHARE_ID_TO_KEY[nameOrShareId]]
  );
}
