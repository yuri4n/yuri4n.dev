<template>
  <UApp>
    <header
      class="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2"
    >
      <NuxtLink :to="$localePath('/')" class="font-semibold"
        >yuri4n.dev playground</NuxtLink
      >
      <AppPreferences />
    </header>
    <UMain>
      <NuxtPage />
    </UMain>
  </UApp>
</template>
