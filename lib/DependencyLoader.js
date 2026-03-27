import { glob } from 'glob'
import path from 'path'
import Hook from './Hook.js'
import { metadataFileName, packageFileName, stripScope, readJson } from './Utils.js'

/**
 * Handles the loading of Adapt authoring tool module dependencies.
 * @memberof core
 */
class DependencyLoader {
  /**
   * Creates a new DependencyLoader instance
   * @param {App} app The main app instance
   */
  constructor (app) {
    /**
     * Name of the class (convenience function to stay consistent with other classes)
     * @type {string}
     */
    this.name = this.constructor.name.toLowerCase()
    /**
     * Reference to the main app
     * @type {App}
     */
    this.app = app
    /**
     * Key/value store of all the Adapt dependencies' configs. Note this includes dependencies which are not loaded as Adapt modules (i.e. `module: false`).
     * @type {Object<string, Object>}
     */
    this.configs = {}
    /**
     * Map of module names to their loaded instances
     * @type {Object<string, Object>}
     */
    this.instances = {}
    /**
     * Map of module names to arrays of modules that depend on them as peer dependencies
     * @type {Object<string, Array<string>>}
     */
    this.peerDependencies = {}
    /**
     * List of module names which have failed to load
     * @type {Array<string>}
     */
    this.failedModules = []
    /**
     * Hook called once all module configs are loaded
     * @type {Hook}
     */
    this.configsLoadedHook = new Hook()
    /**
     * Hook for individual module load
     * @type {Hook}
     */
    this.moduleLoadedHook = new Hook()

    this.moduleLoadedHook.tap(this.logProgress, this)
  }

  /**
   * Loads configuration files for all Adapt dependencies found in node_modules.
   * @return {Promise<void>}
   */
  async loadConfigs () {
    /** @ignore */ this._configsLoaded = false
    const corePathSegment = `/${this.app.name}/`
    const files = await glob(`${this.app.rootDir}/node_modules/**/${metadataFileName}`)
    const deps = files
      .map(d => d.replace(`${metadataFileName}`, ''))
      .sort((a, b) => {
        if (a.endsWith(corePathSegment)) return -1
        if (b.endsWith(corePathSegment)) return 1
        return a.length - b.length
      })
    for (const d of deps) {
      try {
        const c = await this.loadModuleConfig(d)
        if (!this.configs[c.name]) {
          this.configs[c.name] = c
          if (c.peerDependencies) {
            Object.keys(c.peerDependencies).forEach(p => {
              this.peerDependencies[p] = [...(this.peerDependencies[p] || []), c.name]
            })
          }
        }
      } catch (e) {
        this.log('error', `Failed to load config for '${d}', module will not be loaded`)
        this.log('error', e)
      }
    }
    this._configsLoaded = true
    await this.configsLoadedHook.invoke()
  }

  /**
   * Loads the relevant configuration files for an Adapt module by reading and merging package.json and adapt.json
   * @param {string} modDir Absolute path to the module directory
   * @return {Promise<Object>} Resolves with configuration object
   */
  async loadModuleConfig (modDir) {
    const pkg = await readJson(path.join(modDir, packageFileName))
    return {
      ...pkg,
      ...await readJson(path.join(modDir, metadataFileName)),
      name: stripScope(pkg.name),
      packageName: pkg.name,
      rootDir: modDir
    }
  }

  /**
   * Loads a single Adapt module by dynamically importing it, instantiating it, and waiting for its onReady promise. Should not need to be called directly.
   * @param {string} modName Name of the module to load (e.g., 'adapt-authoring-core')
   * @return {Promise<Object>} Resolves with module instance when module.onReady completes
   * @throws {Error} When module already exists, is in an unknown format or cannot be initialised (or initialisation exceeds 60 second timeout)
   */
  async loadModule (modName) {
    if (this.instances[modName]) {
      throw this.app.errors.DEP_ALREADY_LOADED.setData({ module: modName })
    }
    const config = this.configs[modName]

    if (config.module === false) {
      return
    }
    const { default: ModClass } = await import(config.packageName)

    if (typeof ModClass !== 'function') {
      throw this.app.errors.DEP_INVALID_EXPORT.setData({ module: modName })
    }
    const instance = new ModClass(this.app, config)

    if (typeof instance.onReady !== 'function') {
      throw this.app.errors.DEP_NO_ONREADY.setData({ module: modName })
    }
    try {
      const timeout = this.app.getConfig('moduleLoadTimeout') ?? 10000
      await Promise.race([
        instance.onReady(),
        new Promise((resolve, reject) => setTimeout(() => reject(this.app.errors.DEP_TIMEOUT.setData({ module: modName, timeout })), timeout))
      ])
      this.instances[modName] = instance
      await this.moduleLoadedHook.invoke(null, instance)
      return instance
    } catch (e) {
      await this.moduleLoadedHook.invoke(e, { name: modName })
      throw e
    }
  }

