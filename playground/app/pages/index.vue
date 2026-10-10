<script setup lang="ts">
// Each class string is written out in full, so Tailwind finds it in this file.
const swatches = [
  { name: 'background', classes: 'bg-background text-foreground' },
  { name: 'card', classes: 'bg-card text-card-foreground' },
  { name: 'primary', classes: 'bg-primary text-primary-foreground' },
  { name: 'secondary', classes: 'bg-secondary text-secondary-foreground' },
  { name: 'muted', classes: 'bg-muted text-muted-foreground' },
  { name: 'accent', classes: 'bg-accent text-accent-foreground' },
]

useSeoMeta({
  title: 'yuri4n.dev playground',
  description: 'Neutral defaults of the @yuri4n/nuxt-ui token contract.',
})
</script>

<template>
  <UContainer class="flex flex-col gap-8 py-10">
    <section class="flex flex-col gap-2">
      <h1 class="font-heading text-2xl font-semibold">Token contract</h1>
      <p class="text-muted-foreground">
        Neutral defaults of @yuri4n/nuxt-ui. An app sets its own values.
      </p>
    </section>

    <ul class="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <li
        v-for="swatch in swatches"
        :key="swatch.name"
        class="rounded-lg border border-border p-4"
        :class="swatch.classes"
      >
        {{ swatch.name }}
      </li>
    </ul>

    <div class="flex flex-wrap items-center gap-4">
      <UButton label="Nuxt UI button" />
      <UButton label="Neutral" color="neutral" variant="outline" />
      <UIcon name="i-lucide-sun" class="size-6" />
      <NuxtLink to="/docs" class="font-medium text-primary">
        Content page
      </NuxtLink>
    </div>
  </UContainer>
</template>
