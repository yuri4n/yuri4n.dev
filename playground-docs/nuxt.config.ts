// The Docus test site of the library, and the seed of its own docs site.
// It extends the exdoc layer, which extends the docs layer, which extends
// Docus. The `elixir` highlight language comes from the exdoc layer.
const description
  = 'Shared Nuxt 4 layers: base, UI, content and Docus documentation sites.'

export default defineNuxtConfig({
  extends: ['@yuri4n/nuxt-docs-exdoc'],

  site: { name: 'yuri4n.dev' },

  // The layer sets `domain`, `full: false` and the link to /llms-full.txt.
  llms: {
    title: 'yuri4n.dev',
    description,
    sections: [
      {
        title: 'Developer resources',
        description: 'Machine-readable entry points for this documentation.',
        links: [
          {
            title: 'yuri4n.dev on GitHub',
            description: 'The source of the layers and of this site.',
            href: 'https://github.com/yuri4n/yuri4n.dev',
          },
        ],
      },
    ],
    notes: [
      'yuri4n.dev is a library of Nuxt 4 layers. An app mounts it as a git'
      + ' submodule at vendor/yuri4n.dev and extends the layers by package'
      + ' name.',
      'To read this documentation as an agent, fetch /llms-full.txt, or the'
      + ' raw Markdown of one page at /raw/<page-path>.md.',
    ],
  },

  // MCP server for agents at /mcp (it needs a server build).
  mcp: { name: 'yuri4n.dev documentation' },

  compatibilityDate: '2026-10-09',
})
