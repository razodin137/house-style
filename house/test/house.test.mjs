import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import {
  accessSync,
  chmodSync,
  constants,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { test } from "node:test"
import {
  cleanup,
  flagValue,
  houseDir,
  invocationsFor,
  makeProject,
  makeTools,
  readInvocations,
  runHouse
} from "./helpers.mjs"

const INLINE_PAGE = `<!doctype html>
<title>x</title>
<style>
a { color: red; }
</style>
<script>
console.log("hi")
</script>
`

function project(t, options) {
  const root = makeProject(options)
  t.after(() => cleanup(root))
  return root
}

function toolsFor(t, root, names) {
  const directory = makeTools(root, names)
  t.after(() => cleanup(root))
  return directory
}

function command(run, suffix) {
  const message = `${run.stdout}\n${run.stderr}`
  assert.equal(run.status, 0, message)
  assert.ok(run.stdout.includes(suffix), run.stdout)
}

function writeFakeNpx(directory) {
  const file = join(directory, "npx")
  writeFileSync(file, `#!/bin/sh
shift
shift
exec "${process.execPath}" "${join(houseDir, "bin", "house.js")}" "$@"
`)
  chmodSync(file, 0o755)
}

function runHook(root, tools, log) {
  return spawnSync("sh", [ join(root, ".git", "hooks", "pre-commit") ], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${tools}:${process.env.PATH ?? ""}`,
      HOUSE_LOG: log
    }
  })
}

test("detects lanes by file type and keeps css and scss apart", (t) => {
  const root = project(t, {
    files: {
      "src/app.js": "const value = 1\n",
      "src/theme.css": "a { color: red }\n",
      "src/theme.scss": "$color: red\n",
      "index.html": "<!doctype html><title>x</title>\n",
      "README.md": "# hello\n",
      "config.yaml": "name: house-style\n",
      "lib/thing.rb": "puts 1\n",
      "bin/run.sh": "#!/usr/bin/env bash\necho hi\n",
      "tool.py": "print('hi')\n"
    }
  })

  const run = runHouse(root, [ "check" ])
  command(run, "house: 9 lanes passed, 0 lanes failed")

  const stylelint = invocationsFor(run.invocations, "stylelint")
  assert.equal(stylelint.length, 2)

  const css = stylelint.find((entry) => entry.args.includes("src/theme.css"))
  const scss = stylelint.find((entry) => entry.args.includes("src/theme.scss"))
  assert.ok(css)
  assert.ok(scss)
  assert.ok(!css.args.includes("src/theme.scss"))
  assert.ok(!scss.args.includes("src/theme.css"))
  assert.equal(
    flagValue(css, "--config"),
    join(root, "node_modules/@razodin137/stylelint-config-css/index.js")
  )
  assert.equal(
    flagValue(scss, "--config"),
    join(root, "node_modules/@razodin137/stylelint-config-scss/index.js")
  )

  const prettier = invocationsFor(run.invocations, "prettier")
  assert.equal(prettier.length, 2)
  assert.ok(prettier.every((entry) => entry.args.includes("--check")))

  const eslint = invocationsFor(run.invocations, "eslint")
  assert.equal(eslint.length, 1)
  assert.equal(flagValue(eslint[0], "--config"), join(houseDir, "configs", "eslint.config.mjs"))
  assert.deepEqual(eslint[0].args.filter((arg) => arg.endsWith(".js")), [ "src/app.js" ])

  const html = invocationsFor(run.invocations, "html-validate")
  assert.equal(html.length, 1)
  assert.equal(
    flagValue(html[0], "--config"),
    join(root, "node_modules/@razodin137/html-validate-config/index.js")
  )

  const biome = invocationsFor(run.invocations, "biome")
  assert.equal(biome.length, 2)
  assert.deepEqual(biome[0].args, [
    "format",
    `--config-path=${join(root, "node_modules/@razodin137/biome-config/configs/recommended.json")}`,
    "README.md"
  ])
  assert.deepEqual(biome[1].args, [
    "format",
    `--config-path=${join(root, "node_modules/@razodin137/biome-config/configs/recommended.json")}`,
    "config.yaml"
  ])

  const rubocop = invocationsFor(run.invocations, "rubocop")
  assert.equal(rubocop.length, 1)
  assert.equal(flagValue(rubocop[0], "--config"), join(houseDir, "configs", "rubocop-ruby.yml"))

  const shellcheck = invocationsFor(run.invocations, "shellcheck")
  assert.equal(shellcheck.length, 1)
  assert.deepEqual(shellcheck[0].args, [ "--severity=info", "bin/run.sh" ])

  const shfmt = invocationsFor(run.invocations, "shfmt")
  assert.equal(shfmt.length, 1)
  assert.deepEqual(shfmt[0].args, [ "-i", "2", "-d", "bin/run.sh" ])

  const ruff = invocationsFor(run.invocations, "ruff")
  assert.equal(ruff.length, 2)
  assert.deepEqual(ruff[0].args, [ "check", "--config", join(houseDir, "configs", "ruff.toml"), "tool.py" ])
  assert.deepEqual(ruff[1].args, [ "format", "--config", join(houseDir, "configs", "ruff.toml"), "--check", "tool.py" ])
})

test("an HTML project with no JavaScript still gets checked", (t) => {
  const root = project(t, {
    files: {
      "index.html": "<!doctype html><title>x</title>\n",
      "about.html": "<!doctype html><title>About</title>\n"
    }
  })

  const run = runHouse(root, [ "check" ])
  command(run, "house: 1 lane passed, 0 lanes failed")

  assert.equal(run.invocations.length, 1)
  assert.equal(run.invocations[0].tool, "html-validate")
  assert.deepEqual(run.invocations[0].args.slice(2), [ "about.html", "index.html" ])
})

test("an HTML-only project needs only the HTML config", (t) => {
  const root = project(t, {
    configs: [ "@razodin137/html-validate-config" ],
    files: {
      "index.html": "<!doctype html><title>x</title>\n"
    }
  })

  const run = runHouse(root, [ "check" ])
  command(run, "house: 1 lane passed, 0 lanes failed")
  assert.equal(run.invocations.length, 1)
  assert.equal(run.invocations[0].tool, "html-validate")
})

test("an HTML-only project does not need Prettier installed", (t) => {
  const root = project(t, {
    files: {
      "index.html": "<!doctype html><title>x</title>\n"
    }
  })
  const tools = toolsFor(t, root, [ "html-validate" ])

  const run = runHouse(root, [ "check" ], { tools })
  command(run, "house: 1 lane passed, 0 lanes failed")
})

test("--list never extracts inline blocks", (t) => {
  const root = project(t, { files: { "index.html": INLINE_PAGE } })

  const run = runHouse(root, [ "--list" ])
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`)

  assert.equal(existsSync(join(root, "index.css")), false)
  assert.equal(existsSync(join(root, "index.js")), false)
  assert.equal(readFileSync(join(root, "index.html"), "utf8"), INLINE_PAGE)
})

