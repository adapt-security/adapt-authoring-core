import AbstractModule from './AbstractModule.js'
import Config from './Config.js'
import DependencyLoader from './DependencyLoader.js'
import Errors from './Errors.js'
import Lang from './Lang.js'
import Logger from './Logger.js'
import fs from 'fs'
import path from 'path'
import { metadataFileName, packageFileName, getArgs } from './Utils.js'

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
    const rootDir = process.env.ROOT_DIR ?? process.cwd()
    const adaptJson = JSON.parse(fs.readFileSync(path.join(rootDir, metadataFileName)))
    const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, packageFileName)))
    super(null, { ...packageJson, ...adaptJson, name: 'adapt-authoring-core', rootDir })
    /**
     * Instance of App instance (required by all AbstractModules)
     * @type {App}
     */
    this.app = this
    /**
     * Reference to the passed arguments (parsed for easy reference)
     * @type {Object}
     */
    this.args = getArgs()
    /**
     * Reference to the DependencyLoader instance
     * @type {DependencyLoader}
     */
    this.dependencyloader = new DependencyLoader(this)
    this.git = this.getGitInfo()
  }

  /** @override */
  async init () {
    try {
      await this.start()
    } catch (e) {
      process.exitCode = 1
      const error = new Error('Failed to start App')
      error.cause = e
      throw error
    }
    const failedMods = this.dependencyloader.failedModules
    if (failedMods.length) this.log('warn', `${failedMods.length} module${failedMods.length === 1 ? '' : 's'} failed to load: ${failedMods}. See above for details`)
  }

  /**
   * The Adapt module dependencies and their configs
   * @type {Object}
   */
  get dependencies () {
    return this.dependencyloader.configs
  }

  /**
   * Attempts to load and parse the local git data for the root repository
   * @returns {Object}
   */
  getGitInfo () {
    try {
      const gitRoot = path.join(this.rootDir, '.git')
      const gitHead = fs.readFileSync(path.join(gitRoot, 'HEAD'), 'utf8').trim()
      return {
        branch: gitHead.split('/').pop(),
        commit: fs.readFileSync(path.join(gitRoot, gitHead.split(': ')[1]), 'utf8').trim()
      }
    } catch (e) {
      return {}
    }
  }

  /**
   * Starts the app
   * @return {Promise} Resolves when the app has started
   */
  async start () {
    if (this._isReady) throw new Error('cannot start app, already started')

    /**
     * Reference to the Logger instance
     * @type {Logger}
     */
    this.logger = new Logger()

    await this.dependencyloader.loadConfigs()
    await this.runMigrations()

    /**
     * Reference to the Config instance
     * @type {Config}
     */
    this.config = await Config.load(this.rootDir, this.dependencies, this.name, this.logger)
    this.logger = new Logger({
      levels: this.getConfig('logLevels'),
      showTimestamp: this.getConfig('showLogTimestamp')
    })
    /**
     * Reference to the error registry
     * @type {Errors}
     */
    this.errors = await Errors.load(this.dependencies, msg => this.logger.log('warn', 'errors', msg))
    /**
     * Reference to the Lang instance
     * @type {Lang}
     */
    this.lang = new Lang()
    await this.lang.loadPhrases(this.dependencies, this.rootDir, (...args) => this.logger.log('error', 'lang', ...args))

    await this.dependencyloader.loadModules()

    this.log('verbose', 'GIT', 'INFO', this.git)
    this.log('verbose', 'DIR', 'rootDir', this.rootDir)
    this.log('verbose', 'DIR', 'dataDir', this.getConfig('dataDir'))
    this.log('verbose', 'DIR', 'tempDir', this.getConfig('tempDir'))
  }

  /**
   * Runs pending migrations before config validation and module loading.
   * Reads the user config file directly to obtain the MongoDB connection URI.
   * @return {Promise}
   */
  async runMigrations () {
    const configFilePath = path.join(this.rootDir, 'conf', `${process.env.NODE_ENV}.config.js`)
    let userConfig
    try {
      userConfig = (await import(configFilePath)).default
    } catch (e) {
      return // no config file, nothing to migrate
    }
    const connectionUri = userConfig['adapt-authoring-mongodb']?.connectionUri
    if (!connectionUri) return

    const log = (level, ...args) => this.logger.log(level, ...args)
    const { runMigrations } = await import('adapt-authoring-migrations')
    await runMigrations({
      dependencies: this.dependencies,
      connectionUri,
      rootDir: this.rootDir,
      log,
      dryRun: this.args['dry-run'] === true
    })
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
}

export default App
