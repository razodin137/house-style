#!/usr/bin/env node

import process from "node:process"
import { existsSync } from "node:fs"
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { basename, extname, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { chromium } from "playwright"
import pixelmatch from "pixelmatch"
import { PNG } from "pngjs"

const DEFAULT_WIDTHS = [ 390, 1280, 1440, 1920 ]

const HEIGHTS = { 390: 844, 1280: 800, 1440: 900, 1920: 1080 }

const DEFAULT_TOLERANCE = 0.001

const HELP = `Usage: house-shot [pages...] [options]

Screenshot pages at the house widths and compare them with the baselines.

Pages may be http(s) URLs, paths served by --base-url, or local files.

Options:
  -u, --update         write the screenshots as the new baselines
      --base-url URL   resolve page paths against this URL
  -o, --out DIR        baseline root (default: .shot)
  -c, --config FILE    config file (default: shot.config.mjs)
      --widths LIST    comma-separated widths (default: 390,1280,1440,1920)
      --tolerance N    allowed differing ratio (default: 0.001)
  -h, --help           show this help

Config file:

  export default {
    baseURL: "http://localhost:3000",
    pages: [ "/", "/pricing" ],
    widths: [ 390, 1280, 1440, 1920 ],
    out: ".shot",
    tolerance: 0.001
  }
`

function parseArgs(argv) {
  const options = { pages: [], update: false }

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]

    if (arg === "--update" || arg === "-u") options.update = true
    else if (arg === "--help" || arg === "-h") options.help = true
    else if (arg === "--base-url") options.baseURL = argv[++index]
    else if (arg === "--out" || arg === "-o") options.out = argv[++index]
    else if (arg === "--config" || arg === "-c") options.config = argv[++index]
    else if (arg === "--widths") options.widths = argv[++index].split(",").map(Number)
    else if (arg === "--tolerance") options.tolerance = Number(argv[++index])
    else if (arg.startsWith("-")) throw new Error(`Unknown option "${arg}"`)
    else options.pages.push(arg)
  }

  return options
}

async function loadConfig(file) {
  let configFile = file

  if (!configFile) {
    for (const candidate of [ "shot.config.mjs", "shot.config.js" ]) {
      if (existsSync(candidate)) {
        configFile = candidate
        break
      }
    }
  }

  if (!configFile) return {}

  const module = await import(pathToFileURL(resolve(configFile)).href)

  return module.default ?? module
}

function resolveTarget(page, baseURL) {
  if (/^https?:\/\//.test(page)) return page
  if (page.startsWith("file://")) return page

  if (baseURL) return new URL(page, baseURL).href

  const file = resolve(page)

  if (existsSync(file)) return pathToFileURL(file).href

  throw new Error(`Cannot resolve "${page}": pass --base-url or point at a file that exists`)
}

function slugFor(target) {
  const url = new URL(target)

  if (url.protocol === "file:") {
    return basename(url.pathname, extname(url.pathname)) || "index"
  }

  const path = decodeURIComponent(url.pathname).replace(/^\/+|\/+$/g, "")
  const slug = path ? path.replace(/[^a-z0-9]+/gi, "-").toLowerCase() : "index"

  if (!url.search) return slug

  return `${slug}-${url.search.slice(1).replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`
}

async function capture(browser, target, width, height) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    colorScheme: "light",
    reducedMotion: "reduce"
  })

  const page = await context.newPage()

  await page.goto(target, { waitUntil: "load" })
  await page.evaluate(() => document.fonts.ready.then(() => true))
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
    `
  })
  await page.evaluate(() => new Promise((done) => {
    requestAnimationFrame(() => requestAnimationFrame(done))
  }))

  const image = await page.screenshot({ fullPage: true, animations: "disabled", caret: "hide" })

  await context.close()

  return image
}

function pad(image, width, height) {
  const data = new Uint8Array(width * height * 4)

  for (let y = 0; y < image.height; y++) {
    const from = y * image.width * 4
    data.set(image.data.subarray(from, from + image.width * 4), y * width * 4)
  }

  return data
}

function compare(expected, actual) {
  const before = PNG.sync.read(expected)
  const after = PNG.sync.read(actual)
  const width = Math.max(before.width, after.width)
  const height = Math.max(before.height, after.height)
  const diff = new PNG({ width, height })

  const changed = pixelmatch(
    pad(before, width, height),
    pad(after, width, height),
    diff.data,
    width,
    height,
    { threshold: 0.1, alpha: 0.5, diffColor: [ 255, 0, 0 ] }
  )

  return { changed, total: width * height, diff: PNG.sync.write(diff) }
}

function formatCount(count) {
  return count.toLocaleString("en-US")
}

async function run(options) {
  const config = await loadConfig(options.config)

  const pages = options.pages.length > 0 ? options.pages : config.pages ?? []
  const baseURL = options.baseURL ?? config.baseURL
  const out = options.out ?? config.out ?? ".shot"
  const widths = options.widths ?? config.widths ?? DEFAULT_WIDTHS
  const tolerance = options.tolerance ?? config.tolerance ?? DEFAULT_TOLERANCE

  if (pages.length === 0) throw new Error("No pages to shoot: pass a page, or set pages in shot.config.mjs")

  const targets = pages.map((page) => {
    const target = resolveTarget(page, baseURL)

    return { target, slug: slugFor(target) }
  })

  const browser = await chromium.launch()
  const failures = []

  for (const { target, slug } of targets) {
    console.log(`\n${slug}`)

    for (const width of widths) {
      const height = HEIGHTS[width] ?? 900
      const directory = resolve(out, slug)
      const baselineFile = resolve(directory, `${width}.png`)
      const actualFile = resolve(directory, `${width}.actual.png`)
      const diffFile = resolve(directory, `${width}.diff.png`)

      const image = await capture(browser, target, width, height)

      if (options.update) {
        await mkdir(directory, { recursive: true })
        await writeFile(baselineFile, image)
        await rm(actualFile, { force: true })
        await rm(diffFile, { force: true })
        console.log(`  ${width}   baseline written`)
        continue
      }

      if (!existsSync(baselineFile)) {
        failures.push({ slug, width, reason: "missing baseline" })
        console.log(`  ${width}   FAIL   missing baseline (run with --update)`)
        continue
      }

      const baseline = await readFile(baselineFile)
      const { changed, total, diff } = compare(baseline, image)

      if (changed / total <= tolerance) {
        await rm(actualFile, { force: true })
        await rm(diffFile, { force: true })
        console.log(`  ${width}   ok`)
        continue
      }

      await mkdir(directory, { recursive: true })
      await writeFile(actualFile, image)
      await writeFile(diffFile, diff)

      failures.push({ slug, width, reason: "difference" })

      console.log(`  ${width}   FAIL   ${formatCount(changed)} of ${formatCount(total)} px differ (${(changed / total * 100).toFixed(2)}%)`)
      console.log(`         baseline  ${baselineFile}`)
      console.log(`         actual    ${actualFile}`)
      console.log(`         diff      ${diffFile}`)
    }
  }

  await browser.close()

  if (options.update) {
    console.log("\nbaselines updated")
    return 0
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} shot${failures.length === 1 ? "" : "s"} failed`)
    return 1
  }

  console.log(`\nall ${targets.length * widths.length} shots match`)
  return 0
}

let options

try {
  options = parseArgs(process.argv.slice(2))
} catch (error) {
  console.error(error.message)
  process.exit(1)
}

if (options.help) {
  console.log(HELP)
  process.exit(0)
}

try {
  process.exit(await run(options))
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
