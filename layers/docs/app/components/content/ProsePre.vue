<!--
  A proxy. Nuxt Content renders every code fence through a global component
  named ProsePre. This layer component has priority over the one that
  Nuxt UI registers, so every fence passes here. It takes one language
  (mermaid) and forwards everything else, props untouched, to the original
  Nuxt UI component.

    ```mermaid fence  ->  ProsePre (this proxy)  ->  MermaidDiagram
    any other fence   ->  ProsePre (this proxy)  ->  Nuxt UI Pre.vue

  After a fence renders on the client, the proxy calls the runtime hook
  `docs:linkify-fence` (app/types/docs-hooks.d.ts). An add-on layer listens
  to it, for example @yuri4n/nuxt-docs-exdoc for `elixir` fences.
-->
<script setup lang="ts">
// Internal Nuxt UI API: this runtime path is not a public export, so a
// Nuxt UI minor release can move it. The playground-docs build catches it.
import UProsePre from '@nuxt/ui/runtime/components/prose/Pre.vue'

const props = defineProps<{
  icon?: string
  code?: string
  language?: string
  filename?: string
  highlights?: number[]
  hideHeader?: boolean
  meta?: string
  class?: string
}>()

const route = useRoute()
const nuxtApp = useNuxtApp()
const wrap = useTemplateRef<HTMLDivElement>('wrap')

onMounted(async () => {
  const language = props.language
  if (!language || !wrap.value) return
  const el = wrap.value.querySelector('pre code')
  if (!(el instanceof HTMLElement)) return
  await nuxtApp.callHook('docs:linkify-fence', {
    el,
    language,
    path: route.path,
  })
})
</script>

<template>
  <MermaidDiagram
    v-if="props.language === 'mermaid'"
    :code="props.code ?? ''"
  />
  <div v-else ref="wrap" class="contents">
    <UProsePre v-bind="props">
      <slot />
    </UProsePre>
  </div>
</template>
