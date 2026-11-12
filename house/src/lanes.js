import { extname } from "node:path"

const JS_EXTENSIONS = [ ".js", ".mjs", ".cjs", ".jsx" ]
const RUBY_EXTENSIONS = [ ".rb", ".rake", ".gemspec" ]
const SHELL_EXTENSIONS = [ ".sh", ".bash", ".zsh", ".ksh" ]
const PYTHON_EXTENSIONS = [ ".py", ".pyi" ]

const RUBY_BASENAMES = [ "Gemfile", "Rakefile", "config.ru", "Guardfile", "Capfile", "Thorfile", "Vagrantfile" ]
const SHELL_SHEBANG = /^#!.*\b(?:ba|da|k|z)?sh\b/
const PYTHON_SHEBANG = /^#!.*\bpython[0-9.]*\b/
const RUBY_SHEBANG = /^#!.*\bruby\b/

function hasExtension(file, extensions) {
  return extensions.includes(extname(file).toLowerCase())
}

function basename(file) {
  const slash = file.lastIndexOf("/")
  return slash === -1 ? file : file.slice(slash + 1)
}

export const lanes = [
  {
    id: "js",
    title: "JavaScript",
    match(file, head) {
      return hasExtension(file, JS_EXTENSIONS)
    }
  },
  {
    id: "css",
    title: "CSS",
    match(file) {
      return extname(file).toLowerCase() === ".css"
    }
  },
  {
    id: "scss",
    title: "SCSS",
    match(file) {
      return extname(file).toLowerCase() === ".scss"
    }
  },
  {
    id: "html",
    title: "HTML",
    match(file) {
      return [ ".html", ".htm" ].includes(extname(file).toLowerCase())
    }
  },
  {
    id: "ruby",
    title: "Ruby",
    match(file, head) {
      if (hasExtension(file, RUBY_EXTENSIONS)) return true
      if (RUBY_BASENAMES.includes(basename(file))) return true
      return !extname(file) && head !== null && RUBY_SHEBANG.test(head)
    }
  },
  {
    id: "shell",
    title: "Shell",
    match(file, head) {
      if (hasExtension(file, SHELL_EXTENSIONS)) return true
      return !extname(file) && head !== null && SHELL_SHEBANG.test(head)
    }
  },
  {
    id: "python",
    title: "Python",
    match(file, head) {
      if (hasExtension(file, PYTHON_EXTENSIONS)) return true
      return !extname(file) && head !== null && PYTHON_SHEBANG.test(head)
    }
  }
]

export const laneIds = lanes.map((lane) => lane.id)

export function laneById(id) {
  return lanes.find((lane) => lane.id === id) ?? null
}

export function detectLane(file, head) {
  return lanes.find((lane) => lane.match(file, head)) ?? null
}
