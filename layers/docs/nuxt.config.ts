import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))

// The absolute URL of the site, for llms.txt links. Vercel sets
// VERCEL_PROJECT_PRODUCTION_URL. Without it (local and CI builds) nuxt-llms
// skips llms.txt, so fall back to localhost.
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
// `||`, not `??`: an empty NUXT_SITE_URL= (copied .env.example) falls back too.
const siteUrl = process.env.NUXT_SITE_URL
  || (vercelUrl ? `https://${vercelUrl}` : 'http://localhost:3000')

// `llms.full: false` turns off the /llms-full.txt route of nuxt-llms (this
// layer serves its own), and defu keeps `false` over the Docus default
// (docus 5.13 modules/config.ts). nuxt-llms 0.2.0 types `full` as an object
// only, so the key comes through a spread of a plain record. That needs no
// cast and no "expect error" comment, and it type-checks whether or not the
// nuxt-llms types resolve in the consuming app.
const LLMS_FULL_OFF: Record<string, unknown> = { full: false }

export default defineNuxtConfig({
  extends: ['docus'],

  // Docus imports only the FINAL app's app/app.css; a middle layer ships its
  // CSS here. Docus puts its docus.css first in `css`, so this file comes
  // after the site's skin (see the comment at the top of docs-base.css).
  css: [join(currentDir, 'app/assets/css/docs-base.css')],

  site: { url: siteUrl },

  // llms.txt and /raw/<page>.md come from nuxt-llms. /llms-full.txt comes
  // from server/routes/llms-full.txt.get.ts (the nuxt-llms version crashes
  // on bold text), so `full` is off here.
  llms: {
    domain: siteUrl,
    // `full: false`, through a spread (see LLMS_FULL_OFF above).
    ...LLMS_FULL_OFF,
    // `full: false` also drops the "Documentation sets" link of nuxt-llms,
    // so the layer adds it back for its own route. Site sections join it
    // (defu joins arrays).
    sections: [
      {
        title: 'Documentation sets',
        description: 'All pages in one file.',
        links: [
          {
            title: 'All pages',
            description: 'Every page of this site as one Markdown file.',
            href: `${siteUrl}/llms-full.txt`,
          },
        ],
      },
    ],
  },

  nitro: {
    prerender: { routes: ['/llms-full.txt'] },
  },

  docus: {
    // Off on purpose: Docus turns its assistant on when it finds a Vercel
    // OIDC token, and the chat then uses (and bills) the Vercel AI Gateway.
    // In docus 5.13.0 an explicit `enabled` wins over the token
    // (modules/assistant/index.ts: `options.enabled ?? hasAiGatewayAuth`).
    assistant: { enabled: false },
  },
})
