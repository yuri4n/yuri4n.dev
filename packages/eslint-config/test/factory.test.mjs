import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import yuri4n from '../index.js'

const defaults = await yuri4n().toConfigs()
const withNodeTest = await yuri4n({ nodeTest: true }).toConfigs()
const withoutPrettier = await yuri4n({ vuePrettier: false }).toConfigs()
const withPnpm = await yuri4n({ pnpm: true }).toConfigs()

/**
 * The values of one rule in every config that sets it, with that config's
 * `files` (undefined when the config applies to every file).
 *
 * @param {any[]} configs resolved flat configs.
 * @param {string} rule rule name.
 * @returns {{ files: unknown, value: unknown }[]} one entry per config.
 */
function ruleEntries(configs, rule) {
  return configs
    .filter(config => config.rules && Object.hasOwn(config.rules, rule))
    .map(config => ({ files: config.files, value: config.rules[rule] }))
}

/**
 * The value that a rule has in the last config with exactly these `files`.
 *
 * @param {any[]} configs resolved flat configs.
 * @param {string} rule rule name.
 * @param {string[]} files the exact `files` array of the config.
 * @returns {unknown} the rule value, or undefined.
 */
function ruleFor(configs, rule, files) {
  return ruleEntries(configs, rule)
    .filter(entry => JSON.stringify(entry.files) === JSON.stringify(files))
    .at(-1)
    ?.value
}

describe('yuri4n() defaults', () => {
  it('forbids type assertions in script code', () => {
    const values = ruleEntries(defaults, 'ts/consistent-type-assertions')
      .map(entry => entry.value)
    assert.deepEqual(values.at(-1), ['error', { assertionStyle: 'never' }])
  })

  it('forbids non-null assertions in script code', () => {
    const values = ruleEntries(defaults, 'ts/no-non-null-assertion')
      .map(entry => entry.value)
    assert.equal(values.at(-1), 'error')
  })

  it('allows several template roots in layouts and server components', () => {
    const value = ruleFor(defaults, 'vue/no-multiple-template-root', [
      '**/layouts/**/*.vue',
      '**/*.server.vue',
    ])
    assert.equal(value, 'off')
  })

  it('forbids casts and non-null assertions in templates', () => {
    const value = ruleFor(defaults, 'vue/no-restricted-syntax', ['**/*.vue'])
    assert.ok(Array.isArray(value))
    const selectors = value
      .filter(entry => typeof entry === 'object')
      .map(entry => entry.selector)
    assert.ok(selectors.some(selector => selector.startsWith('TSAsExpression')))
    assert.ok(selectors.includes('TSNonNullExpression'))
  })

  it('lets prettier own .vue files without the if-newline loop', () => {
    const prettier = ruleFor(defaults, 'prettier/prettier', ['**/*.vue'])
    assert.ok(Array.isArray(prettier))
    assert.equal(prettier[0], 'error')
    assert.equal(prettier[1].printWidth, 80)
    assert.equal(ruleFor(defaults, 'antfu/if-newline', ['**/*.vue']), 'off')
  })

  it('warns on console calls, except in bin and scripts', () => {
    const everywhere = ruleEntries(defaults, 'no-console')
      .filter(entry => entry.files === undefined)
      .at(-1)
    assert.deepEqual(everywhere?.value, ['warn', { allow: ['warn', 'error'] }])
    const cli = ruleFor(defaults, 'no-console', ['**/bin/**', '**/scripts/**'])
    assert.equal(cli, 'off')
  })

  it('keeps the node:test import rule on', () => {
    const files = ['**/test/**/*.test.{ts,mts,mjs}']
    const value = ruleFor(defaults, 'test/no-import-node-test', files)
    assert.equal(value, undefined)
  })
})

describe('yuri4n() options', () => {
  it('turns off the node:test rules with nodeTest', () => {
    const files = ['**/test/**/*.test.{ts,mts,mjs}']
    const importRule = ruleFor(withNodeTest, 'test/no-import-node-test', files)
    const itRule = ruleFor(withNodeTest, 'test/consistent-test-it', files)
    assert.equal(importRule, 'off')
    assert.equal(itRule, 'off')
  })

  it('drops prettier for .vue with vuePrettier false', () => {
    assert.deepEqual(ruleEntries(withoutPrettier, 'prettier/prettier'), [])
  })

  it('enforces only the trust policy in pnpm-workspace.yaml', () => {
    const value = ruleFor(withPnpm, 'pnpm/yaml-enforce-settings', [
      'pnpm-workspace.yaml',
    ])
    assert.deepEqual(value, [
      'error',
      { settings: { trustPolicy: 'no-downgrade' } },
    ])
  })
})
