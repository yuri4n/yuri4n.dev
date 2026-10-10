---
title: Content check
description: A Markdown page that the content layer renders.
---

# Content check

This page checks two rules of `@yuri4n/nuxt-content`.

## Shiki themes

The code block below has token colors in light and dark mode. Toggle the color
mode to see both themes.

```ts
export function greet(name: string): string {
  return `Hello, ${name}!`
}
```

## Classes in Markdown

The next span uses a class that no other file of the playground uses:
[content classes]{.decoration-wavy .underline}. The production CSS has that
class only because `app/assets/css/main.css` adds an `@source` line for
`content/`.
