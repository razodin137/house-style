import process from "node:process"
import { fileURLToPath } from "node:url"
import { HtmlValidate, StaticConfigLoader } from "html-validate"
import config from "../index.js"

const expected = [
  "attr-quotes",
  "element-required-attributes",
  "heading-level",
  "input-missing-label",
  "no-dup-id",
  "no-implicit-button-type",
  "no-inline-style",
  "valid-for",
  "void-style",
  "wcag/h37"
]

const htmlvalidate = new HtmlValidate(new StaticConfigLoader(config))

const good = await htmlvalidate.validateFile(fileURLToPath(new URL("../fixtures/good.html", import.meta.url)))

if (!good.valid) {
  const problems = good.results.flatMap((result) => result.messages)
  console.error(`fixtures/good.html should pass, but html-validate reported:\n${JSON.stringify(problems, null, 2)}`)
  process.exit(1)
}

const bad = await htmlvalidate.validateFile(fileURLToPath(new URL("../fixtures/bad.html", import.meta.url)))

if (bad.valid) {
  console.error("fixtures/bad.html should fail, but html-validate passed it")
  process.exit(1)
}

const counts = new Map()

for (const result of bad.results) {
  for (const message of result.messages) {
    counts.set(message.ruleId, (counts.get(message.ruleId) ?? 0) + 1)
  }
}

const failures = []

for (const rule of expected) {
  if (counts.get(rule) !== 1) {
    failures.push(`expected exactly one "${rule}" violation, found ${counts.get(rule) ?? 0}`)
  }
}

for (const [ rule, count ] of counts) {
  if (!expected.includes(rule)) {
    failures.push(`unexpected "${rule}" violation (x ${count})`)
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"))
  process.exit(1)
}

console.log(`fixtures/good.html passed; fixtures/bad.html failed with all ${expected.length} expected rules, one violation each`)
