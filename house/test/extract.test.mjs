import test from "node:test"
import assert from "node:assert/strict"
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { extractFiles, extractHtml } from "../src/extract.js"
import { cleanup, makeProject, runHouse } from "./helpers.mjs"

function scratch(t) {
  const directory = mkdtempSync(join(tmpdir(), "house-extract-"))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  return directory
}

const PAGE = `<!doctype html>
<html>
<head>
<style>
a { color: red; }
</style>
</head>
<body>
<script>
console.log("hi")
</script>
</body>
</html>
`

test("extracts inline style and script in document order", (t) => {
  const directory = scratch(t)
  const { text, blocks } = extractHtml(PAGE, { directory, base: "index" })

  assert.deepEqual(
    blocks.map((block) => ({ kind: block.kind, name: block.name, line: block.line, content: block.content })),
    [
      { kind: "css", name: "index.css", line: 4, content: "a { color: red; }" },
      { kind: "js", name: "index.js", line: 9, content: 'console.log("hi")' }
    ]
  )
  assert.match(text, /<link rel="stylesheet" href="index\.css">/)
  assert.match(text, /<script src="index\.js"><\/script>/)
  assert.ok(text.indexOf("<link") < text.indexOf("<script src="))
})

test("extracts text/css styles and preserves link attributes", (t) => {
  const directory = scratch(t)
  const input = [
    '<style type="text/css" media="screen" id="s" class="c" nonce="n" data-x="1" scoped>a{}</style>',
    '<style type="text/less">b{}</style>'
  ].join("\n")

  const { text, blocks } = extractHtml(input, { directory, base: "page" })

  assert.equal(blocks.length, 1)
  assert.equal(
    blocks[0].content,
    "a{}"
  )
  assert.match(text, /^<link rel="stylesheet" href="page\.css" media="screen" id="s" class="c" nonce="n" data-x="1">/)
  assert.ok(text.includes('<style type="text/less">b{}</style>'))
})

test("extracts executable scripts and leaves the rest inline", (t) => {
  const directory = scratch(t)
  const input = [
    '<script type="module">a()</script>',
    '<script type="text/javascript">b()</script>',
    '<script type="application/javascript" id="x" nonce="n" data-y="1">c()</script>',
    '<script type="application/ld+json">{"x":1}</script>',
    '<script type="application/json">{"x":1}</script>',
    '<script type="importmap">{"imports":{}}</script>',
    '<script type="speculationrules">{}</script>',
    '<script type="text/template"><p>x</p></script>',
    '<script type="text/x-custom">z()</script>',
    '<script src="app.js">ignored()</script>'
  ].join("\n")

  const { text, blocks } = extractHtml(input, { directory, base: "page" })

  assert.deepEqual(blocks.map((block) => block.name), [ "page.js", "page-2.js", "page-3.js" ])
  assert.ok(text.includes('<script type="module" src="page.js"></script>'))
  assert.ok(text.includes('<script src="page-2.js"></script>'))
  assert.ok(text.includes('<script id="x" nonce="n" data-y="1" src="page-3.js"></script>'))
  assert.ok(text.includes('<script type="application/ld+json">{"x":1}</script>'))
  assert.ok(text.includes('<script type="application/json">{"x":1}</script>'))
  assert.ok(text.includes('<script type="importmap">{"imports":{}}</script>'))
  assert.ok(text.includes('<script type="speculationrules">{}</script>'))
  assert.ok(text.includes('<script type="text/template"><p>x</p></script>'))
  assert.ok(text.includes('<script type="text/x-custom">z()</script>'))
  assert.ok(text.includes('<script src="app.js">ignored()</script>'))
})

test("drops src, async, defer, and non-module type from extracted scripts", (t) => {
  const directory = scratch(t)
  const input = '<script async defer type="module" id="m" nonce="n">m()</script>'

  const { text } = extractHtml(input, { directory, base: "page" })

  assert.equal(text, '<script type="module" id="m" nonce="n" src="page.js"></script>')
})

