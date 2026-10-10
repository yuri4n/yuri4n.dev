// Turns references inside `elixir` code fences into links. ProsePre of
// @yuri4n/nuxt-docs calls the runtime hook `docs:linkify-fence` after a
// fence renders on the client; this plugin answers for `elixir`.
export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter()
  const { linkifyCodeElement } = useApiLinks()
  nuxtApp.hook('docs:linkify-fence', ({ el, language, path }) => {
    if (language === 'elixir')
      linkifyCodeElement(el, path, to => router.push(to))
  })
})
