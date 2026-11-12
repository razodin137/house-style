import process from "node:process"
import { fileURLToPath } from "node:url"
import stylelint from "stylelint"

const expected = [
  "custom-property-pattern",
  "scale-unlimited/declaration-strict-value"
]

const configFile = fileURLToPath(new URL("../index.js", import.meta.url))

const good = await stylelint.lint({
  configFile,
  files: [ fileURLToPath(new URL("../fixtures/good.css", import.meta.url)) ]
})

if (good.errored) {
  const problems = good.results.flatMap((result) => result.warnings)
  console.error(`fixtures/good.css should pass, but stylelint reported:\n${JSON.stringify(problems, null, 2)}`)
  process.exit(1)
}

const bad = await stylelint.lint({
  configFile,
  files: [ fileURLToPath(new URL("../fixtures/bad.css", import.meta.url)) ]
})

if (!bad.errored) {
  console.error("fixtures/bad.css should fail, but stylelint passed it")
  process.exit(1)
}

const counts = new Map()

for (const result of bad.results) {
  for (const warning of result.warnings) {
    counts.set(warning.rule, (counts.get(warning.rule) ?? 0) + 1)
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

console.log(`fixtures/good.css passed; fixtures/bad.css failed with all ${expected.length} expected rules, one violation each`)