test("house check flags inline blocks without writing", (t) => {
  const root = project(t, { files: { "index.html": INLINE_PAGE } })

  const run = runHouse(root, [ "check" ])
  assert.equal(run.status, 1)

  const output = `${run.stdout}\n${run.stderr}`
  assert.ok(output.includes("index.html:3: embedded <style> is not formatted; run house fix"), output)
  assert.ok(output.includes("index.html:6: embedded <script> is not formatted; run house fix"), output)

  assert.equal(existsSync(join(root, "index.css")), false)
  assert.equal(existsSync(join(root, "index.js")), false)
  assert.equal(readFileSync(join(root, "index.html"), "utf8"), INLINE_PAGE)
})

test("house check accepts already-formatted inline blocks", (t) => {
  const page = `<!doctype html>
<title>x</title>
<style>
  a {
    color: red;
  }
</style>
<script>
  const value = 1
</script>
`
  const root = project(t, { files: { "index.html": page } })

  const run = runHouse(root, [ "check" ])
  command(run, "house: 1 lane passed, 0 lanes failed")

  assert.equal(existsSync(join(root, "index.css")), false)
  assert.equal(existsSync(join(root, "index.js")), false)
  assert.equal(readFileSync(join(root, "index.html"), "utf8"), page)
})

test("house fix extracts and lints the new files in one run", (t) => {
  const root = project(t, { files: { "index.html": INLINE_PAGE } })

  const run = runHouse(root, [ "fix" ])
  command(run, "house: 3 lanes passed, 0 lanes failed")
  assert.ok(
    run.stdout.includes("house fix: extracted 2 inline blocks from 1 HTML file into index.css, index.js"),
    run.stdout
  )

  assert.equal(readFileSync(join(root, "index.css"), "utf8"), "a { color: red; }\n")
  assert.equal(readFileSync(join(root, "index.js"), "utf8"), 'console.log("hi")\n')

  const html = readFileSync(join(root, "index.html"), "utf8")
  assert.ok(html.includes('<link rel="stylesheet" href="index.css">'), html)
  assert.ok(html.includes('<script src="index.js"></script>'), html)
  assert.ok(!html.includes("<style>"), html)

  assert.ok(invocationsFor(run.invocations, "stylelint").some((entry) => entry.args.includes("index.css")))
  assert.ok(invocationsFor(run.invocations, "prettier").some((entry) => entry.args.includes("index.css")))
  assert.ok(invocationsFor(run.invocations, "eslint").some((entry) => entry.args.includes("index.js")))
  assert.ok(invocationsFor(run.invocations, "html-validate").some((entry) => entry.args.includes("index.html")))
})

