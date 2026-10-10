// Type check of the public API (run by `tsc -p packages/eslint-config`).
import yuri4n from '../index.js'

export const config = yuri4n(
  {
    ignores: ['x/**'],
    vuePrettier: false,
    nodeTest: true,
    maxLen: 100,
  },
  { rules: { 'no-console': 'off' } },
)

// @ts-expect-error maxLen is a number, not a string.
export const wrongMaxLen = yuri4n({ maxLen: '80' })
