import { accessSync, constants, statSync } from "node:fs"
import { delimiter, dirname, isAbsolute, join } from "node:path"
import { spawnSync } from "node:child_process"
import { houseRoot } from "./paths.js"

const WINDOWS = process.platform === "win32"

function isExecutable(file) {
  try {
    if (!statSync(file).isFile()) return false
    if (!WINDOWS) accessSync(file, constants.X_OK)
    return true
  } catch {
    return false
  }
}

function extensions() {
  if (!WINDOWS) return [ "" ]
  return (process.env.PATHEXT ?? ".EXE;.CMD;.BAT").split(";")
}

export function findTool(name, cwd) {
  if (isAbsolute(name) || name.includes("/")) return isExecutable(name) ? name : null

  const candidates = []
  let directory = cwd

  while (true) {
    candidates.push(join(directory, "node_modules", ".bin", name))
    const parent = dirname(directory)
    if (parent === directory) break
    directory = parent
  }

  candidates.push(join(houseRoot, "node_modules", ".bin", name))

  for (const entry of (process.env.PATH ?? "").split(delimiter)) {
    if (entry) candidates.push(join(entry, name))
  }

  for (const candidate of candidates) {
    for (const extension of extensions()) {
      const file = candidate + extension
      if (isExecutable(file)) return file
    }
  }

  return null
}

export function runStep(step, cwd) {
  const binary = findTool(step.tool, cwd)
  if (!binary) {
    return {
      ...step,
      status: "missing",
      exitCode: null,
      output: `${step.tool} is not installed or not on PATH`
    }
  }

  const result = spawnSync(binary, step.args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    env: {
      ...process.env,
      NO_COLOR: process.env.NO_COLOR ?? "1"
    }
  })

  const output = [ result.stdout, result.stderr ].filter(Boolean).join("").trim()

  if (result.error) {
    return { ...step, status: "missing", exitCode: null, output: result.error.message }
  }

  return {
    ...step,
    status: result.status === 0 ? "passed" : "failed",
    exitCode: result.status,
    output
  }
}
