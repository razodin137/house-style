import { existsSync, readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { houseRoot } from "./paths.js"

const STYLELINT_CONFIGS = [
  "stylelint.config.js",
  "stylelint.config.cjs",
  "stylelint.config.mjs",
  "stylelint.config.ts",
  ".stylelintrc",
  ".stylelintrc.json",
  ".stylelintrc.yml",
  ".stylelintrc.yaml",
  ".stylelintrc.js",
  ".stylelintrc.cjs"
]

const PRETTIER_CONFIGS = [
  ".prettierrc",
  ".prettierrc.json",
  ".prettierrc.json5",
  ".prettierrc.yml",
  ".prettierrc.yaml",
  ".prettierrc.js",
  ".prettierrc.cjs",
  ".prettierrc.mjs",
  "prettier.config.js",
  "prettier.config.cjs",
  "prettier.config.mjs"
]

const ESLINT_CONFIGS = [
  "eslint.config.js",
  "eslint.config.mjs",
  "eslint.config.cjs",
  "eslint.config.ts",
  "eslint.config.mts",
  "eslint.config.cts"
]

const BIOME_CONFIGS = [ "biome.json", "biome.jsonc" ]

const HTML_CONFIGS = [
  ".htmlvalidate.json",
  ".htmlvalidate.js",
  ".htmlvalidate.cjs",
  ".htmlvalidate.mjs",
  "htmlvalidate.config.js",
  "htmlvalidate.config.cjs",
  "htmlvalidate.config.mjs"
]

const RUBY_CONFIGS = [ ".rubocop.yml", ".rubocop.yaml" ]
const RUFF_CONFIGS = [ "ruff.toml", ".ruff.toml" ]

function packageJson(cwd) {
  const path = join(cwd, "package.json")
  if (!existsSync(path)) return null

  try {
    return JSON.parse(readFileSync(path, "utf8"))
  } catch {
    return null
  }
}

function findProjectConfig(cwd, names, packageKey) {
  for (const name of names) {
    const path = join(cwd, name)
    if (existsSync(path)) return path
  }

  const pkg = packageJson(cwd)
  if (packageKey && pkg && Object.hasOwn(pkg, packageKey)) {
    return join(cwd, "package.json")
  }

  return null
}

function resolvePackage(name, cwd) {
  function resolveFrom(base) {
    try {
      return createRequire(join(base, "package.json")).resolve(name)
    } catch {
      return null
    }
  }

  return resolveFrom(cwd) ?? resolveFrom(houseRoot)
}

function houseConfig(...parts) {
  return join(houseRoot, "configs", ...parts)
}

function packageRoot(name, cwd) {
  const resolved = resolvePackage(name, cwd)
  if (resolved) return dirname(resolved)

  let directory = cwd
  while (true) {
    const candidate = join(directory, "node_modules", ...name.split("/"))
    if (existsSync(join(candidate, "package.json"))) return candidate

    const parent = dirname(directory)
    if (parent === directory) break
    directory = parent
  }

  const bundled = join(houseRoot, "node_modules", ...name.split("/"))
  return existsSync(join(bundled, "package.json")) ? bundled : null
}

function biomeHouseConfig(cwd) {
  const root = packageRoot("@razodin137/biome-config", cwd)
  if (!root) return null

  const config = join(root, "configs", "recommended.json")
  return existsSync(config) ? config : null
}

export function projectConfig(lane, cwd) {
  if (lane === "js") return findProjectConfig(cwd, ESLINT_CONFIGS)
  if (lane === "css" || lane === "scss") return findProjectConfig(cwd, STYLELINT_CONFIGS, "stylelint")
  if (lane === "html") return findProjectConfig(cwd, HTML_CONFIGS, "htmlvalidate")
  if (lane === "md" || lane === "yaml") return findProjectConfig(cwd, BIOME_CONFIGS)
  if (lane === "ruby") return findProjectConfig(cwd, RUBY_CONFIGS)
  if (lane === "python") {
    const found = findProjectConfig(cwd, RUFF_CONFIGS)
    if (found) return found

    const pyproject = join(cwd, "pyproject.toml")
    if (existsSync(pyproject) && readFileSync(pyproject, "utf8").includes("[tool.ruff")) return pyproject
  }

  return null
}

export function prettierProjectConfig(cwd) {
  return findProjectConfig(cwd, PRETTIER_CONFIGS, "prettier")
}

export function resolveLaneConfig(lane, cwd) {
  const project = projectConfig(lane, cwd)
  if (project) return { config: null, project, error: null }

  if (lane === "js") {
    if (!resolvePackage("@razodin137/eslint-config", cwd)) {
      return {
        config: null,
        project: null,
        error: "the js lane needs @razodin137/eslint-config installed, or an eslint.config.* in the project"
      }
    }
    return { config: houseConfig("eslint.config.mjs"), project: null, error: null }
  }

  if (lane === "css" || lane === "scss") {
    const name = lane === "css" ? "@razodin137/stylelint-config-css" : "@razodin137/stylelint-config-scss"
    const config = resolvePackage(name, cwd)
    if (!config) {
      return {
        config: null,
        project: null,
        error: `the ${lane} lane needs ${name} installed, or a stylelint config in the project`
      }
    }
    return { config, project: null, error: null }
  }

  if (lane === "html") {
    const config = resolvePackage("@razodin137/html-validate-config", cwd)
    if (!config) {
      return {
        config: null,
        project: null,
        error: "the html lane needs @razodin137/html-validate-config installed, or an html-validate config in the project"
      }
    }
    return { config, project: null, error: null }
  }

  if (lane === "md" || lane === "yaml") {
    const config = biomeHouseConfig(cwd)
    if (!config) {
      return {
        config: null,
        project: null,
        error: "the md and yaml lanes need @razodin137/biome-config installed, or a biome config in the project"
      }
    }
    return { config, project: null, error: null }
  }

  if (lane === "ruby") {
    return { config: houseConfig("rubocop-ruby.yml"), project: null, error: null }
  }

  if (lane === "python") {
    return { config: houseConfig("ruff.toml"), project: null, error: null }
  }

  return { config: null, project: null, error: null }
}

export function resolvePrettierConfig(cwd) {
  const project = prettierProjectConfig(cwd)
  if (project) return { config: null, project, error: null }

  const config = resolvePackage("@razodin137/prettier-config", cwd)
  if (!config) {
    return {
      config: null,
      project: null,
      error: "formatting needs @razodin137/prettier-config installed, or a prettier config in the project"
    }
  }

  return { config, project: null, error: null }
}
