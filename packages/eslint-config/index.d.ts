import type { OptionsConfig, TypedFlatConfigItem } from '@antfu/eslint-config'
import type antfu from '@antfu/eslint-config'

// A type alias, not an interface: OptionsConfig.ignores is `string[] | fn` and
// TypedFlatConfigItem.ignores is `string[]`, so an interface that extends both
// is error TS2320. antfu's own signature omits 'files' | 'ignores' for this
// reason.
export type Yuri4nOptions = OptionsConfig
  & Omit<TypedFlatConfigItem, 'files' | 'ignores'>
  & {
    /** Line length for style/max-len, wrap and Prettier. Default 80. */
    maxLen?: number
    /** Prettier owns .vue files. Default true. */
    vuePrettier?: boolean
    /** Allow node:test in test files. Default false. */
    nodeTest?: boolean
    /** svg and xml formatters. Needs @prettier/plugin-xml. Default false. */
    xml?: boolean
  }

export default function yuri4n(
  options?: Yuri4nOptions,
  ...userConfigs: Parameters<typeof antfu>[1][]
): ReturnType<typeof antfu>
