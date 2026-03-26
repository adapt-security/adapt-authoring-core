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
  constructor ({ levels = ['error', 'warn', 'success', 'info', 'debug', 'verbose'], showTimestamp = true } = {}) {
    /**
     * Hook invoked on each message logged
     * @type {Hook}
     */
    this.logHook = new Hook()
    /** @ignore */
    this.config = {
      levels: {
        error: {
          enable: Logger.isLevelEnabled(levels, 'error'),
          moduleOverrides: Logger.getModuleOverrides(levels, 'error'),
          colour: chalk.red
        },
        warn: {
          enable: Logger.isLevelEnabled(levels, 'warn'),
          moduleOverrides: Logger.getModuleOverrides(levels, 'warn'),
          colour: chalk.yellow
        },
        success: {
          enable: Logger.isLevelEnabled(levels, 'success'),
          moduleOverrides: Logger.getModuleOverrides(levels, 'success'),
          colour: chalk.green
        },
        info: {
          enable: Logger.isLevelEnabled(levels, 'info'),
          moduleOverrides: Logger.getModuleOverrides(levels, 'info'),
          colour: chalk.cyan
        },
        debug: {
          enable: Logger.isLevelEnabled(levels, 'debug'),
          moduleOverrides: Logger.getModuleOverrides(levels, 'debug'),
          colour: chalk.dim
        },
        verbose: {
          enable: Logger.isLevelEnabled(levels, 'verbose'),
          moduleOverrides: Logger.getModuleOverrides(levels, 'verbose'),
          colour: chalk.grey.italic
        }
      },
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
