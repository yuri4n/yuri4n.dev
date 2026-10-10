# @yuri4n/nuxt-docs-exdoc

An Elixir and ExDoc add-on for `@yuri4n/nuxt-docs`. It extends that layer
(by package name) and adds:

- Links in inline code: a chip such as `` `Acme.Span.of/1` ``,
  `` `ground/3` `` or `` `lib/acme/point.ex` `` becomes a link to the API
  page, to hexdocs.pm or to GitHub (`ProseCode` proxy).
- Links in `elixir` code fences: the same references inside a fence become
  links on the client (a plugin on the `docs:linkify-fence` hook of the docs
  layer).
- `elixir` syntax colors: the layer adds `elixir` to the Docus highlight
  list (`content.build.markdown.highlight.langs`). Layer and app arrays
  join, so a site does not repeat it.
- The `ingest-exdoc` CLI: it turns the Markdown output of `mix docs` into
  Nuxt Content pages and the anchor manifest that the links use.

## Use

```ts
// nuxt.config.ts of the site
export default defineNuxtConfig({
  extends: ['@yuri4n/nuxt-docs-exdoc'],
})
```

The site must commit `app/assets/api-manifest.json`. The file is `{}` at
minimum; the resolver imports it with a static import, so the build fails
without it. `ingest-exdoc` writes it.

## The resolution ladder

A reference is resolved in this order:

1. Another project's package (`packageDocs`): a name under a foreign root
   (for example `Acme.*` on the shop site) always links to that project's
   docs, even when a stale manifest row claims it.
2. Own modules (the manifest): the exact name, then an Elixir-style alias
   (`Point` for `Acme.Point`).
3. The Elixir standard library on hexdocs.pm (`Enum.map/2`). A bare stdlib
   root (`Enum`, `Task`) stays plain text.
4. A bare entry (`ground/3`): the module of the current API page first,
   then the one module that owns the name.
5. A repository path (`lib/acme/point.ex`, `docs/`, `mix.exs`) links to
   GitHub.

## app.config keys

```ts
// app/app.config.ts of the site
export default defineAppConfig({
  exdoc: {
    apiBase: '/api', // the route prefix of the generated API pages
    ref: 'main', // the branch or tag of the GitHub source links
    repo: 'owner/acme', // the default repository of paths
    sources: [
      // First match wins. A prefix that starts with "/" matches the page
      // route; any other prefix matches the start of the path.
      { prefix: 'lib/acme', repo: 'owner/acme' },
      { prefix: '/shop', repo: 'owner/monorepo', pathPrefix: 'apps/shop/' },
    ],
    packageDocs: {
      Acme: { style: 'hexdocs', base: 'https://hexdocs.pm/acme' },
    },
    pathTop: [], // empty: lib, docs, test, config, priv, scripts, .github
  },
})
```

- With no `repo` and no matching `sources` rule, a repository path does not
  link.
- A non-empty `pathTop` replaces the built-in list of top folders (it does
  not add to it).
- `packageDocs` styles: `hexdocs` (`<base>/Acme.Span.html#of/1`) or `site`
  (a docs site like this one: `<base><apiBase>/acme-span#of`; `apiBase`
  default `/api`).
- `apiBase` must be the same value as the `apiBase` of the ingest project.

The layer defaults are empty arrays on purpose: Nuxt merges app.config
files with defu, which joins arrays, so a non-empty default could never be
narrowed by a site. The real defaults live in `createApiLinks`
(`app/utils/api-links.ts`), which is also usable alone and tested with
`node --test`.

### A package that switches between hexdocs and a local site

When a site links to another project's docs that can be either the
published hexdocs or a local docs server (for example while both are
developed together), decide it at build time with `vite.define`:

```ts
// nuxt.config.ts
import process from 'node:process'

export default defineNuxtConfig({
  extends: ['@yuri4n/nuxt-docs-exdoc'],
  vite: {
    define: {
      __PKG_DOCS__: JSON.stringify(
        process.env.PKG_DOCS_LOCAL
          ? { style: 'site', base: 'http://localhost:3001' }
          : { style: 'hexdocs', base: 'https://hexdocs.pm/acme' },
      ),
    },
  },
})
```

```ts
// app/app.config.ts
declare const __PKG_DOCS__: { style: 'hexdocs' | 'site', base: string }

export default defineAppConfig({
  exdoc: { packageDocs: { Acme: __PKG_DOCS__ } },
})
```

## The ingest CLI

A person runs it in the docs site folder after `mix docs`, and commits the
result:

```sh
mix docs              # in the Elixir project: writes doc/*.md
pnpm exec ingest-exdoc
```

It is never chained into `build` or `generate`: a build machine (Vercel,
CI) has no Elixir and no `doc/` folder. Without `doc/`, the CLI only warns
and keeps the pages on disk.

It reads `exdoc.config.mjs` from the current folder (or the path in its
first argument):

```js
// exdoc.config.mjs
export default {
  exdocDir: '../doc', // the output of mix docs (default)
  manifestPath: 'app/assets/api-manifest.json', // (default)
  stamp: null, // a provenance line on every page; no default text
  navTitle: 'API', // (default)
  navIcon: 'i-lucide-braces', // (default)
  projects: [
    {
      pattern: /^Acme(?:\..+)?\.md$/, // the ExDoc files of the project
      outDir: 'content/3.api', // (default)
      apiBase: '/api', // = app.config exdoc.apiBase (default)
      indexDescription: 'All public modules of acme.',
      indexCaption: null, // an italic caption below the module table
      // sourceRewrite: { from: 'https://github.com/a/b/blob/main/',
      //   to: 'https://github.com/c/d/blob/main/apps/b/' },
    },
  ],
}
```

What it writes, for each project: one page per module (`<slug>.md`),
`index.md` (the module table) and `.navigation.yml` in `outDir` (it deletes
`outDir` first), then one manifest for all projects. It drops the footer
that ExDoc writes on every module (`*Consult [api-reference.md]...*`),
because the site has no such page. Fences are found with the CommonMark
rules (` ``` ` and `~~~`, up to three spaces of indent), so a `#` line
inside any fence is never a heading.

## Tests

`test/api-links.test.mts` (the resolver) and `test/ingest.test.mjs` (the
ingest functions) use `node:test`; the library root runs them with
`pnpm test`.
