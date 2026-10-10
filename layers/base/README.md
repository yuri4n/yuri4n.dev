# @yuri4n/nuxt-base

Infrastructure that every app needs, without UI: `robots.txt`, the site URL and
a default `<html lang>`. This layer extends nothing and sets no `experimental`
flag.

## Use it

Add the package to the app and extend it by name:

```json
{
  "dependencies": {
    "@yuri4n/nuxt-base": "workspace:*"
  }
}
```

```ts
export default defineNuxtConfig({
  extends: ['@yuri4n/nuxt-base'],
  site: { name: 'My App' },
})
```

With the git submodule, `workspace:*` resolves through the app's
`pnpm-workspace.yaml` (it lists `vendor/yuri4n.dev/layers/base`). From npm, use
a version range instead. The `extends` line is the same in both cases.

## What it sets

- The `@nuxtjs/robots` module.
- `site.url`, in this order:
  1. `NUXT_SITE_URL`, when it is set.
  2. `https://` + `VERCEL_PROJECT_PRODUCTION_URL` (Vercel sets it).
  3. `http://localhost:3000` (local and CI builds).
- `app.head.htmlAttrs.lang`: `'en'`.

## Hooks for apps

- `site.name`: set it in the app.
- `site.indexable`: set it to `false` to block crawlers (for example on a
  preview deploy).
- `robots`: the options of `@nuxtjs/robots`.
- `app.head.htmlAttrs.lang`: override it in the app. An i18n app sets it with
  `useLocaleHead()` from `@nuxtjs/i18n`.

The layer reads only two environment variables: `NUXT_SITE_URL` and
`VERCEL_PROJECT_PRODUCTION_URL`. Put `NUXT_SITE_URL` in `.env.example` (name
only) when an app needs it.

## Typed routes

Typed routes are an app choice. This layer does not set them:

- Core typed routes: set `experimental.typedPages: true` in the app. The flag is
  part of the Nuxt 5 flag set, so decide it per app.
- `nuxt-typed-router`: use it when the app needs its i18n route helpers.
