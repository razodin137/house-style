import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { spawnSync } from "node:child_process"
import { findTool } from "./run.js"

// A browser ends a script at the first </script, so a lazy match is the
// spec-correct way to find the block boundaries. The same holds for <style>.
const BLOCK = /<(style|script)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi
const ATTRIBUTE = /(?:^|\s)([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi
const SRC = /(?:^|\s)src(?:\s*=|[\s/]|$)/i
const BLANK_PREFIX = /^[ \t]*$/
const LEADING_NEWLINE = /^[ \t]*\r?\n/
const NEWLINE = /\r?\n/
const TRAILING_NEWLINE = /\r?\n$/
const LEADING_INDENT = /^[ \t]*/
const ESCAPED_NEWLINE = /\\\r?\n/

const JS_TYPES = new Set([
  "",
  "module",
  "text/javascript",
  "application/javascript",
  "text/ecmascript",
  "application/ecmascript"
])

const JSON_TYPES = new Set([
  "application/json",
  "application/ld+json",
  "importmap",
  "speculationrules"
])

function attribute(attrs, name) {
  for (const match of attrs.matchAll(ATTRIBUTE)) {
    if (match[1].toLowerCase() === name) return match[2] ?? match[3] ?? match[4] ?? ""
  }

  return null
}

function hasSrc(attrs) {
  return SRC.test(attrs)
}

// Returns the Prettier parser extension for a block, or null when the block is
// not plain CSS, JavaScript, or JSON and should be left alone.
function extensionFor(tag, attrs) {
  if (tag.toLowerCase() === "style") {
    const type = (attribute(attrs, "type") ?? "").trim().toLowerCase()
    return type === "" || type === "text/css" ? "css" : null
  }

  if (hasSrc(attrs)) return null

  const type = (attribute(attrs, "type") ?? "").trim().toLowerCase()
  if (JSON_TYPES.has(type)) return "json"
  if (JS_TYPES.has(type)) return "js"
  return null
}

function indentAt(text, offset) {
  const start = text.lastIndexOf("\n", offset - 1) + 1
  const prefix = text.slice(start, offset)
  return BLANK_PREFIX.test(prefix) ? prefix : ""
}

// Prefixing every line is safe unless the body can span lines inside a literal.
// A JS template literal or a CSS escaped-newline string would gain the prefix
// as part of its value, so those bodies stay at column 0 instead.
function canReindent(extension, formatted) {
  if (extension === "json") return true
  return !formatted.includes("`") && !ESCAPED_NEWLINE.test(formatted)
}

function rebuildBlock(content, formatted, tagIndent, extension) {
  const lines = formatted.replace(TRAILING_NEWLINE, "").split(NEWLINE)

  if (!canReindent(extension, formatted)) {
    return `\n${lines.join("\n")}\n${tagIndent}`
  }

  let baseIndent = null

  if (LEADING_NEWLINE.test(content)) {
    const [ first ] = content.split(NEWLINE).filter((line) => line.trim() !== "")
    if (first !== undefined) [ baseIndent ] = first.match(LEADING_INDENT)
  }

  if (baseIndent === null) baseIndent = `${tagIndent}  `

  const body = lines.map((line) => (line === "" ? "" : `${baseIndent}${line}`)).join("\n")
  return `\n${body}\n${tagIndent}`
}

// Rewrites the body of each supported <style>/<script> block through `format`
// and leaves the surrounding markup, attributes, and closing tags untouched.
export function formatEmbedded(text, format) {
  const blocks = []

  const formattedText = text.replace(BLOCK, (match, tag, attrs, content, offset) => {
    const extension = extensionFor(tag, attrs)
    if (extension === null || content.trim() === "") return match

    const formatted = format(extension, content)
    const next =
      formatted === null || formatted === undefined
        ? content
        : rebuildBlock(content, formatted, indentAt(text, offset), extension)

    blocks.push({
      kind: tag.toLowerCase(),
      extension,
      line: text.slice(0, offset).split("\n").length,
      changed: next !== content
    })

    return next === content ? match : `<${tag}${attrs}>${next}</${tag}>`
  })

  return { text: formattedText, blocks }
}

function formatBlock(prettier, config, file, extension, content) {
  const args = []
  if (config) args.push("--config", config)
  args.push("--stdin-filepath", join(dirname(resolve(file)), `embedded.${extension}`))

  const result = spawnSync(prettier, args, {
    input: content,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, NO_COLOR: "1" }
  })

  if (result.error || result.status !== 0) return null
  return result.stdout
}

function hasSupportedBlocks(text) {
  let found = false

  text.replace(BLOCK, (match, tag, attrs, content) => {
    if (extensionFor(tag, attrs) !== null && content.trim() !== "") found = true
    return match
  })

  return found
}

function report(files, write, config, findPrettier) {
  let failed = false

  for (const file of files) {
    let text = null

    try {
      text = readFileSync(file, "utf8")
    } catch (error) {
      process.stderr.write(`${file}: ${error.message}\n`)
      failed = true
    }

    if (text !== null) {
      // An HTML file with nothing inline is already acceptable, so it must
      // not require Prettier just because this lane ran.
      if (!hasSupportedBlocks(text)) continue

      const prettier = findPrettier()
      if (!prettier) {
        process.stderr.write(
          write
            ? `${file}: inline blocks need prettier to format them\n`
            : `${file}: inline blocks need prettier to check formatting; run house fix\n`
        )
        failed = true
        continue
      }

      const result = formatEmbedded(text, (extension, content) =>
        formatBlock(prettier, config, file, extension, content)
      )
      const changed = result.blocks.filter((block) => block.changed)

      if (changed.length > 0) {
        if (write) {
          writeFileSync(file, result.text)
        } else {
          failed = true
          for (const block of changed) {
            process.stderr.write(
              `${file}:${block.line}: embedded <${block.kind}> is not formatted; run house fix\n`
            )
          }
        }
      }
    }
  }

  return failed ? 1 : 0
}

function main(argv) {
  let config = null
  let write = false
  const files = []

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === "--config") {
      index += 1
      config = argv[index] ?? null
    } else if (arg === "--write") {
      write = true
    } else if (arg === "--check") {
      write = false
    } else {
      files.push(arg)
    }
  }

  let prettier
  const findPrettier = () => {
    if (prettier === undefined) prettier = findTool("prettier", process.cwd())
    return prettier
  }

  return report(files, write, config, findPrettier)
}

const isMain =
  process.argv[1] !== undefined &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url

if (isMain) process.exitCode = main(process.argv.slice(2))
