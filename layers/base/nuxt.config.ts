import process from 'node:process'

// Site URL for robots, sitemap and absolute links. Vercel sets
// VERCEL_PROJECT_PRODUCTION_URL; local and CI builds fall back to localhost.
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
// `||`, not `??`: an empty NUXT_SITE_URL= (copied .env.example) falls back too.
const siteUrl = process.env.NUXT_SITE_URL
  || (vercelUrl ? `https://${vercelUrl}` : 'http://localhost:3000')

export default defineNuxtConfig({
  modules: ['@nuxtjs/robots'],
  site: { url: siteUrl },
  app: { head: { htmlAttrs: { lang: 'en' } } },
})
