import type { AppLocale, AppTheme } from '../../shared/utils/preferences'
import {
  appLocales,
  appThemes,
  isAppLocale,
  isAppTheme,
} from '../../shared/utils/preferences'

export function useAppPreferences() {
  const { locale, setLocale } = useI18n()
  const colorMode = useColorMode()
  const hydrated = ref(false)

  onMounted(() => {
    hydrated.value = true
  })

  const language = computed(
    () => isAppLocale(locale.value) ? locale.value : 'en',
  )
  // The server cannot read localStorage. Keep the select's first render
  // stable while color-mode's head script applies the actual theme early.
  const theme = computed(() => {
    const value = colorMode.preference
    return hydrated.value && isAppTheme(value) ? value : 'system'
  })

  return {
    language,
    theme,
    hydrated,
    locales: appLocales,
    themes: appThemes,
    setLanguage: (value: AppLocale) => setLocale(value),
    setTheme: (value: AppTheme) => {
      colorMode.preference = value
    },
  }
}
