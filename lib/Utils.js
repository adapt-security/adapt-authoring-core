import { metadataFileName, packageFileName } from './utils/constants.js'
import { isObject } from './utils/isObject.js'
import { getArgs } from './utils/getArgs.js'
import { spawn } from './utils/spawn.js'

/**
 * Miscellaneous utility functions for use throughout the application.
 * Prefer importing individual functions from 'adapt-authoring-core' directly.
 * @memberof core
 */
class Utils {
  static get metadataFileName () { return metadataFileName }
  static get packageFileName () { return packageFileName }
  static getArgs () { return getArgs() }
  static isObject (o) { return isObject(o) }
  static spawn (options) { return spawn(options) }
}

export default Utils

// Re-export individual functions for direct imports
export { metadataFileName, packageFileName } from './utils/constants.js'
export { isObject } from './utils/isObject.js'
export { getArgs } from './utils/getArgs.js'
export { spawn } from './utils/spawn.js'
export { readJson } from './utils/readJson.js'
export { writeJson } from './utils/writeJson.js'
export { toBoolean } from './utils/toBoolean.js'
export { ensureDir } from './utils/ensureDir.js'
export { escapeRegExp } from './utils/escapeRegExp.js'
