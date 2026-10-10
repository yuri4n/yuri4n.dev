// Tests for the pure resolver core (app/utils/api-links.ts). The core is a
// factory: createApiLinks(modules, options) returns the resolver functions,
// with no import of a real manifest. The tests feed small fixtures, so they
// pin the rules, not the state of one site.
//
// Two fixture sites: a library with all its paths in one repository, and
// an app that uses that library as a foreign package. Then cases for the
// options (apiBase, ref, sources, pathTop, apiLinksOptionsFromConfig).
//
// Node runs TypeScript directly (type stripping), so this file imports the
// .ts module with its full extension.
import type { ApiLinksOptions, ApiModules } from '../app/utils/api-links.ts'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  apiLinksOptionsFromConfig,
  createApiLinks,
  moduleSlug,
} from '../app/utils/api-links.ts'

// --- The acme fixture: one library, every path in one repository. ---

const ACME: ApiModules = {
  'Acme.Point': {
    slug: 'acme-point',
    types: { t: 't', month: 'month' },
    functions: {
      'compose': 'compose',
      'compose!': 'compose-1',
      'month': 'month-1',
      'new!': 'new',
    },
  },
  'Acme.Span': {
    slug: 'acme-span',
    types: { t: 't' },
    functions: {
      'ground': 'ground',
      'member?': 'member',
      'new!': 'new',
      'union': 'union',
    },
  },
  'Acme.Span.Arc': {
    slug: 'acme-span-arc',
    types: { t: 't' },
    functions: {},
  },
  'Acme': { slug: 'acme', types: {}, functions: {} },
}

const acme = createApiLinks(ACME, { repo: 'owner/acme' })
function z(text: string, path = '/guide/spans') {
  return acme.resolveApiRef(text, path)
}

test('moduleSlug flattens dots and downcases', () => {
  assert.equal(moduleSlug('Acme.Intervals'), 'acme-intervals')
  assert.equal(moduleSlug('Acme'), 'acme')
})

test('a fully qualified reference finds its page and anchor', () => {
  assert.equal(z('Acme.Point.compose/2'), '/api/acme-point#compose')
  assert.equal(z('Acme.Span.t()'), '/api/acme-span#t')
  assert.equal(z('Acme.Point.compose!/2'), '/api/acme-point#compose-1')
})

test('on its own page, a reference becomes a bare hash', () => {
  assert.equal(z('Acme.Span.ground/3', '/api/acme-span'), '#ground')
  assert.equal(z('Acme.Span', '/api/acme-span'), null)
})

test('an alias resolves like in Elixir: the tail segments name the module', () => {
  assert.equal(z('Point.compose/2'), '/api/acme-point#compose')
  assert.equal(z('Span'), '/api/acme-span')
  assert.equal(z('Span.Arc'), '/api/acme-span-arc')
  assert.equal(z('Arc'), '/api/acme-span-arc')
  assert.equal(z('%Span{from: a}'), '/api/acme-span')
})

test('an alias that two modules share stays plain text', () => {
  const amb = createApiLinks(
    {
      'A.Foo': { slug: 'a-foo', types: {}, functions: {} },
      'B.Foo': { slug: 'b-foo', types: {}, functions: {} },
    },
    { repo: 'owner/acme' },
  )
  assert.equal(amb.resolveApiRef('Foo', '/x'), null)
})

test('a project alias shadows a stdlib root, as an Elixir alias does', () => {
  const shadow = createApiLinks(
    {
      'My.Stream': { slug: 'my-stream', types: {}, functions: { run: 'run' } },
    },
    { repo: 'owner/acme' },
  )
  assert.equal(shadow.resolveApiRef('Stream.run/1', '/x'), '/api/my-stream#run')
  // When the aliased module does not know the member, the alias probably
  // guessed wrong: the stdlib takes the reference back.
  assert.equal(
    shadow.resolveApiRef('Stream.map/2', '/x'),
    'https://hexdocs.pm/elixir/Stream.html#map/2',
  )
})

test('a stdlib member links to hexdocs; a bare stdlib root stays plain', () => {
  assert.equal(z('Enum.map/2'), 'https://hexdocs.pm/elixir/Enum.html#map/2')
  assert.equal(z('Date.t()'), 'https://hexdocs.pm/elixir/Date.html#t:t/0')
  assert.equal(z('Task'), null)
  assert.equal(z('Enum'), null)
})

test('a bare entry with one owner links from any page', () => {
  assert.equal(z('ground/3'), '/api/acme-span#ground')
  assert.equal(z('member?/2'), '/api/acme-span#member')
  assert.equal(z('compose/2'), '/api/acme-point#compose')
})

test('a bare entry that many modules own stays plain text', () => {
  assert.equal(z('new!/1'), null)
  assert.equal(z('t()'), null)
})

