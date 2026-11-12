import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { delimiter, dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

const here = dirname(fileURLToPath(import.meta.url))
const bin = resolve(here, "..", "bin", "house.js")
const scratch = join(here, ".tmp")

const CONFIG_PACKAGES = {
  "@razodin137/eslint-config": { main: "index.js", type: "module", body: "export default { rules: {} }\n" },
  "@razodin137/stylelint-config-css": { main: "index.js", body: "module.exports = { rules: {} }\n" },
  "@razodin137/stylelint-config-scss": { main: "index.js", body: "module.exports = { rules: {} }\n" },
  "@razodin137/prettier-config": { main: "index.js", body: "module.exports = { semi: false }\n" },
  "@razodin137/html-validate-config": { main: "index.js", body: "module.exports = { rules: {} }\n" }
}

const FAKE_TOOL = `#!/usr/bin/env node
const fs = require("node:fs")

const tool = process.argv[1].split("/").pop()
const args = process.argv.slice(2)

if (process.env.HOUSE_LOG) {
  fs.appendFileSync(process.env.HOUSE_LOG, JSON.stringify({ tool, args }) + "\\n")
}

const failing = (process.env.HOUSE_FAIL_TOOL ?? "").split(",").filter(Boolean)
if (failing.includes(tool)) {
  process.stdout.write("fake " + tool + " failure\\n")
  process.exit(1)
}

process.stdout.write("fake " + tool + " ok\\n")
`

export function makeProject({ files = {}, configs = true } = {}) {
  mkdirSync(scratch, { recursive: true })
  const root = mkdtempSync(join(scratch, "project-"))

  for (const [ path, content ] of Object.entries(files)) {
    const target = join(root, path)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, content)
  }

  if (configs) {
    for (const [ name, pkg ] of Object.entries(CONFIG_PACKAGES)) {
      const directory = join(root, "node_modules", name)
      mkdirSync(directory, { recursive: true })
      writeFileSync(join(directory, "package.json"), JSON.stringify({
        name,
        version: "0.1.0",
        main: pkg.main,
        ...(pkg.type ? { type: pkg.type } : {})
      }))
      writeFileSync(join(directory, pkg.main), pkg.body)
    }
  }

  return root
}

export function makeTools(root, names = [ "eslint", "stylelint", "prettier", "html-validate", "rubocop", "bundle", "shellcheck", "shfmt", "ruff" ]) {
  const directory = join(root, ".fake-bin")
  mkdirSync(directory, { recursive: true })

  for (const name of names) {
    const file = join(directory, name)
    writeFileSync(file, FAKE_TOOL)
    chmodSync(file, 0o755)
  }

  return directory
}

export function runHouse(root, args, { tools, extraEnv = {} } = {}) {
  const log = join(root, ".invocations.jsonl")
  const toolPath = tools ?? makeTools(root)
  const result = spawnSync(process.execPath, [ bin, ...args ], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${toolPath}${delimiter}${process.env.PATH ?? ""}`,
      HOUSE_LOG: log,
      ...extraEnv
    }
  })

  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    invocations: readInvocations(log)
  }
}

export function readInvocations(log) {
  if (!existsSync(log)) return []
  return readFileSync(log, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
}

export function cleanup(root) {
  rmSync(root, { recursive: true, force: true })
}

export function invocationsFor(invocations, tool) {
  return invocations.filter((entry) => entry.tool === tool)
}

export function argsOf(entry) {
  return entry.args
}

export function hasFlag(entry, flag) {
  return entry.args.includes(flag)
}

export function flagValue(entry, flag) {
  const index = entry.args.indexOf(flag)
  return index === -1 ? null : entry.args[index + 1]
}
