// tina/config.ts
import { defineConfig } from "tinacms";
var config_default = defineConfig({
  branch: "main",
  clientId: "c6bed7fc-077d-4454-b8d1-dfa43ea05603",
  token: process.env.TINA_TOKEN,
  build: {
    outputFolder: "apps/template-cms",
    publicFolder: "./"
  },
  media: {
    tina: {
      mediaRoot: "templates",
      publicFolder: "./templates"
    }
  },
  schema: {
    collections: [
      {
        name: "bundleConfig",
        label: "Bundle Configuration",
        path: "",
        format: "json",
        match: {
          include: "bundles.json"
        },
        ui: {
          allowedActions: {
            create: false,
            delete: false
          }
        },
        fields: [
          {
            type: "string",
            name: "media_api",
            nameOverride: "media-api",
            label: "API Templates",
            list: true
          },
          {
            type: "string",
            name: "media_image",
            nameOverride: "media-image",
            label: "Image Templates",
            list: true
          },
          {
            type: "string",
            name: "media_video",
            nameOverride: "media-video",
            label: "Video Templates",
            list: true
          },
          {
            type: "string",
            name: "media_other",
            nameOverride: "media-other",
            label: "Other Templates",
            list: true
          }
        ]
      }
    ]
  }
});
export {
  config_default as default
};
