import process from "node:process"
import { existsSync } from "node:fs"
import { mkdir, rm } from "node:fs/promises"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const command = resolve(root, "shot.mjs")
const output = resolve(root, ".test-output/baselines")

const widths = [ 390, 1280, 1440, 1920 ]

function shot(fixture, ...args) {
  return spawnSync(process.execPath, [
    command,
    resolve(root, "fixtures", fixture, "index.html"),
    "--out", output,
    ...args
  ], { encoding: "utf8" })
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

await rm(resolve(root, ".test-output"), { recursive: true, force: true })
await mkdir(output, { recursive: true })

const update = shot("good", "--update")

if (update.status !== 0) fail(`baseline update should pass, but exited ${update.status}:\n${update.stdout}${update.stderr}`)

for (const width of widths) {
  if (!existsSync(resolve(output, "index", `${width}.png`))) fail(`--update did not write the ${width} baseline`)
}

const good = shot("good")

if (good.status !== 0) fail(`fixtures/good should match its baselines, but exited ${good.status}:\n${good.stdout}${good.stderr}`)

const bad = shot("bad")

if (bad.status === 0) fail(`fixtures/bad should fail, but exited 0:\n${bad.stdout}`)

if (!bad.stdout.includes("390   FAIL")) fail(`fixtures/bad should fail at 390:\n${bad.stdout}`)

for (const width of [ 1280, 1440, 1920 ]) {
  if (bad.stdout.includes(`${width}   FAIL`)) fail(`fixtures/bad should not fail at ${width}:\n${bad.stdout}`)
}

if (!existsSync(resolve(output, "index", "390.diff.png"))) fail("fixtures/bad should leave a diff for 390")
if (!existsSync(resolve(output, "index", "390.actual.png"))) fail("fixtures/bad should leave the actual shot for 390")

for (const width of [ 1280, 1440, 1920 ]) {
  if (existsSync(resolve(output, "index", `${width}.diff.png`))) fail(`fixtures/bad should not leave a diff for ${width}`)
}

const missing = await rm(output, { recursive: true, force: true }).then(() => shot("good"))

if (missing.status === 0 || !missing.stdout.includes("missing baseline")) {
  fail(`a run with no baselines should fail, but exited ${missing.status}:\n${missing.stdout}`)
}

console.log(`fixtures/good matched baselines at ${widths.join(", ")}; fixtures/bad failed at 390 only, with a diff`)