test("house check is clean after house fix extracts", (t) => {
  const root = project(t, { files: { "index.html": INLINE_PAGE } })

  command(runHouse(root, [ "fix" ]), "house: 3 lanes passed, 0 lanes failed")

  const check = runHouse(root, [ "check" ])
  command(check, "house: 3 lanes passed, 0 lanes failed")
  assert.ok(!check.stdout.includes("not formatted"), check.stdout)
})

test("a second house fix is a no-op", (t) => {
  const root = project(t, { files: { "index.html": INLINE_PAGE } })

  command(runHouse(root, [ "fix" ]), "house: 3 lanes passed, 0 lanes failed")
  const html = readFileSync(join(root, "index.html"), "utf8")
  const css = readFileSync(join(root, "index.css"), "utf8")

  const second = runHouse(root, [ "fix" ])
  command(second, "house: 3 lanes passed, 0 lanes failed")
  assert.ok(!second.stdout.includes("extracted"), second.stdout)

  assert.equal(readFileSync(join(root, "index.html"), "utf8"), html)
  assert.equal(readFileSync(join(root, "index.css"), "utf8"), css)
  assert.deepEqual(
    readdirSync(root).filter((name) => name.startsWith("index")).sort(),
    [ "index.css", "index.html", "index.js" ]
  )
})

test("src, JSON-LD, and template scripts stay inline", (t) => {
  const jsonLd = '<script type="application/ld+json">{"@context":"https://schema.org"}</script>'
  const json = '<script type="application/json">{"x":1}</script>'
  const template = '<script type="text/template"><p>hi</p></script>'
  const external = '<script src="already.js"></script>'
  const page = INLINE_PAGE.replace(
    "</style>",
    `</style>\n${jsonLd}\n${json}\n${template}\n${external}`
  )
  const root = project(t, {
    files: {
      "index.html": page,
      "already.js": 'console.log("already")\n'
    }
  })

  const run = runHouse(root, [ "fix" ])
  command(run, "house: 3 lanes passed, 0 lanes failed")

  const html = readFileSync(join(root, "index.html"), "utf8")
  assert.ok(html.includes('type="application/ld+json"'), html)
  assert.ok(html.includes('type="application/json"'), html)
  assert.ok(html.includes(template), html)
  assert.ok(html.includes(external), html)
  assert.equal(existsSync(join(root, "index-2.js")), false)
})

