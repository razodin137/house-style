import { existsSync } from "node:fs"
import { join } from "node:path"

function step(tool, args, label) {
  return { tool, args, label: label ?? tool }
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

function htmlPlan(files, config) {
  return {
    fix: [],
    check: [ step("html-validate", [ ...withConfig([], config), ...files ]) ]
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
  if (lane === "html") return htmlPlan(files, config)
  if (lane === "ruby") return rubyPlan(files, config, cwd, fix)
  if (lane === "shell") return shellPlan(files, fix)
  if (lane === "python") return pythonPlan(files, config, fix)

  return { fix: [], check: [] }
}
