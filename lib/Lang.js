import fs from 'node:fs'
import { globSync } from 'glob'
import path from 'node:path'

/**
 * Handles loading and translation of language strings.
 * @memberof core
 */
class Lang {
  /**
   * @param {Object} options
   * @param {Object} options.dependencies Key/value map of dependency configs (each with a rootDir)
   * @param {String} options.rootDir The application root directory
   * @param {Function} [options.log] Optional logging function (level, id, ...args)
   */
  constructor ({ dependencies, rootDir, log } = {}) {
    /**
     * The loaded language phrases
     * @type {Object}
     */
    this.phrases = {}
    this.loadPhrases(dependencies, rootDir, log)
  }

  /**
   * Returns the languages supported by the application
   * @type {Array<String>}
   */
  get supportedLanguages () {
    return Object.keys(this.phrases)
  }

  /**
   * Loads and merges all language phrases from dependencies
   * @param {Object} dependencies Key/value map of dependency configs (each with a rootDir)
   * @param {String} appRootDir The application root directory
   * @param {Function} [log] Optional logging function (level, id, ...args)
   */
  loadPhrases (dependencies, appRootDir, log) {
    const dirs = [
      appRootDir,
      ...Object.values(dependencies).map(d => d.rootDir)
    ]
    for (const dir of dirs) {
      const files = globSync('lang/*.json', { cwd: dir, absolute: true })
      for (const f of files) {
        try {
          const contents = JSON.parse(fs.readFileSync(f, 'utf8'))
          Object.entries(contents).forEach(([k, v]) => Lang.storeStrings(this.phrases, `${path.basename(f).replace('.json', '')}.${k}`, v))
        } catch (e) {
          log?.('error', 'lang', e.message, f)
        }
      }
    }
  }

  /**
   * Returns translated language string
   * @param {String} defaultLang Default language to use when lang is not a string
   * @param {Function} logWarn Logging function for missing keys
   * @param {String} lang The target language
   * @param {String|AdaptError} key The unique string key
   * @param {Object} data Dynamic data to be inserted into translated string
   * @return {String}
   */
  translate (defaultLang, logWarn, lang, key, data) {
    return Lang.translate(this.phrases, defaultLang, logWarn, lang, key, data)
  }

  /**
   * Translates an AdaptError
   * @param {String} defaultLang Default language to use
   * @param {Function} logWarn Logging function for missing keys
   * @param {String} lang The target language
   * @param {AdaptError} error Error to translate
   * @returns The translated error
   */
  translateError (defaultLang, logWarn, lang, error) {
    return Lang.translateError(this.phrases, defaultLang, logWarn, lang, error)
  }

  /**
   * Parses a dotted language key and stores the value in the phrases dictionary
   * @param {Object} phrases The phrases dictionary to store into
   * @param {String} key Key in the format 'lang.namespace.key'
   * @param {String} value The string value to store
   */
  static storeStrings (phrases, key, value) {
    const i = key.indexOf('.')
    const lang = key.slice(0, i)
    if (!phrases[lang]) phrases[lang] = {}
    phrases[lang][key.slice(i + 1)] = value
  }

  /**
   * Returns translated language string
   * @param {Object} phrases The phrases dictionary
   * @param {String} defaultLang Default language to use when lang is not a string
   * @param {Function} logWarn Logging function for missing keys
   * @param {String} lang The target language
   * @param {String|AdaptError} key The unique string key
   * @param {Object} data Dynamic data to be inserted into translated string
   * @return {String}
   */
  static translate (phrases, defaultLang, logWarn, lang, key, data) {
    if (typeof lang !== 'string') {
      lang = defaultLang
    }
    if (key instanceof Error) {
      return Lang.translateError(phrases, defaultLang, logWarn, lang, key)
    }
    const s = phrases[lang]?.[key]
    if (!s) {
      logWarn(`missing key '${lang}.${key}'`)
      return key
    }
    if (!data) {
      return s
    }
    return Object.entries(data).reduce((s, [k, v]) => {
      v = Array.isArray(v) ? v.map(v2 => Lang.translateError(phrases, defaultLang, logWarn, lang, v2)) : Lang.translateError(phrases, defaultLang, logWarn, lang, v)
      s = s.replaceAll(`\${${k}}`, v)
      if (Array.isArray(v)) {
        const matches = [...s.matchAll(new RegExp(String.raw`\$map{${k}:(.+)}`, 'g'))]
        matches.forEach(([replace, data]) => {
          const [attrs, delim] = data.split(':')
          s = s.replace(replace, v.map(val => attrs.split(',').map(a => Object.prototype.hasOwnProperty.call(val, a) ? val[a] : a)).join(delim))
        })
      }
      return s
    }, s)
  }

  /**
   * Translates an AdaptError
   * @param {Object} phrases The phrases dictionary
   * @param {String} defaultLang Default language to use
   * @param {Function} logWarn Logging function for missing keys
   * @param {String} lang The target language
   * @param {AdaptError} error Error to translate
   * @returns The translated error
   */
  static translateError (phrases, defaultLang, logWarn, lang, error) {
    return error instanceof Error
      ? Lang.translate(phrases, defaultLang, logWarn, lang, `error.${error.code}`, error.data ?? error)
      : error
  }
}

export default Lang
