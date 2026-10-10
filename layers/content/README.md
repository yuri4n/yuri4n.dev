# @yuri4n/nuxt-content

Nuxt Content 3 that works on Vercel and on any Node 22.5 or later without a
native module, with Shiki themes that follow the color-mode classes. It extends
nothing. It is opt-in: the template does not extend it by default.

## What it sets

- The `@nuxt/content` module.
- `content.experimental.sqliteConnector: 'native'`: Content uses Node's
  built-in `node:sqlite`. There is no `better-sqlite3`, no native build and no
  `allowBuilds` entry for it. The prebuilt `better-sqlite3` binary fails to load
  on Vercel (`ERR_DLOPEN_FAILED`), which breaks every runtime
  `queryCollection` call.
- Shiki themes keyed to the color-mode classes on `<html>`: `default` and
  `light` are `vitesse-light`, `dark` is `vitesse-dark`. Nuxt UI's color mode
  sets the class `dark` or `light` (no suffix), and MDC writes
  `html.dark .shiki span` selectors from these keys. `light` is set because MDC
  deep-merges its own defaults.

## Use it

1. Add the packages to the app. The app owns `content.config.ts`, which
   imports `defineCollection`, so the app lists `@nuxt/content` too (same
   range).

   ```json
   {
     "dependencies": {
       "@nuxt/content": "^3.16.1",
       "@yuri4n/nuxt-content": "workspace:*"
     }
   }
   ```

   With the git submodule, also add `vendor/yuri4n.dev/layers/content` to the
   app's `pnpm-workspace.yaml`.

2. Extend the layer. **Put it before `@yuri4n/nuxt-ui`** in `extends`:

   ```ts
   export default defineNuxtConfig({
     extends: [
       '@yuri4n/nuxt-content',
       '@yuri4n/nuxt-ui',
       '@yuri4n/nuxt-base',
     ],
   })
   ```

   Why: Nuxt installs the modules of the last layer in `extends` first. Nuxt UI
   must be installed before Nuxt Content: both register `Prose*` components
   with the same priority, and the first one registered wins. With
   `@yuri4n/nuxt-content` before `@yuri4n/nuxt-ui`, Markdown renders with the
   styled Nuxt UI prose components, not the plain MDC ones.

3. Write `content.config.ts` in the app root, for example:

   ```ts
   import { defineCollection, defineContentConfig } from '@nuxt/content'

   export default defineContentConfig({
     collections: {
       docs: defineCollection({
         type: 'page',
         source: { include: 'docs/**', prefix: '/docs' },
       }),
     },
   })
   ```

4. Add the `@source` line of the next section to the app's CSS entry.

## Rule: Tailwind does not scan `content/`

The Vite root is the app's `srcDir` (`app/`), and Nuxt UI adds an `@source`
line only for the `app/` directory of each layer. Utility classes written in
Markdown, for example the MDC attribute in `[text]{.text-primary}`, are in
`content/**`, so they produce no CSS. The app's CSS entry must add:

```css
@source '../../../content/**/*';
```

The path is relative to `app/assets/css/main.css`. This layer cannot add the
line: a CSS file in a layer cannot know the app's content path. (Docus adds the
line for its own sites.) The library playground tests this rule.

## Hooks for apps

- `content.config.ts`: the collections (owned by the app).
- `content.build.markdown.highlight.langs` and `preload`: extra Shiki
  languages. The app lists only the languages it uses.
- `content.build.markdown.highlight.theme`: other theme names. Keep the
  `default`, `light` and `dark` keys.
