// Tests for the ExDoc -> Nuxt Content transform (lib/ingest.mjs). The suite
// covers the parsers and the renderers, plus these cases: the dropped ExDoc
// footer, CommonMark fences (~~~ and indented openers), the stamp option,
// apiBase, captions, source rewrites and ingestProject.
//
// The fixture imitates the real shape of ExDoc's Markdown output:
//   # `Module.Name`        <- one h1 for the module, then the moduledoc
//   ## A moduledoc section <- the moduledoc keeps its own h2 headings
//   # `type_name`          <- one h1 per type, followed by an elixir fence
//   # `function_name`      <- one h1 per function (arity is lost)
//   ---                    <- then the footer that links api-reference.md
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  classifyEntry,
  computeAnchors,
  dropExdocFooter,
  extractSummary,
  fenceMask,
  ingestProject,
  moduleManifest,
  moduleSlug,
  parseModuleDoc,
  renderIndex,
  renderPage,
  resolveConfig,
  rewriteSource,
  shiftHeadings,
} from '../lib/ingest.mjs'

const SOURCE = 'https://github.com/owner/acme/blob/main/lib/acme/fake.ex#L1'

const FIXTURE = `# \`Acme.Fake\`
[🔗](${SOURCE})

A fake module for tests.

It has a second paragraph that must not enter the summary.

## The unit graph

Indented code keeps its column, so this line is not a heading:

    # not a heading, it is code
    :year ── month ── day

# \`chain\`

\`\`\`elixir
@type chain() :: [segment(), ...]
\`\`\`

# \`union\`

\`\`\`elixir
@spec union(t(), t()) :: t()
\`\`\`

Joins two things.

## Examples

\`\`\`elixir
# a comment at column zero inside a fence is not a heading
union(a, b)
\`\`\`

# \`union\`

\`\`\`elixir
@spec union([t()]) :: t()
\`\`\`

---

*Consult [api-reference.md](api-reference.md) for complete listing*
`

const STAMP = '[AI SLOP]{.ai-slop} A test stamp.'

test('moduleSlug flattens dots and downcases', () => {
  assert.equal(moduleSlug('Acme.Intervals'), 'acme-intervals')
  assert.equal(moduleSlug('Shop.Solver.Problem'), 'shop-solver-problem')
  assert.equal(moduleSlug('Acme'), 'acme')
})