test("suffixes multiple blocks and existing files with -2, -3", (t) => {
  const directory = scratch(t)
  const input = "<style>a{}</style><script>b()</script><style>c{}</style>"

  const first = extractHtml(input, { directory, base: "index" })
  assert.deepEqual(first.blocks.map((block) => block.name), [ "index.css", "index.js", "index-2.css" ])
  assert.equal(
    first.text,
    '<link rel="stylesheet" href="index.css"><script src="index.js"></script><link rel="stylesheet" href="index-2.css">'
  )

  writeFileSync(join(directory, "index.css"), "old\n")
  const second = extractHtml(input, { directory, base: "index" })
  assert.deepEqual(second.blocks.map((block) => block.name), [ "index-2.css", "index.js", "index-3.css" ])
})

test("a second run is a no-op", (t) => {
  const directory = scratch(t)
  const first = extractHtml(PAGE, { directory, base: "index" })
  const second = extractHtml(first.text, { directory, base: "index" })

  assert.equal(second.text, first.text)
  assert.deepEqual(second.blocks, [])
})

test("extractFiles checks without writing", (t) => {
  const directory = scratch(t)
  writeFileSync(join(directory, "index.html"), PAGE)

  const { results, created } = extractFiles([ "index.html" ], directory, { write: false })

  assert.equal(results.length, 1)
  assert.deepEqual(results[0].blocks.map((block) => block.name), [ "index.css", "index.js" ])
  assert.deepEqual(created, [])
  assert.equal(existsSync(join(directory, "index.css")), false)
  assert.match(readFileSync(join(directory, "index.html"), "utf8"), /<style>/)
})

test("extractFiles writes sibling files and rewrites the HTML", (t) => {
  const directory = scratch(t)
  writeFileSync(join(directory, "index.html"), PAGE)

  const { created } = extractFiles([ "index.html" ], directory, { write: true })

  assert.deepEqual(created.sort(), [ "index.css", "index.js" ])
  assert.equal(readFileSync(join(directory, "index.css"), "utf8"), "a { color: red; }\n")
  assert.equal(readFileSync(join(directory, "index.js"), "utf8"), 'console.log("hi")\n')

  const html = readFileSync(join(directory, "index.html"), "utf8")
  assert.match(html, /<link rel="stylesheet" href="index\.css">/)
  assert.match(html, /<script src="index\.js"><\/script>/)

  const again = extractFiles([ "index.html" ], directory, { write: true })
  assert.deepEqual(again.results, [])
  assert.deepEqual(again.created, [])
})

test("extractFiles ignores non-HTML files", (t) => {
  const directory = scratch(t)
  writeFileSync(join(directory, "style.css"), "a{}\n")

  const { results, created } = extractFiles([ "style.css" ], directory, { write: true })

  assert.deepEqual(results, [])
  assert.deepEqual(created, [])
})

test("house extract defaults to check", (t) => {
  const root = makeProject({ files: { "index.html": PAGE } })
  t.after(() => cleanup(root))

  const run = runHouse(root, [ "extract" ])

  assert.equal(run.status, 1)
  assert.equal(
    run.stderr,
    "index.html:4: inline <style> is not extracted; run house fix\n" +
    "index.html:9: inline <script> is not extracted; run house fix\n"
  )
  assert.equal(existsSync(join(root, "index.css")), false)
})

test("house extract --write extracts and then checks clean", (t) => {
  const root = makeProject({ files: { "index.html": PAGE } })
  t.after(() => cleanup(root))

  const write = runHouse(root, [ "extract", "--write" ])
  assert.equal(write.status, 0)
  assert.ok(write.stdout.includes("house extract: wrote index.css"))
  assert.ok(write.stdout.includes("house extract: wrote index.js"))
  assert.ok(existsSync(join(root, "index.css")))
  assert.ok(existsSync(join(root, "index.js")))

  const check = runHouse(root, [ "extract", "--check" ])
  assert.equal(check.status, 0)
  assert.equal(check.stderr, "")
})

test("house extract rejects --check with --write", (t) => {
  const root = makeProject({ files: { "index.html": PAGE } })
  t.after(() => cleanup(root))

  const run = runHouse(root, [ "extract", "--check", "--write" ])

  assert.equal(run.status, 2)
  assert.match(run.stderr, /choose --check or --write/)
})
