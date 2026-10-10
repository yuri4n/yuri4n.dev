import { defineCollection, defineContentConfig } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    // content/docs/** is served under /docs (content/docs/index.md is /docs).
    docs: defineCollection({
      type: 'page',
      source: { include: 'docs/**', prefix: '/docs' },
    }),
  },
})
