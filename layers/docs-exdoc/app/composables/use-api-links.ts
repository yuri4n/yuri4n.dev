// The site shell of the exdoc resolver. It binds the pure core
// (utils/api-links.ts) to the data of the consuming site, once per process:
//
//   - the manifest that `ingest-exdoc` writes. `~` is the consuming site
//     here on purpose: each site commits app/assets/api-manifest.json
//     (`{}` at minimum, else this import cannot resolve);
//   - the `exdoc` block of app.config (repo, ref, apiBase, sources,
//     packageDocs, pathTop).
//
// Components and plugins call `useApiLinks()` (auto-imported).
import type { ApiLinks, ApiModules } from '../utils/api-links'
import manifest from '~/assets/api-manifest.json'
import { apiLinksOptionsFromConfig, createApiLinks } from '../utils/api-links'

// The manifest and app.config are the same for every request, so one
// resolver serves the whole process.
let cache: ApiLinks | undefined

export default function useApiLinks(): ApiLinks {
  if (!cache) {
    const modules: ApiModules = manifest
    const options = apiLinksOptionsFromConfig(useAppConfig().exdoc)
    cache = createApiLinks(modules, options)
  }
  return cache
}