test("multiple inline blocks are numbered", (t) => {
  const page = `<!doctype html>
<title>x</title>
<style>
a { color: red; }
</style>
<script>
console.log("one")
</script>
<style>
b { color: blue; }
</style>
<script>
console.log("two")
</script>
`
  const root = project(t, { files: { "index.html": page } })

  const run = runHouse(root, [ "fix" ])
  command(run, "house: 3 lanes passed, 0 lanes failed")

  assert.equal(readFileSync(join(root, "index.css"), "utf8"), "a { color: red; }\n")
  assert.equal(readFileSync(join(root, "index.js"), "utf8"), 'console.log("one")\n')
  assert.equal(readFileSync(join(root, "index-2.css"), "utf8"), "b { color: blue; }\n")
  assert.equal(readFileSync(join(root, "index-2.js"), "utf8"), 'console.log("two")\n')

  const html = readFileSync(join(root, "index.html"), "utf8")
  assert.ok(html.includes('href="index.css"'), html)
  assert.ok(html.includes('src="index.js"'), html)
  assert.ok(html.includes('href="index-2.css"'), html)
  assert.ok(html.includes('src="index-2.js"'), html)
})

test("house fix does not extract when the html lane is not selected", (t) => {
  const root = project(t, {
    files: {
      "index.html": INLINE_PAGE,
      "theme.css": "a { color: red }\n"
    }
  })

  const run = runHouse(root, [ "fix", "--lane", "css" ])
  command(run, "house: 1 lane passed, 0 lanes failed")

  assert.equal(existsSync(join(root, "index.css")), false)
  assert.equal(readFileSync(join(root, "index.html"), "utf8"), INLINE_PAGE)
})

test("signoff never extracts inline blocks", (t) => {
  const root = project(t, { files: { "index.html": INLINE_PAGE } })

  const run = runHouse(root, [ "signoff", "--context", "tests" ])
  assert.equal(run.status, 1)
  assert.ok(run.stdout.includes("run house fix"), run.stdout)

  assert.equal(existsSync(join(root, "index.css")), false)
  assert.equal(existsSync(join(root, "index.js")), false)
  assert.equal(readFileSync(join(root, "index.html"), "utf8"), INLINE_PAGE)
  assert.equal(invocationsFor(run.invocations, "gh").length, 0)
})

test("a CSS-only project never asks for the SCSS config", (t) => {
  const root = project(t, {
    configs: [ "@razodin137/stylelint-config-css", "@razodin137/prettier-config" ],
    files: {
      "theme.css": "a { color: red }\n"
    }
  })

  const run = runHouse(root, [ "check" ])
  command(run, "house: 1 lane passed, 0 lanes failed")

  const stylelint = invocationsFor(run.invocations, "stylelint")
  assert.equal(stylelint.length, 1)
  assert.equal(
    flagValue(stylelint[0], "--config"),
    join(root, "node_modules/@razodin137/stylelint-config-css/index.js")
  )
  assert.ok(!run.stdout.includes("stylelint-config-scss"))
})

test("project configs win over the house fallbacks", (t) => {
  const root = project(t, {
    configs: false,
    files: {
      "app.js": "const value = 1\n",
      "theme.css": "a { color: red }\n",
      "eslint.config.mjs": "export default []\n",
      "stylelint.config.js": "module.exports = { rules: {} }\n",
      ".prettierrc": "{}\n"
    }
  })

  const run = runHouse(root, [ "check" ])
  command(run, "house: 2 lanes passed, 0 lanes failed")

  assert.equal(flagValue(invocationsFor(run.invocations, "eslint")[0], "--config"), null)
  assert.equal(flagValue(invocationsFor(run.invocations, "stylelint")[0], "--config"), null)
  assert.equal(flagValue(invocationsFor(run.invocations, "prettier")[0], "--config"), null)
})

test("a project biome config wins over the house fallback", (t) => {
  const root = project(t, {
    configs: false,
    files: {
      "README.md": "# hello\n",
      "config.yml": "name: house-style\n",
      "biome.json": "{ \"formatter\": { \"enabled\": true } }\n"
    }
  })

  const run = runHouse(root, [ "check" ])
  command(run, "house: 2 lanes passed, 0 lanes failed")

  const biome = invocationsFor(run.invocations, "biome")
  assert.equal(biome.length, 2)
  assert.ok(biome.every((entry) => entry.args.every((arg) => !arg.startsWith("--config-path"))))
  assert.ok(!run.stdout.includes("@razodin137/biome-config"))
})

