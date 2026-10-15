export const appLocales = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'pt-BR', name: 'Português (Brasil)' },
] as const

export type AppLocale = (typeof appLocales)[number]['code']

export const appThemes = ['system', 'light', 'dark'] as const
export type AppTheme = (typeof appThemes)[number]

export function isAppLocale(value: string): value is AppLocale {
  return appLocales.some(locale => locale.code === value)
}

export function isAppTheme(value: string): value is AppTheme {
  return value === 'system' || value === 'light' || value === 'dark'
}
