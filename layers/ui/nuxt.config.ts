// No `css` entry here: the app owns its CSS entry and imports this layer's
// base.css first (see README.md), so the app adds its skin, `@theme` and
// `@utility` blocks in the same Tailwind compilation.
export default defineNuxtConfig({
  modules: ['@nuxt/ui'],
  nitro: {
    // @nuxt/icon's server bundle imports @iconify/utils at run time; Nitro
    // externalizes it and Vercel's file trace leaves it out of the function.
    // Inlining bundles it into the server chunks, so it is always present.
    externals: { inline: ['@iconify/utils'] },
  },
})
