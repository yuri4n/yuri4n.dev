// The pure core of code-reference resolution for Elixir docs: turn a
// reference such as "Acme.Span.t()", "Point.compose/2", "ground/3" or
// "lib/acme/point.ex" into a link target.
//
// createApiLinks(modules, options) is a FACTORY: it closes over the data and
// returns the resolvers. This is dependency injection: the site shell
// (composables/use-api-links.ts) injects the real manifest and the
// app.config options; the tests (test/api-links.test.mts) inject a fixture.
// Every option has a default, so a site with no options gets the built-in
// behavior.
//
//       use-api-links.ts (shell)              api-links.ts (this file)
//       manifest + app.config  ──inject──▶   createApiLinks(...)
//                                               ├ resolveApiRef
//                                               ├ resolvePathRef
//                                               ├ findRefRanges
//                                               └ linkifyCodeElement
//
// The resolution ladder, in order. The order is part of the design:
//
//   1. Another project's package (options.packageDocs). The boundary is
//      structural: a name under a foreign root belongs to that project BY
//      RULE, so a stale row in the generated manifest can never claim it.
//   2. Own modules: the exact name, then an Elixir-style alias (the tail
//      segments of a module chain: "Point" for "Acme.Point").
//   3. The Elixir stdlib. It comes AFTER own modules, because an alias
//      shadows a stdlib root exactly as `alias` does in Elixir source.
//   4. A bare entry ("ground/3"): the current page's module first, then the
//      one module that owns the name, if exactly one does.
//   5. A repository path ("lib/acme/point.ex") -> GitHub.
//
// Nuxt auto-imports the exports of app/utils, so every exported name here
// starts with "Api" or names the resolver, to stay clear of DOM globals.

export interface ApiModule {
  slug: string
  types: Record<string, string>
  functions: Record<string, string>
}

export type ApiModules = Record<string, ApiModule>

/**
 * Where another project publishes its reference. 'hexdocs' is the format of
 * hexdocs.pm ("Acme.Span.html#of/1"); 'site' is the format of a docs site
 * like this one ("<base><apiBase>/acme-span#of").
 */
export interface ApiPackageDocs {
  style: 'hexdocs' | 'site'
  base: string
  /** The route prefix of the API pages of a 'site'. Default '/api'. */
  apiBase?: string
}

/** The repository that owns a path, and the folder of the path in it. */
export interface ApiSource {
  /** "owner/name". */
  repo: string
  /** A folder inside the repository: '' or a value that ends with '/'. */
  prefix: string
}

/** One data rule of the app.config list `exdoc.sources`. */
export interface ApiSourceRule {
  /**
   * A prefix that starts with "/" matches the route of the current page
   * ("/shop"); any other prefix matches the start of the repository path
   * ("lib/acme").
   */
  prefix: string
  /** "owner/name". */
  repo: string
  /** The folder of the paths inside `repo` ("apps/shop/"). Default ''. */
  pathPrefix?: string
}

/** The standard library: a member reference ("Enum.map/2") links here. */
export interface ApiStdlib {
  roots: Iterable<string>
  base: string
}

export interface ApiLinksOptions {
  /** The route prefix of the generated API pages. Default '/api'. */
  apiBase?: string
  /** The branch or tag of the GitHub source links. Default 'main'. */
  ref?: string
  /** The default repository ("owner/name") of repository paths. */
  repo?: string
  /** Rules that map a page or a path to a repository. First match wins. */
  sources?: readonly ApiSourceRule[]
  /** Replaces `repo` and `sources`: the source of one path on one page. */
  sourceFor?: (path: string, page: string) => ApiSource | null
  /** Foreign module roots and where their docs live: { Acme: {...} }. */
  packageDocs?: Record<string, ApiPackageDocs>
  /** The known top folders of repository paths. Empty: the built-in list. */
  pathTop?: readonly string[]
  /** Root files that link without a top folder (no `g` flag). */
  rootFiles?: RegExp
  /** The Elixir standard library. Default: Elixir on hexdocs.pm. */
  stdlib?: ApiStdlib
}

