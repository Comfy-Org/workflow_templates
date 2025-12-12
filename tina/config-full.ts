import { defineConfig } from "tinacms";

export default defineConfig({
  branch: "main",
  clientId: "c6bed7fc-077d-4454-b8d1-dfa43ea05603",
  token: process.env.TINA_TOKEN,

  build: {
    outputFolder: "apps/template-cms",
    publicFolder: "./",
  },
  
  search: {
    tina: {
      indexerToken: process.env.TINA_SEARCH_TOKEN,
      stopwordLanguages: ['eng'],
    },
  },

  media: {
    tina: {
      mediaRoot: "templates",
      publicFolder: "./templates",
    },
  },

  schema: {
    collections: [
      {
        name: "templateIndex",
        label: "Template Index",
        path: "templates",
        format: "json",
        match: {
          include: "index.json",
        },
        ui: {
          allowedActions: {
            create: false,
            delete: false,
          },
          filename: {
            readonly: true,
          },
        },
        fields: [
          {
            type: "object",
            name: "categories",
            label: "Template Categories",
            list: true,
            ui: {
              itemProps: (item) => ({
                label: item?.title || item?.moduleName,
              }),
            },
            fields: [
              {
                type: "string",
                name: "moduleName",
                label: "Module Name",
                required: true,
                description: "Unique identifier for this category",
              },
              {
                type: "string",
                name: "title",
                label: "Display Title",
                required: true,
                description: "User-friendly name shown in the interface",
              },
              {
                type: "string",
                name: "type",
                label: "Category Type",
                options: ["image", "video", "audio", "3d", "api"],
                description: "Optional type hint for the category",
              },
              {
                type: "boolean",
                name: "isEssential",
                label: "Is Essential Category",
                description: "Mark as essential/featured category",
              },
              {
                type: "object",
                name: "templates",
                label: "Templates",
                list: true,
                ui: {
                  itemProps: (item) => ({
                    label: item?.title || item?.name,
                  }),
                },
                fields: [
                  {
                    type: "string",
                    name: "name",
                    label: "Template Name",
                    required: true,
                    description: "Workflow filename without .json extension",
                  },
                  {
                    type: "image",
                    name: "thumbnail1",
                    label: "Primary Thumbnail",
                    description: "Main thumbnail image (will be saved as [name]-1.webp)",
                  },
                  {
                    type: "image", 
                    name: "thumbnail2",
                    label: "Secondary Thumbnail",
                    description: "Optional second thumbnail (will be saved as [name]-2.webp)",
                  },
                  {
                    type: "string",
                    name: "title",
                    label: "Display Title",
                    description: "User-friendly title for the template",
                  },
                  {
                    type: "string",
                    name: "description",
                    label: "Description",
                    required: true,
                    ui: {
                      component: "textarea",
                    },
                    description: "Brief description of what this workflow does",
                  },
                  {
                    type: "string",
                    name: "mediaType",
                    label: "Media Type",
                    required: true,
                    options: ["image", "video", "audio", "3d"],
                    description: "Type of output this workflow generates",
                  },
                  {
                    type: "string",
                    name: "mediaSubtype",
                    label: "Media Subtype",
                    required: true,
                    options: ["webp", "mp4", "mp3", "gif", "png", "jpg"],
                    description: "File format for thumbnails",
                  },
                  {
                    type: "string",
                    name: "thumbnailVariant",
                    label: "Thumbnail Variant",
                    options: ["compareSlider", "hoverDissolve", "hoverZoom", "zoomHover"],
                    description: "Special hover effect for thumbnails",
                  },
                  {
                    type: "string",
                    name: "tutorialUrl",
                    label: "Tutorial URL",
                    description: "Link to documentation or tutorial",
                  },
                  {
                    type: "string",
                    name: "tags",
                    label: "Tags",
                    list: true,
                    description: "Searchable tags for categorization",
                  },
                  {
                    type: "string",
                    name: "models",
                    label: "Required Models",
                    list: true,
                    description: "AI models required for this workflow",
                  },
                  {
                    type: "datetime",
                    name: "date",
                    label: "Date Added",
                    ui: {
                      dateFormat: "YYYY-MM-DD",
                    },
                  },
                  {
                    type: "number",
                    name: "size",
                    label: "File Size (bytes)",
                    description: "Total size of the workflow and assets",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "bundles",
        label: "Bundle Configuration", 
        path: "",
        format: "json",
        match: {
          include: "bundles.json",
        },
        ui: {
          allowedActions: {
            create: false,
            delete: false,
          },
        },
        fields: [
          {
            type: "string",
            name: "media_api",
            nameOverride: "media-api",
            label: "Media API Templates",
            list: true,
            description: "Templates that use external APIs",
          },
          {
            type: "string", 
            name: "media_image",
            nameOverride: "media-image",
            label: "Image Generation Templates",
            list: true,
            description: "Templates for image generation workflows",
          },
          {
            type: "string",
            name: "media_video",
            nameOverride: "media-video", 
            label: "Video Generation Templates",
            list: true,
            description: "Templates for video generation workflows",
          },
          {
            type: "string",
            name: "media_other",
            nameOverride: "media-other",
            label: "Other Templates",
            list: true, 
            description: "Audio, 3D, and other specialized templates",
          },
        ],
      },
      {
        name: "workflows",
        label: "Workflow Files",
        path: "templates",
        format: "json",
        match: {
          exclude: "index*.json",
        },
        ui: {
          filename: {
            readonly: false,
            slugify: (values) => {
              return `${values?.name || 'template'}`;
            },
          },
        },
        fields: [
          {
            type: "string",
            name: "name", 
            label: "Template Name",
            required: true,
            description: "This will be used as the filename and for matching thumbnails",
          },
          {
            type: "string",
            name: "title",
            label: "Display Title",
            description: "User-friendly title shown in the interface",
          },
          {
            type: "string",
            name: "description",
            label: "Description", 
            required: true,
            ui: {
              component: "textarea",
            },
            description: "Brief description of what this workflow does",
          },
          {
            type: "string",
            name: "mediaType",
            label: "Media Type",
            required: true,
            options: ["image", "video", "audio", "3d"],
            description: "Type of output - determines auto-categorization",
          },
          {
            type: "image",
            name: "thumbnail1",
            label: "Primary Thumbnail",
            description: "Main thumbnail (auto-saved as [name]-1.webp)",
          },
          {
            type: "image",
            name: "thumbnail2", 
            label: "Secondary Thumbnail",
            description: "Optional second thumbnail (auto-saved as [name]-2.webp)",
          },
          {
            type: "string",
            name: "tags",
            label: "Tags",
            list: true,
            description: "Searchable tags for categorization",
          },
          {
            type: "string",
            name: "models",
            label: "Required Models", 
            list: true,
            description: "AI models required for this workflow",
          },
          {
            type: "rich-text",
            name: "body",
            label: "Workflow JSON",
            isBody: true,
            ui: {
              component: "textarea",
            },
          },
        ],
      },
    ],
  },
});