test("markdown without a biome config is a configuration error", (t) => {
  const root = project(t, {
    configs: [],
    files: {
      "README.md": "# hello\n"
    }
  })

  const run = runHouse(root, [ "check" ])
  assert.equal(run.status, 2)
  assert.ok(run.stdout.includes("not configured"), run.stdout)
  assert.ok(run.stdout.includes("@razodin137/biome-config"), run.stdout)
  assert.equal(invocationsFor(run.invocations, "biome").length, 0)
})

test("fix runs the fixers first, then verifies", (t) => {
  const root = project(t, {
    files: {
      "app.js": "const value = 1\n",
      "theme.css": "a { color: red }\n",
      "theme.scss": "$color: red\n",
      "index.html": "<!doctype html><title>x</title>\n",
      "README.md": "# hello\n",
      "config.yaml": "name: house-style\n",
      "lib/thing.rb": "puts 1\n",
      "bin/run.sh": "#!/usr/bin/env bash\necho hi\n",
      "tool.py": "print('hi')\n"
    }
  })

  const run = runHouse(root, [ "fix" ])
  command(run, "house: 9 lanes passed, 0 lanes failed")

  const eslint = invocationsFor(run.invocations, "eslint")
  assert.equal(eslint.length, 2)
  assert.ok(eslint[0].args.includes("--fix"))
  assert.ok(!eslint[1].args.includes("--fix"))

  const stylelint = invocationsFor(run.invocations, "stylelint")
  assert.equal(stylelint.length, 4)
  assert.ok(stylelint[0].args.includes("--fix"))
  assert.ok(!stylelint[1].args.includes("--fix"))
  assert.ok(stylelint[2].args.includes("--fix"))
  assert.ok(!stylelint[3].args.includes("--fix"))

  const prettier = invocationsFor(run.invocations, "prettier")
  assert.equal(prettier.length, 4)
  assert.ok(prettier[0].args.includes("--write"))
  assert.ok(prettier[1].args.includes("--check"))
  assert.ok(prettier[2].args.includes("--write"))
  assert.ok(prettier[3].args.includes("--check"))

  const rubocop = invocationsFor(run.invocations, "rubocop")
  assert.equal(rubocop.length, 2)
  assert.ok(rubocop[0].args.includes("-a"))
  assert.ok(!rubocop[1].args.includes("-a"))

  const shfmt = invocationsFor(run.invocations, "shfmt")
  assert.equal(shfmt.length, 2)
  assert.ok(shfmt[0].args.includes("-w"))
  assert.ok(shfmt[1].args.includes("-d"))

  const ruff = invocationsFor(run.invocations, "ruff")
  assert.equal(ruff.length, 4)
  assert.ok(ruff[0].args.includes("--fix"))
  assert.ok(!ruff[1].args.includes("--check"))
  assert.ok(!ruff[2].args.includes("--fix"))
  assert.ok(ruff[3].args.includes("--check"))

  assert.equal(invocationsFor(run.invocations, "html-validate").length, 2)
  assert.ok(invocationsFor(run.invocations, "html-validate")[0].args.includes("--fix"))

  const biome = invocationsFor(run.invocations, "biome")
  assert.equal(biome.length, 4)
  assert.ok(biome[0].args.includes("--write"))
  assert.ok(!biome[1].args.includes("--write"))
  assert.ok(biome[2].args.includes("--write"))
  assert.ok(!biome[3].args.includes("--write"))
})

test("a failing check exits 1 and prints the tool output", (t) => {
  const root = project(t, {
    files: {
      "app.js": "const value = 1\n"
    }
  })

  const run = runHouse(root, [ "check" ], { extraEnv: { HOUSE_FAIL_TOOL: "eslint" } })
  assert.equal(run.status, 1)
  assert.ok(run.stdout.includes("FAILED"), run.stdout)
  assert.ok(run.stdout.includes("fake eslint failure"), run.stdout)
})

