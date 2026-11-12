import { readFile } from "node:fs/promises"
import process from "node:process"
import { fileURLToPath } from "node:url"
import prettier from "prettier"
import config from "../index.js"

const languages = [ "css", "scss" ]

const failures = []

for (const language of languages) {
  const goodFile = fileURLToPath(new URL(`../fixtures/good.${language}`, import.meta.url))
  const badFile = fileURLToPath(new URL(`../fixtures/bad.${language}`, import.meta.url))
  const good = await readFile(goodFile, "utf8")
  const bad = await readFile(badFile, "utf8")

  const formattedGood = await prettier.format(good, { ...config, filepath: goodFile })

  if (formattedGood !== good) {
    failures.push(`fixtures/good.${language} should be formatted already, but prettier would rewrite it to:\n\n${formattedGood}`)
  }

  const formattedBad = await prettier.format(bad, { ...config, filepath: badFile })

  if (formattedBad !== good) {
    failures.push(`fixtures/bad.${language} should format to fixtures/good.${language}, but prettier produced:\n\n${formattedBad}`)
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"))
  process.exit(1)
}

console.log("fixtures/good.{css,scss} pass clean; fixtures/bad.{css,scss} reformat to exactly their pinned good output")
