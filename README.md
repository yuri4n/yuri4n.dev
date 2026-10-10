# yuri4n.dev

Shared Nuxt 4 layers, an ESLint preset, reusable GitHub workflows and a
Renovate preset for the apps of [yuri4n](https://github.com/yuri4n).

The layers ship source code, with no build step. An app mounts this repository
as a git submodule and adds the packages that it needs to its pnpm workspace.
The packages are ready for npm too, so the `extends` line of an app does not
change if they move to a registry later.

Rules for people and agents: [AGENTS.md](AGENTS.md).

## Packages

| Package                   | Path                     | What it gives                                                                     |
| ------------------------- | ------------------------ | --------------------------------------------------------------------------------- |
| `@yuri4n/nuxt-base`       | `layers/base`            | robots.txt, the site URL, the default `<html lang>`                               |
| `@yuri4n/nuxt-ui`         | `layers/ui`              | Nuxt UI 4 (it owns Tailwind 4), the token contract, the Vercel fix for icons      |
| `@yuri4n/nuxt-content`    | `layers/content`         | Nuxt Content 3 on `node:sqlite`, Shiki themes that follow the color mode (opt-in) |
| `@yuri4n/nuxt-docs`       | `layers/docs`            | Docus 5.13 base: Mermaid, docs CSS, `/llms-full.txt`, the AI assistant off        |
| `@yuri4n/nuxt-docs-exdoc` | `layers/docs-exdoc`      | Elixir and ExDoc links and the `ingest-exdoc` CLI (extends `@yuri4n/nuxt-docs`)   |
| `@yuri4n/eslint-config`   | `packages/eslint-config` | The ESLint preset (antfu 9, zero casts, Prettier for `.vue`)                      |

The layers do not extend each other. An app lists the layers that it wants.
Only `@yuri4n/nuxt-docs-exdoc` extends `@yuri4n/nuxt-docs`, because it cannot
work alone. Each package has its own README with its hooks.

Also in this repository:

- `.github/workflows/`: the reusable workflows `nuxt-ci.yml`, `docs-ci.yml`
  and `vercel-deploy.yml` (see [Use the reusable workflows](#use-the-reusable-workflows)).
- `renovate/default.json`: the Renovate preset of every app.
- `playground/`: a test app that extends `base`, `ui` and `content`.
- `playground-docs/`: a Docus test site that extends the docs layers. Docus
  cannot share an app with the ui layer, so the docs layers have their own
  playground.

## Develop

Requirements: [mise](https://mise.jdx.dev) (it installs Node 24 and turns on
corepack, which gives the pinned pnpm).

```sh
mise install
pnpm install
pnpm dev        # playground (app layers)
pnpm dev:docs   # playground-docs (docs layers)
```

Run `unset PORT` first if your shell sets `PORT` (Vite HMR binds that port
otherwise).

Checks (CI runs the same scripts):

```sh
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

`pnpm build` builds both playgrounds. `pnpm typecheck` checks the ESLint
package types and both playgrounds. The tests use `node:test`.

## Use the library in an app

The owner's `nuxt-template` repository (private) is already wired. These
steps are for an app that does not come from it.

### Add the submodule (once)

In the app repository root (its `origin` must be a `github.com/yuri4n`
repository, because the URL is relative):

```sh
git submodule add ../yuri4n.dev.git vendor/yuri4n.dev
git -C vendor/yuri4n.dev checkout v0.1.0
git config -f .gitmodules submodule.vendor/yuri4n.dev.branch v0.1.0
git add .gitmodules vendor/yuri4n.dev
```

`branch = v0.1.0` in `.gitmodules` lets Renovate move the submodule from tag to
tag. An app outside the `yuri4n` account writes the absolute URL
`https://github.com/yuri4n/yuri4n.dev.git`.

Then add the packages that the app uses:

1. `pnpm-workspace.yaml`: list the package paths. pnpm does not inherit the
   settings of this repository, so also copy its supply-chain settings,
   `allowBuilds` and the `eslint-flat-config-utils` override.

   ```yaml
   packages:
     - vendor/yuri4n.dev/layers/base
     - vendor/yuri4n.dev/layers/ui
     - vendor/yuri4n.dev/packages/eslint-config
   ```

2. `package.json`: add `"@yuri4n/nuxt-base": "workspace:*"` and the others.
3. `nuxt.config.ts`: `extends: ['@yuri4n/nuxt-ui', '@yuri4n/nuxt-base']`.
4. `app/assets/css/main.css`, first line:
   `@import '@yuri4n/nuxt-ui/app/assets/css/base.css';`
5. Run `pnpm install` in the app root. Never run pnpm inside `vendor/`.

### Clone an app

```sh
git clone --recurse-submodules <app-url>   # or clone, then: git submodule update --init --recursive
mise install
cp .env.example .env.local
pnpm install
```

An empty `vendor/yuri4n.dev` makes pnpm fail with "no matching package in
workspace". The fix is `git submodule update --init --recursive`.

### Move an app to a new release

```sh
git -C vendor/yuri4n.dev fetch --tags
git -C vendor/yuri4n.dev checkout v0.2.0
git config -f .gitmodules submodule.vendor/yuri4n.dev.branch v0.2.0
pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add .gitmodules vendor/yuri4n.dev pnpm-lock.yaml
git commit -m "chore: yuri4n.dev v0.2.0"
```

Also move the `uses: yuri4n/yuri4n.dev/.github/workflows/<file>@<tag>` refs to
the same tag. Renovate does both in one pull request (see
[Renovate](#renovate)).

- A tag never moves. A fix after a release is the next patch tag.
- Never commit changes inside `vendor/yuri4n.dev` from the app. The submodule
  HEAD is detached on a tag.
- The app lockfile pins the versions of the app. The library lockfile does not
  apply to the app. The CI of each repository checks its own lockfile.

### Change the library while you work on an app

1. Change and check the library in its own clone (`pnpm dev`, then the four
   checks).
2. Try the change in the app before a release:
   `git -C vendor/yuri4n.dev fetch <library-clone> <branch>`, then
   `git -C vendor/yuri4n.dev checkout FETCH_HEAD`, `pnpm install` and the app
   checks. Do not commit the app in this state.
3. Merge and tag the library, push the tag, then move each app to the new
   release.

### Other ways to consume

- **giget remote `extends`**:
  `extends: [['github:yuri4n/yuri4n.dev/layers/ui#v0.1.0', { install: true }]]`.
  For a throwaway app only: the layer dependencies install into
  `node_modules/.c12`, where ESLint, vue-tsc and the app cannot see them.
  `@yuri4n/nuxt-docs-exdoc` does not work this way.
- **npm or GitHub Packages**: the packages need no build, so
  `pnpm -r --filter "./layers/*" --filter "./packages/*" publish` works. The
  app then installs them and deletes the workspace entries. The `extends` line
  and the CSS import line stay the same.

## Use the reusable workflows

The workflows are defined once here (`on: workflow_call`). An app calls them
with a tag, never with `@main`:

```yaml
jobs:
  ci:
    uses: yuri4n/yuri4n.dev/.github/workflows/nuxt-ci.yml@v0.1.0
    with:
      library-path: vendor/yuri4n.dev
      nitro-preset: vercel
      e2e: true
    secrets:
      SUBMODULES_TOKEN: ${{ secrets.SUBMODULES_TOKEN }}
```

Pass secrets by name, not with `secrets: inherit`. Each workflow checks out the
app with `github.token`, then the library at the commit of the app's gitlink
with `SUBMODULES_TOKEN`. When `library-path` is set but the app has no gitlink
there, the job stops with "is not a git submodule".

Renovate moves these refs to the next tag in the same pull request as the
submodule (see [Renovate](#renovate)), so the app and its CI use one release.

### `nuxt-ci.yml`

Install, lint, type check, test and build; optional Playwright tests.

| Input                | Default             | Use                                                      |
| -------------------- | ------------------- | -------------------------------------------------------- |
| `node-version`       | `'24'`              | Node major                                               |
| `working-directory`  | `.`                 | app root inside the repository                           |
| `library-path`       | `''`                | for example `vendor/yuri4n.dev`; empty = no library      |
| `library-repository` | `yuri4n/yuri4n.dev` | repository of the library                                |
| `lint`               | `true`              | run `pnpm run lint`                                      |
| `typecheck`          | `true`              | run `pnpm run typecheck`                                 |
| `test`               | `true`              | run `pnpm run test`                                      |
| `build`              | `true`              | run the build command                                    |
| `build-command`      | `pnpm run build`    | build command                                            |
| `nitro-preset`       | `''`                | the deploy's preset (`vercel`), so the proof is the same |
| `e2e`                | `false`             | second job: Chromium + `pnpm run test:e2e`               |

Secrets: `SUBMODULES_TOKEN` (optional).

### `docs-ci.yml`

Build a Docus site, check the files for agents, and check that the Docus AI
assistant is off. The build gets a dummy `VERCEL_OIDC_TOKEN`; the job fails
when the runtime config says `enabled: true`, or when it cannot find the flag.

| Input                | Default                  | Use                                              |
| -------------------- | ------------------------ | ------------------------------------------------ |
| `working-directory`  | `docs`                   | site root inside the repository                  |
| `node-version`       | `'24'`                   | Node major                                       |
| `library-path`       | `''`                     | for example `vendor/yuri4n.dev`                  |
| `library-repository` | `yuri4n/yuri4n.dev`      | repository of the library                        |
| `run-tests`          | `false`                  | run `pnpm test` first                            |
| `build-command`      | `pnpm run build`         | `pnpm generate` for a static site                |
| `nitro-preset`       | `''`                     | `vercel_static` for a static site                |
| `output-dir`         | `.output/public`         | `.vercel/output/static` for a static site        |
| `check-files`        | `llms.txt llms-full.txt` | files that must exist in `output-dir`            |
| `assistant-check`    | `true`                   | build with a dummy OIDC token and check the flag |

Secrets: `SUBMODULES_TOKEN` (optional).

### `vercel-deploy.yml`

`vercel pull`, `vercel build` and `vercel deploy --prebuilt`. It is the one
publisher of an app while this library is private.

| Input                | Default             | Use                             |
| -------------------- | ------------------- | ------------------------------- |
| `node-version`       | `'24'`              | Node major                      |
| `working-directory`  | `.`                 | app root inside the repository  |
| `library-path`       | `''`                | for example `vendor/yuri4n.dev` |
| `library-repository` | `yuri4n/yuri4n.dev` | repository of the library       |
| `environment`        | `production`        | `production` or `preview`       |
| `vercel-version`     | `63.1.0`            | exact `vercel` CLI version      |

Secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (required),
`SUBMODULES_TOKEN` (optional). The app turns the job on with the repository
variable `DEPLOY_FROM_CI=true`.

### Owner steps for a private library

The owner does these steps. Agents never create or handle tokens.

1. Let the apps call the workflows of this private repository:

   ```sh
   gh api -X PUT repos/yuri4n/yuri4n.dev/actions/permissions/access -f access_level=user
   ```

2. In each app, add the secret `SUBMODULES_TOKEN`: a fine-grained PAT with
   Contents read on `yuri4n.dev` only. It does not need access to the app.
3. For a CI deploy: add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`,
   set `DEPLOY_FROM_CI=true`, and keep `"git": { "deploymentEnabled": false }`
   in the app's `vercel.json`.

### Deploy rule

Work gets to production through a pull request. CI is the proof. Exactly one
machine publishes each app, and it builds the same thing as the proof:

- Private library (default): the `vercel-deploy.yml` job publishes, and the
  Vercel Git integration is off.
- Public library: the Vercel Git integration publishes. Delete the `git` key of
  `vercel.json` and leave `DEPLOY_FROM_CI` unset.

Never turn on both.

## Renovate

This repository uses `renovate.json`, which extends the shared preset
`renovate/default.json`. An app extends it too:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["github>yuri4n/yuri4n.dev//renovate/default"],
  "git-submodules": { "enabled": true },
  "cloneSubmodules": true
}
```

The preset:

- extends `github>nuxt/renovate-config-nuxt`, with weekly lockfile maintenance
  and `pnpmDedupe`;
- labels every PR `dependencies` (release notes group them);
- holds TypeScript below 7 and holds pnpm majors;
- pins `docus` exactly and never automerges it;
- groups the submodule and the `uses: yuri4n/yuri4n.dev/...@<tag>` refs into
  one PR named "yuri4n.dev library".

A private library needs the Renovate app installed on it too (or a `hostRules`
token from the owner).

The submodule PR moves only the gitlink. When a release changes a layer's
dependencies, the PR's `pnpm-lock.yaml` is stale and CI fails at
`pnpm install --frozen-lockfile`. Then check out the branch, run
`git submodule update --init` and `pnpm install`, commit `pnpm-lock.yaml` and
push.

## Release

1. Change, then run `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
2. Merge to `main` through a pull request.
3. Tag the commit `vX.Y.Z` and push the tag. A breaking change (a hook or token
   rename) is a major release; while the version is `0.x`, it is a minor
   release.
4. A tag never moves. A fix is the next patch tag.
5. Apps move through Renovate, or by the steps of
   [Move an app to a new release](#move-an-app-to-a-new-release).

Release notes come from `.github/release.yml` (labels `breaking`,
`enhancement`, `bug`, `dependencies`).

## License

No license yet. The owner decides.
