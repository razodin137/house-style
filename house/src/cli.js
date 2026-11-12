import { readFileSync } from "node:fs"
import { join } from "node:path"
import { parseArgs } from "node:util"
import { buildPlan } from "./commands.js"
import { groupByLane, discoverFiles } from "./files.js"
import { lanes, laneIds } from "./lanes.js"
import { houseRoot } from "./paths.js"
import { resolveLaneConfig, resolvePrettierConfig } from "./config.js"
import { runStep } from "./run.js"

const VERSION = JSON.parse(readFileSync(join(houseRoot, "package.json"), "utf8")).version

const TOOL_HINTS = {
  bundle: "install bundler, or add a Gemfile-based setup",
  eslint: "npm install --save-dev eslint",
  "html-validate": "npm install --save-dev html-validate",
  prettier: "npm install --save-dev prettier",
  rubocop: "gem install rubocop, or add it to the Gemfile",
  ruff: "mise use ruff, or brew install ruff",
  shellcheck: "mise use shellcheck, or brew install shellcheck",
  shfmt: "mise use shfmt, or brew install shfmt",
  stylelint: "npm install --save-dev stylelint"
}

function colorize(enabled, code, text) {
  return enabled ? `\u001b[${code}m${text}\u001b[0m` : text
}

function useColor(requested) {
  if (requested === "always") return true
  if (requested === "never") return false
  return Boolean(process.stdout.isTTY) && !process.env.NO_COLOR
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`
}

function clip(text, lines = 120, size = 12000) {
  const clipped = text.split("\n").slice(0, lines).join("\n")
  if (clipped.length <= size && clipped.split("\n").length < text.split("\n").length) {
    return `${clipped}\n…`
  }
  if (clipped.length > size) return `${clipped.slice(0, size)}\n…`
  return clipped
}

function indent(text, prefix = "    ") {
  return text
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n")
}

function displayCommand(step) {
  return [ step.tool, ...step.args ].join(" ")
}

function usage() {
  return [
    "house — one house check binary",
    "",
    "Usage:",
    "  house check [options] [paths...]",
    "  house fix [options] [paths...]",
    "",
    "Lanes are chosen by file type, not language:",
    "  js      .js .mjs .cjs .jsx",
    "  css     .css",
    "  scss    .scss",
    "  html    .html .htm",
    "  ruby    .rb .rake .gemspec, Gemfile, Rakefile, ruby shebangs",
    "  shell   .sh .bash .zsh .ksh, shell shebangs",
    "  python  .py .pyi, python shebangs",
    "",
    "Options:",
    "  -l, --lane <id>   only run these lanes (repeat or comma-separate)",
    "      --list        show detected lanes and files, then exit",
    "      --json        machine-readable result",
    "      --verbose     print every command as it runs",
    "      --color <when>  auto, always, or never (default: auto)",
    "  -h, --help        show this help",
    "  -V, --version     show the version",
    "",
    "Exit codes: 0 clean, 1 checks failed, 2 configuration or tool error."
  ].join("\n")
}

function parse(argv) {
  try {
    const parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        lane: { type: "string", multiple: true, short: "l" },
        list: { type: "boolean" },
        json: { type: "boolean" },
        verbose: { type: "boolean" },
        color: { type: "string" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "V" }
      }
    })

    return { values: parsed.values, positionals: parsed.positionals, error: null }
  } catch (error) {
    return { values: {}, positionals: [], error: error.message }
  }
}

function requestedLanes(values) {
  const requested = []

  for (const value of values.lane ?? []) {
    for (const id of value.split(",")) {
      const lane = id.trim()
      if (lane) requested.push(lane)
    }
  }

  return requested
}

function selectedLanes(requested) {
  if (requested.length === 0) return lanes

  const unknown = requested.filter((id) => !laneIds.includes(id))
  if (unknown.length > 0) return { unknown }

  return lanes.filter((lane) => requested.includes(lane.id))
}

function summarize(laneResults, command, fileCount, cwd, exitCode) {
  return {
    command,
    cwd,
    files: fileCount,
    lanes: laneResults.map((result) => ({
      id: result.id,
      title: result.title,
      files: result.files,
      status: result.status,
      error: result.error,
      steps: result.steps.map((step) => ({
        phase: step.phase,
        tool: step.tool,
        args: step.args,
        status: step.status,
        exitCode: step.exitCode,
        output: step.output
      }))
    })),
    exitCode
  }
}

function printLaneLine(result, command, color) {
  const status = {
    ok: command === "fix" ? colorize(color, "32", "fixed and clean") : colorize(color, "32", "ok"),
    failed: colorize(color, "31", "FAILED"),
    missing: colorize(color, "33", "tool missing"),
    error: colorize(color, "33", "not configured")
  }[result.status]

  const suffix = result.status === "error" ? `  ${result.error}` : ""
  return `${result.id.padEnd(6)} ${plural(result.files.length, "file").padEnd(9)} ${status}${suffix}`
}

function printDetails(result, color, verbose) {
  const lines = []

  if (result.error) lines.push(`  ${result.error}`)

  for (const step of result.steps) {
    if (step.status === "passed" && !verbose) continue

    const marker = step.status === "passed" ? "·" : step.status === "missing" ? "!" : "✗"
    const paint = step.status === "passed" ? "2" : step.status === "missing" ? "33" : "31"
    const phase = step.phase === "fix" ? "fix" : "check"
    lines.push(`  ${colorize(color, paint, marker)} ${phase} ${step.label} (${displayCommand(step)})`)

    if (step.status === "missing") {
      const hint = TOOL_HINTS[step.tool]
      if (hint) lines.push(`      ${hint}`)
    }

    if (step.output && (verbose || step.status !== "passed")) {
      lines.push(indent(clip(step.output), "      "))
    }
  }

  return lines
}

export async function main(argv) {
  const parsed = parse(argv)

  if (parsed.error) {
    process.stderr.write(`house: ${parsed.error}\n\n${usage()}\n`)
    return 2
  }

  const { values, positionals } = parsed

  if (values.help) {
    process.stdout.write(`${usage()}\n`)
    return 0
  }

  if (values.version) {
    process.stdout.write(`${VERSION}\n`)
    return 0
  }

  const command = positionals[0]
  if (command !== "check" && command !== "fix") {
    process.stderr.write(`house: expected "check" or "fix"\n\n${usage()}\n`)
    return 2
  }

  const color = useColor(values.color ?? "auto")
  const cwd = process.cwd()
  const paths = positionals.slice(1)
  const files = discoverFiles(cwd, paths)
  const groups = groupByLane(files, cwd)
  const requested = requestedLanes(values)
  const selected = selectedLanes(requested)

  if (selected.unknown) {
    process.stderr.write(`house: unknown lane ${selected.unknown.join(", ")} (known: ${laneIds.join(", ")})\n`)
    return 2
  }

  if (values.list) {
    if (values.json) {
      const listed = selected.map((lane) => ({
        id: lane.id,
        title: lane.title,
        files: groups.get(lane.id) ?? []
      }))
      process.stdout.write(`${JSON.stringify({ command: "list", cwd, lanes: listed }, null, 2)}\n`)
      return 0
    }

    const lines = [ `house lanes in ${cwd}` ]
    for (const lane of selected) {
      const laneFiles = groups.get(lane.id) ?? []
      const preview = laneFiles.slice(0, 3).join(", ")
      lines.push(`  ${lane.id.padEnd(6)} ${String(laneFiles.length).padStart(3)}  ${preview}`)
    }
    process.stdout.write(`${lines.join("\n")}\n`)
    return 0
  }

  const toRun = selected
    .map((lane) => ({ lane, files: groups.get(lane.id) ?? [] }))
    .filter((entry) => entry.files.length > 0)

  if (toRun.length === 0) {
    process.stdout.write(`house ${command}: no supported files found\n`)
    return 0
  }

  const laneResults = []

  for (const { lane, files: laneFiles } of toRun) {
    const config = resolveLaneConfig(lane.id, cwd)
    const prettier = lane.id === "css" || lane.id === "scss" ? resolvePrettierConfig(cwd) : null
    const error = config.error ?? prettier?.error ?? null

    if (error) {
      laneResults.push({
        id: lane.id,
        title: lane.title,
        files: laneFiles,
        status: "error",
        error,
        steps: []
      })
      continue
    }

    const plan = buildPlan(lane.id, laneFiles, {
      config: config.config,
      prettier: prettier?.config ?? null,
      cwd,
      fix: command === "fix"
    })

    const steps = []
    if (command === "fix") {
      for (const step of plan.fix) steps.push({ ...step, phase: "fix" })
    }
    for (const step of plan.check) steps.push({ ...step, phase: "check" })

    const results = []
    for (const step of steps) {
      if (values.verbose) {
        process.stdout.write(`${colorize(color, "2", `→ ${step.phase} ${displayCommand(step)}`)}\n`)
      }
      results.push({ ...runStep(step, cwd), phase: step.phase })
    }

    let status = "ok"
    if (results.some((step) => step.status === "missing")) status = "missing"
    else if (results.some((step) => step.status === "failed")) status = "failed"

    laneResults.push({
      id: lane.id,
      title: lane.title,
      files: laneFiles,
      status,
      error: null,
      steps: results
    })
  }

  const failed = laneResults.filter((result) => result.status === "failed").length
  const missing = laneResults.filter((result) => result.status === "missing").length
  const errored = laneResults.filter((result) => result.status === "error").length
  const exitCode = failed > 0 ? 1 : missing + errored > 0 ? 2 : 0

  if (values.json) {
    process.stdout.write(`${JSON.stringify(summarize(laneResults, command, files.length, cwd, exitCode), null, 2)}\n`)
    return exitCode
  }

  const lines = [ `house ${command}: ${plural(laneResults.length, "lane")}, ${plural(files.length, "file")}`, "" ]
  for (const result of laneResults) {
    lines.push(printLaneLine(result, command, color))
    lines.push(...printDetails(result, color, values.verbose))
  }

  lines.push("")
  const passed = laneResults.filter((result) => result.status === "ok").length
  lines.push(`house: ${passed} passed, ${failed} failed${missing ? `, ${missing} missing tools` : ""}${errored ? `, ${errored} misconfigured` : ""}`)

  process.stdout.write(`${lines.join("\n")}\n`)
  return exitCode
}
