// Transform ExDoc's Markdown output (`mix docs` writes doc/*.md) into Nuxt
// Content pages and the anchor manifest of the resolver. This is an
// adapter: it converts one fixed format into another and holds no knowledge
// of the Elixir code itself.
//
//   doc/Acme.Point.md                 content/3.api/acme-point.md
//   ┌──────────────────────┐         ┌────────────────────────────────┐
//   │ # `Acme.Point`       │         │ ---                            │
//   │ moduledoc ...        │  ────▶  │ title / description            │
//   │ # `t`      (@type)   │         │ ---                            │
//   │ # `new`    (@spec)   │         │ moduledoc ... ## Types ## Fns  │
//   └──────────────────────┘         └────────────────────────────────┘
//
// ExDoc gives every symbol an h1 and loses arities. The page rebuilds a
// hierarchy: the moduledoc keeps its h2 sections, entries become h3 under
// "## Types" or "## Functions", and the headings of an entry body shift
// down by 2 so they nest.
//
// Every parser here works line by line with a fence mask (CommonMark:
// ``` or ~~~, up to three spaces of indent). Lines inside fences are never
// headings. Indented code blocks need no mask: their lines never start at
// column zero.
//
// Pure functions only: the CLI (bin/ingest-exdoc.mjs) reads and writes the
// files. Node built-ins only, no dependencies.

/** "Acme.Intervals" -> "acme-intervals". Dots would fight the router. */
export function moduleSlug(moduleName) {
  return moduleName.toLowerCase().replaceAll('.', '-')
}

/**
 * For each line: true when it is inside a code fence (or is a fence line).
 * Follows CommonMark: ``` or ~~~, closed by the same character, at least as
 * long.
 *
 * @param {string[]} lines
 * @returns {boolean[]} one flag per line
 */
