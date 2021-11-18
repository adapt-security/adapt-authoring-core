import Events from './Events.js';
/**
 * Abstract class for authoring tool modules. All custom modules must extend this class.
 * @extends {Events}
 */
export default class AbstractModule extends Events {
  /**
   * Create the Module instance
   * @param {Object} app Reference to the main application
   * @param {Object} pkg Config object from package.json for this module
   */
  constructor(app, pkg, options = { autoInit: true }) {
    super(app, pkg);
    /**
     * Reference to the main app instance
     * @type {App}
     */
    this.app = app;
    /**
     * Module config options
     * @type {Object}
     */
    this.pkg = pkg;
    /**
     * Name of the module
     * @type {String}
     */
    this.name = pkg?.name || this.constructor.name;
    /**
     * Root directory of this module
     * @type {String}
     */
    this.rootDir = pkg?.rootDir;
    /** @ignore */
    this._isReady = false;

    if(!options.autoInit) return;

    this.init()
      .then(() => this.setReady())
      .catch(e => this.setFailed(e));
  }
  /**
   * Initialises the module. Any custom initialisation tasks should go here.
   * @return {Promise}
   */
  async init() {
  }
  /**
   * Signals that the module is loaded
   * @emits {ready}
   * @param {Error} error
   * @return {Promise}
   */
  setReady(error) {
    if(this._isReady) {
      return;
    }
    this._isReady = true;
    this.emit('ready', this, error);
    this.constructor.emit('ready', this.name, this);
    this.log('debug', 'ready');
  }
  /**
   * Alias for setReady
   * @param {Error} error
   * @see {AbstractModule#setReady}
   */
  setFailed(error) {
    this.setReady(error);
  }
  /**
   * Used to listen to the module's ready signal
   * @return {Promise}
   */
  async onReady() {
    return new Promise((resolve, reject) => {
      if(this._isReady) {
        return this._initError ? reject(this._initError) : resolve(this);
      }
      this.once('ready', (instance, error) => {
        if(error) {
          /** @ignore */this._initError = error;
          return reject(error);
        }
        resolve(instance);
      });
    });
  }
  /**
   * Shortcut for retrieving config values
   * @param {String} key
   * @return {*}
   */
  getConfig(key) {
    try {
      return this.app.config.get(`${this.name}.${key}`);
    } catch(e) {
      return undefined;
    }
  }
  /**
   * Shortcut for translating language strings
   * @param {String} key Key to be passed to the translation utility
   * @param {Object} data Data to be passed to the translation utility
   * @return {String} The translated string
   */
  t(key, data) {
    try {
      return this.app.lang.t(key, data);
    } catch(e) {
      return JSON.stringify(Object.assign(data, { key }));
    }
  }
  /**
   * Log a message using the Logger module
   * @param {String} level Log level of message
   * @param {...*} rest Arguments to log
   * @return {Promise}
   */
  async log(level, ...rest) {
    const args = [level, this.name.replace(/^adapt-authoring-/, ''), ...rest];
    const log = async () => {
      await this.app.logger.onReady();
      this.app.logger.log(...args);
    };
    if(this.app.logger) {
      return log();
    }
    const observer = () => {
      if(!this.app.logger) return;
      this.app.dependencyloader.off('moduleloaded', observer);
      log();
    };
    this.app.dependencyloader.on('moduleloaded', observer);
  }
}