/** One linkable reference inside a fence text. */
export interface ApiRefRange {
  start: number
  end: number
  href: string
}

/** A text node of a fence and its offset in the joined fence text. */
interface TextSpan {
  node: Text
  start: number
}

// A qualified reference: a module chain, then an optional entry with an
// optional "()" or "/arity" suffix. Example: Acme.Span.of/1
const QUALIFIED
  = /^([A-Z]\w*(?:\.[A-Z]\w*)*)(?:\.([a-z_]\w*[!?]?)(\(\)|\/\d+)?)?$/
// A bare entry reference. The suffix is required; a bare word would
// over-match prose.
const LOCAL = /^([a-z_]\w*[!?]?)(\(\)|\/\d+)$/

// The fence scanners: the same three shapes, found inside running text.
const QUAL_SCAN = /[A-Z]\w*(?:\.[A-Z]\w*)*(?:\.([a-z_]\w*[!?]?)(\(\)|\/\d+)?)?/g
const LOCAL_SCAN = /(?:^|[^.\w:%])([a-z_]\w*[!?]?)(\(\)|\/\d+)/g
const PATH_SCAN = /(?:^|[^\w./-])((?:[\w.-]+\/)+[\w.{}*,-]+\/?)/g

// The Elixir standard library. A member reference ("Enum.map/2") links to
// hexdocs.pm/elixir. A BARE root ("Task") stays plain text: many stdlib
// roots are ordinary English words, and the tail of a project alias is
// often one of them (`alias Shop.Task`: then "Task" means the project's
// module). A bare foreign-package root DOES link (see packageUrl): a package
// root is an owned name that nothing else carries.
const STDLIB_ROOTS = [
  'Access',
  'Agent',
  'Application',
  'Atom',
  'Base',
  'Bitwise',
  'Calendar',
  'Code',
  'Config',
  'Date',
  'DateTime',
  'Duration',
  'DynamicSupervisor',
  'Enum',
  'Exception',
  'File',
  'Float',
  'Function',
  'GenServer',
  'IO',
  'Inspect',
  'Integer',
  'Kernel',
  'Keyword',
  'List',
  'Macro',
  'Map',
  'MapSet',
  'Module',
  'NaiveDateTime',
  'Node',
  'OptionParser',
  'Path',
  'Port',
  'Process',
  'Protocol',
  'Range',
  'Record',
  'Regex',
  'Registry',
  'Stream',
  'String',
  'StringIO',
  'Supervisor',
  'System',
  'Task',
  'Time',
  'Tuple',
  'URI',
  'Version',
]

const DEFAULT_STDLIB: ApiStdlib = {
  roots: STDLIB_ROOTS,
  base: 'https://hexdocs.pm/elixir',
}

// Repository paths. The first segment must be a known top folder, so that
// prose such as "and/or" never becomes a link.
const DEFAULT_PATH_TOP = [
  'lib',
  'docs',
  'test',
  'config',
  'priv',
  'scripts',
  '.github',
]
const DEFAULT_ROOT_FILES
  = /^(?:mix\.(?:exs|lock)|(?:README|AGENTS|CHANGELOG)\.md|LICENSE|mise\.toml)$/

/** "Acme.Intervals" -> "acme-intervals", the ingest page slug. */
export function moduleSlug(moduleName: string): string {
  return moduleName.toLowerCase().replaceAll('.', '-')
}

// The own value of a record key. A plain `record[key]` would also return
// Object.prototype members for names such as "constructor".
function ownValue<T>(record: Record<string, T>, key: string): T | undefined {
  return Object.hasOwn(record, key) ? record[key] : undefined
}

// "Acme.Span.Arc" -> "Acme".
function rootOf(moduleName: string): string {
  const dot = moduleName.indexOf('.')
  return dot < 0 ? moduleName : moduleName.slice(0, dot)
}

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? trimTrailingSlash(value.slice(0, -1)) : value
}

