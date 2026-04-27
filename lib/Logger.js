import chalk from 'chalk'
import Hook from './Hook.js'

/**
 * Provides console logging with configurable levels, colours, and module-specific overrides.
 * @memberof core
 */
class Logger {
  static levelColours = {
    error: chalk.red,
    warn: chalk.yellow,
    success: chalk.green,
    info: chalk.cyan,
    debug: chalk.dim,
    verbose: chalk.grey.italic
  }

  /**
   * Creates a Logger instance from config values
   * @param {Object} options
   * @param {Array<String>} options.levels Log level config strings. An empty array mutes all output.
   * @param {Boolean} options.showTimestamp Whether to show timestamps
   */
  constructor ({ levels = Object.keys(Logger.levelColours), showTimestamp = true } = {}) {
    /**
     * Hook invoked on each message logged
     * @type {Hook}
     */
    this.logHook = new Hook()
    /** @ignore */
    this.config = {
      levels: Object.entries(Logger.levelColours).reduce((m, [level, colour]) => {
        m[level] = {
          enable: Logger.isLevelEnabled(levels, level),
          moduleOverrides: Logger.getModuleOverrides(levels, level),
          lineOverrides: Logger.getLineOverrides(levels, level),
          colour
        }
        return m
      }, {}),
      idOverrides: Logger.getIdOverrides(levels),
      timestamp: showTimestamp,
      mute: levels.length === 0
    }
  }

  /**
   * Logs a message to the console. When `args[0]` is a string it's treated as
   * a short id for line-level filtering (e.g. `'verbose.server.ADD_ROUTE'`).
   * @param {String} level Severity of the message
   * @param {String} id Identifier for the message (typically the module name)
   * @param {...*} args Arguments to be logged
   */
  log (level, id, ...args) {
    const shortId = typeof args[0] === 'string' ? args[0] : undefined
    if (this.config.mute || !Logger.isLoggingEnabled(this.config.levels, level, id, shortId, this.config.idOverrides)) {
      return
    }
    const colour = this.config.levels[level]?.colour
    const logFunc = console[level] ?? console.log
    const timestamp = this.config.timestamp ? chalk.dim(`${new Date().toISOString()} `) : ''
    logFunc(`${timestamp}${colour ? colour(level) : level} ${chalk.magenta(id)}`, ...args)
    this.logHook.invoke(new Date(), level, id, ...args).catch((error) => {
      console.error('Logger logHook invocation failed:', error)
    })
  }

  /**
   * Determines whether a specific log level is enabled
   * @param {Array<String>} levelsConfig Array of level configuration strings
   * @param {String} level The log level to check
   * @return {Boolean}
   */
  static isLevelEnabled (levelsConfig, level) {
    return !levelsConfig.includes(`!${level}`) && levelsConfig.includes(level)
  }

  /**
   * Returns per-level module overrides (e.g. `debug.core` / `!debug.core`).
   * @param {Array<String>} levelsConfig Array of level configuration strings
   * @param {String} level The log level to find overrides for
   * @return {Array<String>}
   */
  static getModuleOverrides (levelsConfig, level) {
    return levelsConfig.filter(l => Logger.matchesLevelPrefix(l, level) && Logger.entrySegmentCount(l) === 2)
  }

  /**
   * Returns per-level line overrides (e.g. `debug.core.LOAD` / `!debug.core.LOAD`).
   * @param {Array<String>} levelsConfig Array of level configuration strings
   * @param {String} level The log level to find overrides for
   * @return {Array<String>}
   */
  static getLineOverrides (levelsConfig, level) {
    return levelsConfig.filter(l => Logger.matchesLevelPrefix(l, level) && Logger.entrySegmentCount(l) >= 3)
  }

  /**
   * Returns id-wide overrides — entries whose first segment isn't a known level,
   * meaning they apply to that id at every level (e.g. `core` / `!core`).
   * @param {Array<String>} levelsConfig Array of level configuration strings
   * @return {Array<String>}
   */
  static getIdOverrides (levelsConfig) {
    const knownLevels = Object.keys(Logger.levelColours)
    return levelsConfig.filter(entry => {
      const body = entry.startsWith('!') ? entry.slice(1) : entry
      const firstSegment = body.split('.')[0]
      return body.length > 0 && !knownLevels.includes(firstSegment)
    })
  }

  /** @ignore */
  static matchesLevelPrefix (entry, level) {
    return entry.startsWith(`${level}.`) || entry.startsWith(`!${level}.`)
  }

  /** @ignore */
  static entrySegmentCount (entry) {
    const body = entry.startsWith('!') ? entry.slice(1) : entry
    return body.split('.').length
  }

  /**
   * Returns whether a message should be logged. Resolution order, most-specific
   * wins: line-level (`!level.id.shortId`) → per-level module (`!level.id`)
   * → id-wide (`!id`) → global level.
   * @param {Object} configLevels The resolved levels config object
   * @param {String} level Logging level
   * @param {String} id Id of log caller
   * @param {String} [shortId] Optional line-level id (typically `args[0]`)
   * @param {Array<String>} [idOverrides] Id-wide override entries
   * @returns {Boolean}
   */
  static isLoggingEnabled (configLevels, level, id, shortId, idOverrides = []) {
    const { enable, moduleOverrides = [], lineOverrides = [] } = configLevels?.[level] || {}
    if (typeof shortId === 'string') {
      if (lineOverrides.includes(`!${level}.${id}.${shortId}`)) return false
      if (lineOverrides.includes(`${level}.${id}.${shortId}`)) return true
    }
    if (moduleOverrides.includes(`!${level}.${id}`)) return false
    if (moduleOverrides.includes(`${level}.${id}`)) return true
    if (idOverrides.includes(`!${id}`)) return false
    if (idOverrides.includes(id)) return true
    return Boolean(enable)
  }
}

export default Logger
