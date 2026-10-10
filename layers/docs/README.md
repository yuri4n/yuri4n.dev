# @yuri4n/nuxt-docs

The generic base of a Docus documentation site. It extends
[Docus](https://docus.dev) 5.13.0 (exact pin) and adds:

- Mermaid diagrams: a `mermaid` code fence becomes a diagram with a zoom
  lightbox (`ProsePre` proxy and `MermaidDiagram`).
- `/llms-full.txt`: all pages in one Markdown file for AI agents, prerendered.
  It replaces the nuxt-llms version, which crashes on bold text.
- The site URL for `llms.txt`, derived from `NUXT_SITE_URL` or
  `VERCEL_PROJECT_PRODUCTION_URL`, with `http://localhost:3000` as the
  fallback.
- The Docus AI assistant off (`docus.assistant.enabled: false`). Docus turns
  it on when a build has a Vercel OIDC token, and the chat then bills the
  Vercel AI Gateway.
- Structural CSS (`app/assets/css/docs-base.css`) for the layer components,
  code-reference links, the source chip, figure captions and the AI SLOP
  stamp.
- The runtime hook `docs:linkify-fence` for add-on layers.

Add-on: `@yuri4n/nuxt-docs-exdoc` (Elixir and ExDoc links) extends this
layer.

Why Docus 5.13.0 exactly: on this version the key `docus.assistant.enabled`
is verified to win over the OIDC token. Docus 5.14 moved the agent features
to `nuxt-agent-discovery` and changes these keys. The move to 5.14 is a
reviewed Renovate pull request, and the `docs-ci.yml` assistant check must
pass on it.

## Use

```ts
// nuxt.config.ts of the site
export default defineNuxtConfig({
  extends: ['@yuri4n/nuxt-docs'],
  site: { name: 'my-lib' },
  llms: {
    title: 'my-lib',
    description: 'One line about my-lib.',
    sections: [],
    notes: [],
  },
  mcp: { name: 'my-lib documentation' },
})
```

## Hooks for a site

- `app/app.css`: the skin. Set the Nuxt UI tokens (`--ui-primary`,
  `--ui-bg*`, `--ui-border*`, `--ui-radius`), the fonts in `@theme`
  (`--font-sans`, `--font-mono`), and two layer variables:
  - `--docs-accent-2`: a second accent for links inside code fences and the
    hover of the source chip. Default: `--ui-primary`.
  - `--docs-glow`: a `box-shadow` value for chips and buttons. Default:
    `none`.

  Never write `@import "tailwindcss"` in `app.css`: Docus imports Tailwind
  and Nuxt UI itself, and it imports `app.css` at the end of its own CSS.

- `app/app.config.ts`: `seo`, `header`, `ui.colors`, `socials`, `toc` and
  `github: { url, branch, rootDir }`. Set `github`: without it, a build
  without `.git` writes dead "edit this page" links.
- `nuxt.config.ts`: `site.name`, `llms.title`, `llms.description`,
  `llms.sections`, `llms.notes` and `mcp.name`. The layer sets `site.url`,
  `llms.domain`, `llms.full: false` and one `llms.sections` entry that links
  `/llms-full.txt` (site sections join it). Do not set `llms.full` again:
  the layer route serves `/llms-full.txt`.
- More Shiki languages: `content.build.markdown.highlight.langs` (for
  example `['scala', 'java']`). Layer and app arrays join the Docus list
  (`bash`, `diff`, `json`, `js`, `ts`, `html`, `css`, `vue`, `shell`, `mdc`,
  `md`, `yaml`).
- The runtime hook `docs:linkify-fence`, typed in
  `app/types/docs-hooks.d.ts`. `ProsePre` calls it on the client after a
  fence renders, with `{ el, language, path }`. A plugin can change the DOM
  of the fence:

  ```ts
  export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.hook('docs:linkify-fence', ({ el, language }) => {
      if (language === 'sql')
        el.classList.add('sql-fence')
    })
  })
  ```

## Dependencies and pnpm

Every package declares what it imports, and the library uses no
`shamefullyHoist`. This layer declares `@nuxt/content` and `minimark` (the
`/llms-full.txt` route imports them) and `@nuxt/ui` (the `ProsePre` proxy
imports `@nuxt/ui/runtime/components/prose/Pre.vue`, which is internal Nuxt
UI API).

Docus resolves `tailwindcss` and `@nuxt/ui` for its generated `docus.css`
from its own package location, so a site does not need them for CSS. A site
lists `@nuxt/ui` only when its own code or its type check needs it, with the
same range as this layer (`^4.11.3`), so pnpm keeps one copy. A site lists
no `tailwindcss` and no `better-sqlite3`: Docus uses `node:sqlite`
(`content.experimental.sqliteConnector: 'native'`).

## AI SLOP convention

This layer always ships the styles. Each site writes its own notice text,
because the notice names a reviewer.

- The stamp: `[AI SLOP]{.ai-slop}` at the start of a paragraph at the top
  of a page that an AI agent wrote. The paragraph says who wrote the page
  and who reviewed it.
- Figure captions: an italic-only paragraph directly below a figure (a
  diagram, an image, a table). It has three parts: the name of the figure,
  one line on what it shows, and the note that AI made it, for example
  `_Figure 1 — The module table: one row per module. AI generated._`
- The `ingest-exdoc` CLI of the exdoc layer writes the stamp only when its
  `stamp` option is set (there is no default text).

## Deploy (Vercel)

Two `vercel.json` examples are in `examples/`. Copy one to the site root as
`vercel.json`:

- `examples/vercel.server.json`: a server build (Nuxt `build`). It has
  `/mcp`, the MCP server for agents.
- `examples/vercel.static.json`: a static build (`pnpm generate` with
  `NITRO_PRESET=vercel_static`). Its build command starts with
  `unset VERCEL_OIDC_TOKEN AI_GATEWAY_API_KEY;`. Keep that prefix: it is a
  second defense next to `docus.assistant.enabled: false`, because local and
  CI builds have no OIDC token, so a wrong key would show first on Vercel.

The deploy rule: work reaches production through a pull request, CI is the
proof, and exactly one machine publishes each site. With a public library,
the Vercel Git integration publishes. With a private library, the
`vercel-deploy.yml` reusable workflow publishes, and `vercel.json` gets
`"git": { "deploymentEnabled": false }`. Never turn on both. Agents never
deploy.

## CI

A docs site calls the reusable workflow of the library, pinned to a tag:

```yaml
jobs:
  docs:
    uses: yuri4n/yuri4n.dev/.github/workflows/docs-ci.yml@v0.1.0
    with:
      working-directory: docs
      library-path: vendor/yuri4n.dev
      run-tests: true
    secrets:
      SUBMODULES_TOKEN: ${{ secrets.SUBMODULES_TOKEN }}
```

A static site also passes `build-command: pnpm generate`,
`nitro-preset: vercel_static` and `output-dir: .vercel/output/static`. The
workflow builds with a dummy `VERCEL_OIDC_TOKEN` and fails when the Docus
assistant is on in the build.

## Known limitation: MCP menu items on a static build

On a static build (`vercel_static`), the Docus page menu still shows "Copy
MCP Server URL" and "Add MCP Server". They point at `/mcp`, which a static
build does not have. The fix is planned for v0.2: a shadow of the Docus
component `DocsPageHeaderLinks.vue` that hides the two items on a static
build. Until then, a static site lives with the two dead items, or uses the
server build.

## New docs site checklist

Copy the files from `playground-docs/` in the library and change the names.

- `package.json`: dependencies `@yuri4n/nuxt-docs` (or
  `@yuri4n/nuxt-docs-exdoc` for an Elixir site) with `workspace:*` or a
  version, `nuxt`, `@nuxt/ui` and `@nuxt/content` (the generated collection
  types in `.nuxt/content/types.d.ts` import `@nuxt/content` from the site
  root; without it `queryCollection('docs')` is typed `never`). Scripts:
  `dev`, `build`, `generate`, `preview`, `postinstall: nuxt prepare`,
  `typecheck: node scripts/typecheck.mjs`, and `test` when the site has
  tests.
- `scripts/typecheck.mjs`: runs `nuxt typecheck` and fails only on errors
  outside `node_modules`. Docus 5.13.0 ships its source, and vue-tsc finds
  8 errors in it that a site cannot fix.
- `pnpm-workspace.yaml`: pnpm does not inherit it. Copy the `allowBuilds`
  (with `better-sqlite3: false`), supply-chain (`minimumReleaseAge`,
  `trustPolicy`, `trustPolicyIgnoreAfter`, `blockExoticSubdeps`) and
  `overrides` blocks of the template, and list the library layer paths that
  the site uses (for example `vendor/yuri4n.dev/layers/docs`), relative to
  the file.
- `nuxt.config.ts`: `extends`, `site.name`, `llms` and `mcp.name`.
- `tsconfig.json`: the four project references (`files: []` and
  `.nuxt/tsconfig.{app,server,shared,node}.json`). `nuxt typecheck` fails
  without it.
- `app/app.config.ts`: `seo`, `header.title`, `ui.colors` and `github`.
- `app/app.css`: the skin, with no `@import "tailwindcss"`.
- `app/assets/api-manifest.json`: `{}` (only an `@yuri4n/nuxt-docs-exdoc`
  site).
- `content/index.md`: the landing page.
- `vercel.json`: one of the two examples above.
- `.github/workflows/docs.yml`: calls `docs-ci.yml` (see CI above).
