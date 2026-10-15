import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { appLocales, appThemes } from '../shared/utils/preferences.ts'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

test('all locales have complete preference labels', async () => {
  const required = ['language', 'appearance', ...appThemes].sort()
  for (const { code } of appLocales) {
    const url = new URL(`../i18n/locales/${code}.json`, import.meta.url)
    const messages: unknown = JSON.parse(await readFile(url, 'utf8'))
    assert.ok(isObject(messages), `${code}: message object`)
    assert.ok(isObject(messages.preference), `${code}: preference labels`)
    assert.deepEqual(Object.keys(messages.preference).sort(), required, code)
    for (const [key, value] of Object.entries(messages.preference)) {
      assert.ok(typeof value === 'string' && value.trim(), `${code}: ${key}`)
    }
  }
})
