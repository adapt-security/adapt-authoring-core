import AdaptError from './AdaptError.js'
import fs from 'node:fs'
import { globSync } from 'glob'

/**
 * Loads and stores all error definitions for the application. Errors are accessed via human-readable error codes for better readability when thrown in code.
 * @memberof core
 */
class Errors {
  /**
   * @param {Object} options
   * @param {Object} options.dependencies Key/value map of dependency configs (each with a rootDir)
   * @param {Function} [options.log] Optional logging function (level, id, ...args)
   */
  constructor ({ dependencies, log } = {}) {
    const errorDefs = {}
    for (const d of Object.values(dependencies)) {
      const files = globSync('errors/*.json', { cwd: d.rootDir, absolute: true })
      for (const f of files) {
        try {
          const contents = JSON.parse(fs.readFileSync(f))
          Object.entries(contents).forEach(([k, v]) => {
            if (errorDefs[k]) {
              log?.('warn', 'errors', `error code '${k}' already defined`)
              return
            }
            errorDefs[k] = v
          })
        } catch (e) {
          log?.('warn', 'errors', e.message)
        }
      }
    }
    Object.entries(errorDefs)
      .sort()
      .forEach(([k, { description, statusCode, isFatal, data }]) => {
        Object.defineProperty(this, k, {
          get: () => {
            const metadata = { description }
            if (isFatal) metadata.isFatal = true
            if (data) metadata.data = data
            return new AdaptError(k, statusCode, metadata)
          },
          enumerable: true
        })
      })
  }
}

export default Errors