// Inline chips sometimes hold a struct literal: %Acme.Point{...}. The
// module name inside it is still a valid reference, so cut it out.
function normalize(text: string): string {
  let t = text.trim()
  if (t.startsWith('%'))
    t = t.slice(1)
  const brace = t.indexOf('{')
  if (brace >= 0)
    t = t.slice(0, brace)
  return t
}

// The hexdocs.pm anchor format: functions "#name/arity", types
// "#t:name/0".
function hexdocsUrl(
  base: string,
  mod: string,
  fun?: string,
  suffix?: string,
): string {
  const page = `${base}/${mod}.html`
  if (!fun)
    return page
  if (suffix === '()')
    return `${page}#t:${fun}/0`
  if (suffix?.startsWith('/'))
    return `${page}#${fun}${suffix}`
  return page
}

// The default `sourceFor`: the first rule that matches, else `repo`. With
// no rule and no repo, a repository path does not link.
function sourceForRules(repo: string, rules: readonly ApiSourceRule[]) {
  return (path: string, page: string): ApiSource | null => {
    for (const rule of rules) {
      const subject = rule.prefix.startsWith('/') ? page : path
      if (!rule.prefix || !subject.startsWith(rule.prefix))
        continue
      const folder = rule.pathPrefix ?? ''
      return {
        repo: rule.repo,
        prefix: folder && !folder.endsWith('/') ? `${folder}/` : folder,
      }
    }
    return repo ? { repo, prefix: '' } : null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSourceRule(value: unknown): value is ApiSourceRule {
  return isRecord(value)
    && typeof value.prefix === 'string'
    && typeof value.repo === 'string'
    && (value.pathPrefix === undefined || typeof value.pathPrefix === 'string')
}

function isPackageDocs(value: unknown): value is ApiPackageDocs {
  return isRecord(value)
    && (value.style === 'hexdocs' || value.style === 'site')
    && typeof value.base === 'string'
    && (value.apiBase === undefined || typeof value.apiBase === 'string')
}

function isPackageEntry(
  entry: [string, unknown],
): entry is [string, ApiPackageDocs] {
  return isPackageDocs(entry[1])
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

/**
 * Read the `exdoc` block of app.config. Nuxt merges the app.config files
 * as plain data, so every field is checked here instead of trusted; a field
 * with the wrong shape is left out (its default applies).
 */
export function apiLinksOptionsFromConfig(config: unknown): ApiLinksOptions {
  if (!isRecord(config))
    return {}
  const options: ApiLinksOptions = {}
  if (typeof config.apiBase === 'string')
    options.apiBase = config.apiBase
  if (typeof config.ref === 'string' && config.ref)
    options.ref = config.ref
  if (typeof config.repo === 'string' && config.repo)
    options.repo = config.repo
  if (Array.isArray(config.sources))
    options.sources = config.sources.filter(isSourceRule)
  if (isRecord(config.packageDocs)) {
    const entries = Object.entries(config.packageDocs).filter(isPackageEntry)
    options.packageDocs = Object.fromEntries(entries)
  }
  if (Array.isArray(config.pathTop))
    options.pathTop = config.pathTop.filter(isString)
  return options
}

/** Build the resolvers for one site: its manifest plus its options. */
export function createApiLinks(
  allModules: ApiModules,
  options: ApiLinksOptions = {},
) {
  const apiBase = trimTrailingSlash(options.apiBase ?? '/api')
  const ref = options.ref || 'main'
  const packageDocs = options.packageDocs ?? {}
  const pathTop = new Set(
    options.pathTop?.length ? options.pathTop : DEFAULT_PATH_TOP,
  )
  const rootFiles = options.rootFiles ?? DEFAULT_ROOT_FILES
  const stdlib = options.stdlib ?? DEFAULT_STDLIB
  const stdlibRoots = new Set(stdlib.roots)
  const stdlibBase = trimTrailingSlash(stdlib.base)
  const sourceFor = options.sourceFor
    ?? sourceForRules(options.repo ?? '', options.sources ?? [])

  // The boundary is enforced HERE, at construction: a manifest row under a
  // foreign package root is stale generated data (the ingest no longer
  // writes it), and keeping it would leak local links to pages this site
  // does not build. Foreign roots contribute nothing: not a page, not an
  // alias, not an owner.
  const ownEntries = Object.entries(allModules).filter(
    ([name]) => !Object.hasOwn(packageDocs, rootOf(name)),
  )
  const modules: ApiModules = Object.fromEntries(ownEntries)
  const bySlug = new Map(Object.values(modules).map(m => [m.slug, m]))

  // The alias index: every proper dotted tail of a module name points to
  // it: "Point" and "Point.ComposeError" for "Acme.Point.ComposeError".
  // A tail that two modules share is ambiguous; null marks it dead.
  const aliases = new Map<string, string | null>()
  for (const name of Object.keys(modules)) {
    const parts = name.split('.')
    for (let i = 1; i < parts.length; i++) {
      const tail = parts.slice(i).join('.')
      aliases.set(tail, aliases.has(tail) ? null : name)
    }
  }

  // The owner index: an entry name maps to the ONE module that has it. A
  // name that many modules have (t, new!) is ambiguous; null marks it.
  const owners = new Map<string, ApiModule | null>()
  for (const mod of Object.values(modules)) {
    const names = [...Object.keys(mod.types), ...Object.keys(mod.functions)]
    for (const name of names) {
      const prev = owners.get(name)
      if (prev === undefined)
        owners.set(name, mod)
      else if (prev !== mod)
        owners.set(name, null)
    }
  }

  function pageOf(mod: ApiModule): string {
    return `${apiBase}/${mod.slug}`
  }

  // The slug of the current page when it is an API page of this site.
  function slugOfPage(path: string): string | undefined {
    const head = `${apiBase}/`
    if (!path.startsWith(head))
      return undefined
    const slug = path.slice(head.length)
    return /^[\w-]+$/.test(slug) ? slug : undefined
  }

  function findModule(name: string): ApiModule | undefined {
    const direct = ownValue(modules, name)
    if (direct)
      return direct
    const target = aliases.get(name)
    return target ? ownValue(modules, target) : undefined
  }

  // "name()" reads as a type, "name/2" and a bare ".name" read as a
  // function. When the preferred kind is absent, the other kind still
  // answers: the reader lands on the right page either way.
  function anchorFor(
    mod: ApiModule,
    name: string,
    prefer: 'type' | 'function',
  ): string | null {
    const type = ownValue(mod.types, name)
    const fun = ownValue(mod.functions, name)
    return (prefer === 'type' ? type ?? fun : fun ?? type) ?? null
  }

  // A module under a foreign package root (packageDocs) links to that
  // project's published reference. Anchors differ by style:
  //   hexdocs  functions "#name/arity", types "#t:name/arity"
  //   site     "#name" without punctuation: an APPROXIMATION of the heading
  //            slug; a punctuated duplicate ("compose!" next to "compose")
  //            lands on the first of the pair. Only the owning site knows
  //            its exact ids, and this stays inside the repository boundary
  //            instead of reading them across it.
  function packageUrl(
    mod: string,
    fun?: string,
    suffix?: string,
  ): string | null {
    const docs = ownValue(packageDocs, rootOf(mod))
    if (!docs)
      return null
    if (docs.style === 'hexdocs')
      return hexdocsUrl(docs.base, mod, fun, suffix)
    const siteApiBase = trimTrailingSlash(docs.apiBase ?? '/api')
    const page = `${docs.base}${siteApiBase}/${moduleSlug(mod)}`
    return fun ? `${page}#${fun.replace(/[!?]$/, '')}` : page
  }

  function stdlibUrl(
    mod: string,
    fun?: string,
    suffix?: string,
  ): string | null {
    if (!stdlibRoots.has(rootOf(mod)))
      return null
    if (!fun && !mod.includes('.'))
      return null
    return hexdocsUrl(stdlibBase, mod, fun, suffix)
  }

  function githubUrl(
    path: string,
    page: string,
    kind: 'blob' | 'tree',
    target: string,
  ): string | null {
    const source = sourceFor(path, page)
    if (!source || !source.repo)
      return null
    const where = `${source.repo}/${kind}/${ref}`
    return `https://github.com/${where}/${source.prefix}${target}`
  }

  /** The GitHub target of a repository path, or null. */
  function resolvePathRef(text: string, currentPath = ''): string | null {
    const trimmed = text.trim()
    const t = trimmed.replace(/\/$/, '')
    if (rootFiles.test(t))
      return githubUrl(t, currentPath, 'blob', t)
    // "lib/": one segment with a closing slash is the folder itself.
    if (/^[\w.-]+\/$/.test(trimmed)) {
      return pathTop.has(t)
        ? githubUrl(t, currentPath, 'tree', t)
        : null
    }
    if (!/^[\w.-]+(?:\/[\w.{}*,-]+)+$/.test(t))
      return null
    let segments = t.split('/')
    // "/3" is an arity, not a folder; numeric segments mean "not a path".
    if (segments.some(s => /^\d+$/.test(s)))
      return null
    if (!pathTop.has(segments[0] ?? ''))
      return null
    const last = segments.at(-1) ?? ''
    let kind: 'blob' | 'tree' = /\.[a-z]+$/i.test(last) ? 'blob' : 'tree'
    // A glob ("docs/adr-*.md") links to the folder that holds the matches.
    const glob = segments.findIndex(s => /[*{]/.test(s))
    if (glob === 0)
      return null
    if (glob > 0) {
      segments = segments.slice(0, glob)
      kind = 'tree'
    }
    return githubUrl(t, currentPath, kind, segments.join('/'))
  }

  /** The target for one reference, or null when it names nothing known. */
  function resolveApiRef(text: string, currentPath: string): string | null {
    const t = normalize(text)
    const q = QUALIFIED.exec(t)
    const moduleName = q?.[1]
    const entry = q?.[2]
    const suffix = q?.[3]

    // 1. A foreign package owns its root by rule; generated data can never
    //    claim the name back (a stale manifest row would 404).
    if (moduleName) {
      const pkg = packageUrl(moduleName, entry, suffix)
      if (pkg)
        return pkg
    }

    // 2. Own modules: exact name, then alias.
    const mod = moduleName ? findModule(moduleName) : undefined
    if (moduleName && mod) {
      const page = pageOf(mod)
      if (!entry)
        return page === currentPath ? null : page
      const prefer = suffix === '()' ? 'type' : 'function'
      const anchor = anchorFor(mod, entry, prefer)
      if (anchor)
        return page === currentPath ? `#${anchor}` : `${page}#${anchor}`
      // The module knows no such entry. Behind an ALIAS that can mean the
      // alias guessed wrong: "Task.async/1" resolves to Shop.Task, but the
      // author meant Elixir's Task. Give the stdlib the member before
      // settling for the module page.
      const viaAlias = !ownValue(modules, moduleName)
      const std = viaAlias ? stdlibUrl(moduleName, entry, suffix) : null
      if (std)
        return std
      return page === currentPath ? null : page
    }

    // 3. The stdlib, shadowed by own aliases (see the ladder above).
    if (moduleName) {
      const std = stdlibUrl(moduleName, entry, suffix)
      if (std)
        return std
    }

    // 4. A bare entry: the current page's module, then the single owner.
    const local = LOCAL.exec(t)
    if (local) {
      const name = local[1] ?? ''
      const prefer = local[2] === '()' ? 'type' : 'function'
      const slug = slugOfPage(currentPath)
      const page = slug ? bySlug.get(slug) : undefined
      if (page) {
        const anchor = anchorFor(page, name, prefer)
        if (anchor)
          return `#${anchor}`
      }
      const owner = owners.get(name)
      if (owner && owner !== page) {
        const anchor = anchorFor(owner, name, prefer)
        if (anchor)
          return `${pageOf(owner)}#${anchor}`
      }
    }

    // 5. A repository path.
    return resolvePathRef(t, currentPath)
  }

  /** Find every linkable reference range inside the joined fence text. */
  function findRefRanges(text: string, currentPath: string): ApiRefRange[] {
    const ranges: ApiRefRange[] = []
    function overlaps(s: number, e: number): boolean {
      return ranges.some(r => s < r.end && e > r.start)
    }

    for (const m of text.matchAll(QUAL_SCAN)) {
      // The char before the match must not extend an identifier ("~T[...]").
      const before = text[m.index - 1]
      if (before && /[\w.]/.test(before))
        continue
      const suffix = (m[1] ? `.${m[1]}` : '') + (m[2] ?? '')
      const moduleName = suffix ? m[0].slice(0, -suffix.length) : m[0]
      const href = resolveApiRef(m[0], currentPath)
        ?? resolveApiRef(moduleName, currentPath)
      if (!href)
        continue
      ranges.push({ start: m.index, end: m.index + m[0].length, href })
    }
    for (const m of text.matchAll(LOCAL_SCAN)) {
      const name = m[1] ?? ''
      const suffix = m[2] ?? ''
      const end = m.index + m[0].length
      const start = end - name.length - suffix.length
      if (overlaps(start, end))
        continue
      const href = resolveApiRef(name + suffix, currentPath)
      if (href)
        ranges.push({ start, end, href })
    }
    for (const m of text.matchAll(PATH_SCAN)) {
      const path = m[1] ?? ''
      const end = m.index + m[0].length
      const start = end - path.length
      if (overlaps(start, end))
        continue
      const href = resolvePathRef(path, currentPath)
      if (href)
        ranges.push({ start, end, href })
    }
    return ranges
  }

  /**
   * Wrap every known reference inside a rendered <code> element in a link.
   * Client-only: call it after the fence is in the DOM. `navigate` receives
   * the target route, so clicks stay inside the SPA router.
   */
  function linkifyCodeElement(
    codeEl: HTMLElement,
    currentPath: string,
    navigate: (to: string) => void,
  ): void {
    if (codeEl.closest('a'))
      return

    // One pass to map every text node to its offset in the joined string.
    const nodes: TextSpan[] = []
    let text = ''
    const walker = document.createTreeWalker(codeEl, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!(n instanceof Text))
        continue
      nodes.push({ node: n, start: text.length })
      text += n.data
    }

    // Wrap back-to-front: splitting a text node keeps its head in place,
    // so earlier offsets stay valid while the tail of the document changes.
    const ranges = findRefRanges(text, currentPath)
    ranges.sort((a, b) => b.start - a.start)
    for (const range of ranges) {
      for (let i = nodes.length - 1; i >= 0; i--) {
        const span = nodes[i]
        if (!span)
          continue
        const { node, start } = span
        const len = node.data.length
        const from = Math.max(0, range.start - start)
        const to = Math.min(len, range.end - start)
        if (from >= to)
          continue
        if (node.parentElement?.closest('a'))
          continue
        if (to < len)
          node.splitText(to)
        const piece = from > 0 ? node.splitText(from) : node
        if (piece !== node)
          nodes.splice(i + 1, 0, { node: piece, start: start + from })
        const a = document.createElement('a')
        a.href = range.href
        a.className = 'code-ref'
        if (range.href.startsWith('http')) {
          // External target (GitHub, hexdocs): a plain link in a new tab.
          a.target = '_blank'
          a.rel = 'noopener'
        }
        else {
          a.addEventListener('click', (e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
              return
            e.preventDefault()
            navigate(range.href)
          })
        }
        piece.parentNode?.insertBefore(a, piece)
        a.appendChild(piece)
      }
    }
  }

  return { resolveApiRef, resolvePathRef, findRefRanges, linkifyCodeElement }
}

export type ApiLinks = ReturnType<typeof createApiLinks>
