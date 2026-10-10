export default defineAppConfig({
  ui: {
    colors: {
      // Nuxt UI defaults its `neutral` alias to `slate`, which remaps
      // Tailwind's `--color-neutral-*` scale to a blue-tinted gray. Point it
      // back at Tailwind's true `neutral`, so `text-neutral-*` and
      // `bg-neutral-*` keep their usual values. An app can override it.
      neutral: 'neutral',
    },
  },
})
