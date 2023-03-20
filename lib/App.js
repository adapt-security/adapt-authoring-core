import AbstractModule from './AbstractModule.js'
import DependencyLoader from './DependencyLoader.js'
import { fileURLToPath } from 'url'
import fs from 'fs'
import path from 'path'
import Utils from './Utils.js'

let instance
/**
 * Core functionality
 * @namespace core
 */
/**
 * The main application class
 * @memberof core
 * @extends {AbstractModule}
 */
class App extends AbstractModule {
  /**
   * The singleton instance. Self-initialises it if there isn't one.
   * @type {App}
   */
  static get instance () {
    if (!instance) instance = new App()
    return instance
  }

  /** @override */
  constructor () {
    const rootDir = fileURLToPath(new URL('../../..', import.meta.url))
    const adaptJson = JSON.parse(fs.readFileSync(path.join(rootDir, Utils.metadataFileName)))
    const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, Utils.packageFileName)))
    super(null, { ...packageJson, ...adaptJson, name: 'adapt-authoring-core', rootDir })
  }

  /** @override */
  async init () {
    /**
     * Reference to the passed arguments (parsed for easy reference)
     * @type {Object}
     */
    this.args = Utils.getArgs()
    /**
     * Instance of App instance (required by all AbstractModules)
     * @type {App}
     */
    this.app = this
    /**
     * Reference to the DependencyLoader instance
     * @type {DependencyLoader}
     */
    this.dependencyloader = new DependencyLoader(this)

    /** @ignore */ this._isStarting = false

    const configRootDir = this.getConfig('rootDir')
    if (configRootDir) /** @ignore */this.rootDir = configRootDir

    let startError
    try {
      await this.start()
    } catch (e) {
      startError = e
    }
    const failedMods = this.dependencyloader.failedModules
    if (failedMods.length) this.log('warn', `${failedMods.length} module${failedMods.length === 1 ? '' : 's'} failed to load: ${failedMods}. See above for details`)
    if (startError) {
      process.exitCode = 1
      throw new Error('Failed to start App')
    }
  }

  /**
   * The Adapt module dependencies and their configs
   * @type {Object}
   */
  get dependencies () {
    return this.dependencyloader.configs
  }

  /**
   * Starts the app
   * @return {Promise} Resolves when the app has started
   */
  async start () {
    if (this._isReady) throw new Error('warn', 'cannot start app, already started')
    if (this._isStarting) throw new Error('warn', 'cannot start app, already initialising')

    this._isStarting = true

    await this.dependencyloader.load()

    this._isStarting = false
  }

  /**
   * Enables waiting for other modules to load
   * @param {...String} modNames Names of modules to wait for
   * @return {Promise} Resolves when specified module has been loaded
   */
  async waitForModule (...modNames) {
    const results = await Promise.all(modNames.map(m => this.dependencyloader.waitForModule(m)))
    return results.length > 1 ? results : results[0]
  }

  /** @override */
  setReady (error) {
    this._isStarting = false
    super.setReady(error)
  }
}

export default App
