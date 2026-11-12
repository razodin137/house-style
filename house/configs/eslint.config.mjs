import { createRequire } from "node:module"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

const require = createRequire(join(process.cwd(), "package.json"))
const configPath = require.resolve("@razodin137/eslint-config")
const loaded = await import(pathToFileURL(configPath).href)
const config = loaded.default ?? loaded

export default Array.isArray(config) ? config : [ config ]
