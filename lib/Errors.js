import AdaptError from './AdaptError.js'
import fs from 'fs/promises'
import { glob } from 'glob'

/**
 * Loads and stores all error definitions for the application. Errors are accessed via human-readable error codes for better readability when thrown in code.
 * @memberof core
 */
class Errors {
  /**
   * Loads all errors defined in Adapt module dependencies
   * @param {Object} dependencies Key/value map of dependency configs (each with a rootDir)
   * @param {Function} [logWarn] Optional logging function for duplicate warnings
   * @returns {Promise<Errors>}
   */
  static async load (dependencies, logWarn) {
    const instance = new Errors()
    const errorDefs = {}
    await Promise.all(Object.values(dependencies).map(async d => {
      const files = await glob('errors/*.json', { cwd: d.rootDir, absolute: true })
      await Promise.all(files.map(async f => {
        try {
          const contents = JSON.parse(await fs.readFile(f))
          Object.entries(contents).forEach(([k, v]) => {
            if (errorDefs[k]) {
              if (logWarn) logWarn(`error code '${k}' already defined`)
              return
            }
            errorDefs[k] = v
          })
        } catch (e) {
          if (logWarn) logWarn(e.message)
        }
      }))
    }))
    Object.entries(errorDefs)
      .sort()
      .forEach(([k, { description, statusCode, isFatal, data }]) => {
        Object.defineProperty(instance, k, {
          get: () => {
            const metadata = { description }
            if (isFatal) metadata.isFatal = true
            if (data) metadata.data = data
            return new AdaptError(k, statusCode, metadata)
          },
          enumerable: true
        })
      })
    return instance
  }
}

export default Errors
