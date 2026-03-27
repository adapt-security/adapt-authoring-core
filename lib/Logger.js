import chalk from 'chalk'
import Hook from './Hook.js'

/**
 * Provides console logging with configurable levels, colours, and module-specific overrides.
 * @memberof core
 */
class Logger {
  /**
   * Creates a Logger instance from config values
   * @param {Object} options
   * @param {Array<String>} options.levels Log level config strings. An empty array mutes all output.
   * @param {Boolean} options.showTimestamp Whether to show timestamps
   */
  static levelColours = {
    error: chalk.red,
    warn: chalk.yellow,
    success: chalk.green,
    info: chalk.cyan,
    debug: chalk.dim,
    verbose: chalk.grey.italic
  }

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
          colour
        }
        return m
      }, {}),
      timestamp: showTimestamp,
      mute: levels.length === 0
    }
  }

  /**
   * Logs a message to the console
   * @param {String} level Severity of the message
   * @param {String} id Identifier for the message
   * @param {...*} args Arguments to be logged
   */
  log (level, id, ...args) {
    if (this.config.mute) {
      return
    }
    if (!Logger.isLoggingEnabled(this.config.levels, level, id)) {
      return
    }
    const colour = this.config.levels[level]?.colour
    const logFunc = console[level] ?? console.log
    logFunc(`${Logger.getDateStamp(this.config)}${Logger.colourise(level, colour)} ${Logger.colourise(id, chalk.magenta)}`, ...args)
    this.logHook.invoke(new Date(), level, id, ...args)
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
   * Returns module-specific log level overrides
   * @param {Array<String>} levelsConfig Array of level configuration strings
   * @param {String} level The log level to find overrides for
   * @return {Array<String>}
   */
  static getModuleOverrides (levelsConfig, level) {
    const overrides = []
    levelsConfig.forEach(l => {
      const s = `${level}.`; const notS = `!${level}.`
      if (l.indexOf(s) === 0 || l.indexOf(notS) === 0) overrides.push(l)
    })
    return overrides
  }

  /**
   * Returns whether a message should be logged based on the resolved config
   * @param {Object} configLevels The resolved levels config object
   * @param {String} level Logging level
   * @param {String} id Id of log caller
   * @returns {Boolean}
   */
  static isLoggingEnabled (configLevels, level, id) {
    const { enable, moduleOverrides = [] } = configLevels?.[level] || {}
    const isEnabled = enable || moduleOverrides.includes(`${level}.${id}`)
    const disableOverride = moduleOverrides.includes(`!${level}.${id}`)
    return isEnabled && !disableOverride
  }

  /**
   * Colours a string using a chalk function
   * @param {String} str The string to colourise
   * @param {Function} colourFunc A chalk colour function
   * @return {String}
   */
  static colourise (str, colourFunc) {
    if (typeof colourFunc === 'string') colourFunc = chalk[colourFunc]
    return colourFunc ? colourFunc(str) : str
  }

  /**
   * Returns a formatted ISO date stamp string
   * @param {Object} config Logger configuration
   * @return {String}
   */
  static getDateStamp (config) {
    if (!config.timestamp) {
      return ''
    }
    return Logger.colourise(`${new Date().toISOString()} `, chalk.dim)
  }
}

export default Logger
