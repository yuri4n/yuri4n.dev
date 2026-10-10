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
mise trust && mise install   # mise refuses the mise.toml of a new clone until you trust it
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

CI (`.github/workflows/ci.yml`) has two jobs: `ci` (the reusable
`nuxt-ci.yml`: lint, type check, test, build of `playground`) and `docs` (the
reusable `docs-ci.yml` on `playground-docs`: the build with a dummy Vercel
OIDC token, the `llms.txt` files and the Docus assistant check).

## Use the library in an app

The owner's `nuxt-template` repository (private) is already wired. These
steps are for an app that does not come from it.

### Add the submodule (once)

In the app repository root:

```sh
git submodule add https://github.com/yuri4n/yuri4n.dev.git vendor/yuri4n.dev
git -C vendor/yuri4n.dev checkout v0.1.0
git config -f .gitmodules submodule.vendor/yuri4n.dev.branch v0.1.0
git add .gitmodules vendor/yuri4n.dev
```

The library is public, so the HTTPS URL works for every app, for Vercel and
for CI, with no token. `branch = v0.1.0` in `.gitmodules` lets Renovate move
the submodule from tag to tag.

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
mise trust && mise install
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
```

Each workflow checks out the app with `github.token`, then the library at the
commit of the app's gitlink. The library is public, so `github.token` can read
it, and any repository can call these workflows. The secret
`SUBMODULES_TOKEN` is optional: only a private copy of the library needs it.
Pass secrets by name, not with `secrets: inherit`. When `library-path` is set
but the app has no gitlink there, the job stops with "is not a git
submodule". Each job stops after `timeout-minutes`.

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
| `timeout-minutes`    | `30`                | limit of each job                                        |

Secrets: `SUBMODULES_TOKEN` (optional). When the e2e job fails, it uploads
`playwright-report/` and `test-results/` (traces).

### `docs-ci.yml`

Build a Docus site, check the files for agents, and check that the Docus AI
assistant is off. The build gets a dummy `VERCEL_OIDC_TOKEN`; the job fails
when the runtime config says `enabled: true`, or when it cannot find the flag.

| Input                | Default                  | Use                                              |
| -------------------- | ------------------------ | ------------------------------------------------ |
| `working-directory`  | `docs`                   | site root inside the repository                  |
| `install-directory`  | `''`                     | where `pnpm install` runs; empty = the site root |
| `node-version`       | `'24'`                   | Node major                                       |
| `library-path`       | `''`                     | for example `vendor/yuri4n.dev`                  |
| `library-repository` | `yuri4n/yuri4n.dev`      | repository of the library                        |
| `run-tests`          | `false`                  | run `pnpm test` first                            |
| `build-command`      | `pnpm run build`         | `pnpm generate` for a static site                |
| `nitro-preset`       | `''`                     | `vercel_static` for a static site                |
| `output-dir`         | `.output/public`         | `.vercel/output/static` for a static site        |
| `check-files`        | `llms.txt llms-full.txt` | files that must exist in `output-dir`            |
| `assistant-check`    | `true`                   | build with a dummy OIDC token and check the flag |
| `timeout-minutes`    | `45`                     | limit of the job                                 |

Secrets: `SUBMODULES_TOKEN` (optional).

### `vercel-deploy.yml`

`vercel pull`, `vercel build` and `vercel deploy --prebuilt`: the
alternative publisher of an app (see [Deploy rule](#deploy-rule)).

| Input                | Default             | Use                             |
| -------------------- | ------------------- | ------------------------------- |
| `node-version`       | `'24'`              | Node major                      |
| `working-directory`  | `.`                 | app root inside the repository  |
| `library-path`       | `''`                | for example `vendor/yuri4n.dev` |
| `library-repository` | `yuri4n/yuri4n.dev` | repository of the library       |
| `environment`        | `production`        | `production` or `preview`       |
| `timeout-minutes`    | `30`                | limit of the job                |

Secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (required),
`SUBMODULES_TOKEN` (optional). The app turns the job on with the repository
variable `DEPLOY_FROM_CI=true`.

The workflow runs the app's own `vercel` CLI (`pnpm exec vercel`). Add it once
in the app, at an exact version: `pnpm add -D -E -w vercel@<version>` (`-w`
because the app root is a pnpm workspace root). Then the app's lockfile, its
pnpm supply-chain settings and Renovate cover the CLI, which runs with the
Vercel token. The job stops with a clear message when the app has no
`node_modules/.bin/vercel` (it does not use a global `vercel` of the runner).

### Deploy rule

Work gets to production through a pull request. CI is the proof. Exactly one
machine publishes each app, and it builds the same thing as the proof:

- Default: the Vercel Git integration publishes. Vercel clones the public
  library submodule over HTTPS. The app's `vercel.json` has no `git` key, and
  `DEPLOY_FROM_CI` stays unset.
- Alternative: the `vercel-deploy.yml` job publishes. The owner adds the
  `vercel` CLI to the app (see above), the secrets `VERCEL_TOKEN`,
  `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`, the variable `DEPLOY_FROM_CI=true`,
  and `"git": { "deploymentEnabled": false }` in the app's `vercel.json`.

Never turn on both. Agents never create or handle tokens.

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
- holds TypeScript below 7, holds pnpm majors, and holds Node and
  `@types/node` below 25 (owner rule: Node 24);
- pins `docus` exactly, gives it its own PR ("docus") and never automerges
  it;
- groups the submodule and the `uses: yuri4n/yuri4n.dev/...@<tag>` refs into
  one PR named "yuri4n.dev library", with no release-age wait (git submodules
  have no release timestamps, so the preset's 25-hour wait would hold the
  submodule forever).

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

## Security

Report a security problem privately, not in a public issue: see
[.github/SECURITY.md](.github/SECURITY.md). The shared `yuri4n/.github`
repository with the default community files of the account is not published
yet, so this repository has its own security policy.

## License

No license yet. The owner decides.
