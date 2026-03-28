import AbstractModule from './AbstractModule.js'
import Config from './Config.js'
import DependencyLoader from './DependencyLoader.js'
import Errors from './Errors.js'
import Lang from './Lang.js'
import Logger from './Logger.js'
import fs from 'fs'
import path from 'path'
import { runMigrations } from 'adapt-authoring-migrations'
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
    process.env.NODE_ENV ??= 'production'
    const rootDir = process.env.ROOT_DIR ?? process.cwd()
    const adaptJson = JSON.parse(fs.readFileSync(path.join(rootDir, metadataFileName)))
    const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, packageFileName)))
    super(null, { ...packageJson, ...adaptJson, name: 'adapt-authoring-core', rootDir })
  }

  /** @override */
  async init () {
    try {
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
       * Reference to the Config instance
       * @type {Config}
       */
      this.config = undefined
      /**
       * Reference to the error registry
       * @type {Errors}
       */
      this.errors = undefined
      /**
       * Reference to the Lang instance
       * @type {Lang}
       */
      this.lang = undefined
      /**
       * Reference to the Logger instance
       * @type {Logger}
       */
      this.logger = new Logger()
      /**
       * Reference to the DependencyLoader instance
       * @type {DependencyLoader}
       */
      this.dependencyloader = new DependencyLoader(this)
      /**
       * Git metadata for the application (branch and commit hash)
       * @type {Object}
       */
      this.git = this.getGitInfo()

      await this.dependencyloader.loadConfigs()

      const options = {
        dependencies: this.dependencies,
        configFilePath: path.join(this.rootDir, 'conf', `${process.env.NODE_ENV}.config.js`),
        rootDir: this.rootDir,
        log: (...args) => this.logger.log(...args)
      }

      await runMigrations({ ...options, dryRun: this.args['dry-run'] === true })

      this.config = await new Config({ ...options, appName: this.name }).load()
      this.logger = new Logger({ levels: this.getConfig('logLevels'), showTimestamp: this.getConfig('showLogTimestamp') })
      this.errors = new Errors(options)
      this.lang = new Lang({ ...options, defaultLang: this.getConfig('defaultLang') })

      await this.dependencyloader.loadModules()

      this.log('verbose', 'GIT', 'INFO', this.git)
      this.log('verbose', 'DIR', 'rootDir', this.rootDir)
      this.log('verbose', 'DIR', 'dataDir', this.getConfig('dataDir'))
      this.log('verbose', 'DIR', 'tempDir', this.getConfig('tempDir'))
    } catch (cause) {
      process.exitCode = 1
      throw new Error('Failed to start App', { cause })
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
