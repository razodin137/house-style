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
  gh: "install the GitHub CLI, then gh extension install basecamp/gh-signoff",
  "html-validate": "npm install --save-dev html-validate",
  prettier: "npm install --save-dev prettier",
  rubocop: "gem install rubocop, or add it to the Gemfile",
  ruff: "mise use ruff, or brew install ruff",
  shellcheck: "mise use shellcheck, or brew install shellcheck",
  shfmt: "mise use shfmt, or brew install shfmt",
  stylelint: "npm install --save-dev stylelint"
}

const STEP_MARKS = {
  failed: { marker: "✗", paint: "31" },
  missing: { marker: "!", paint: "33" },
  passed: { marker: "·", paint: "2" }
}

function colorize(enabled, code, text) {
  return enabled ? `\u001B[${code}m${text}\u001B[0m` : text
}

function resolveColor(requested) {
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
    "  house signoff [options] [paths...]",
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
    "Signoff options:",
    "      --context <name>  sign off this context (repeat or comma-separate)",
    "      --commit <rev>    sign off this commit instead of HEAD",
    "      --url <url>       Details link for the status",
    "  -f, --force           sign off without checking the commit is pushed",
    "      --fail            post gh signoff fail when the check fails",
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
        context: { type: "string", multiple: true },
        commit: { type: "string" },
        url: { type: "string" },
        force: { type: "boolean", short: "f" },
        fail: { type: "boolean" },
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

function signoffContexts(values) {
  const contexts = []

  for (const value of values.context ?? []) {
    for (const name of value.split(",")) {
      const context = name.trim()
      if (context) contexts.push(context)
    }
  }

  return contexts
}

function signoffArgs(values, contexts, reportFailure) {
  const args = [ "signoff" ]

  if (!reportFailure && values.force) args.push("-f")
  if (values.commit) args.push("--commit", values.commit)
  if (values.url) args.push("--url", values.url)
  if (reportFailure) args.push("fail")

  return [ ...args, ...contexts ]
}

function signoffFlagsUsed(values) {
  return Boolean(
    (values.context && values.context.length > 0) ||
    values.commit ||
    values.url ||
    values.force ||
    values.fail
  )
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
    if (step.status !== "passed" || verbose) {
      const { marker, paint } = STEP_MARKS[step.status] ?? STEP_MARKS.failed
      const phase = step.phase === "fix" ? "fix" : "check"
      lines.push(`  ${colorize(color, paint, marker)} ${phase} ${step.label} (${displayCommand(step)})`)

      if (step.status === "missing") {
        const hint = TOOL_HINTS[step.tool]
        if (hint) lines.push(`      ${hint}`)
      }

      if (step.output) {
        lines.push(indent(clip(step.output), "      "))
      }
    }
  }

  return lines
}

function runLanes(toRun, command, cwd, values, color) {
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
    } else {
      laneResults.push(runLane(lane, laneFiles, config, prettier, command, values, color, cwd))
    }
  }

  return laneResults
}

function runLane(lane, laneFiles, config, prettier, command, values, color, cwd) {
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

  return {
    id: lane.id,
    title: lane.title,
    files: laneFiles,
    status,
    error: null,
    steps: results
  }
}

function laneExitCode(laneResults) {
  const failed = laneResults.filter((result) => result.status === "failed").length
  const missing = laneResults.filter((result) => result.status === "missing").length
  const errored = laneResults.filter((result) => result.status === "error").length
  if (failed > 0) return 1
  if (missing + errored > 0) return 2
  return 0
}

function reportLanes(command, laneResults, checked, color, verbose) {
  const failed = laneResults.filter((result) => result.status === "failed").length
  const missing = laneResults.filter((result) => result.status === "missing").length
  const errored = laneResults.filter((result) => result.status === "error").length
  const passed = laneResults.filter((result) => result.status === "ok").length

  const lines = [ `house ${command}: ${plural(laneResults.length, "lane")}, ${plural(checked, "file")}`, "" ]
  for (const result of laneResults) {
    lines.push(printLaneLine(result, command, color))
    lines.push(...printDetails(result, color, verbose))
  }

  lines.push("")
  lines.push(`house: ${passed} ${passed === 1 ? "lane" : "lanes"} passed, ${failed} ${failed === 1 ? "lane" : "lanes"} failed${missing ? `, ${missing} missing ${missing === 1 ? "tool" : "tools"}` : ""}${errored ? `, ${errored} misconfigured ${errored === 1 ? "lane" : "lanes"}` : ""}`)
  return lines
}

