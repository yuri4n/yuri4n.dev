# @yuri4n/nuxt-preferences

The common app preferences: English, Spanish and Brazilian Portuguese;
system, light and dark appearance. The app owns its content and skin.

## Use it

1. Add `vendor/yuri4n.dev/layers/preferences` to the app's workspace and
   `"@yuri4n/nuxt-preferences": "workspace:*"` to its dependencies.
2. Extend `@yuri4n/nuxt-preferences` in `nuxt.config.ts`.
3. Render `<AppPreferences />` in the app header or settings page. It uses
   semantic token utilities from `@yuri4n/nuxt-ui`; that layer is optional
   when the app provides equivalent styles.
4. Put translated app messages in `i18n/locales/en.json`, `es.json` and
   `pt-BR.json`. Declare those files in the app so i18n merges them with
   the shared preference labels:

   ```ts
   export default defineNuxtConfig({
     extends: ['@yuri4n/nuxt-preferences', '@yuri4n/nuxt-ui'],
     i18n: {
       locales: [
         { code: 'en', language: 'en', file: 'en.json' },
         { code: 'es', language: 'es', file: 'es.json' },
         { code: 'pt-BR', language: 'pt-BR', file: 'pt-BR.json' },
       ],
     },
   })
   ```

The locale codes are `en`, `es` and `pt-BR`. Use `useLocalePath()` for app
links so navigation keeps the selected language. Localized routes use no
prefix for English, `/es` for Spanish and `/pt-BR` for Brazilian Portuguese.
The layer updates `<html lang>` and `dir`. Each app owns its title,
description, canonical URL and alternate-language metadata.
Keep the `language` fields when declaring files in an app: Nuxt i18n does
not preserve them when the app replaces locale entries without the fields.
`useLocaleHead()` needs them to generate alternate-language links. An app
that enables localized SEO also supplies its public `i18n.baseUrl`.

At `/`, the first visit uses the browser's language when it is supported;
otherwise it uses English. The `app-locale` cookie remembers the selection.
A direct localized URL keeps its language. This uses the standard Nuxt i18n
route and cookie behavior; it does not translate application text by itself.

Appearance starts at `system` and follows operating-system changes. An
explicit light or dark selection persists in localStorage at
`app-color-mode`, per origin. Selecting `system` resumes live system sync.
The color-mode head script applies the class before rendering to avoid a
flash. The selector waits for hydration before showing a stored preference,
so the server and client render the same initial markup. `.light` and
`.dark` are the classes on `<html>`. Each app supplies both token palettes.

The common labels use `preference.language`, `preference.appearance`,
`preference.system`, `preference.light` and `preference.dark`. The app may
override those messages. Native selects provide visible labels, keyboard
navigation and screen-reader names. Component class attributes are merged
onto its root element. The `app-preferences`, `preference-field` and
`preference-select` classes are stable style hooks for the app.

## Custom controls

`useAppPreferences()` exposes reactive `language`, `theme`, and `hydrated`;
`locales` (`code`, `name`) and `themes`; async `setLanguage(code)` and
`setTheme(preference)`. The accepted theme values are `system`, `light` and
`dark`. Keep the theme control disabled until `hydrated` is true.

Nuxt merges the layer options with the app's options. The app can override
the cookie or storage key, routing strategy or initial color preference.
Do not set an absolute `langDir`: Nuxt i18n resolves locale files separately
for each layer, and absolute paths do not survive production deployment.

## Verify in a browser

Build the playground and start `playground/.output/server/index.mjs`.
Check a new session with Spanish or Brazilian Portuguese browser language,
then switch all three routes and reload. Change the operating-system theme
with `system` selected; select the opposite explicit theme and reload;
change the system again and verify the explicit theme remains. Finally,
select `system` and verify that live synchronization resumes. Check the
controls at a narrow viewport and with keyboard navigation.
