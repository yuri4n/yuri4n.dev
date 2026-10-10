// Defaults of the `exdoc` block. Data only, so it serializes; typed
// constants instead of casts.
//
// Every array default is EMPTY on purpose. Nuxt merges the app.config files
// of the layers and of the site with defu, and defu joins arrays, so a
// non-empty default here could never be narrowed by a site. The real
// defaults live in createApiLinks (app/utils/api-links.ts): an empty
// `pathTop` means the built-in list.

interface ExdocSource {
  /** A page route prefix ("/shop") or a repository path prefix ("lib/acme"). */
  prefix: string
  /** The GitHub repository, "owner/name". */
  repo: string
  /** The folder of the paths inside `repo`, for example "apps/shop/". */
  pathPrefix?: string
}

interface PackageDocs {
  style: 'hexdocs' | 'site'
  base: string
  /** The route prefix of the API pages of a 'site'. Default '/api'. */
  apiBase?: string
}

// First matching rule wins.
const sources: ExdocSource[] = []
// Foreign module roots -> where their docs live.
const packageDocs: Record<string, PackageDocs> = {}
// Empty = the built-in list (lib, docs, test, config, priv, scripts, .github).
const pathTop: string[] = []

export default defineAppConfig({
  exdoc: {
    // The route prefix of the generated API pages.
    apiBase: '/api',
    // The branch or tag of the GitHub source links.
    ref: 'main',
    // The default "owner/name" of repository paths. Empty: no path links.
    repo: '',
    sources,
    packageDocs,
    pathTop,
  },
})
