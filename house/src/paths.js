import { dirname } from "node:path"
import { fileURLToPath } from "node:url"

export const houseRoot = dirname(dirname(fileURLToPath(import.meta.url)))
