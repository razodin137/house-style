import { existsSync } from "node:fs"
import { join } from "node:path"
import { houseRoot } from "./paths.js"

const EMBEDDED = join(houseRoot, "src", "embedded.js")

function step(tool, args, label) {
  return { tool, args, label: label ?? tool }
}

// Extraction happens before the lanes run, so after it the only supported
// blocks left inline are JSON-like ones. `--write` formats those in place.
// Check accepts either layout: no blocks, or blocks Prettier already agrees
// with. Nothing is written in check mode.
function embeddedStep(files, prettier, mode) {
  const base = withConfig([], prettier)
  return step(process.execPath, [ EMBEDDED, mode, ...base, ...files ], "embedded blocks")
}

function embeddedPlan(files, prettier, fix) {
  if (fix) {
    return {
      fix: [ embeddedStep(files, prettier, "--write") ],
      check: [ embeddedStep(files, prettier, "--check") ]
    }
  }

  return { fix: [], check: [ embeddedStep(files, prettier, "--check") ] }
}

function withConfig(base, config) {
  return config ? [ ...base, "--config", config ] : [ ...base ]
}

function eslintPlan(files, config, fix) {
  const base = withConfig([ "--max-warnings", "0" ], config)
  if (fix) return { fix: [ step("eslint", [ ...base, "--fix", ...files ]) ], check: [ step("eslint", [ ...base, ...files ]) ] }
  return { fix: [], check: [ step("eslint", [ ...base, ...files ]) ] }
}

function stylePlan(files, config, prettier, fix) {
  const lint = withConfig([], config)
  const format = withConfig([], prettier)

  if (fix) {
    return {
      fix: [
        step("stylelint", [ ...lint, "--fix", ...files ]),
        step("prettier", [ ...format, "--write", ...files ])
      ],
      check: [
        step("prettier", [ ...format, "--check", ...files ]),
        step("stylelint", [ ...lint, ...files ])
      ]
    }
  }

  return {
    fix: [],
    check: [
      step("prettier", [ ...format, "--check", ...files ]),
      step("stylelint", [ ...lint, ...files ])
    ]
  }
}

function htmlPlan(files, config, prettier, fix) {
  const base = withConfig([], config)
  const embedded = embeddedPlan(files, prettier, fix)
  const check = [
    ...embedded.check,
    step("html-validate", [ ...base, ...files ])
  ]

  if (fix) {
    return {
      fix: [
        step("html-validate", [ ...base, "--fix", ...files ]),
        ...embedded.fix
      ],
      check
    }
  }

  return { fix: [], check }
}

function biomePlan(files, config, fix) {
  const base = config ? [ `--config-path=${config}` ] : []

  if (fix) {
    return {
      fix: [ step("biome", [ "format", ...base, "--write", ...files ]) ],
      check: [ step("biome", [ "format", ...base, ...files ]) ]
    }
  }

  return {
    fix: [],
    check: [ step("biome", [ "format", ...base, ...files ]) ]
  }
}

function rubyPlan(files, config, cwd, fix) {
  const bundler = existsSync(join(cwd, "Gemfile"))
  const command = bundler ? "bundle" : "rubocop"
  const label = bundler ? "bundle exec rubocop" : "rubocop"
  const prefix = bundler ? [ "exec", "rubocop" ] : []
  const base = [ ...prefix, ...withConfig([], config) ]

  if (fix) {
    return {
      fix: [ step(command, [ ...base, "-a", ...files ], label) ],
      check: [ step(command, [ ...base, ...files ], label) ]
    }
  }

  return { fix: [], check: [ step(command, [ ...base, ...files ], label) ] }
}

function shellPlan(files, fix) {
  const shellcheck = step("shellcheck", [ "--severity=info", ...files ])
  const format = step("shfmt", [ "-i", "2", fix ? "-w" : "-d", ...files ])

  if (fix) {
    return { fix: [ format ], check: [ shellcheck, step("shfmt", [ "-i", "2", "-d", ...files ]) ] }
  }

  return { fix: [], check: [ shellcheck, format ] }
}

function pythonPlan(files, config, fix) {
  const base = withConfig([], config)

  if (fix) {
    return {
      fix: [
        step("ruff", [ "check", ...base, "--fix", ...files ]),
        step("ruff", [ "format", ...base, ...files ])
      ],
      check: [
        step("ruff", [ "check", ...base, ...files ]),
        step("ruff", [ "format", ...base, "--check", ...files ])
      ]
    }
  }

  return {
    fix: [],
    check: [
      step("ruff", [ "check", ...base, ...files ]),
      step("ruff", [ "format", ...base, "--check", ...files ])
    ]
  }
}

export function buildPlan(lane, files, { config, prettier, cwd, fix }) {
  if (lane === "js") return eslintPlan(files, config, fix)
  if (lane === "css" || lane === "scss") return stylePlan(files, config, prettier, fix)
  if (lane === "html") return htmlPlan(files, config, prettier, fix)
  if (lane === "md" || lane === "yaml") return biomePlan(files, config, fix)
  if (lane === "ruby") return rubyPlan(files, config, cwd, fix)
  if (lane === "shell") return shellPlan(files, fix)
  if (lane === "python") return pythonPlan(files, config, fix)

  return { fix: [], check: [] }
}
