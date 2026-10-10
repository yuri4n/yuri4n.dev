export default defineNuxtConfig({
  extends: ['@yuri4n/nuxt-docs'],
  // The Docus highlight list has no `elixir`, so
  // elixir fences had no syntax colors. Layer arrays join (defu), so this
  // adds one language to the Docus list.
  content: { build: { markdown: { highlight: { langs: ['elixir'] } } } },
})
