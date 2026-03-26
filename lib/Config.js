import { Schemas } from 'adapt-schemas'
import chalk from 'chalk'
import fs from 'fs/promises'
import path from 'path'

/**
 * Loads, validates, and provides access to application configuration.
 * Configuration is sourced from user settings files, environment variables, and module schema defaults.
 * @memberof core
 */
class Config {
  /**
   * Loads configuration from all sources
   * @param {String} rootDir Application root directory
   * @param {Object} dependencies Key/value map of dependency configs
   * @param {String} appName The core module name (for sorting)
   * @returns {Promise<Config>}
   */
  static async load (rootDir, dependencies, appName) {
    const instance = new Config()
    instance.rootDir = rootDir
    instance.configFilePath = path.join(rootDir, 'conf', `${process.env.NODE_ENV}.config.js`)
    await instance.storeUserSettings()
    instance.storeEnvSettings()
    instance.storeSchemaSettings(dependencies, appName)
    return instance
  }

  constructor () {
    /** @ignore */
    this._config = {}
    /**
     * Application root directory
     * @type {String}
     */
    this.rootDir = undefined
    /**
     * Path to the user configuration file
     * @type {String}
     */
    this.configFilePath = undefined
    /**
     * The keys for all attributes marked as public
     * @type {Array<String>}
     */
    this.publicAttributes = []
  }

  /**
   * Determines whether an attribute has a set value
   * @param {String} attr Attribute key name
   * @return {Boolean}
   */
  has (attr) {
    return Object.hasOwn(this._config, attr)
  }

  /**
   * Returns a value for a given attribute
   * @param {String} attr Attribute key name
   * @return {*}
   */
  get (attr) {
    return this._config[attr]
  }

  /**
   * Retrieves all config options marked as 'public'
   * @return {Object}
   */
  getPublicConfig () {
    return this.publicAttributes.reduce((m, a) => {
      m[a] = this.get(a)
      return m
    }, {})
  }

  /**
   * Loads the relevant config file into memory
   * @return {Promise<Object|undefined>} The parsed config object, or undefined if loading failed
   */
  async storeUserSettings () {
    let configError
    let config
    try {
      await fs.readFile(this.configFilePath)
    } catch (e) {
      if (e.code === 'ENOENT') configError = `No config file found at '${this.configFilePath}'`
    }
    try {
      if (!configError) config = (await import(this.configFilePath)).default
    } catch (e) {
      configError = e.toString()
    }
    if (configError) {
      console.log(chalk.yellow(`Failed to load config at ${this.configFilePath}:\n\n${configError}\n\nWill attempt to run with defaults.\n`))
      return
    }
    Object.entries(config).forEach(([name, c]) => {
      Object.entries(c).forEach(([key, val]) => {
        this._config[`${name}.${key}`] = val
      })
    })
    return config
  }

  /**
   * Copy env values to config
   */
  storeEnvSettings () {
    Object.entries(process.env).forEach(([key, val]) => {
      try {
        val = JSON.parse(val)
      } catch {} // ignore parse errors for non-JSON values
      this._config[Config.envVarToConfigKey(key)] = val
    })
  }

  /**
   * Processes all module config schema files
   * @param {Object} dependencies Key/value map of dependency configs
   * @param {String} appName The core module name (for sorting)
   */
  storeSchemaSettings (dependencies, appName) {
    const schemas = new Schemas()
    const isCore = d => d.name === appName
    const deps = Object.values(dependencies).sort((a, b) => {
      if (isCore(a)) return -1
      if (isCore(b)) return 1
      return a.name.localeCompare(b.name)
    })
    const coreDep = deps.find(d => isCore(d))
    if (coreDep) this.processModuleSchema(coreDep, schemas)

    let hasErrored = false
    for (const d of deps.filter(d => !isCore(d))) {
      try {
        this.processModuleSchema(d, schemas)
      } catch (e) {
        hasErrored = true
        if (e?.data?.errors) {
          console.log(`${e.modName}: ${e.data.errors}`)
        } else {
          console.log(e)
        }
      }
    }
    if (hasErrored) throw new Error('Config validation failed')
  }

  /**
   * Processes and validates a single module config schema
   * @param {Object} pkg Package.json data
   * @param {Schemas} schemas Schemas library instance
   */
  processModuleSchema (pkg, schemas) {
    if (!pkg.name || !pkg.rootDir) return
    const schemaPath = path.resolve(pkg.rootDir, 'conf/config.schema.json')
    let schema
    try {
      schema = schemas.createSchema(schemaPath).build()
    } catch (e) {
      return
    }
    const dirKeys = new Set()
    let data = Object.entries(schema.raw.properties).reduce((m, [k, v]) => {
      if (v?._adapt?.isPublic) this.publicAttributes.push(`${pkg.name}.${k}`)
      if (v?.isDirectory) dirKeys.add(k)
      return { ...m, [k]: this.get(`${pkg.name}.${k}`) }
    }, {})
    try {
      data = schema.validate(data)
    } catch (e) {
      e.modName = pkg.name
      throw e
    }
    Object.entries(data).forEach(([key, val]) => {
      if (dirKeys.has(key) && typeof val === 'string') {
        val = this.resolveDirectory(val)
      }
      this._config[`${pkg.name}.${key}`] = val
    })
  }

  /**
   * Resolves directory path variables ($ROOT, $DATA, $TEMP)
   * @param {String} value The path string to resolve
   * @return {String}
   */
  resolveDirectory (value) {
    const vars = [
      ['$ROOT', this.rootDir],
      ['$DATA', this._config['adapt-authoring-core.dataDir']],
      ['$TEMP', this._config['adapt-authoring-core.tempDir']]
    ]
    for (const [key, replacement] of vars) {
      if (value.startsWith(key) && replacement && !replacement.startsWith('$')) {
        return path.resolve(replacement, value.replace(key, '').slice(1))
      }
    }
    return value
  }

  /**
   * Parses an environment variable key into a format expected by Config
   * @param {String} envVar
   * @return {String}
   */
  static envVarToConfigKey (envVar) {
    if (envVar.startsWith('ADAPT_AUTHORING_')) {
      const [modPrefix, key] = envVar.split('__')
      return `${modPrefix.replace(/_/g, '-').toLowerCase()}.${key}`
    }
    return `env.${envVar}`
  }
}

export default Config
