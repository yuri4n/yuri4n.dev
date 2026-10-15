# @yuri4n/nuxt-ui

Nuxt UI 4 as the base kit, with one CSS pipeline: Nuxt UI brings Tailwind 4
through `@tailwindcss/vite`. Do not add `@nuxtjs/tailwindcss`,
`@tailwindcss/postcss` or a `tailwind.config` file.

The layer ships:

- the token contract: semantic variables, then Tailwind utilities, then the
  Nuxt UI `--ui-*` tokens, with neutral default values;
- `app.config.ts` with `ui.colors.neutral: 'neutral'`;
- the Vercel fix for `@nuxt/icon` (see "Vercel" below).

It extends nothing. It has no skin: each app sets its own values.

## Use it

1. Add the packages to the app. The app lists `@nuxt/ui` and `tailwindcss` too,
   with the same ranges as this layer, because pnpm does not hoist and the
   app's CSS entry is compiled from the app root. Same ranges keep one copy.

   ```json
   {
     "dependencies": {
       "@nuxt/ui": "^4.11.3",
       "@yuri4n/nuxt-ui": "workspace:*",
       "tailwindcss": "^4.3.3"
     }
   }
   ```

2. Extend the layer and declare the app's CSS entry:

   ```ts
   export default defineNuxtConfig({
     extends: ['@yuri4n/nuxt-ui'],
     css: ['~/assets/css/main.css'],
   })
   ```

3. Import `base.css` on the first line of `app/assets/css/main.css`, then set
   the skin:

   ```css
   @import '@yuri4n/nuxt-ui/app/assets/css/base.css';

   :root {
     --primary: var(--color-sky-300);
     --primary-foreground: var(--color-stone-950);
   }
   ```

The layer has no `css` entry of its own. The app owns the entry, so its skin,
`@theme` and `@utility` blocks are in the same Tailwind compilation as the
contract.

## Hooks for apps

### CSS entry

`@import '@yuri4n/nuxt-ui/app/assets/css/base.css';` as the first line of the
app's CSS entry. It imports `tailwindcss`, `@nuxt/ui`, `tokens.css` and
`bridge.css`, sets the `dark` variant and two base rules (border and outline
colors on `*`, background and text colors on `body`).

### Variables

Set these on `:root` (light) and `.dark` (dark), after the import. A later rule
with the same selector wins, so the app's values replace the defaults.

- `--background`, `--foreground`: `bg-background`, `text-foreground`.
- `--card`, `--card-foreground`: `bg-card`, `text-card-foreground`.
- `--popover`, `--popover-foreground`: `bg-popover`, `text-popover-foreground`.
- `--primary`, `--primary-foreground`: `bg-primary`,
  `text-primary-foreground`.
- `--secondary`, `--secondary-foreground`: `bg-secondary`,
  `text-secondary-foreground`.
- `--muted`, `--muted-foreground`: `bg-muted`, `text-muted-foreground`.
- `--accent`, `--accent-foreground`: `bg-accent`, `text-accent-foreground`.
- `--destructive`: `bg-destructive`, `text-destructive`.
- `--border`, `--input`, `--ring`: `border-border`, `border-input`,
  `ring-ring`.
- `--code`: `bg-code`.
- `--radius`: `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`.

`font-heading` uses `--font-sans`. Set `--font-sans` (and other faces) in an
`@theme` block of the app.

### Nuxt UI tokens

`bridge.css` maps the Nuxt UI tokens to the variables above, in one
`html:root` block for both modes: `--ui-primary`, `--ui-secondary`,
`--ui-error` (from `--destructive`), `--ui-bg*`, `--ui-text*`, `--ui-border*`
and `--ui-radius` (from `--radius-sm`). So a Nuxt UI component and a
`bg-primary` element show the same color. To change one Nuxt UI token only,
set it in an `html:root` block of the app after the import.

### `app.config.ts`

`ui.colors` (`primary`, `secondary`, `neutral`, ...) selects the Nuxt UI shade
scales. This layer sets `neutral: 'neutral'`, so `text-neutral-*` keeps
Tailwind's neutral gray (Nuxt UI's default is `slate`). Shade utilities such as
`text-primary-500` come from these scales, not from `--primary`.

## Rules

- **Tailwind scan (`@source`).** Nuxt UI's generated `.nuxt/ui.css` adds one
  `@source` line for the `app/` directory of each layer, and nothing else.
  Classes written in `content/`, `shared/`, `server/` or any other folder
  outside `app/` produce no CSS until the app's CSS adds a line, with a path
  relative to the CSS file. For `app/assets/css/main.css`:

  ```css
  @source '../../../content/**/*';
  ```

- **Class names built from data.** Tailwind cannot see them. Add them with
  `@source inline('...')`.
- **Variables read at run time.** Tailwind 4 drops theme variables that no
  compiled CSS uses, but only in production builds. Declare variables that
  JavaScript or inline styles read in `@theme static`. Check styles in a local
  production build (`nuxt build`, then `node .output/server/index.mjs`).
- **Scoped styles.** Use `@reference` to the app's CSS entry, never `@import`
  (it would copy all of Tailwind into the component).
- **Icons.** The app installs `@iconify-json/<set>` for every icon set it uses.
  This layer declares none. Without a local set, the server fetches icons from
  the Iconify API, which can time out on Vercel.
- **reka-ui.** Do not add it directly. When a layer or an app needs it, pin it
  to the exact version that `@nuxt/ui` pins (2.10.5 for `@nuxt/ui` 4.11.3). A
  range installs a second copy with a second inject context.
- **Dark mode.** Nuxt UI's color mode puts `.dark` on `<html>`. Extend
  `@yuri4n/nuxt-preferences` and use `<AppPreferences>` for the shared
  system/light/dark control and language selector. The system preference
  follows operating-system changes until the user selects a fixed theme.

## Not in this layer (v0.1)

`cn`, `cva`, `@tailwindcss/typography`, `tw-animate-css` and shadcn-vue
components each have one real user today. An app adds them on first use. They
move here when a second app needs them.

## Add shadcn-vue later

Decide first where shadcn-vue lives (this layer or a separate package). Then:

1. Add `shadcn-nuxt` to this layer with the prefix `Shad`. Resolve its
   component directory from the layer file with `fileURLToPath` and
   `import.meta.url`. Never use `~/` or `@/` in a layer: they point at the
   app.
2. Add `reka-ui`, pinned to the version that `@nuxt/ui` pins.
3. Add `cn` (`twMerge(clsx(inputs))`), `cva` and `tw-animate-css` (import it
   in `base.css`).
4. shadcn-vue components read the same variables. The `--ui-bg-muted` line of
   `bridge.css` matters here: Tailwind resolves `bg-muted` through Nuxt UI's
   `--background-color-muted`, so the bridge keeps both kits on one value.

## Vercel

`@nuxt/icon`'s server bundle imports `@iconify/utils` at run time. Nitro
externalizes it, and Vercel's file trace leaves it out of the function. The
layer sets `nitro.externals.inline: ['@iconify/utils']`, so the module is
bundled into the server chunks.
