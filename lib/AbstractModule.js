import Events from './Events.js';
/**
 * Abstract class for authoring tool modules. All custom modules must extend this class.
 * @extends {Events}
 */
class AbstractModule extends Events {
  /**
   * Create the Module instance
   * @param {Object} app Reference to the main application
   * @param {Object} pkg Config object from package.json for this module
   * @param {Object} options Options object
   * @param {boolean} options.autoInit Whether the module should call the init function and handle initialisation errors. If set to false, you will need to make sure setReady/setFailed are called appropriately yourself.
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
    /** @ignore */
    this._startTime = Date.now();

    if(!options.autoInit) return;

    this.init()
      .then(() => this.setReady())
      .catch(e => this.setFailed(e));
  }
  /**
   * Initialises the module. Any custom initialisation tasks should go here. Any uncaught errors thrown here will be caught later and halt the module's load, so make sure any non-fatal errors are handled.
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
    this.log('debug', 'ready', `${Math.round((Date.now()-this._startTime))}ms`);
  }
  /**
   * Alias for setReady used when an error occurs. Intended to make error handling more explicit when reading code.
   * @param {Error} error
   * @see {AbstractModule#setReady}
   */
  setFailed(error) {
    this.setReady(error);
  }
  /**
   * Used to listen to the module's ready signal. The returned promise will be resolved when the module has completed initialisation successfully.
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
   * Log a message using the Logger module
   * @param {String} level Log level of message
   * @param {...*} rest Arguments to log
   * @return {Promise}
   */
  async log(level, ...rest) {
    return new Promise(async resolve => {
      const args = [level, this.name.replace(/^adapt-authoring-/, ''), ...rest];
      const log = async () => {
        await this.app.logger.onReady();
        this.app.logger.log(...args);
        resolve();
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
    });
  }
}

export default AbstractModule;