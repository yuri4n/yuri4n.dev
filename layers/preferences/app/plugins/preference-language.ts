export default defineNuxtPlugin({
  name: 'app-preference-language',
  dependsOn: ['i18n:plugin'],
  setup(nuxtApp) {
    // Read the locale when the head is rendered, after route detection.
    // useLocaleHead snapshots too early when called from a server plugin.
    useHead(() => ({
      htmlAttrs: { lang: nuxtApp.$i18n.locale.value, dir: 'ltr' },
    }))
  },
})