test("a missing tool is a configuration error with a hint", (t) => {
  const root = project(t, {
    files: {
      "app.js": "const value = 1\n"
    }
  })
  const tools = toolsFor(t, root, [ "stylelint", "prettier", "html-validate", "rubocop", "shellcheck", "shfmt", "ruff" ])

  const run = runHouse(root, [ "check" ], { tools })
  assert.equal(run.status, 2)
  assert.ok(run.stdout.includes("tool missing"), run.stdout)
  assert.ok(run.stdout.includes("npm install --save-dev eslint"), run.stdout)
})

test("lane selection narrows the run", (t) => {
  const root = project(t, {
    files: {
      "app.js": "const value = 1\n",
      "theme.scss": "$color: red\n"
    }
  })

  const run = runHouse(root, [ "check", "--lane", "scss" ])
  command(run, "house: 1 lane passed, 0 lanes failed")
  assert.equal(invocationsFor(run.invocations, "eslint").length, 0)
  assert.equal(invocationsFor(run.invocations, "stylelint").length, 1)
  assert.ok(invocationsFor(run.invocations, "stylelint")[0].args.includes("theme.scss"))
})

test("an unknown lane is rejected", (t) => {
  const root = project(t, {
    files: {
      "app.js": "const value = 1\n"
    }
  })

  const run = runHouse(root, [ "check", "--lane", "typescript" ])
  assert.equal(run.status, 2)
  assert.ok(run.stderr.includes("unknown lane typescript"), run.stderr)
})

test("a Gemfile routes Ruby through bundle exec", (t) => {
  const root = project(t, {
    files: {
      Gemfile: "source \"https://rubygems.org\"\n",
      "lib/thing.rb": "puts 1\n"
    }
  })

  const run = runHouse(root, [ "check" ])
  command(run, "house: 1 lane passed, 0 lanes failed")

  assert.equal(invocationsFor(run.invocations, "rubocop").length, 0)
  const bundle = invocationsFor(run.invocations, "bundle")
  assert.equal(bundle.length, 1)
  assert.deepEqual(bundle[0].args.slice(0, 2), [ "exec", "rubocop" ])
  assert.ok(bundle[0].args.includes("lib/thing.rb"))
})

test("extensionless files are detected by shebang", (t) => {
  const root = project(t, {
    files: {
      "bin/deploy": "#!/usr/bin/env bash\necho hi\n",
      "scripts/run": "#!/usr/bin/env python3\nprint('hi')\n",
      "scripts/task": "#!/usr/bin/env ruby\nputs 'hi'\n"
    }
  })

  const run = runHouse(root, [ "check" ])
  command(run, "house: 3 lanes passed, 0 lanes failed")

  assert.ok(invocationsFor(run.invocations, "shellcheck")[0].args.includes("bin/deploy"))
  assert.ok(invocationsFor(run.invocations, "ruff")[0].args.includes("scripts/run"))
  assert.ok(invocationsFor(run.invocations, "rubocop")[0].args.includes("scripts/task"))
})

test("--json reports the lane ledger", (t) => {
  const root = project(t, {
    files: {
      "theme.css": "a { color: red }\n"
    }
  })

  const run = runHouse(root, [ "check", "--json" ], { extraEnv: { HOUSE_FAIL_TOOL: "stylelint" } })
  assert.equal(run.status, 1)

  const report = JSON.parse(run.stdout)
  assert.equal(report.command, "check")
  assert.equal(report.exitCode, 1)
  assert.equal(report.lanes.length, 1)
  assert.equal(report.lanes[0].id, "css")
  assert.equal(report.lanes[0].status, "failed")
  assert.ok(report.lanes[0].steps.some((step) => step.tool === "stylelint" && step.status === "failed"))
})

test("no supported files is a clean no-op", (t) => {
  const root = project(t, {
    files: {
      "notes.txt": "hello\n"
    }
  })

  const run = runHouse(root, [ "check" ])
  assert.equal(run.status, 0)
  assert.ok(run.stdout.includes("no supported files found"), run.stdout)
})

