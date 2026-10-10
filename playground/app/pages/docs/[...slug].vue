<script setup lang="ts">
const route = useRoute()

// The key follows the path, so each docs page has its own payload entry.
const { data: page } = await useAsyncData(
  () => `docs:${route.path}`,
  () => queryCollection('docs').path(route.path).first(),
)

if (!page.value) {
  throw createError({ status: 404, statusText: 'Page not found', fatal: true })
}

useSeoMeta({
  title: page.value.title,
  description: page.value.description,
})
</script>

<template>
  <UContainer class="py-10">
    <ContentRenderer v-if="page" :value="page" />
  </UContainer>
</template>
