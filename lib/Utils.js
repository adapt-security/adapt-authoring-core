const minimist = require('minimist');
const path = require('path');
/**
 * Miscellaneous utility functions for use throughout the application
 */
class Utils {
  /**
   * The name of the file used for defining Adapt authoring tool metadata
   * @return {String}
   */
  static get metadataFileName() {
    return 'adapt-authoring.json';
  }
  /**
   * The name of the Node.js package file
   * @return {String}
   */
  static get packageFileName() {
    return 'package.json';
  }
  /**
   * Returns the passed arguments, parsed by minimist for easy access
   * @return {Object} The parsed arguments
   * @see {@link https://github.com/substack/minimist#readme}
   */
  static getArgs() {
    return minimist(process.argv);
  }
  /**
   * Returns the path used when requiring a module. Should be used rather than assuming any structure (e.g. ./node_modules/moduleName).
   * @param {String} moduleName
   * @return {String} The resolved path
   */
  static getModuleDir(moduleName) {
    if(moduleName) {
      return path.dirname(require.resolve(moduleName));
    }
    return path.resolve(require.resolve('adapt-authoring-core'), '..', '..');
  }
  /**
   * Loads a package.json for a module (or root by default)
   * @param {String} modName Module of package.json
   * @return {Object} The package contents
   */
  static requirePackage(modName) {
    const filepath = modName ? this.getModuleDir(modName) : path.resolve(__dirname, '../../../');
    return require(path.join(filepath, this.packageFileName));
  }
  /**
   * Determines if param is a Javascript object (note: returns false for arrays, functions and null)
   * @return {Boolean}
   */
  static isObject(o) {
    return typeof o === 'object' && o !== null && !Array.isArray(o);
  }
}

module.exports = Utils;
