## What and why

<!-- What does this change do, and why is it needed? -->

## Linked issue

<!-- "Closes #123" or "Refs #123". -->

## How tested

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build` (builds both playgrounds)
- [ ] Style changes: checked in a local production build and preview

## Library checklist

- [ ] The README of each changed layer or package is up to date.
- [ ] A breaking change (for example a hook or token rename) uses `!` in the
      commit type (`feat(ui)!: …`). While the version is `0.x`, it goes into the
      next minor release.
- [ ] No tag moves. A fix after a release is the next patch tag.
- [ ] Apps get the release through Renovate (one grouped PR that moves the
      submodule and the reusable-workflow refs).

## Breaking change

<!-- No, or Yes + the migration steps for apps. -->

No

## Screenshots

<!-- For UI changes: before and after. Delete this section otherwise. -->