test("--list shows the detected lanes", (t) => {
  const root = project(t, {
    files: {
      "app.js": "const value = 1\n",
      "theme.css": "a { color: red }\n",
      "README.md": "# hello\n"
    }
  })

  const run = runHouse(root, [ "--list" ])
  assert.equal(run.status, 0)
  assert.ok(run.stdout.includes("js"), run.stdout)
  assert.ok(run.stdout.includes("css"), run.stdout)
  assert.ok(run.stdout.includes("md"), run.stdout)
  assert.ok(run.stdout.includes("1  app.js"), run.stdout)
  assert.ok(run.stdout.includes("1  README.md"), run.stdout)
})

test("signoff runs the lanes, then posts the context", (t) => {
  const root = project(t, {
    files: {
      "app.js": "const value = 1\n"
    }
  })

  const run = runHouse(root, [ "signoff", "--context", "tests,lint" ])
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`)
  assert.ok(run.stdout.includes("house: 1 lane passed, 0 lanes failed"), run.stdout)
  assert.ok(run.stdout.includes("signoff tests, lint"), run.stdout)

  const gh = invocationsFor(run.invocations, "gh")
  assert.equal(gh.length, 1)
  assert.deepEqual(gh[0].args, [ "signoff", "tests", "lint" ])
})

test("signoff forwards force, commit, and url in gh order", (t) => {
  const root = project(t, {
    files: {
      "app.js": "const value = 1\n"
    }
  })

  const run = runHouse(root, [
    "signoff",
    "--force",
    "--commit", "abc1234",
    "--url", "https://ci.example.com/runs/1",
    "--context", "tests"
  ])
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`)

  const gh = invocationsFor(run.invocations, "gh")
  assert.deepEqual(gh[0].args, [
    "signoff",
    "-f",
    "--commit", "abc1234",
    "--url", "https://ci.example.com/runs/1",
    "tests"
  ])
})

test("a failed check posts nothing without --fail", (t) => {
  const root = project(t, {
    files: {
      "app.js": "const value = 1\n"
    }
  })

  const run = runHouse(root, [ "signoff", "--context", "tests" ], { extraEnv: { HOUSE_FAIL_TOOL: "eslint" } })
  assert.equal(run.status, 1)
  assert.equal(invocationsFor(run.invocations, "gh").length, 0)
  assert.ok(run.stdout.includes("nothing signed off"), run.stdout)
})

test("--fail posts a red status when the check fails", (t) => {
  const root = project(t, {
    files: {
      "app.js": "const value = 1\n"
    }
  })

  const run = runHouse(root, [ "signoff", "--fail", "--context", "tests" ], { extraEnv: { HOUSE_FAIL_TOOL: "eslint" } })
  assert.equal(run.status, 1)

  const gh = invocationsFor(run.invocations, "gh")
  assert.equal(gh.length, 1)
  assert.deepEqual(gh[0].args, [ "signoff", "fail", "tests" ])
})

test("a missing gh is a configuration error with a hint", (t) => {
  const root = project(t, {
    files: {
      "app.js": "const value = 1\n"
    }
  })
  const tools = makeTools(root, [ "eslint" ])

  const run = runHouse(root, [ "signoff" ], {
    tools,
    extraEnv: { PATH: `${tools}:${dirname(process.execPath)}:/usr/bin` }
  })
  assert.equal(run.status, 2)
  assert.ok(run.stdout.includes("gh extension install basecamp/gh-signoff"), run.stdout)
})

test("signoff-only flags are rejected on check", (t) => {
  const root = project(t, {
    files: {
      "app.js": "const value = 1\n"
    }
  })

  const run = runHouse(root, [ "check", "--context", "tests" ])
  assert.equal(run.status, 2)
  assert.ok(run.stderr.includes("only valid for signoff"), run.stderr)
})

test("--json reports the signoff step", (t) => {
  const root = project(t, {
    files: {
      "app.js": "const value = 1\n"
    }
  })

  const run = runHouse(root, [ "signoff", "--context", "tests", "--json" ])
  assert.equal(run.status, 0)

  const report = JSON.parse(run.stdout)
  assert.equal(report.command, "signoff")
  assert.equal(report.exitCode, 0)
  assert.deepEqual(report.signoff.contexts, [ "tests" ])
  assert.deepEqual(report.signoff.args, [ "signoff", "tests" ])
  assert.equal(report.signoff.status, "passed")
})

