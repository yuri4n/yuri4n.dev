<script setup lang="ts">
import { isAppLocale, isAppTheme } from '../../shared/utils/preferences'

const { t } = useI18n()
const { language, theme, hydrated, locales, themes, setLanguage, setTheme } =
  useAppPreferences()

async function changeLanguage(event: Event) {
  if (
    event.target instanceof HTMLSelectElement &&
    isAppLocale(event.target.value)
  ) {
    await setLanguage(event.target.value)
  }
}

function changeTheme(event: Event) {
  if (
    event.target instanceof HTMLSelectElement &&
    isAppTheme(event.target.value)
  ) {
    setTheme(event.target.value)
  }
}
</script>

<template>
  <div class="app-preferences flex flex-wrap items-center gap-3">
    <label
      class="preference-field flex items-center gap-2 text-sm text-muted-foreground"
    >
      <span>{{ t('preference.language') }}</span>
      <select
        :value="language"
        class="preference-select min-h-9 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        @change="changeLanguage"
      >
        <option
          v-for="option in locales"
          :key="option.code"
          :value="option.code"
          :lang="option.code"
        >
          {{ option.name }}
        </option>
      </select>
    </label>
    <label
      class="preference-field flex items-center gap-2 text-sm text-muted-foreground"
    >
      <span>{{ t('preference.appearance') }}</span>
      <select
        :value="theme"
        :disabled="!hydrated"
        class="preference-select min-h-9 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        @change="changeTheme"
      >
        <option v-for="option in themes" :key="option" :value="option">
          {{ t(`preference.${option}`) }}
        </option>
      </select>
    </label>
  </div>
</template>
