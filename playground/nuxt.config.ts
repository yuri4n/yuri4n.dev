import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  // Every app layer of the library, by package name. Nuxt installs the
  // modules of the last layer first, so the content layer comes before the
  // ui layer: @nuxt/ui must be installed before @nuxt/content, or the plain
  // MDC prose components win over the Nuxt UI ones.
  extends: ['@yuri4n/nuxt-base', '@yuri4n/nuxt-content', '@yuri4n/nuxt-ui'],
  modules: ['@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  site: { name: 'yuri4n.dev playground' },
  compatibilityDate: '2026-10-09',
  eslint: {
    config: {
      standalone: false,
      // ESLint runs from the library root (eslint.config.js there imports
      // playground/.nuxt/eslint.config.mjs), so the generated paths start
      // there too.
      rootDir: fileURLToPath(new URL('..', import.meta.url)),
    },
  },
})
