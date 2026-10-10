import antfu from '@antfu/eslint-config'
import wrap from '@seahax/eslint-plugin-wrap'

// Owner rule (zero casts) for <template> expressions.
// `ts/consistent-type-assertions` sees only the script AST, so template casts
// need vue/no-restricted-syntax. The first three entries repeat antfu's own
// value for this rule (antfu 9 dist/index.mjs, vue config).
// `as const` stays allowed.
const AS_CONST = [
  '[typeAnnotation.type="TSTypeReference"]',
  '[typeAnnotation.typeName.name="const"]',
].join('')

const VUE_RESTRICTED_SYNTAX = [
  'error',
  'DebuggerStatement',
  'LabeledStatement',
  'WithStatement',
  {
    selector: `TSAsExpression:not(${AS_CONST})`,
    message: 'No `as` casts in templates (owner rule): narrow in <script>.',
  },
  {
    selector: 'TSNonNullExpression',
    message: 'No `!` non-null assertions in templates (owner rule).',
  },
]

// pnpm-workspace.yaml: antfu 9.5 also demands `shellEmulator: true` and
// `minimumReleaseAgeExcludePrune: true`. This preset did not adopt them, so it
// enforces only the trust policy. The override changes the rule only where
// antfu registered it (a workspace with a pnpm-workspace.yaml).
const PNPM_WORKSPACE_SETTINGS = { trustPolicy: 'no-downgrade' }

/**
 * The one ESLint preset of the yuri4n.dev apps.
 *
 * Apps: `export default withNuxt(yuri4n())` (withNuxt from
 * ./.nuxt/eslint.config.mjs, with `eslint.config.standalone: false` in
 * nuxt.config).
 *
 * @param {import('./index.d.ts').Yuri4nOptions} [options] antfu options plus
 *   `maxLen`, `vuePrettier`, `nodeTest` and `xml`.
 * @param {...any} userConfigs more flat configs, appended last.
 * @returns {ReturnType<typeof antfu>} the antfu composer (awaitable).
 */
export default function yuri4n(options = {}, ...userConfigs) {
  const {
    maxLen = 80,
    vuePrettier = true,
    nodeTest = false,
    xml = false,
    typescript,
    ...antfuOptions
  } = options
  const typescriptOptions = typescript && typeof typescript === 'object'
    ? typescript
    : {}

  return antfu(
    {
      vue: true,
      stylistic: true,
      typescript: {
        ...typescriptOptions,
        overrides: {
          'ts/consistent-type-assertions': [
            'error',
            { assertionStyle: 'never' },
          ],
          'ts/no-non-null-assertion': 'error',
          ...typescriptOptions.overrides,
        },
      },
      formatters: {
        css: true,
        html: true,
        markdown: true,
        graphql: true,
        svg: xml,
        xml,
        prettierOptions: { printWidth: maxLen },
      },
      ...antfuOptions,
    },
    {
      // Only pages need one template root (page transitions cannot animate a
      // fragment). @nuxt/eslint also enforces it on layouts and *.server.vue.
      name: 'yuri4n/vue/template-root',
      files: ['**/layouts/**/*.vue', '**/*.server.vue'],
      rules: { 'vue/no-multiple-template-root': 'off' },
    },
    {
      // `no-console` warns. An app that turns it off also needs a build step
      // that removes console calls.
      name: 'yuri4n/rules',
      rules: {
        'style/max-len': ['warn', { code: maxLen }],
        'no-console': ['warn', { allow: ['warn', 'error'] }],
      },
    },
    {
      // typescript-eslint 8.71.1 bug: its no-unused-vars, which
      // unused-imports/no-unused-vars runs, reports every const and let in a
      // file that espree parses (JS) as "only used as a type"
      // (`!ref.isValueReference`; the next release checks `=== false`).
      // JS files use ESLint's core rule with the same options until then.
      name: 'yuri4n/js/unused-vars',
      files: ['**/*.?([cm])js'],
      ignores: ['**/*.md/**'],
      rules: {
        'unused-imports/no-unused-vars': 'off',
        'no-unused-vars': [
          'error',
          {
            args: 'after-used',
            argsIgnorePattern: '^_',
            ignoreRestSiblings: true,
            vars: 'all',
            varsIgnorePattern: '^_',
          },
        ],
      },
    },
    {
      // CLIs print by design.
      name: 'yuri4n/cli/console',
      files: ['**/bin/**', '**/scripts/**'],
      rules: { 'no-console': 'off' },
    },
    {
      name: 'yuri4n/vue/no-template-casts',
      files: ['**/*.vue'],
      rules: { 'vue/no-restricted-syntax': VUE_RESTRICTED_SYNTAX },
    },
    // node:test files: antfu rewrites `node:test` imports to `vitest` and
    // renames test() to it().
    nodeTest
      ? {
          name: 'yuri4n/node-test',
          files: ['**/test/**/*.test.{ts,mts,mjs}'],
          rules: {
            'test/no-import-node-test': 'off',
            'test/consistent-test-it': 'off',
          },
        }
      : [],
    [{ ...wrap.config({ maxLen }), name: 'yuri4n/wrap' }],
    vuePrettier ? loadVuePrettier(maxLen) : [],
    ...userConfigs,
  ).overrideRules({
    'pnpm/yaml-enforce-settings': [
      'error',
      { settings: PNPM_WORKSPACE_SETTINGS },
    ],
  })
}

/**
 * Prettier owns .vue files (owner decision, 2026-07-16). It runs as one
 * ESLint rule, so `eslint --fix` formats and lints .vue in one pass.
 * eslint-config-prettier first turns off the ESLint formatting rules for
 * .vue, so nothing fights Prettier.
 *
 * @param {number} maxLen the Prettier print width.
 */
async function loadVuePrettier(maxLen) {
  const [prettierConfig, prettierPlugin] = await Promise.all([
    import('eslint-config-prettier').then(module => module.default),
    import('eslint-plugin-prettier').then(module => module.default),
  ])

  return [
    {
      files: ['**/*.vue'],
      ...prettierConfig,
      name: 'yuri4n/vue/prettier-disables',
    },
    {
      name: 'yuri4n/vue/prettier',
      files: ['**/*.vue'],
      plugins: { prettier: prettierPlugin },
      rules: {
        // Prettier options live here (no prettier.config file). They mirror
        // antfu's no-semi and single-quote style, so <script> does not churn.
        'prettier/prettier': [
          'error',
          {
            printWidth: maxLen,
            semi: false,
            singleQuote: true,
            vueIndentScriptAndStyle: false,
          },
        ],
        // eslint-config-prettier does not cover these, but Prettier owns them.
        'vue/first-attribute-linebreak': 'off',
        'vue/multiline-html-element-content-newline': 'off',
        // Width tools: Prettier owns the width in .vue.
        'style/max-len': 'off',
        // antfu/if-newline and Prettier fight over a one-line
        // `if (...) return`, so `eslint --fix` never settles. Prettier wins.
        'antfu/if-newline': 'off',
      },
    },
  ]
}
