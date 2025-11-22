// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  compatibilityDate: '2025-11-21',
  
  // TypeScript configuration
  typescript: {
    typeCheck: false
  },

  // CSS
  css: ['~/assets/css/main.css'],
  
  // Modules
  modules: [
    '@vueuse/nuxt',
    '@nuxtjs/color-mode',
    'shadcn-nuxt'
  ],

  shadcn: {
    prefix: '',
    componentDir: './components/ui'
  },

  colorMode: {
    classSuffix: ''
  },

  // Server-side rendering
  ssr: true,

  // PostCSS configuration for Tailwind
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
})