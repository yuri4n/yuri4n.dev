export default defineNuxtConfig({
  modules: ['@nuxt/content'],
  content: {
    // Node's built-in `node:sqlite` instead of the `better-sqlite3` native
    // addon: no native build, and it loads on Vercel (the prebuilt
    // better-sqlite3 binary fails there with ERR_DLOPEN_FAILED, which breaks
    // every runtime `queryCollection` call). Needs Node 22.5 or later.
    experimental: { sqliteConnector: 'native' },
    build: {
      markdown: {
        highlight: {
          // Keys must match the color-mode classes on <html> (Nuxt UI sets
          // classSuffix to ''), because MDC emits `html.dark .shiki span`
          // selectors from them. `light` is set too: MDC deep-merges its own
          // defaults and would keep another theme under that key.
          theme: {
            default: 'vitesse-light',
            light: 'vitesse-light',
            dark: 'vitesse-dark',
          },
        },
      },
    },
  },
})
