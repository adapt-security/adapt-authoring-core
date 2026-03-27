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
    this.git = this.getGitInfo()
  }

  /** @override */
  async init () {
    /**
     * Reference to the passed arguments (parsed for easy reference)
     * @type {Object}
     */
    this.args = getArgs()
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

    let startError
    try {
      await this.start()
      this.log('verbose', 'GIT', 'INFO', this.git)
      this.log('verbose', 'DIR', 'rootDir', this.rootDir)
      this.log('verbose', 'DIR', 'dataDir', this.getConfig('dataDir'))
      this.log('verbose', 'DIR', 'tempDir', this.getConfig('tempDir'))
    } catch (e) {
      startError = e
    }
    const failedMods = this.dependencyloader.failedModules
    if (failedMods.length) this.log('warn', `${failedMods.length} module${failedMods.length === 1 ? '' : 's'} failed to load: ${failedMods}. See above for details`)
    if (startError) {
      process.exitCode = 1
      const e = new Error('Failed to start App')
      e.cause = startError
      throw e
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
    if (this._isReady) throw new Error('warn', 'cannot start app, already started')
    if (this._isStarting) throw new Error('warn', 'cannot start app, already initialising')

    this._isStarting = true

    /**
     * Reference to the Logger instance
     * @type {Logger}
     */
    this.logger = new Logger()

    await this.dependencyloader.loadConfigs()
    await this.runMigrations()
    await this.loadLibraries()
    await this.dependencyloader.load()

    this._isStarting = false
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
   * Loads the core bootstrap libraries (config, logger, errors, lang) before any modules initialise.
   * @return {Promise}
   */
  async loadLibraries () {
    const deps = this.dependencies
    /**
     * Reference to the Config instance
     * @type {Config}
     */
    this.config = await Config.load(this.rootDir, deps, this.name, this.logger)
    this.logger = new Logger({
      levels: this.getConfig('logLevels'),
      showTimestamp: this.getConfig('showLogTimestamp')
    })
    this.logger.log('info', 'config', `using config at ${this.config.configFilePath}`)
    /**
     * Reference to the error registry
     * @type {Errors}
     */
    this.errors = await Errors.load(deps, msg => this.logger.log('warn', 'errors', msg))
    /**
     * Reference to the Lang instance
     * @type {Lang}
     */
    this.lang = new Lang()
    await this.lang.loadPhrases(deps, this.rootDir, (...args) => this.logger.log('error', 'lang', ...args))

    const configRootDir = this.getConfig('rootDir')
    if (configRootDir) /** @ignore */this.rootDir = configRootDir
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
