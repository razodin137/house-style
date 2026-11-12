import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { basename, dirname, extname, join, relative, resolve } from "node:path"
import { pathToFileURL } from "node:url"

// A browser ends a script at the first </script, so a lazy match is the
// spec-correct way to find the block boundaries. The same holds for <style>.
const BLOCK = /<(style|script)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi
const ATTRIBUTE = /([^\s=/>]+)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/g
const HTML_EXTENSIONS = new Set([ ".html", ".htm" ])

const JS_TYPES = new Set([
  "",
  "module",
  "text/javascript",
  "application/javascript",
  "text/ecmascript",
  "application/ecmascript"
])

function parseAttributes(attrs) {
  const parsed = []

  ATTRIBUTE.lastIndex = 0
  let match
  while ((match = ATTRIBUTE.exec(attrs)) !== null) {
    const raw = match[0]
    const equals = raw.indexOf("=")
    let value = equals === -1 ? "" : raw.slice(equals + 1).trim()
    const quoted =
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))

    if (quoted) value = value.slice(1, -1)
    parsed.push({ name: match[1].toLowerCase(), raw, value })
  }

  return parsed
}

function kindFor(tag, attrs) {
  const parsed = parseAttributes(attrs)
  const type = (parsed.find((attribute) => attribute.name === "type")?.value ?? "")
    .trim()
    .toLowerCase()

  if (tag.toLowerCase() === "style") {
    return type === "" || type === "text/css" ? "css" : null
  }

  // A script with src already points at an external file, and a whitelist of
  // executable types leaves JSON-LD, import maps, templates, and unknown
  // types inline on purpose.
  if (parsed.some((attribute) => attribute.name === "src")) return null
  return JS_TYPES.has(type) ? "js" : null
}

// `type`/`scoped` move to the link element implicitly, and `src`/`async`/
// `defer` must not be carried over from an inline script: they were inert
// inline and would change timing externally. Every other attribute (media,
// id, class, nonce, data-*) is copied verbatim.
function replacementFor(tag, attrs, name) {
  const parsed = parseAttributes(attrs)
  const kept = (drop) =>
    parsed
      .filter((attribute) => !drop.has(attribute.name))
      .map((attribute) => attribute.raw)

  if (tag.toLowerCase() === "style") {
    const attributes = kept(new Set([ "type", "scoped" ]))
    const suffix = attributes.length > 0 ? ` ${attributes.join(" ")}` : ""
    return `<link rel="stylesheet" href="${name}"${suffix}>`
  }

  const attributes = kept(new Set([ "src", "async", "defer", "type" ]))
  const type = parsed.find((attribute) => attribute.name === "type")?.value ?? ""
  const module = type.trim().toLowerCase() === "module" ? ' type="module"' : ""
  const suffix = attributes.length > 0 ? ` ${attributes.join(" ")}` : ""
  return `<script${module}${suffix} src="${name}"></script>`
}

function uniqueName(directory, base, extension, reserved) {
  for (let index = 1; ; index += 1) {
    const suffix = index === 1 ? "" : `-${index}`
    const name = `${base}${suffix}.${extension}`
    const path = resolve(directory, name)
    if (!reserved.has(path) && !existsSync(path)) {
      reserved.add(path)
      return name
    }
  }
}

// Rewrites each inline <style>/<script> block into a sibling file and replaces
// the element with a link or an external script. Markup, attributes, and block
// order are preserved.
export function extractHtml(text, { directory = ".", base = "page", reserved = new Set() } = {}) {
  const blocks = []

  const extracted = text.replace(BLOCK, (match, tag, attrs, content, offset) => {
    const kind = kindFor(tag, attrs)
    if (kind === null || content.trim() === "") return match

    const name = uniqueName(directory, base, kind, reserved)
    blocks.push({
      kind,
      name,
      line: text.slice(0, offset).split("\n").length,
      content: content.trim()
    })

    return replacementFor(tag, attrs, name)
  })

  return { text: extracted, blocks }
}

function isHtml(file) {
  return HTML_EXTENSIONS.has(extname(file).toLowerCase())
}

// Extracts every HTML file in `files`. In check mode nothing is written; the
// caller reports the returned blocks. In write mode the sibling files and the
// rewritten HTML are written, and `created` lists the new paths.
export function extractFiles(files, cwd = process.cwd(), { write = false } = {}) {
  const reserved = new Set()
  const results = []
  const created = []

  for (const file of files) {
    if (!isHtml(file)) continue

    const absolute = resolve(cwd, file)
    const text = readFileSync(absolute, "utf8")
    const directory = dirname(absolute)

    const result = extractHtml(text, {
      directory,
      base: basename(file, extname(file)),
      reserved
    })

    if (result.blocks.length === 0) continue
    results.push({ file, blocks: result.blocks })

    if (!write) continue

    for (const block of result.blocks) {
      const target = join(directory, block.name)
      writeFileSync(target, `${block.content}\n`)
      created.push(relative(cwd, target))
    }

    writeFileSync(absolute, result.text)
  }

  return { results, created }
}

function report(results) {
  let failed = false

  for (const { file, blocks } of results) {
    for (const block of blocks) {
      const tag = block.kind === "css" ? "style" : "script"
      process.stderr.write(
        `${file}:${block.line}: inline <${tag}> is not extracted; run house fix\n`
      )
      failed = true
    }
  }

  return failed ? 1 : 0
}

// Used by the html lane's check step: `node src/extract.js --check <files>`.
// The `house extract` subcommand wraps the same functions for direct use.
function main(argv) {
  let write = false
  const files = []

  for (const arg of argv) {
    if (arg === "--write") write = true
    else if (arg === "--check") write = false
    else files.push(arg)
  }

  const { results } = extractFiles(files, process.cwd(), { write })
  return write ? 0 : report(results)
}

const isMain =
  process.argv[1] !== undefined &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url

if (isMain) process.exitCode = main(process.argv.slice(2))