test('the () and /arity suffixes choose between a type and a function', () => {
  assert.equal(z('month()'), '/api/acme-point#month')
  assert.equal(z('month/1'), '/api/acme-point#month-1')
})

test('on an API page, the page module answers before the global owner', () => {
  assert.equal(z('union/2', '/api/acme-span'), '#union')
  // The page module does not know the name, so the single owner answers.
  assert.equal(z('ground/3', '/api/acme-point'), '/api/acme-span#ground')
})

test('a file path links to the GitHub blob, a folder to the tree', () => {
  assert.equal(
    z('lib/acme/point.ex'),
    'https://github.com/owner/acme/blob/main/lib/acme/point.ex',
  )
  assert.equal(
    z('test/acme'),
    'https://github.com/owner/acme/tree/main/test/acme',
  )
  assert.equal(
    z('mix.exs'),
    'https://github.com/owner/acme/blob/main/mix.exs',
  )
})

test('a top folder with a closing slash links to its tree', () => {
  assert.equal(z('lib/'), 'https://github.com/owner/acme/tree/main/lib')
  assert.equal(z('docs/'), 'https://github.com/owner/acme/tree/main/docs')
  // Without the slash, one word is prose, not a path.
  assert.equal(z('lib'), null)
})

test('a glob links to the folder of the matches; an arity is not a path', () => {
  assert.equal(
    z('docs/adr-*.md'),
    'https://github.com/owner/acme/tree/main/docs',
  )
  assert.equal(acme.resolvePathRef('foo/3'), null)
})

test('findRefRanges collects every reference of a fence, without overlaps', () => {
  const text = 'a = Point.compose!(x, y)\nsee lib/acme/point.ex and ground/3'
  const ranges = acme.findRefRanges(text, '/guide/spans')
  const hrefs = ranges.map(x => x.href).sort()
  assert.deepEqual(hrefs, [
    '/api/acme-point#compose-1',
    '/api/acme-span#ground',
    'https://github.com/owner/acme/blob/main/lib/acme/point.ex',
  ])
  // Ranges must not overlap: each covers its own slice of the text.
  const sorted = [...ranges].sort((a, b) => a.start - b.start)
  for (const [i, range] of sorted.entries()) {
    const previous = sorted[i - 1]
    if (previous)
      assert.ok(range.start >= previous.end)
  }
})

test('a name of Object.prototype is not an entry', () => {
  assert.equal(z('constructor/1'), null)
  assert.equal(z('toString()'), null)
})

// --- The shop fixture: a foreign package root and a vendored path. ---

const SHOP: ApiModules = {
  'Shop.Solver': {
    slug: 'shop-solver',
    types: {},
    functions: { compile: 'compile', solve: 'solve' },
  },
  'Shop.Task': {
    slug: 'shop-task',
    types: { t: 't' },
    functions: { 'new!': 'new', 'variant_for': 'variant_for' },
  },
  'Shop.Goal': {
    slug: 'shop-goal',
    types: { t: 't' },
    functions: { 'new!': 'new', 'windows': 'windows' },
  },
  // A stale row: the ingest no longer writes acme modules, but an old
  // committed manifest can still hold one. The boundary must win.
  'Acme.Span': {
    slug: 'acme-span',
    types: { t: 't' },
    functions: { ground: 'ground' },
  },
}

const SHOP_OPTIONS: ApiLinksOptions = {
  repo: 'owner/shop',
  sources: [{ prefix: 'lib/acme', repo: 'owner/acme' }],
  packageDocs: {
    Acme: { style: 'hexdocs', base: 'https://hexdocs.pm/acme' },
  },
}

const shop = createApiLinks(SHOP, SHOP_OPTIONS)
function s(text: string, path = '/guide/plans') {
  return shop.resolveApiRef(text, path)
}

test('a foreign package reference leaves the site: hexdocs style', () => {
  assert.equal(
    s('Acme.Span.of/1'),
    'https://hexdocs.pm/acme/Acme.Span.html#of/1',
  )
  assert.equal(
    s('Acme.Span.t()'),
    'https://hexdocs.pm/acme/Acme.Span.html#t:t/0',
  )
  assert.equal(s('Acme.Point'), 'https://hexdocs.pm/acme/Acme.Point.html')
  // A bare package root is an owned name, so it links (a bare stdlib root
  // stays plain).
  assert.equal(s('Acme'), 'https://hexdocs.pm/acme/Acme.html')
})

test('the package boundary wins over a stale manifest row', () => {
  assert.equal(
    s('Acme.Span.ground/3'),
    'https://hexdocs.pm/acme/Acme.Span.html#ground/3',
  )
  // Even the alias of a stale row must not resolve to a local page.
  assert.notEqual(s('Span'), '/api/acme-span')
})

