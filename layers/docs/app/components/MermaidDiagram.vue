<!--
  Draws one mermaid diagram in the browser, with a zoom lightbox.

  - The mermaid library is large, so it loads lazily (dynamic import) and
    only on pages that hold a diagram. Until the SVG is ready (on the
    server, and when the source has an error) the raw source shows.
  - Colors and the font come from the CSS tokens of the site at draw time
    (--ui-primary, --ui-bg-elevated, --ui-border-accented, --ui-text,
    --font-mono), because mermaid writes them into the SVG. A change of the
    color mode draws the diagram again.
  - A click on the figure opens a full-screen overlay: the mouse wheel
    zooms, a drag pans, Escape or a click on the backdrop closes it.
  - This component adds no caption. A site that wants captions writes them
    in the content, below the figure (see the layer README).
-->
<script setup lang="ts">
const props = defineProps<{ code: string }>()

const svg = ref('')
const colorMode = useColorMode()

// mermaid needs a unique element id for each render, and it scopes the
// <style> of the SVG by that id. useId() is unique per instance on a page.
const renderId = `mmd-${useId().replace(/[^\w-]/g, '-')}`

// mermaid derives its shades with khroma, which reads hex, rgb and hsl but
// not the oklch() values that Tailwind 4 writes. A 1x1 canvas turns any
// color that the browser knows into hex.
function toHex(value: string): string | undefined {
  const color = value.trim()
  if (!color || !CSS.supports('color', color)) return undefined
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return undefined
  context.fillStyle = color
  context.fillRect(0, 0, 1, 1)
  const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`
}

// The theme of the site, read when the diagram is drawn. A token that the
// site does not define is left out, so mermaid keeps its own value.
function themeFromTokens() {
  const style = getComputedStyle(document.documentElement)
  const token = (name: string) => toHex(style.getPropertyValue(name))
  const candidates: Record<string, string | undefined> = {
    primaryColor: token('--ui-bg-elevated'),
    primaryTextColor: token('--ui-text'),
    primaryBorderColor: token('--ui-primary'),
    lineColor: token('--ui-primary'),
    clusterBorder: token('--ui-border-accented'),
  }
  const themeVariables: Record<string, string> = {}
  for (const [key, value] of Object.entries(candidates)) {
    if (value) themeVariables[key] = value
  }
  const font = style.getPropertyValue('--font-mono').trim()
  return { themeVariables, fontFamily: font || 'ui-monospace, monospace' }
}

// A later draw (for example after a fast color-mode toggle) wins; an
// earlier one that ends late does not overwrite it.
let drawCount = 0

async function draw() {
  const current = ++drawCount
  const { default: mermaid } = await import('mermaid')
  // Read the tokens after the color-mode class has changed.
  await nextTick()
  const { themeVariables, fontFamily } = themeFromTokens()
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    // mermaid 12 changed the defaults to the ELK layout and the "neo" look;
    // these two keys keep the look of mermaid 11.
    layout: 'dagre',
    look: 'classic',
    theme: colorMode.value === 'dark' ? 'dark' : 'neutral',
    fontFamily,
    themeVariables,
  })
  try {
    const { svg: rendered } = await mermaid.render(renderId, props.code)
    if (current === drawCount) svg.value = rendered
  } catch (error) {
    console.error('[MermaidDiagram] the diagram cannot render:', error)
    if (current === drawCount) svg.value = ''
  }
}

onMounted(draw)
// Draw again when the visitor flips light/dark: mermaid bakes colors into
// the SVG.
watch(() => colorMode.value, draw, { flush: 'post' })

// Zoom state: one scale factor and one translation vector; a CSS transform
// applies both.
const open = ref(false)
const scale = ref(1)
const tx = ref(0)
const ty = ref(0)

let dragging = false
let moved = false
let lastX = 0
let lastY = 0

function reset() {
  scale.value = 1
  tx.value = 0
  ty.value = 0
}
function openZoom() {
  if (!svg.value) return
  reset()
  open.value = true
}
function close() {
  open.value = false
}
function zoomBy(factor: number) {
  scale.value = Math.min(8, Math.max(0.3, scale.value * factor))
}
function onWheel(e: WheelEvent) {
  zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15)
}
function onDown(e: PointerEvent) {
  dragging = true
  moved = false
  lastX = e.clientX
  lastY = e.clientY
}
function onMove(e: PointerEvent) {
  if (!dragging) return
  moved = true
  tx.value += e.clientX - lastX
  ty.value += e.clientY - lastY
  lastX = e.clientX
  lastY = e.clientY
}
function onUp() {
  dragging = false
}
// A click on the backdrop closes the overlay, but not at the end of a drag.
function onBackdropClick(e: MouseEvent) {
  if (!moved && e.target === e.currentTarget) close()
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}
watch(open, (isOpen) => {
  if (isOpen) window.addEventListener('keydown', onKey)
  else window.removeEventListener('keydown', onKey)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <ClientOnly>
    <!-- The SVG comes from mermaid with securityLevel: strict (sanitized). -->
    <figure
      v-if="svg"
      class="mermaid-figure"
      role="button"
      tabindex="0"
      title="Click to zoom"
      @click="openZoom"
      @keydown.enter="openZoom"
    >
      <div v-html="svg" />
    </figure>
    <pre v-else class="mermaid-figure">{{ code }}</pre>

    <Teleport to="body">
      <div
        v-if="open"
        class="mermaid-zoom"
        role="dialog"
        aria-label="Zoomed diagram"
        @click="onBackdropClick"
        @wheel.prevent="onWheel"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointerleave="onUp"
      >
        <div
          class="mermaid-zoom-canvas"
          :style="{ transform: `translate(${tx}px, ${ty}px) scale(${scale})` }"
          v-html="svg"
        />
        <div class="mermaid-zoom-controls">
          <button type="button" @click.stop="zoomBy(1.25)">+</button>
          <button type="button" @click.stop="zoomBy(1 / 1.25)">−</button>
          <button type="button" @click.stop="reset()">reset</button>
          <button type="button" @click.stop="close()">esc</button>
        </div>
      </div>
    </Teleport>

    <template #fallback>
      <pre class="mermaid-figure">{{ code }}</pre>
    </template>
  </ClientOnly>
</template>
