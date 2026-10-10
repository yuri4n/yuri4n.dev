#!/usr/bin/env node
// ingest-exdoc: turn the ExDoc Markdown output (`mix docs`) into Nuxt
// Content pages and the API manifest of @yuri4n/nuxt-docs-exdoc.
//
//   pnpm exec ingest-exdoc [config]      (default config: exdoc.config.mjs)
//
// A person runs it after `mix docs`, in the docs site folder, and commits
// the result. It is never chained into `build` or `generate`: a build
// machine (Vercel, CI) has no Elixir and no doc/ folder.
//
//   <exdocDir>/<Module>.md ──▶ <outDir>/<slug>.md      one page per module
//                          ├─▶ <outDir>/index.md       the module table
//                          ├─▶ <outDir>/.navigation.yml
//                          └─▶ <manifestPath>           anchors for links
//
// Paths in the config are relative to the current folder. The pure
// functions live in lib/ingest.mjs (tested there).
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { ingestProject, resolveConfig } from '../lib/ingest.mjs'

async function main() {
  const cwd = process.cwd()
  const configFile = resolve(cwd, process.argv[2] ?? 'exdoc.config.mjs')
  if (!existsSync(configFile))
    throw new Error(`no config file: ${configFile}`)
  const loaded = await import(pathToFileURL(configFile).href)
  const config = resolveConfig(loaded.default)

  const exdocDir = resolve(cwd, config.exdocDir)
  const manifestFile = resolve(cwd, config.manifestPath)
  mkdirSync(dirname(manifestFile), { recursive: true })

  // The site imports the manifest with a static import, so the file must
  // exist before the bundler starts, even on a machine with no Elixir.
  // `{}` maps no module. It is written only when the file is absent, so a
  // committed manifest is never replaced by an empty one.
  if (!existsSync(manifestFile))
    writeFileSync(manifestFile, '{}\n')

  if (!existsSync(exdocDir)) {
    // A warning is enough: the pages are derived, and a site without them
    // still builds.
    console.warn(`[ingest-exdoc] no ExDoc output in ${exdocDir}.`)
    console.warn('[ingest-exdoc] Kept the pages on disk. Run `mix docs` first.')
    return
  }

  const files = readdirSync(exdocDir)
    .filter(name => name.endsWith('.md'))
    .map(name => ({ name, raw: readFileSync(join(exdocDir, name), 'utf8') }))

  const manifest = {}
  for (const project of config.projects) {
    const result = ingestProject(project, files, {
      stamp: config.stamp,
      navTitle: config.navTitle,
      navIcon: config.navIcon,
    })
    const outDir = resolve(cwd, project.outDir)
    rmSync(outDir, { recursive: true, force: true })
    mkdirSync(outDir, { recursive: true })
    for (const page of result.pages)
      writeFileSync(join(outDir, page.file), page.content)
    Object.assign(manifest, result.manifest)
    const count = Object.keys(result.manifest).length
    console.log(
      `[ingest-exdoc] wrote ${count} module pages to ${project.outDir}/`,
    )
  }
  writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`[ingest-exdoc] wrote ${config.manifestPath}`)
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[ingest-exdoc] ${message}`)
  process.exitCode = 1
})