test('a package in site style links to that docs site', () => {
  const local = createApiLinks(SHOP, {
    ...SHOP_OPTIONS,
    packageDocs: { Acme: { style: 'site', base: 'http://localhost:3001' } },
  })
  function l(text: string) {
    return local.resolveApiRef(text, '/x')
  }
  assert.equal(l('Acme.Span.of/1'), 'http://localhost:3001/api/acme-span#of')
  assert.equal(l('Acme'), 'http://localhost:3001/api/acme')
  // The site style strips the punctuation that the slugger drops.
  assert.equal(
    l('Acme.Point.compose!/2'),
    'http://localhost:3001/api/acme-point#compose',
  )
  // The other site can have its own API route prefix.
  const prefixed = createApiLinks(SHOP, {
    packageDocs: {
      Acme: {
        style: 'site',
        base: 'https://docs.example.com',
        apiBase: '/ref/',
      },
    },
  })
  assert.equal(
    prefixed.resolveApiRef('Acme.Span', '/x'),
    'https://docs.example.com/ref/acme-span',
  )
})

test('own modules resolve by exact name and by alias', () => {
  assert.equal(s('Shop.Solver.solve/2'), '/api/shop-solver#solve')
  assert.equal(s('Solver.solve/2'), '/api/shop-solver#solve')
  assert.equal(s('Solver'), '/api/shop-solver')
})

test('a stdlib root that aliases an own module resolves locally first', () => {
  // "Task" is the tail of Shop.Task, so the alias wins, as `alias Shop.Task`
  // wins inside Elixir source.
  assert.equal(s('Task'), '/api/shop-task')
  assert.equal(s('Task.variant_for/2'), '/api/shop-task#variant_for')
  // Shop.Task knows no async/1, so the stdlib takes the reference back.
  assert.equal(s('Task.async/1'), 'https://hexdocs.pm/elixir/Task.html#async/1')
})

test('a bare stdlib root without a local alias stays plain; a member links', () => {
  assert.equal(s('Enum'), null)
  assert.equal(s('Enum.map/2'), 'https://hexdocs.pm/elixir/Enum.html#map/2')
})

test('a bare entry with one owner links; a shared name stays plain', () => {
  assert.equal(s('solve/2'), '/api/shop-solver#solve')
  assert.equal(s('windows/1'), '/api/shop-goal#windows')
  assert.equal(s('new!/1'), null)
})

test('a path rule sends vendored code to its own repository', () => {
  assert.equal(
    s('lib/shop/solver.ex'),
    'https://github.com/owner/shop/blob/main/lib/shop/solver.ex',
  )
  assert.equal(
    s('lib/acme/point.ex'),
    'https://github.com/owner/acme/blob/main/lib/acme/point.ex',
  )
  assert.equal(s('docs/'), 'https://github.com/owner/shop/tree/main/docs')
  assert.equal(s('mix.exs'), 'https://github.com/owner/shop/blob/main/mix.exs')
})

test('findRefRanges resolves fenced references through the same ladder', () => {
  const ranges = shop.findRefRanges(
    'plan = Solver.solve(problem) # see Acme.Span.ground/3',
    '/guide',
  )
  const hrefs = ranges.map(x => x.href).sort()
  assert.deepEqual(hrefs, [
    '/api/shop-solver#solve',
    'https://hexdocs.pm/acme/Acme.Span.html#ground/3',
  ])
})

// --- Options of the shared version. ---

test('apiBase moves the API pages and the current-page check', () => {
  const site = createApiLinks(ACME, {
    repo: 'owner/acme',
    apiBase: '/shop/api',
  })
  function r(text: string, path = '/shop/guide') {
    return site.resolveApiRef(text, path)
  }
  assert.equal(r('Acme.Point.compose/2'), '/shop/api/acme-point#compose')
  assert.equal(r('Span'), '/shop/api/acme-span')
  assert.equal(r('ground/3'), '/shop/api/acme-span#ground')
  // On its own page under the new prefix, a bare entry is a bare hash.
  assert.equal(r('union/2', '/shop/api/acme-span'), '#union')
  assert.equal(r('Acme.Span', '/shop/api/acme-span'), null)
  // The old prefix is not an API page any more.
  assert.equal(r('union/2', '/api/acme-span'), '/shop/api/acme-span#union')
  // A trailing slash on apiBase changes nothing.
  const slash = createApiLinks(ACME, { apiBase: '/shop/api/' })
  assert.equal(slash.resolveApiRef('Span', '/x'), '/shop/api/acme-span')
})

test('ref sets the branch or tag of every GitHub link', () => {
  const tagged = createApiLinks(ACME, { repo: 'owner/acme', ref: 'v1.2.0' })
  function r(text: string) {
    return tagged.resolveApiRef(text, '/x')
  }
  assert.equal(
    r('lib/acme/point.ex'),
    'https://github.com/owner/acme/blob/v1.2.0/lib/acme/point.ex',
  )
  assert.equal(r('lib/'), 'https://github.com/owner/acme/tree/v1.2.0/lib')
  assert.equal(
    r('mix.exs'),
    'https://github.com/owner/acme/blob/v1.2.0/mix.exs',
  )
  assert.equal(
    r('docs/adr-*.md'),
    'https://github.com/owner/acme/tree/v1.2.0/docs',
  )
})

