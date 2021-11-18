import minimist from 'minimist';
/**
 * Miscellaneous utility functions for use throughout the application
 */
export default class Utils {
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
   * Determines if param is a Javascript object (note: returns false for arrays, functions and null)
   * @return {Boolean}
   */
  static isObject(o) {
    return typeof o === 'object' && o !== null && !Array.isArray(o);
  }
}