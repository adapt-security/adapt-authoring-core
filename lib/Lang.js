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
   * @param {String} options.defaultLang The default language for translations
   * @param {String} options.rootDir The application root directory
   * @param {Function} [options.log] Optional logging function (level, id, ...args)
   */
  constructor ({ dependencies, defaultLang, rootDir, log } = {}) {
    /**
     * The loaded language phrases
     * @type {Object}
     */
    this.phrases = {}
    /**
     * The default language for translations
     * @type {String}
     */
    this.defaultLang = defaultLang
    /**
     * Optional logging function (level, id, ...args)
     * @type {Function}
     */
    this.log = log
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
          const lang = path.basename(f, '.json')
          if (!this.phrases[lang]) this.phrases[lang] = {}
          const contents = JSON.parse(fs.readFileSync(f, 'utf8'))
          Object.entries(contents).forEach(([k, v]) => { this.phrases[lang][k] = v })
        } catch (e) {
          log?.('error', 'lang', e.message, f)
        }
      }
    }
  }

  /**
   * Returns translated language string. If key is an Error, translates using
   * the error code as the key and error data for substitution. Non-Error,
   * non-string values are returned unchanged.
   * @param {String} lang The target language (falls back to defaultLang)
   * @param {String|Error} key The unique string key, or an Error to translate
   * @param {Object} data Dynamic data to be inserted into translated string
   * @return {String}
   */
  translate (lang, key, data) {
    if (typeof lang !== 'string') {
      lang = this.defaultLang
    }
    if (key instanceof Error) {
      return this.translate(lang, `error.${key.code}`, key.data ?? key)
    }
    if (typeof key !== 'string') {
      return key
    }
    const s = this.phrases[lang]?.[key]
    if (!s) {
      this.log?.('warn', 'lang', `missing key '${lang}.${key}'`)
      return key
    }
    if (!data) {
      return s
    }
    return this.substituteData(s, lang, data)
  }

  /**
   * Replaces placeholders in a translated string with data values.
   * Supports ${key} for simple substitution, and $map{key:attrs:delim}
   * for mapping over array values.
   * @param {String} s The translated string
   * @param {String} lang The target language
   * @param {Object} data Key/value pairs to substitute
   * @return {String}
   */
  substituteData (s, lang, data) {
    for (const [k, v] of Object.entries(data)) {
      const resolved = Array.isArray(v)
        ? v.map(item => item instanceof Error ? this.translate(lang, item) : item)
        : v instanceof Error ? this.translate(lang, v) : v
      s = s.replaceAll(`\${${k}}`, resolved)
      if (Array.isArray(resolved)) {
        for (const [match, expr] of s.matchAll(new RegExp(String.raw`\$map{${k}:(.+)}`, 'g'))) {
          const [attrs, delim] = expr.split(':')
          const mapped = resolved.map(val => attrs.split(',').map(a => val?.[a] ?? a).join(delim))
          s = s.replace(match, mapped)
        }
      }
    }
    return s
  }
}

export default Lang