export function fenceMask(lines) {
  const mask = []
  let open = null
  for (const line of lines) {
    const m = /^ {0,3}(`{3,}|~{3,})/.exec(line)
    const marker = m ? m[1] : ''
    const rest = m ? line.slice(m[0].length) : ''
    if (open) {
      mask.push(true)
      const closes = marker[0] === open.char && marker.length >= open.len
      if (closes && !rest.trim())
        open = null
    }
    else if (marker && !(marker[0] === '`' && rest.includes('`'))) {
      open = { char: marker[0], len: marker.length }
      mask.push(true)
    }
    else {
      mask.push(false)
    }
  }
  return mask
}

const EXDOC_FOOTER = /\[api-reference\.md\]\(api-reference\.md\)/

/**
 * Drop the footer that ExDoc writes at the end of every module file:
 * a `---` rule and "*Consult [api-reference.md](api-reference.md) for
 * complete listing*". The link points at a page that the site does not
 * build (a 404 on every API page).
 */
export function dropExdocFooter(raw) {
  const lines = raw.split('\n')
  let end = lines.length
  while (end > 0 && lines[end - 1].trim() === '')
    end--
  if (end === 0 || !EXDOC_FOOTER.test(lines[end - 1]))
    return raw
  end--
  while (end > 0 && lines[end - 1].trim() === '')
    end--
  if (end > 0 && lines[end - 1].trim() === '---')
    end--
  return `${lines.slice(0, end).join('\n').trimEnd()}\n`
}

const H1 = /^# `(.+)`\s*$/
const SOURCE_LINK = /^\[🔗\]\((\S+)\)\s*/

/**
 * Split a raw ExDoc Markdown file into
 * { moduleName, sourceUrl, moduleDoc, entries: [{ name, body }] }.
 * An entry starts at each h1 of the form  # `name`  OUTSIDE fences.
 */
export function parseModuleDoc(raw) {
  const lines = dropExdocFooter(raw).split('\n')
  const mask = fenceMask(lines)
  const sections = []
  let current = null
  for (const [i, line] of lines.entries()) {
    const m = mask[i] ? null : H1.exec(line)
    if (m) {
      current = { name: m[1], lines: [] }
      sections.push(current)
    }
    else if (current) {
      current.lines.push(line)
    }
  }
  const [head, ...rest] = sections
  if (!head)
    throw new Error('no module heading (# `Module.Name`) outside a fence')
  // ExDoc writes the module source link as the first moduledoc line, in the
  // form "[🔗](https://.../file.ex#L7)". It becomes data (sourceUrl), not
  // the first paragraph of the page.
  const rawDoc = head.lines.join('\n').trim()
  const src = SOURCE_LINK.exec(rawDoc)
  return {
    moduleName: head.name,
    sourceUrl: src ? src[1] : null,
    moduleDoc: src ? rawDoc.slice(src[0].length).trim() : rawDoc,
    entries: rest.map(s => ({
      name: s.name,
      body: s.lines.join('\n').trim(),
    })),
  }
}

/**
 * An entry is a type when its first elixir fence declares one. ExDoc always
 * puts the @type/@opaque declaration in the first fence.
 */
export function classifyEntry(entry) {
  const fence = /```elixir\n([^\n]*)/.exec(entry.body)
  return fence && /^@(?:typep?|opaque)\b/.test(fence[1]) ? 'type' : 'function'
}

/** Demote every heading by `delta` levels; fenced lines stay untouched. */
export function shiftHeadings(body, delta) {
  const lines = body.split('\n')
  const mask = fenceMask(lines)
  return lines
    .map((line, i) => {
      const m = mask[i] ? null : /^(#{1,4})(\s.*)$/.exec(line)
      return m ? '#'.repeat(Math.min(m[1].length + delta, 6)) + m[2] : line
    })
    .join('\n')
}

/**
 * The first paragraph, unwrapped to one line, backticks stripped. It
 * becomes the plain-text description in the front matter.
 */
export function extractSummary(moduleDoc) {
  const firstParagraph = moduleDoc.split(/\n\s*\n/)[0] ?? ''
  return firstParagraph.split('\n').join(' ').replaceAll('`', '').trim()
}

// "## Types" or "## Functions" with one h3 per entry; '' for no entries.
function renderSection(title, list) {
  if (list.length === 0)
    return ''
  const body = list
    .map(e => `### \`${e.name}\`\n\n${shiftHeadings(e.body, 2)}`)
    .join('\n\n')
  return `\n## ${title}\n\n${body}`
}

/**
 * Assemble one Nuxt Content page from a parsed module.
 *
 * @param {{ moduleName: string, sourceUrl: string | null, moduleDoc: string,
 *   entries: { name: string, body: string }[] }} parsed
 * @param {{ stamp?: string | null }} [options] `stamp`: a provenance line
 *   (for example "[AI SLOP]{.ai-slop} ...") at the top of the page. No
 *   default: each site writes its own text.
 */
export function renderPage(parsed, options = {}) {
  const { moduleName, sourceUrl, moduleDoc, entries } = parsed
  const grouped = { type: [], function: [] }
  for (const entry of entries)
    grouped[classifyEntry(entry)].push(entry)

  const frontmatter = [
    '---',
    `title: ${JSON.stringify(moduleName)}`,
    `description: ${JSON.stringify(extractSummary(moduleDoc))}`,
    '---',
  ].join('\n')

  // The lifted source link renders as a small chip under the stamp; the
  // docs layer styles the .source-link class.
  const intro = [
    options.stamp,
    sourceUrl ? `[Source on GitHub ↗](${sourceUrl}){.source-link}` : null,
  ].filter(Boolean)
  const head = intro.length > 0 ? `${intro.join('\n\n')}\n\n` : ''

  const types = renderSection('Types', grouped.type)
  const functions = renderSection('Functions', grouped.function)
  return `${frontmatter}\n\n${head}${moduleDoc}\n${types}${functions}\n`
}

/**
 * The anchor id that the site gives a heading at run time. Nuxt Content
 * uses github-slugger: lowercase, punctuation dropped, spaces become dashes,
 * and a repeated id gets "-1", "-2", ... . This function emulates that at
 * build time, so generated links point at real anchors.
 */
export function computeAnchors(markdown) {
  const seen = new Map()
  const anchors = []
  const lines = markdown.split('\n')
  const mask = fenceMask(lines)
  for (const [i, line] of lines.entries()) {
    const m = mask[i] ? null : /^(#{1,6})\s+(\S.*)$/.exec(line)
    if (!m)
      continue
    const text = m[2].replaceAll('`', '').trim()
    const base = text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}_\- ]+/gu, '')
      .replace(/\s+/g, '-')
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    const id = n === 0 ? base : `${base}-${n}`
    anchors.push({ level: m[1].length, text, id })
  }
  return anchors
}

const SECTION_GROUPS = new Map([
  ['Types', 'types'],
  ['Functions', 'functions'],
])

/**
 * One manifest row per module: the page slug plus the anchor of every type
 * and every function heading. The resolver (app/utils/api-links.ts) reads
 * the JSON to turn code references such as `Acme.Span.t()` into links.
 */
export function moduleManifest(parsed) {
  const manifest = {
    slug: moduleSlug(parsed.moduleName),
    types: {},
    functions: {},
  }
  let group = null
  for (const a of computeAnchors(renderPage(parsed))) {
    if (a.level === 2) {
      group = SECTION_GROUPS.get(a.text) ?? null
    }
    else if (a.level === 3 && group) {
      // Two arities of one name share the first anchor.
      const target = manifest[group]
      if (!Object.hasOwn(target, a.text))
        target[a.text] = a.id
    }
  }
  return manifest
}

const DEFAULT_INDEX_DESCRIPTION
  = 'All public modules, generated from the Elixir docstrings by mix docs.'
const DEFAULT_INDEX_INTRO = [
  'To change this reference, edit the `@doc` and `@moduledoc` attributes',
  'in `lib/`, run `mix docs`, and run `ingest-exdoc` again.',
].join('\n')

/**
 * The API landing page: one table row per module.
 *
 * @param {{ moduleName: string, summary: string }[]} modules
 * @param {{ apiBase?: string, title?: string, description?: string,
 *   intro?: string, stamp?: string | null, caption?: string | null }}
 *   [options] `caption`: an italic line below the table (the figure caption
 *   of the site's attribution rules). No default.
 */
export function renderIndex(modules, options = {}) {
  const {
    apiBase = '/api',
    title = 'API Reference',
    description = DEFAULT_INDEX_DESCRIPTION,
    intro = DEFAULT_INDEX_INTRO,
    stamp = null,
    caption = null,
  } = options
  const base = apiBase.replace(/\/+$/, '')
  const rows = modules.map((m) => {
    const href = `${base}/${moduleSlug(m.moduleName)}`
    return `| [${m.moduleName}](${href}) | ${m.summary} |`
  })
  return [
    '---',
    `title: ${JSON.stringify(title)}`,
    `description: ${JSON.stringify(description)}`,
    '---',
    '',
    ...(stamp ? [stamp, ''] : []),
    intro,
    '',
    '| Module | Summary |',
    '| --- | --- |',
    ...rows,
    '',
    ...(caption ? [caption, ''] : []),
  ].join('\n')
}

/**
 * Rewrite the start of a source URL (for example after a repository move:
 * github.com/owner/shop/blob/main/ -> github.com/owner/monorepo/blob/main/
 * apps/shop/). The first rule whose `from` matches wins.
 *
 * @param {string | null} url
 * @param {{ from: string, to: string }[]} rules
 */
export function rewriteSource(url, rules) {
  if (!url)
    return url
  const rule = rules.find(r => url.startsWith(r.from))
  return rule ? rule.to + url.slice(rule.from.length) : url
}

/**
 * The full configuration with its defaults. `config` is the default export
 * of exdoc.config.mjs.
 *
 *   {
 *     exdocDir: '../doc',                         // the output of mix docs
 *     manifestPath: 'app/assets/api-manifest.json',
 *     stamp: null,                                // no default text
 *     navTitle: 'API',
 *     navIcon: 'i-lucide-braces',
 *     projects: [{
 *       pattern: /^MyLib(?:\..+)?\.md$/,            // ExDoc file names
 *       outDir: 'content/3.api',
 *       apiBase: '/api',                          // = app.config exdoc.apiBase
 *       indexTitle, indexDescription, indexIntro, indexCaption,
 *       sourceRewrite: { from, to } | [{ from, to }],
 *     }],
 *   }
 */
export function resolveConfig(config = {}) {
  const projects = Array.isArray(config.projects) ? config.projects : []
  if (projects.length === 0)
    throw new Error('exdoc.config.mjs: `projects` needs at least one entry')
  return {
    exdocDir: config.exdocDir ?? '../doc',
    manifestPath: config.manifestPath ?? 'app/assets/api-manifest.json',
    stamp: config.stamp ?? null,
    navTitle: config.navTitle ?? 'API',
    navIcon: config.navIcon ?? 'i-lucide-braces',
    projects: projects.map((project, i) => {
      if (!project || !project.pattern)
        throw new Error(`exdoc.config.mjs: projects[${i}] has no \`pattern\``)
      const rewrite = project.sourceRewrite
      return {
        pattern: project.pattern instanceof RegExp
          ? project.pattern
          : new RegExp(project.pattern),
        outDir: project.outDir ?? 'content/3.api',
        apiBase: project.apiBase ?? '/api',
        indexTitle: project.indexTitle,
        indexDescription: project.indexDescription,
        indexIntro: project.indexIntro,
        indexCaption: project.indexCaption ?? null,
        sourceRewrite: rewrite ? [rewrite].flat() : [],
      }
    }),
  }
}

/**
 * Everything one project produces, from the ExDoc files it matches.
 *
 * @param {ReturnType<typeof resolveConfig>['projects'][number]} project
 * @param {{ name: string, raw: string }[]} files every file of exdocDir
 * @param {{ stamp?: string | null, navTitle?: string, navIcon?: string }}
 *   [options]
 * @returns {{ pages: { file: string, content: string }[],
 *   manifest: Record<string, ReturnType<typeof moduleManifest>> }}
 *   `file` is relative to `project.outDir`.
 */
export function ingestProject(project, files, options = {}) {
  const {
    stamp = null,
    navTitle = 'API',
    navIcon = 'i-lucide-braces',
  } = options
  const pages = []
  const manifest = {}
  const modules = []
  const matching = files
    .filter(f => project.pattern.test(f.name))
    .sort((a, b) => a.name.localeCompare(b.name))
  for (const file of matching) {
    const parsed = parseModuleDoc(file.raw)
    parsed.sourceUrl = rewriteSource(parsed.sourceUrl, project.sourceRewrite)
    modules.push({
      moduleName: parsed.moduleName,
      summary: extractSummary(parsed.moduleDoc),
    })
    manifest[parsed.moduleName] = moduleManifest(parsed)
    pages.push({
      file: `${moduleSlug(parsed.moduleName)}.md`,
      content: renderPage(parsed, { stamp }),
    })
  }
  modules.sort((a, b) => a.moduleName.localeCompare(b.moduleName))
  pages.push({
    file: 'index.md',
    content: renderIndex(modules, {
      apiBase: project.apiBase,
      title: project.indexTitle,
      description: project.indexDescription,
      intro: project.indexIntro,
      stamp,
      caption: project.indexCaption,
    }),
  })
  pages.push({
    file: '.navigation.yml',
    content: `title: ${JSON.stringify(navTitle)}\nicon: ${navIcon}\n`,
  })
  return { pages, manifest }
}
