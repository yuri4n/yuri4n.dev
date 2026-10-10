# @yuri4n/eslint-config

The one ESLint preset of the yuri4n.dev apps. It wraps
[`@antfu/eslint-config`](https://github.com/antfu/eslint-config) 9 for
ESLint 10 and adds the owner's rules:

- **Zero casts.** `ts/consistent-type-assertions` (`assertionStyle: 'never'`)
  and `ts/no-non-null-assertion` in script code. In `.vue` templates,
  `vue/no-restricted-syntax` reports `as` casts and `!` assertions. `as const`
  stays allowed.
- **Prettier owns `.vue` files** (default). It runs as the `prettier/prettier`
  rule, so one `eslint --fix` formats and lints. `antfu/if-newline` is off in
  `.vue`, so the two never fight.
- **80 columns.** `style/max-len` (warn), `@seahax/eslint-plugin-wrap` and the
  Prettier print width use the same `maxLen`.
- **Formatters.** CSS, HTML, Markdown and GraphQL go through Prettier. SVG and
  XML are opt-in.
- **Console.** `no-console` warns (except `console.warn` and `console.error`).
  It is off in `**/bin/**` and `**/scripts/**`, because CLIs print.
- **One template root only in pages.** Layouts and `*.server.vue` may have
  several roots.
- **pnpm workspace.** In `pnpm-workspace.yaml`, the preset enforces only
  `trustPolicy: no-downgrade`. antfu also asks for `shellEmulator` and
  `minimumReleaseAgeExcludePrune`; the yuri4n.dev apps do not use them.

The package is plain ESM JavaScript with a `.d.ts` file, so ESLint loads it
without a TypeScript loader.

## Use in a Nuxt app

```ts
// eslint.config.ts
import yuri4n from '@yuri4n/eslint-config'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(yuri4n())
```

The app registers `@nuxt/eslint` with `eslint: { config: { standalone: false } }`
in `nuxt.config.ts`. Its `pnpm-workspace.yaml` forces one copy of
`eslint-flat-config-utils`, so `withNuxt()` and `antfu()` compose:

```yaml
overrides:
  eslint-flat-config-utils: ^3.2.0
```

## Options

`yuri4n(options?, ...userConfigs)` returns the antfu composer (awaitable). It
accepts every antfu option and these:

- `maxLen` (number, default `80`): the line length for `style/max-len`, wrap
  and Prettier.
- `vuePrettier` (boolean, default `true`): Prettier owns `.vue` files. Set
  `false` to let antfu stylistic format `.vue` too.
- `nodeTest` (boolean, default `false`): allow `node:test` in
  `**/test/**/*.test.{ts,mts,mjs}`. It turns off `test/no-import-node-test` and
  `test/consistent-test-it`. Without it, `eslint --fix` rewrites the
  `node:test` import to `vitest`.
- `xml` (boolean, default `false`): format `.svg` and `.xml` files. The app
  must add `@prettier/plugin-xml` to its devDependencies.

The `typescript.overrides` of the caller are merged after the zero-cast rules,
so an app can change them on purpose. The preset changes
`pnpm/yaml-enforce-settings` with `overrideRules()` after all configs are
resolved; to change that rule, call `.overrideRules()` again on the result.

## Checks

```sh
node --test packages/eslint-config/test/factory.test.mjs
tsc -p packages/eslint-config
```

`test/factory.test.mjs` resolves the configs and checks the rules above.
`test/usage.ts` checks the option types.