  /**
   * Loads Adapt modules. If no list is provided, loads all configured dependencies.
   * @param {Array<string>} [modules] Module names to load (defaults to all dependencies)
   * @return {Promise<void>} Resolves when all modules have loaded or failed
   * @throws {Error} When any module throws a fatal error (error.isFatal or error.cause.isFatal)
   */
  async loadModules (modules = Object.values(this.configs).map(c => c.name)) {
    await Promise.all(modules.map(async m => {
      try {
        await this.loadModule(m)
      } catch (e) {
        if (e.isFatal || e.cause?.isFatal) {
          throw e
        }
        this.log('error', `Failed to load '${m}',`, e)
        const deps = this.peerDependencies[m]
        if (deps?.length) {
          this.log('error', 'The following modules are peer dependencies, and may not work:')
          deps.forEach(d => this.log('error', `- ${d}`))
        }
        this.failedModules.push(m)
      }
    }))
  }

  /**
   * Waits for a single module to load. Returns the instance (if loaded), or hooks into moduleLoadedHook to wait for it.
   * @param {string} modName Name of module to wait for (accepts short names without 'adapt-authoring-' prefix)
   * @return {Promise<Object>} Resolves with module instance when module.onReady completes
   * @throws {Error} When module is missing from configs or has failed to load
   */
  async waitForModule (modName) {
    if (!this._configsLoaded) {
      await this.configsLoadedHook.onInvoke()
    }
    if (!modName.startsWith('adapt-authoring-')) modName = `adapt-authoring-${modName}`
    if (!this.configs[modName]) {
      throw this.app.errors.DEP_MISSING.setData({ module: modName })
    }
    if (this.failedModules.includes(modName)) {
      throw this.app.errors.DEP_FAILED.setData({ module: modName })
    }
    const instance = this.instances[modName]
    if (instance) {
      return instance.onReady()
    }
    return new Promise((resolve, reject) => {
      this.moduleLoadedHook.tap((error, instance) => {
        if (instance?.name === modName) return resolve(instance)
        if (error && instance?.name === modName) {
          return reject(this.app.errors.DEP_FAILED.setData({ module: modName }))
        }
      })
    })
  }

  /**
   * Logs load progress
   * @param {AbstractModule} instance The last loaded instance
   */
  logProgress (error, instance) {
    if (error) return

    const toShort = names => names.map(n => n.replace('adapt-authoring-', '')).join(', ')
    const loaded = []
    const notLoaded = []
    let totalCount = 0
    Object.keys(this.configs).forEach(key => {
      if (this.configs[key].module === false) return
      this.instances[key]?._isReady || key === instance.name ? loaded.push(key) : notLoaded.push(key)
      totalCount++
    })
    const progress = Math.round((loaded.length / totalCount) * 100)
    this.log('verbose', 'LOAD', [
      toShort([instance.name]),
      `${loaded.length}/${totalCount} (${progress}%)`,
      notLoaded.length && `awaiting: ${toShort(notLoaded)}`,
      this.failedModules.length && `failed: ${toShort(this.failedModules)}`
    ].filter(Boolean).join(', '))

    if (progress === 100) {
      const initTimes = Object.fromEntries(
        Object.entries(this.instances)
          .sort(([, a], [, b]) => a.initTime - b.initTime)
          .map(([name, inst]) => [name, inst.initTime])
      )
      this.log('verbose', initTimes)
    }
  }

  /**
   * Logs a message using the app logger
   * @param {...*} args Arguments to be logged
   */
  log (level, ...args) {
    this.app.logger?.log(level, this.name, ...args)
  }
}

export default DependencyLoader
