# Shared app preferences

## Context

The owner requested English, Spanish and Brazilian Portuguese, plus a
system default and explicit light/dark choice, as a standard across apps.
This is an explicit request to share the controls and preference behavior.

## Options

- Duplicate i18n configuration and selectors in each app.
- Add a neutral opt-in layer with app-owned messages and styles.

## Decision

Add `@yuri4n/nuxt-preferences`. Use Nuxt i18n for localized routes, message
merging and browser-language detection, and Nuxt color-mode for an early
head script, persistent selection and live system synchronization. Share
only preference labels and controls. Each app owns the rest of its copy.

## Reason

One configuration gives the apps the same locale codes, URL behavior,
keyboard controls and theme choices without sharing branding or content.
Native selects also avoid another popover or focus-management dependency.

## Baseline

The repository was clean on `main` at the start. Work is isolated on
`feat/app-preferences`. The baseline install used the frozen lockfile.
Baseline lint, type check, 64 tests and both playground builds passed.
Lint reported 40 existing warnings and no errors.

## Validation

Lint has the same 40 existing warnings and no errors. Type checking passes;
the existing docs wrapper ignores the same 10 upstream Docus error lines
as the baseline. All 65 tests pass, including preference-label completeness.
Both production builds and the final frozen-lockfile install pass.

The production playground was checked in Chromium at desktop and mobile
widths, in both color modes. The checks covered browser-language detection,
all three localized routes, merged app and layer messages, server-rendered
and hydrated `html lang`, cookie persistence, explicit theme persistence,
live system theme changes, and returning from an explicit theme to system.
Localized docs navigation also passed. There were no hydration warnings,
page errors or horizontal overflow at 390 pixels.

The first browser check found that `useLocaleHead` in a plugin captured
English before route detection. The plugin now reads the reactive locale
at head-render time. A new production build passed the same checks.