test("hook install writes an executable, non-blocking pre-commit hook", (t) => {
  const root = project(t, {
    files: {
      "app.js": "const value = 1\n"
    }
  })

  const run = runHouse(root, [ "hook", "install" ])
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`)
  assert.ok(run.stdout.includes("pre-commit"), run.stdout)

  const hook = join(root, ".git", "hooks", "pre-commit")
  const body = readFileSync(hook, "utf8")

  assert.ok(body.startsWith("#!/bin/sh"))
  assert.ok(body.includes("# house: pre-commit hook"))
  assert.ok(body.includes("house fix"))
  assert.ok(body.trimEnd().endsWith("exit 0"))
  accessSync(hook, constants.X_OK)

  const again = runHouse(root, [ "hook", "install" ])
  assert.equal(again.status, 0, `${again.stdout}\n${again.stderr}`)
})

test("hook install refuses to overwrite an unknown hook without --force", (t) => {
  const root = project(t, { files: {} })
  const hook = join(root, ".git", "hooks", "pre-commit")
  const custom = "#!/bin/sh\necho custom\n"

  mkdirSync(dirname(hook), { recursive: true })
  writeFileSync(hook, custom)

  const refused = runHouse(root, [ "hook", "install" ])
  assert.equal(refused.status, 2)
  assert.ok(refused.stderr.includes("--force"), refused.stderr)
  assert.equal(readFileSync(hook, "utf8"), custom)

  const forced = runHouse(root, [ "hook", "install", "--force" ])
  assert.equal(forced.status, 0, `${forced.stdout}\n${forced.stderr}`)
  assert.ok(readFileSync(hook, "utf8").includes("# house: pre-commit hook"))
})

test("hook install honors core.hooksPath", (t) => {
  const root = project(t, { files: {} })
  spawnSync("git", [ "config", "core.hooksPath", ".githooks" ], { cwd: root })

  const run = runHouse(root, [ "hook", "install" ])
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`)

  const hook = join(root, ".githooks", "pre-commit")
  assert.ok(readFileSync(hook, "utf8").includes("# house: pre-commit hook"))
})

test("hook install needs a git repository", (t) => {
  const root = mkdtempSync(join(tmpdir(), "house-no-git-"))
  t.after(() => rmSync(root, { recursive: true, force: true }))

  const run = runHouse(root, [ "hook", "install" ])
  assert.equal(run.status, 2)
  assert.ok(run.stderr.includes("not inside a git repository"), run.stderr)
})

test("the pre-commit hook fixes only the staged files", (t) => {
  const root = project(t, {
    files: {
      "app.js": "const value = 1\n",
      "notes.txt": "not linted\n"
    }
  })
  const tools = toolsFor(t, root)
  writeFakeNpx(tools)

  const installed = runHouse(root, [ "hook", "install" ], { tools })
  assert.equal(installed.status, 0, `${installed.stdout}\n${installed.stderr}`)

  spawnSync("git", [ "add", "app.js" ], { cwd: root })

  const log = join(root, ".invocations.jsonl")
  const run = runHook(root, tools, log)
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`)

  const eslint = invocationsFor(readInvocations(log), "eslint")
  assert.ok(eslint.length > 0)
  assert.ok(eslint.every((entry) => entry.args.includes("app.js")))
  assert.ok(eslint.every((entry) => !entry.args.includes("notes.txt")))
})

test("the pre-commit hook skips a partially staged file", (t) => {
  const root = project(t, {
    files: {
      "app.js": "const value = 1\n"
    }
  })
  const tools = toolsFor(t, root)
  writeFakeNpx(tools)

  const installed = runHouse(root, [ "hook", "install" ], { tools })
  assert.equal(installed.status, 0, `${installed.stdout}\n${installed.stderr}`)

  spawnSync("git", [ "add", "app.js" ], { cwd: root })
  writeFileSync(join(root, "app.js"), "const value = 2\n")

  const log = join(root, ".invocations.jsonl")
  const run = runHook(root, tools, log)

  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`)
  assert.ok(run.stderr.includes("unstaged changes"), run.stderr)
  assert.equal(readInvocations(log).length, 0)
})
