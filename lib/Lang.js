import fs from 'node:fs'
import { globSync } from 'glob'
import path from 'node:path'
import { reconcileLangKeys } from './utils/reconcileLangKeys.js'

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
   * @param {Boolean} [options.warnMissing=true] Whether to log a startup warning for declared keys with no translation
   */
  constructor ({ dependencies, defaultLang, rootDir, log, warnMissing = true } = {}) {
    /**
     * The loaded language phrases
     * @type {Object}
     */
    this.phrases = {}
    /**
     * The language keys modules declare they expect (key to definition metadata)
     * @type {Object}
     */
    this.definitions = {}
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
    this.loadDefinitions(dependencies, rootDir, log)
    this.validate({ warnMissing })
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
  loadPhrases (dependencies = {}, appRootDir, log) {
    const dirs = [
      ...(appRootDir ? [appRootDir] : []),
      ...Object.values(dependencies).map(d => d.rootDir)
    ]
    for (const dir of dirs) {
      const files = globSync('lang/**/*.json', { cwd: dir, absolute: true })
      for (const f of files) {
        try {
          const relative = path.relative(path.join(dir, 'lang'), f)
          const parts = relative.replace(/\.json$/, '').split(path.sep)
          const lang = parts[0]
          const prefix = parts.length > 1 ? parts.slice(1).join('.') + '.' : ''
          if (!this.phrases[lang]) this.phrases[lang] = {}
          const contents = JSON.parse(fs.readFileSync(f, 'utf8'))
          Object.entries(contents).forEach(([k, v]) => { this.phrases[lang][`${prefix}${k}`] = v })
        } catch (e) {
          log?.('error', 'lang', e.message, f)
        }
      }
    }
  }

  /**
   * Loads the language-key declarations shipped by each module in `strings/*.json`.
   * Keys are already fully prefixed (for example app.myTitle); an entry may set a `pattern` flag
   * to declare a dynamic key family (a prefix) rather than an exact key.
   * @param {Object} dependencies Key/value map of dependency configs (each with a rootDir)
   * @param {String} appRootDir The application root directory
   * @param {Function} [log] Optional logging function (level, id, ...args)
   */
  loadDefinitions (dependencies = {}, appRootDir, log) {
    const dirs = [
      ...(appRootDir ? [appRootDir] : []),
      ...Object.values(dependencies).map(d => d.rootDir)
    ]
    for (const dir of dirs) {
      const files = globSync('strings/*.json', { cwd: dir, absolute: true })
      for (const f of files) {
        try {
          const contents = JSON.parse(fs.readFileSync(f, 'utf8'))
          Object.entries(contents).forEach(([k, v]) => {
            if (!this.definitions[k]) this.definitions[k] = v
          })
        } catch (e) {
          log?.('error', 'lang', e.message, f)
        }
      }
    }
  }

  /**
   * Reconciles the keys modules declare in `strings/*.json` against the
   * default-language translations, logging a warning for any that are missing.
   * (Error strings are out of scope — they are handled by the error registry.)
   * @param {Object} options
   * @param {Boolean} [options.warnMissing=true] Whether to log the missing keys
   * @returns {{ missing: Array<String> }}
   */
  validate ({ warnMissing = true } = {}) {
    const declared = this.definitions
    const translated = Object.keys(this.phrases[this.defaultLang] ?? {})
    const { missing } = reconcileLangKeys({ declared, translated })
    if (warnMissing && missing.length) {
      this.log?.('warn', 'lang', `${missing.length} declared language string(s) have no '${this.defaultLang}' translation:`)
      for (const k of missing.sort()) this.log?.('warn', 'lang', `  ${k}`)
    }
    return { missing }
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
      if (!key.code) return key.message || String(key)
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
      const items = [v].flat().map(item => item instanceof Error ? this.translate(lang, item) : item)
      s = s.replaceAll(`\${${k}}`, items)
      for (const [match, expr] of s.matchAll(new RegExp(String.raw`\$map{${k}:(.+)}`, 'g'))) {
        const [attrs, delim] = expr.split(':')
        s = s.replace(match, items.map(val => attrs.split(',').map(a => val?.[a] ?? a).join(delim)))
      }
    }
    return s
  }
}

export default Lang
