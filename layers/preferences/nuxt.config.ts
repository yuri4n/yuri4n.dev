export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n', '@nuxtjs/color-mode'],
  i18n: {
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    // i18n resolves these files relative to each layer's i18n/ directory.
    // Absolute langDir paths are not portable to a production deployment.
    langDir: 'locales',
    locales: [
      { code: 'en', language: 'en', name: 'English', file: 'en.json' },
      { code: 'es', language: 'es', name: 'Español', file: 'es.json' },
      {
        code: 'pt-BR',
        language: 'pt-BR',
        name: 'Português (Brasil)',
        file: 'pt-BR.json',
      },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'app-locale',
      redirectOn: 'root',
      fallbackLocale: 'en',
    },
  },
  colorMode: {
    preference: 'system',
    fallback: 'light',
    classSuffix: '',
    storage: 'localStorage',
    storageKey: 'app-color-mode',
  },
})