test('parseModuleDoc splits module doc and entries on h1, outside fences only', () => {
  const parsed = parseModuleDoc(FIXTURE)
  assert.equal(parsed.moduleName, 'Acme.Fake')
  // The ExDoc source link is lifted out of the moduledoc: it becomes data,
  // not the first paragraph (it used to leak into the page description).
  assert.equal(parsed.sourceUrl, SOURCE)
  assert.ok(!parsed.moduleDoc.includes('🔗'))
  // The moduledoc keeps its prose and its h2 section.
  assert.match(parsed.moduleDoc, /A fake module for tests\./)
  assert.match(parsed.moduleDoc, /## The unit graph/)
  // Indented code lines that start with # are NOT headings.
  assert.match(parsed.moduleDoc, / {4}# not a heading/)
  // Three entries: one type, two same-named functions (arities merged).
  assert.equal(parsed.entries.length, 3)
  assert.deepEqual(parsed.entries.map(e => e.name), ['chain', 'union', 'union'])
  // The fence comment "# a comment..." must not create a fourth entry.
  assert.match(parsed.entries[1].body, /# a comment at column zero/)
})

test('parseModuleDoc drops the ExDoc api-reference.md footer', () => {
  const parsed = parseModuleDoc(FIXTURE)
  const last = parsed.entries.at(-1).body
  assert.ok(!last.includes('api-reference.md'))
  assert.ok(!last.trimEnd().endsWith('---'))
  const page = renderPage(parsed)
  assert.ok(!page.includes('api-reference'))
})

test('dropExdocFooter changes nothing when there is no footer', () => {
  const raw = '# `A`\n\nText.\n\n---\n\nMore text.\n'
  assert.equal(dropExdocFooter(raw), raw)
  assert.equal(
    dropExdocFooter(
      '# `A`\n\nText.\n\n---\n\n*Consult [api-reference.md](api-reference.md) for complete listing*\n\n',
    ),
    '# `A`\n\nText.\n',
  )
})

test('fenceMask follows CommonMark: ``` and ~~~, indented openers, longer closers', () => {
  const lines = [
    'text',
    '~~~elixir',
    '# inside a tilde fence',
    '```',
    '~~~',
    '   ```elixir',
    '# inside an indented fence',
    '````',
    '    ```',
    'after',
  ]
  assert.deepEqual(fenceMask(lines), [
    false,
    true,
    true,
    // A backtick line does not close a tilde fence.
    true,
    true,
    true,
    true,
    // A longer closer closes the fence.
    true,
    // Four spaces of indent: indented code, not a fence opener.
    false,
    false,
  ])
  // An info string with a backtick is not a fence opener.
  assert.deepEqual(fenceMask(['``` a`b', '# heading']), [false, false])
})

test('parseModuleDoc ignores headings inside ~~~ and indented fences', () => {
  const raw = [
    '# `Acme.Tilde`',
    '',
    'Doc.',
    '',
    '~~~elixir',
    '# `not_an_entry`',
    '~~~',
    '',
    '  ```elixir',
    '# `not_an_entry_either`',
    '  ```',
    '',
    '# `real`',
    '',
    'Body.',
  ].join('\n')
  const parsed = parseModuleDoc(raw)
  assert.deepEqual(parsed.entries.map(e => e.name), ['real'])
  assert.match(parsed.moduleDoc, /not_an_entry_either/)
})

test('parseModuleDoc fails clearly without a module heading', () => {
  assert.throws(() => parseModuleDoc('no heading\n'), /no module heading/)
})

test('classifyEntry reads the first fence: @type/@opaque mean type', () => {
  const parsed = parseModuleDoc(FIXTURE)
  assert.equal(classifyEntry(parsed.entries[0]), 'type')
  assert.equal(classifyEntry(parsed.entries[1]), 'function')
  assert.equal(classifyEntry(parsed.entries[2]), 'function')
  assert.equal(
    classifyEntry({ body: '```elixir\n@opaque t() :: map()\n```' }),
    'type',
  )
  assert.equal(
    classifyEntry({ body: '```elixir\n@typep x() :: map()\n```' }),
    'type',
  )
})

test('shiftHeadings demotes headings but never touches fenced lines', () => {
  const body = '## Examples\n\n```elixir\n# comment\n```\n'
  assert.equal(
    shiftHeadings(body, 2),
    '#### Examples\n\n```elixir\n# comment\n```\n',
  )
  const tilde = '## Notes\n\n~~~\n## not a heading\n~~~\n'
  assert.equal(
    shiftHeadings(tilde, 2),
    '#### Notes\n\n~~~\n## not a heading\n~~~\n',
  )
})

test('extractSummary takes only the first paragraph, unwrapped, without backticks', () => {
  const summary = extractSummary(
    'First line\nwraps here.\n\nSecond paragraph.\n',
  )
  assert.equal(summary, 'First line wraps here.')
  assert.equal(
    extractSummary('Uses `Timex` inside.\n\nMore.\n'),
    'Uses Timex inside.',
  )
})

test('renderPage groups entries under Types and Functions with h3 names', () => {
  const page = renderPage(parseModuleDoc(FIXTURE), { stamp: STAMP })
  // Front matter with a quoted title and description.
  assert.match(
    page,
    /^---\ntitle: "Acme.Fake"\ndescription: "A fake module for tests\."\n---\n/,
  )
  // The stamp comes first, when the site sets one.
  assert.ok(page.includes(`---\n\n${STAMP}\n\n[Source on GitHub`))
  // Group headings appear once each, types before functions.
  const typesAt = page.indexOf('## Types')
  const fnsAt = page.indexOf('## Functions')
  assert.ok(typesAt > 0 && fnsAt > typesAt)
  // Entry names become h3; the duplicate union stays duplicated.
  assert.match(page, /### `chain`/)
  assert.equal(page.match(/### `union`/g).length, 2)
  // Entry-body headings sit under the entry: h2 -> h4.
  assert.match(page, /#### Examples/)
  // The lifted source link renders as a styled chip.
  assert.ok(page.includes(`[Source on GitHub ↗](${SOURCE}){.source-link}`))
})

test('renderPage writes no stamp by default', () => {
  const page = renderPage(parseModuleDoc(FIXTURE))
  assert.ok(!page.includes('.ai-slop'))
  assert.ok(page.includes(`---\n\n[Source on GitHub ↗](${SOURCE})`))
  const bare = renderPage(parseModuleDoc('# `A`\n\nDoc.\n'))
  assert.equal(bare, '---\ntitle: "A"\ndescription: "Doc."\n---\n\nDoc.\n\n')
})

test('computeAnchors emulates the runtime heading ids, duplicates included', () => {
  const anchors = computeAnchors(renderPage(parseModuleDoc(FIXTURE)))
  const ids = anchors.map(a => a.id)
  // Backticks vanish from the heading text before slugging.
  assert.ok(ids.includes('chain'))
  // The duplicate `union` entry gets the "-1" suffix, like github-slugger.
  assert.ok(ids.includes('union') && ids.includes('union-1'))
  // Lines inside fences are never headings.
  assert.ok(!ids.some(id => id.includes('comment')))
})

test('moduleManifest maps each type and function to its page anchor', () => {
  const manifest = moduleManifest(parseModuleDoc(FIXTURE))
  assert.equal(manifest.slug, 'acme-fake')
  assert.deepEqual(manifest.types, { chain: 'chain' })
  // Two arities of union share one name: the first anchor wins.
  assert.deepEqual(manifest.functions, { union: 'union' })
})

test('moduleManifest keeps an entry named like an Object.prototype member', () => {
  const raw = '# `A`\n\nDoc.\n\n# `constructor`\n\n```elixir\n@spec constructor() :: t()\n```\n'
  const manifest = moduleManifest(parseModuleDoc(raw))
  assert.deepEqual(manifest.functions, { constructor: 'constructor' })
})

test('renderIndex writes one row per module, module and summary only', () => {
  const index = renderIndex([
    { moduleName: 'Acme', summary: 'The facade.' },
    { moduleName: 'Acme.Fake', summary: 'A fake module for tests.' },
  ])
  assert.match(index, /\| \[Acme\]\(\/api\/acme\) \| The facade\. \|/)
  assert.match(
    index,
    /\| \[Acme\.Fake\]\(\/api\/acme-fake\) \| A fake module for tests\. \|/,
  )
  // Two columns, no "Library" column: with one project it said nothing.
  assert.match(index, /\| Module \| Summary \|\n\| --- \| --- \|\n/)
  assert.ok(!index.includes('Library'))
  // No stamp and no caption unless the site sets them.
  assert.ok(!index.includes('.ai-slop'))
  assert.ok(!index.includes('_Figure'))
})

test('renderIndex uses apiBase for the rows and carries the stamp', () => {
  const index = renderIndex(
    [{ moduleName: 'Shop.Solver', summary: 'Solves.' }],
    { apiBase: '/shop/api/', stamp: STAMP, title: 'Shop API' },
  )
  assert.match(index, /\| \[Shop\.Solver\]\(\/shop\/api\/shop-solver\) \|/)
  assert.match(index, /^---\ntitle: "Shop API"\n/)
  assert.ok(index.includes(`---\n\n${STAMP}\n\nTo change this reference`))
})

// The attribution rules of a site treat the module table as a figure, so it
// gets a caption with three parts: the figure name, one line on what the
// figure shows, and the note that AI made it. It sits BELOW the table.
test('renderIndex puts the caption of the site below the module table', () => {
  const caption = '_Figure 1 — Every public module of acme, with the first'
    + ' line of its moduledoc. AI generated, human reviewed._'
  const index = renderIndex(
    [{ moduleName: 'Acme.Fake', summary: 'A fake module for tests.' }],
    { caption },
  )
  const lastLine = index
    .split('\n')
    .filter(line => line.trim() !== '')
    .at(-1)
  assert.equal(lastLine, caption)
  assert.match(lastLine, /^_Figure 1 — /)
  assert.match(lastLine, /AI generated, human reviewed\._$/)
  assert.ok(index.indexOf('_Figure 1') > index.indexOf('| [Acme.Fake]'))
})

test('rewriteSource moves a source link to a new repository', () => {
  const rules = [{
    from: 'https://github.com/owner/shop/blob/main/',
    to: 'https://github.com/owner/monorepo/blob/main/apps/shop/',
  }]
  assert.equal(
    rewriteSource(
      'https://github.com/owner/shop/blob/main/lib/shop.ex#L1',
      rules,
    ),
    'https://github.com/owner/monorepo/blob/main/apps/shop/lib/shop.ex#L1',
  )
  assert.equal(
    rewriteSource('https://example.com/x', rules),
    'https://example.com/x',
  )
  assert.equal(rewriteSource(null, rules), null)
})

test('resolveConfig applies the defaults and checks the projects', () => {
  const config = resolveConfig({
    projects: [{ pattern: '^Acme(\\..+)?\\.md$' }],
  })
  assert.equal(config.exdocDir, '../doc')
  assert.equal(config.manifestPath, 'app/assets/api-manifest.json')
  assert.equal(config.stamp, null)
  assert.equal(config.navTitle, 'API')
  assert.equal(config.navIcon, 'i-lucide-braces')
  const [project] = config.projects
  assert.ok(project.pattern.test('Acme.Span.md'))
  assert.ok(!project.pattern.test('Shop.md'))
  assert.equal(project.outDir, 'content/3.api')
  assert.equal(project.apiBase, '/api')
  assert.deepEqual(project.sourceRewrite, [])
  assert.throws(() => resolveConfig({}), /projects/)
  assert.throws(() => resolveConfig({ projects: [{}] }), /pattern/)
})

test('ingestProject turns the matching files into pages and manifest rows', () => {
  const [project] = resolveConfig({
    projects: [{
      pattern: /^Acme(?:\..+)?\.md$/,
      apiBase: '/acme/api',
      sourceRewrite: {
        from: 'https://github.com/owner/acme/blob/main/',
        to: 'https://github.com/owner/monorepo/blob/main/oss/acme/',
      },
    }],
  }).projects
  const files = [
    { name: 'Acme.Fake.md', raw: FIXTURE },
    { name: 'Other.md', raw: '# `Other`\n\nNot this project.\n' },
    { name: 'api-reference.md', raw: '# API Reference\n' },
  ]
  const { pages, manifest } = ingestProject(project, files, { stamp: STAMP })
  assert.deepEqual(
    pages.map(p => p.file),
    ['acme-fake.md', 'index.md', '.navigation.yml'],
  )
  assert.deepEqual(Object.keys(manifest), ['Acme.Fake'])
  const [page, index, navigation] = pages.map(p => p.content)
  assert.ok(page.includes(STAMP))
  assert.ok(
    page.includes(
      'https://github.com/owner/monorepo/blob/main/oss/acme/lib/acme/fake.ex#L1',
    ),
  )
  assert.match(index, /\(\/acme\/api\/acme-fake\)/)
  assert.equal(navigation, 'title: "API"\nicon: i-lucide-braces\n')
})