test('a page rule sends the paths of a page section to a repository folder', () => {
  const central = createApiLinks(SHOP, {
    repo: 'owner/monorepo',
    sources: [
      { prefix: 'lib/acme', repo: 'owner/acme' },
      { prefix: '/shop', repo: 'owner/monorepo', pathPrefix: 'apps/shop' },
    ],
  })
  assert.equal(
    central.resolveApiRef('mix.exs', '/shop/guide'),
    'https://github.com/owner/monorepo/blob/main/apps/shop/mix.exs',
  )
  assert.equal(
    central.resolveApiRef('lib/shop/solver.ex', '/shop/api/shop-solver'),
    'https://github.com/owner/monorepo/blob/main/apps/shop/lib/shop/solver.ex',
  )
  // The first matching rule wins: vendored acme code keeps its repository.
  assert.equal(
    central.resolveApiRef('lib/acme/point.ex', '/shop/guide'),
    'https://github.com/owner/acme/blob/main/lib/acme/point.ex',
  )
  // Pages outside /shop use the default repository with no folder.
  assert.equal(
    central.resolveApiRef('docs/', '/platform'),
    'https://github.com/owner/monorepo/tree/main/docs',
  )
})

test('a custom sourceFor replaces repo and sources', () => {
  const site = createApiLinks(ACME, {
    repo: 'ignored/repo',
    sourceFor: path => ({
      repo: 'owner/other',
      prefix: path.startsWith('lib') ? 'src/' : '',
    }),
  })
  assert.equal(
    site.resolvePathRef('lib/a.ex', '/x'),
    'https://github.com/owner/other/blob/main/src/lib/a.ex',
  )
})

test('with no repository, a path does not link', () => {
  const site = createApiLinks(ACME)
  assert.equal(site.resolveApiRef('lib/acme/point.ex', '/x'), null)
  assert.equal(site.resolveApiRef('mix.exs', '/x'), null)
  // Module references still link.
  assert.equal(site.resolveApiRef('Span', '/x'), '/api/acme-span')
})

test('pathTop replaces the built-in top folders; empty keeps them', () => {
  const site = createApiLinks(ACME, {
    repo: 'owner/monorepo',
    pathTop: ['apps', 'infra'],
  })
  assert.equal(
    site.resolvePathRef('apps/shop/mix.exs'),
    'https://github.com/owner/monorepo/blob/main/apps/shop/mix.exs',
  )
  assert.equal(site.resolvePathRef('lib/acme/point.ex'), null)
  const empty = createApiLinks(ACME, { repo: 'owner/acme', pathTop: [] })
  assert.equal(
    empty.resolvePathRef('lib/'),
    'https://github.com/owner/acme/tree/main/lib',
  )
})

test('apiLinksOptionsFromConfig keeps valid fields and drops the rest', () => {
  assert.deepEqual(apiLinksOptionsFromConfig(undefined), {})
  assert.deepEqual(apiLinksOptionsFromConfig('x'), {})
  const options = apiLinksOptionsFromConfig({
    apiBase: '/api',
    ref: '',
    repo: 'owner/acme',
    sources: [
      { prefix: 'lib/acme', repo: 'owner/acme' },
      { prefix: 'bad' },
      'bad',
    ],
    packageDocs: {
      Acme: { style: 'hexdocs', base: 'https://hexdocs.pm/acme' },
      Bad: { style: 'pdf', base: 'x' },
    },
    pathTop: ['lib', 3, 'apps'],
  })
  assert.deepEqual(options, {
    apiBase: '/api',
    repo: 'owner/acme',
    sources: [{ prefix: 'lib/acme', repo: 'owner/acme' }],
    packageDocs: {
      Acme: { style: 'hexdocs', base: 'https://hexdocs.pm/acme' },
    },
    pathTop: ['lib', 'apps'],
  })
})

test('the app.config defaults give the built-in behavior', () => {
  // The defaults of app/app.config.ts plus a site's repo.
  const options = apiLinksOptionsFromConfig({
    apiBase: '/api',
    ref: 'main',
    repo: 'owner/acme',
    sources: [],
    packageDocs: {},
    pathTop: [],
  })
  const site = createApiLinks(ACME, options)
  assert.equal(site.resolveApiRef('ground/3', '/x'), '/api/acme-span#ground')
  assert.equal(
    site.resolveApiRef('lib/', '/x'),
    'https://github.com/owner/acme/tree/main/lib',
  )
})
