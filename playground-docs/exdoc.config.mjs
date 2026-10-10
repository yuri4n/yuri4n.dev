// An example config for `pnpm exec ingest-exdoc` (see the README of
// @yuri4n/nuxt-docs-exdoc). This repository has no Elixir project and no
// ExDoc output, so nobody runs it here; app/assets/api-manifest.json stays
// `{}`.
export default {
  // The output of `mix docs`, relative to this folder.
  exdocDir: '../doc',
  // A provenance line on every generated page, for example an AI SLOP
  // stamp. Each site writes its own text; there is no default.
  stamp: null,
  projects: [
    {
      // The ExDoc file names of the project: MyLib.md, MyLib.Parser.md...
      pattern: /^MyLib(?:\..+)?\.md$/,
      outDir: 'content/3.api',
      apiBase: '/api',
      indexDescription: 'All public modules of my_lib.',
    },
  ],
}
