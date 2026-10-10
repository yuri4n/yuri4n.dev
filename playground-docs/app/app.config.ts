export default defineAppConfig({
  seo: {
    title: 'yuri4n.dev',
    description: 'Shared Nuxt 4 layers for the apps of yuri4n.',
  },
  header: {
    title: 'yuri4n.dev',
  },
  ui: {
    colors: {
      primary: 'sky',
      neutral: 'neutral',
    },
  },
  // Edit links. Without them, a build without .git writes dead links.
  github: {
    url: 'https://github.com/yuri4n/yuri4n.dev',
    branch: 'main',
    rootDir: 'playground-docs',
  },
  socials: {
    github: 'https://github.com/yuri4n/yuri4n.dev',
  },
  toc: {
    title: 'On this page',
  },
  // @yuri4n/nuxt-docs-exdoc: repository paths in code link to this
  // repository. A non-empty pathTop replaces the built-in top folders.
  exdoc: {
    repo: 'yuri4n/yuri4n.dev',
    pathTop: ['layers', 'packages', 'playground', 'playground-docs'],
  },
})
