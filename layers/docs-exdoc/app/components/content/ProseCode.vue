<!--
  A proxy, like ProsePre of @yuri4n/nuxt-docs. Nuxt Content renders every
  INLINE code span through a global component named ProseCode; this layer
  component has priority over the Nuxt UI one. When the chip text names a
  module, type, function or repository path that the resolver knows
  (app/assets/api-manifest.json and the `exdoc` app config), the chip
  becomes a link. Everything else is forwarded untouched.

    `scope: :year`   ->  ProseCode (this proxy)  ->  Nuxt UI Code.vue
    `Enum.map/2`     ->  ProseCode  ->  NuxtLink(Nuxt UI Code.vue)
-->
<script setup lang="ts">
// Internal Nuxt UI API: this runtime path is not a public export, so a
// Nuxt UI minor release can move it. The playground-docs build catches it.
import UProseCode from '@nuxt/ui/runtime/components/prose/Code.vue'

// Every attribute (lang, color, class, ui) goes to the Nuxt UI component in
// both branches, untouched and with its own types, so this proxy declares
// no props.
defineOptions({ inheritAttrs: false })

const slots = useSlots()
const route = useRoute()
const { resolveApiRef } = useApiLinks()

// Inline code holds exactly one text child, so the chip text is the
// concatenation of the string children of the slot.
const text = computed(() =>
  (slots.default?.() ?? [])
    .map((n) => (typeof n.children === 'string' ? n.children : ''))
    .join(''),
)

const target = computed(() => resolveApiRef(text.value, route.path))
// External targets (GitHub, hexdocs) open in a new tab; site routes stay
// inside the router.
const external = computed(() => target.value?.startsWith('http') ?? false)
</script>

<template>
  <NuxtLink
    v-if="target"
    :to="target"
    class="code-ref"
    :target="external ? '_blank' : undefined"
    :rel="external ? 'noopener' : undefined"
  >
    <UProseCode v-bind="$attrs"><slot /></UProseCode>
  </NuxtLink>
  <UProseCode v-else v-bind="$attrs"><slot /></UProseCode>
</template>
