---
title: yuri4n.dev
description: Shared Nuxt 4 layers for the apps of yuri4n.
---

# yuri4n.dev

Shared Nuxt 4 layers. An app mounts the library as a git submodule at
`vendor/yuri4n.dev`, lists the layer packages in its `pnpm-workspace.yaml`,
and extends them by package name.

## Packages

- `@yuri4n/nuxt-base`: robots, the site URL and the default `lang`.
- `@yuri4n/nuxt-ui`: Nuxt UI 4, Tailwind 4 and the token contract.
- `@yuri4n/nuxt-content`: Nuxt Content 3 on `node:sqlite`, with Shiki themes
  that follow the color mode.
- `@yuri4n/nuxt-docs`: the base of a Docus documentation site, such as this
  one.
- `@yuri4n/nuxt-docs-exdoc`: links for Elixir and ExDoc references, and the
  `ingest-exdoc` CLI.
- `@yuri4n/eslint-config`: the one ESLint preset.

Start with [the layers](/guide/layers).
