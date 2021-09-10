const AbstractModule = require('./AbstractModule');
const DependencyLoader = require('./DependencyLoader');
const path = require('path');
const Utils = require('./Utils');

let instance;
// /** @ignore */ let initialising = false;
/**
 * The main application class
 * @extends {AbstractModule}
 */
class App extends AbstractModule {
  /**
   * The singleton instance (initialises it if there isn't one)
   * @type {App}
   */
  static get instance() {
    if(!instance) instance = new App();
    return instance;
  }
  /**
   * Create the application instance
   */
  constructor() {
    const adaptJson = require(path.join(process.cwd(), Utils.metadataFileName));
    const packageJson = Utils.requirePackage();
    super(null, { ...packageJson, ...adaptJson, name: 'adapt-authoring-core', rootDir: path.resolve(`${__dirname}/../../..`) });
  }
  /** @override */
  async init() {
    /**
     * Reference to the passed arguments (parsed for easy reference)
     */ 
    this.args = Utils.getArgs();
    /**
     * Instance of App instance (required by all AbstractModules)
     * @type {App}
     */
    this.app = this;
    /**
     * Reference to the DependencyLoader instance
     * @type {DependencyLoader}
     */
    this.dependencyloader = new DependencyLoader(this);

    /** @ignore */ this._isStarting = false;

    let startError;

    try {
      await this.start();
      
      const configRootDir = this.getConfig('rootDir');
      if(configRootDir) /** @ignore */this.rootDir = configRootDir;
    } catch(e) {
      startError = e;
    }
    const failedMods = this.dependencyloader.failedModules.length;
    if(failedMods) {
      this.log('warn', `${failedMods} module${failedMods === 1 ? '' : 's'} failed to load. See above for details`);
    }
    if(startError) process.exit(1);
  }
  /**
   * The Adapt module dependencies and their configs
   * @type {Object}
   */
  get dependencies() {
    return this.dependencyloader.configs;
  }
  /**
   * Starts the app
   * @return {Promise} Resolves when the app has started
   */
  async start() {
    if(this._isReady) throw new Error('warn', 'cannot start app, already started');
    if(this._isStarting) throw new Error('warn', 'cannot start app, already initialising');

    this._isStarting = true;

    await this.dependencyloader.load();
    // Check all APIs marked as essential have a module which implements them
    const errors = this.pkg.essentialApis && this.pkg.essentialApis.filter(d => !this[d]);
    if(errors?.length) {
      throw new Error(`Missing essential api${errors.length > 1 ? 's' : ''}: ${errors.join(', ')}\n${errors.length > 1 ? 'These' : 'This'} must be installed for the app to run correctly.`);
    }
    this._isStarting = false;
  }
  /**
   * Enables waiting for other modules to load
   * @param {...String} modNames Names of modules to wait for
   * @return {Promise} Resolves when specified module has been loaded
   */
  async waitForModule(...modNames) {
    const results = await Promise.all(modNames.map(m => this.dependencyloader.waitForModule(m)));
    return results.length > 1 ? results : results[0];
  }
  /** @override */
  setReady(error) {
    this._isStarting = false;
    super.setReady(error);
  }
}

module.exports = App;
