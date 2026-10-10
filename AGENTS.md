# Agents

These instructions are for AI agents that work in this repository. They use
ASD-STE100 (Simplified Technical English). Keep that style when you edit this
file. The rules in `~/.claude/AGENTS.md` also apply.

## 1. Purpose

This repository is `yuri4n.dev`. It holds the shared Nuxt 4 layers and tools
of the owner's apps. An app mounts this repository as a git submodule at
`vendor/yuri4n.dev`. Later, an app can also install the packages from npm.

The packages:

- `packages/eslint-config`: `@yuri4n/eslint-config`, the one ESLint preset.
- `layers/base`: `@yuri4n/nuxt-base`. Robots, the site URL and `<html lang>`.
- `layers/ui`: `@yuri4n/nuxt-ui`. Nuxt UI 4, Tailwind 4 and the token contract.
- `layers/content`: `@yuri4n/nuxt-content`. Nuxt Content 3 on `node:sqlite`.
- `layers/docs`: `@yuri4n/nuxt-docs`. The Docus base for docs sites.
- `layers/docs-exdoc`: `@yuri4n/nuxt-docs-exdoc`. The Elixir and ExDoc add-on.
- `playground/` and `playground-docs/`: test apps. They are not published.

The commands (run them in the repository root):

- `pnpm dev` starts the playground. `pnpm dev:docs` starts the docs
  playground.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` are the checks.

## 2. The second-use rule

Owner rule (2026-08-08): a thing moves into this library when a second app
needs it.

- Do not add code that only one app uses.
- Infrastructure that every app needs is the only exception: the CSS pipeline,
  deploy fixes, robots and the site URL, lint and CI.
- A utility function, a CSS plugin or a component is never infrastructure. It
  needs two real uses.

## 3. No personal data

- Do not add personal data, CV content, site branding or skins.
- Layers expose hooks: CSS variables, `app.config`, slots and Nuxt runtime
  hooks. Each app sets its own values.

## 4. Layer rules

- Each layer is a package with `"main": "./nuxt.config.ts"`.
- Declare every import in `dependencies`. This repository does not hoist
  packages.
- Use plain semver ranges. Do not use `catalog:`. A consumer workspace does not
  read the catalogs of this repository.
- Resolve paths in `nuxt.config.ts` with `fileURLToPath(import.meta.url)`.
- Do not use `~/` or `@/` for imports inside a layer. These aliases point at
  the consumer app.
- When a layer needs another layer, it extends that layer by package name.

## 5. TypeScript

Owner rule (2026-07-16): zero casts.

- Do not use `as` casts, in `<script>` and in `<template>`. Lint enforces this
  rule. `as const` is permitted.
- Do not use `!` non-null assertions.
- Use these patterns instead: generic overloads with a concrete-union
  implementation, type guards, `Object.assign` for generic merges, and an
  exhaustive `switch` with `satisfies never`.
- When the payload of `useAsyncData` is a union, wrap it in `{ value }`. Then
  `PickFrom` does not change the union.
- In `defineProps`, use literal unions. Do not use conditional types.
  `compiler-sfc` cannot resolve them, and Nuxt dev then shows "IPC connection
  closed". To restart a dead vite-node, run `touch nuxt.config.ts`.
- Read `process` through `import process from 'node:process'`. The lint rule
  `node/prefer-global/process` requires this import.

## 6. CSS

- Use only semantic tokens (`bg-background`, `text-foreground` and the other
  token utilities).
- In scoped styles, use `@reference`. Do not use `@import`.
- Use `@theme static` for variables that code reads at run time.
- Use `@source inline()` for class names that code builds from data.
- Nuxt UI scans only the `app/` folder of each layer. Add a `@source` line for
  each other folder that holds classes (`content/`, `shared/`, `server/`).
- Tailwind 4 removes unused variables only in a production build. Examine each
  Tailwind change in a local production build.

## 7. Icons

- Install `@iconify-json/<set>` for each icon set that you use. If the set is
  missing, SSR gets the icons from the Iconify API, and this can time out on
  Vercel.

## 8. reka-ui

- When a layer needs `reka-ui` directly, pin it to the exact version that
  `@nuxt/ui` pins. A range can install a second copy.

## 9. Dev server

- Run `unset PORT` before `nuxt dev`. If `PORT` is set, Vite HMR binds the app
  port, and the browser gets HTTP 426.

## 10. Release

1. Make the change.
2. Run `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
3. Commit the change.
4. Tag the commit `vX.Y.Z` (semver). A breaking change (for example a hook
   rename or a token rename) increases the major version. While the version is
   `0.x`, it increases the minor version.
5. A tag never moves. A fix after a tag gets the next patch tag.
6. Consumers move their submodule and their reusable-workflow refs to the new
   tag. Renovate opens one pull request for both.

## 11. Large changes

- Ask the owner before a large refactor.
- One composable that a builder function specializes is better than many named
  variants.

## 12. Change discipline

- Record a baseline before you change files: the branch, the uncommitted files
  and the check results.
- Keep uncommitted work that you did not make. Do not commit, stash, discard or
  move it without the owner's yes.
- Use one branch or one worktree for each agent.
- Stage files by name. Do not stage all files with one command.
- Open pull requests as drafts.
- Examine the remote, the repository and the base branch before a push.
- Do not merge and do not force-push without the owner's yes.

## 13. Parallel agents

- Follow `~/.claude/AGENTS.md`: at most 4 agents at the same time, and at most
  2 agents that build, install or test.

## 14. Node

- `mise.toml` pins `node = "24"`. Do not change it to `lts` or `latest`.
- Reasons: `lts` becomes Node 26 in late October 2026. Vercel has no Node 26
  runtime. Nuxt 4.6 needs `^24.15.0` on the Node 24 line.
- The old reason (better-sqlite3 has no Node 26 prebuilds) does not apply here.
  The content layer uses `node:sqlite`.

## 15. Deploy

Owner rule (2026-08-05): CI proves, one machine publishes, and both build the
same thing.

- Work gets to production only through a pull request.
- CI is the proof. CI does not publish on its own.
- Exactly one machine publishes each app. When this library is public, the
  Vercel Git integration publishes. When this library is private, the
  `vercel-deploy.yml` job publishes.
- The publisher runs the same build as the proof.
- Agents never deploy, never push, and never create remote repositories without
  the owner's yes.

## 16. Secrets

- Agents never create, read, print or store tokens or secret values.
- The owner creates `SUBMODULES_TOKEN` (a fine-grained PAT with Contents read
  on `yuri4n.dev` only) and the Vercel secrets.
- For `.env*` files, write only the key names. Never write the values.

## 17. Local planning files

- `HANDOFF.md` and `docs/research/` are git-ignored on purpose. Never commit
  them.
- Never run `git clean -x` in this repository. It deletes ignored files.

## 18. Tests

- Tests use `node:test`. Write explicit `.ts` or `.mts` extensions in imports.
- The lint factory option `nodeTest: true` permits the `node:test` import. The
  root `eslint.config.js` sets this option.
- Never run `eslint --fix` with that option off. The antfu rule then changes
  the import to `vitest`, and this repository does not install Vitest.
