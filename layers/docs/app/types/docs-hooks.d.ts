// The runtime hook of @yuri4n/nuxt-docs. ProsePre calls it on the client
// after a code fence renders. An add-on layer listens to it and changes the
// DOM of the fence (for example @yuri4n/nuxt-docs-exdoc adds links to
// `elixir` fences).
declare module '#app' {
  interface RuntimeNuxtHooks {
    'docs:linkify-fence': (ctx: {
      el: HTMLElement
      language: string
      path: string
    }) => void | Promise<void>
  }
}

export {}
