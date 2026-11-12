import { closeSync, existsSync, openSync, readdirSync, readSync, statSync } from "node:fs"
import { extname, join, relative, resolve, sep } from "node:path"
import { spawnSync } from "node:child_process"
import { detectLane } from "./lanes.js"

const IGNORED_DIRS = new Set([
  ".bundle",
  ".cache",
  ".git",
  ".next",
  ".nuxt",
  ".venv",
  "__pycache__",
  "build",
  "coverage",
  "dist",
  "log",
  "node_modules",
  "target",
  "tmp",
  "vendor"
])

const MAX_HEAD = 256

function toPosix(file) {
  return file.split(sep).join("/")
}

function headOf(file, fullPath) {
  if (extname(file)) return null

  let descriptor = null
  try {
    descriptor = openSync(fullPath, "r")
    const buffer = Buffer.alloc(MAX_HEAD)
    const read = readSync(descriptor, buffer, 0, MAX_HEAD, 0)
    return buffer.toString("utf8", 0, read).split("\n")[0]
  } catch {
    return null
  } finally {
    if (descriptor !== null) closeSync(descriptor)
  }
}

function walk(directory, cwd) {
  const files = []

  function visit(absolute) {
    let entries = []
    try {
      entries = readdirSync(absolute, { withFileTypes: true })
    } catch {
      return
    }

    entries.sort((a, b) => a.name.localeCompare(b.name))

    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue

      const child = join(absolute, entry.name)
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue
        visit(child)
      } else if (entry.isFile()) {
        files.push(toPosix(relative(cwd, child)))
      }
    }
  }

  visit(directory)
  return files
}

function gitFiles(cwd) {
  const result = spawnSync("git", [ "ls-files", "--cached", "--others", "--exclude-standard", "-z" ], {
    cwd,
    encoding: "buffer",
    maxBuffer: 64 * 1024 * 1024
  })

  if (result.status !== 0 || !result.stdout) return null

  return result.stdout
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .map(toPosix)
}

export function discoverFiles(cwd, inputs) {
  const seen = new Set()
  const files = []

  function add(file) {
    const normalized = toPosix(file)
    if (!normalized || seen.has(normalized)) return
    if (!existsSync(resolve(cwd, normalized))) return
    seen.add(normalized)
    files.push(normalized)
  }

  if (inputs.length > 0) {
    for (const input of inputs) {
      const absolute = resolve(cwd, input)
      if (!existsSync(absolute)) continue

      if (statSync(absolute).isDirectory()) {
        for (const file of walk(absolute, cwd)) add(file)
      } else {
        add(input)
      }
    }
  } else {
    const listed = gitFiles(cwd)
    if (listed) {
      for (const file of listed) add(file)
    } else {
      for (const file of walk(cwd, cwd)) add(file)
    }
  }

  return files.sort((a, b) => a.localeCompare(b))
}

export function groupByLane(files, cwd) {
  const groups = new Map()

  for (const file of files) {
    const head = headOf(file, resolve(cwd, file))
    const lane = detectLane(file, head)
    if (!lane) continue

    const group = groups.get(lane.id) ?? []
    group.push(file)
    groups.set(lane.id, group)
  }

  return groups
}
