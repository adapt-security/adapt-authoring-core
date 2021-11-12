import fs from 'fs';
import minimist from 'minimist';
import path from 'path';
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
    const args = minimist(process.argv);
    args.params = args._.slice(2);
    return args;
  }
  /**
   * Loads a package.json for a module (or root by default)
   * @param {String} modName Module of package.json
   * @return {Object} The package contents
   */
  static requirePackage() {
    JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../', this.packageFileName)));
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