function signoffLabel(reportFailure, contexts) {
  if (reportFailure) return "fail"
  if (contexts.length > 0) return contexts.join(", ")
  return "status"
}

function printSignoff(step, result, color, verbose) {
  const lines = []
  const { marker, paint } = STEP_MARKS[result.status] ?? STEP_MARKS.failed
  lines.push(`  ${colorize(color, paint, marker)} signoff ${step.label} (${displayCommand(step)})`)

  if (result.status === "missing") {
    const hint = TOOL_HINTS.gh
    if (hint) lines.push(`      ${hint}`)
  }

  if (result.output && (verbose || result.status !== "passed")) {
    lines.push(indent(clip(result.output), "      "))
  }

  return lines
}

function runSignoff({ laneResults, laneExit, checked, values, color, cwd }) {
  const contexts = signoffContexts(values)
  const reportFailure = laneExit === 1 && values.fail
  const step = {
    tool: "gh",
    args: signoffArgs(values, contexts, reportFailure),
    label: signoffLabel(reportFailure, contexts)
  }

  let result = null
  if (laneExit === 0 || reportFailure) {
    if (values.verbose) {
      process.stdout.write(`${colorize(color, "2", `→ check ${displayCommand(step)}`)}\n`)
    }
    result = runStep(step, cwd)
  }

  let exitCode
  if (laneExit === 2) {
    exitCode = 2
  } else if (laneExit === 1) {
    exitCode = result && result.status !== "passed" ? 2 : 1
  } else {
    exitCode = result && result.status === "passed" ? 0 : 2
  }

  if (values.json) {
    const report = summarize(laneResults, "check", checked, cwd, laneExit)
    report.command = "signoff"
    report.exitCode = exitCode
    report.signoff = {
      contexts,
      args: step.args,
      status: result?.status ?? "skipped",
      exitCode: result?.exitCode ?? null,
      output: result?.output ?? null
    }
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
    return exitCode
  }

  const lines = laneResults.length > 0
    ? reportLanes("check", laneResults, checked, color, values.verbose)
    : [ "house signoff: no supported files found" ]

  lines.push("")

  if (!result) {
    const reason = laneExit === 2 ? "the check could not run" : "the check failed"
    lines.push(colorize(color, "31", `house signoff: ${reason}, nothing signed off`))
  } else {
    lines.push(...printSignoff(step, result, color, values.verbose))
  }

  process.stdout.write(`${lines.join("\n")}\n`)
  return exitCode
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
  const color = resolveColor(values.color ?? "auto")
  const cwd = process.cwd()

  if (values.color && ![ "auto", "always", "never" ].includes(values.color)) {
    process.stderr.write("house: --color must be auto, always, or never\n")
    return 2
  }
  const runnable = command === "check" || command === "fix" || command === "signoff"
  const paths = runnable ? positionals.slice(1) : positionals
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

  if (!runnable) {
    process.stderr.write(`house: expected "check", "fix", or "signoff"\n\n${usage()}\n`)
    return 2
  }

  if (command !== "signoff" && signoffFlagsUsed(values)) {
    process.stderr.write("house: --context, --commit, --url, --force, and --fail are only valid for signoff\n")
    return 2
  }

  const toRun = selected
    .map((lane) => ({ lane, files: groups.get(lane.id) ?? [] }))
    .filter((entry) => entry.files.length > 0)

  if (toRun.length === 0 && command !== "signoff") {
    if (values.json) {
      process.stdout.write(`${JSON.stringify({ command, cwd, files: 0, lanes: [], exitCode: 0 }, null, 2)}\n`)
      return 0
    }
    process.stdout.write(`house ${command}: no supported files found\n`)
    return 0
  }

  const laneResults = runLanes(toRun, command === "fix" ? "fix" : "check", cwd, values, color)
  const checked = laneResults.reduce((total, result) => total + result.files.length, 0)
  const exitCode = laneExitCode(laneResults)

  if (command === "signoff") {
    return runSignoff({ laneResults, laneExit: exitCode, checked, values, color, cwd })
  }

  if (values.json) {
    process.stdout.write(`${JSON.stringify(summarize(laneResults, command, checked, cwd, exitCode), null, 2)}\n`)
    return exitCode
  }

  process.stdout.write(`${reportLanes(command, laneResults, checked, color, values.verbose).join("\n")}\n`)
  return exitCode
}
