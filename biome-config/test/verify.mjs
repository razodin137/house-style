import { execFileSync, spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import process from "node:process"
import { fileURLToPath } from "node:url"

const config = fileURLToPath(new URL("../configs/recommended.json", import.meta.url))
const fixture = (name) => fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url))
const biome = process.env.BIOME_BIN ?? "biome"

const htmlRules = [
  "noAccessKey",
  "noAmbiguousAnchorText",
  "noAriaUnsupportedElements",
  "noAutofocus",
  "noHeaderScope",
  "noInteractiveElementToNoninteractiveRole",
  "noLabelWithoutControl",
  "noNoninteractiveElementToInteractiveRole",
  "noNoninteractiveTabindex",
  "noPositiveTabindex",
  "noRedundantAlt",
  "noStaticElementInteractions",
  "noSvgWithoutTitle",
  "useAriaActivedescendantWithTabindex",
  "useAriaPropsForRole",
  "useAriaPropsSupportedByRole",
  "useButtonType",
  "useFocusableInteractive",
  "useHtmlLang",
  "useIframeTitle",
  "useKeyWithClickEvents",
  "useKeyWithMouseEvents",
  "useMediaCaption",
  "useValidAnchor",
  "useValidAriaProps",
  "useValidAriaRole",
  "useValidAriaValues",
  "useValidLang"
]

try {
  execFileSync(biome, [ "--version" ], { stdio: "ignore" })
} catch {
  console.error("biome is required to run these tests (install @biomejs/biome, or set BIOME_BIN)")
  process.exit(1)
}

function format(name, source) {
  return execFileSync(biome, [ "format", `--config-path=${config}`, `--stdin-file-path=${fixture(name)}` ], {
    encoding: "utf8",
    input: source,
    stdio: [ "pipe", "pipe", "pipe" ]
  })
}

function check(files) {
  return execFileSync(biome, [ "check", `--config-path=${config}`, ...files ], {
    encoding: "utf8",
    stdio: [ "ignore", "pipe", "pipe" ]
  })
}

function lint(files) {
  const result = spawnSync(biome, [ "lint", "--reporter=json", `--config-path=${config}`, ...files ], {
    encoding: "utf8",
    stdio: [ "ignore", "pipe", "pipe" ]
  })

  if (result.error) {
    throw result.error
  }

  return JSON.parse(result.stdout)
}

const languages = [ "md", "yaml" ]
const failures = []

for (const language of languages) {
  const good = readFileSync(fixture(`good.${language}`), "utf8")
  const bad = readFileSync(fixture(`bad.${language}`), "utf8")

  if (format(`good.${language}`, good) !== good) {
    failures.push(`fixtures/good.${language} should be formatted already, but biome would rewrite it`)
  }

  if (format(`bad.${language}`, bad) !== good) {
    failures.push(`fixtures/bad.${language} should format to fixtures/good.${language}`)
  }
}

try {
  check([ fixture("good.md"), fixture("good.yaml"), fixture("good.html") ])
} catch {
  failures.push("fixtures/good.md, fixtures/good.yaml, and fixtures/good.html should pass biome check")
}

let badRejected = false

try {
  check([ fixture("bad.md"), fixture("bad.yaml") ])
} catch {
  badRejected = true
}

if (!badRejected) {
  failures.push("fixtures/bad.md and fixtures/bad.yaml should fail biome check")
}

try {
  check([ fixture("good.md"), fixture("good.yaml"), fixture("ignored.js") ])
} catch {
  failures.push("fixtures/ignored.js should be ignored: the config must not format or lint JavaScript")
}

const goodHtml = lint([ fixture("good.html") ])

if (goodHtml.diagnostics.length > 0) {
  const rules = goodHtml.diagnostics.map((diagnostic) => diagnostic.category.split("/").pop())
  failures.push(`fixtures/good.html should pass lint, but biome reported: ${rules.join(", ")}`)
}

const badHtml = lint([ fixture("bad.html") ])
const htmlCounts = new Map()

for (const diagnostic of badHtml.diagnostics) {
  const rule = diagnostic.category.split("/").pop()
  htmlCounts.set(rule, (htmlCounts.get(rule) ?? 0) + 1)
}

for (const rule of htmlRules) {
  if (htmlCounts.get(rule) !== 1) {
    failures.push(`expected exactly one "${rule}" lint violation, found ${htmlCounts.get(rule) ?? 0}`)
  }
}

for (const [ rule, count ] of htmlCounts) {
  if (!htmlRules.includes(rule)) {
    failures.push(`unexpected "${rule}" lint violation (x ${count})`)
  }
}

let htmlFormatRejected = false

try {
  format("bad.html", readFileSync(fixture("bad.html"), "utf8"))
} catch {
  htmlFormatRejected = true
}

if (!htmlFormatRejected) {
  failures.push("fixtures/bad.html should not be formatted: HTML formatting stays off")
}

if (failures.length > 0) {
  console.error(failures.join("\n"))
  process.exit(1)
}

console.log(`fixtures/good.{md,yaml} pass clean; fixtures/bad.{md,yaml} reformat to exactly their pinned good output; fixtures/good.html passes lint; fixtures/bad.html fails with all ${htmlRules.length} expected a11y rules, one violation each; JavaScript is left alone`)
