const _ = require('lodash');
const fs = require('fs-extra');
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
  * Takes a singular string and pluralises it!
  * @param {String} s String to pluralise
  * @return {String}
  */
  static pluralise(s) {
    if(!_.isString(s)) return s;
    return `${s}s`;
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
  static async requirePackage(modName) {
    const filepath = modName ? this.getModuleDir(modName) : process.cwd();
    return require(path.join(filepath, this.packageFileName));
  }
  /**
  * Loads the relevant configuration files for an Adapt module
  * @param {String} relPath Relative path of module
  * @return {Promise}
  */
  static async loadModuleConfig(relPath) {
    const absPath = path.join(process.cwd(), relPath);
    return {
      ...await fs.readJson(path.join(absPath, this.packageFileName)),
      ...await fs.readJson(path.join(absPath, this.metadataFileName)),
      rootDir: absPath
    };
  }
}

module.exports = Utils;
