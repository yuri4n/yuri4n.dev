<script setup lang="ts">
const route = useRoute()
const contentPath = computed(() => {
  const slug = route.params.slug
  const path = Array.isArray(slug) ? slug.join('/') : slug
  return path ? `/docs/${path}` : '/docs'
})

// The key follows the path, so each docs page has its own payload entry.
const { data: page } = await useAsyncData(
  () => `docs:${contentPath.value}`,
  () => queryCollection('docs').path(contentPath.value).first(),
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
