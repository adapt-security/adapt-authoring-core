import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import Lang from '../lib/Lang.js'
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function createLang (phrases, defaultLang = 'en') {
  const lang = new Lang({ dependencies: {}, defaultLang, rootDir: __dirname })
  lang.phrases = phrases
  return lang
}

describe('Lang', () => {
  let testDir

  before(async () => {
    testDir = path.join(__dirname, 'data', 'lang-test')
    const langDir = path.join(testDir, 'lang')
    await fs.ensureDir(langDir)
    await fs.writeJson(path.join(langDir, 'en.json'), {
      'app.name': 'Test App',
      'app.greeting': 'Hello ${name}', // eslint-disable-line no-template-curly-in-string
      'error.TEST_ERROR': 'A test error occurred'
    })
    await fs.writeJson(path.join(langDir, 'fr.json'), {
      'app.name': 'Application Test'
    })
  })

  after(async () => {
    await fs.remove(testDir)
  })

  describe('#loadPhrases()', () => {
    it('should load phrases from dependencies', async () => {
      const lang = new Lang()
      await lang.loadPhrases({ test: { rootDir: testDir } }, testDir)
      assert.ok(lang.phrases.en)
      assert.equal(lang.phrases.en['app.name'], 'Test App')
    })

    it('should load multiple languages', async () => {
      const lang = new Lang()
      await lang.loadPhrases({ test: { rootDir: testDir } }, testDir)
      assert.ok(lang.phrases.fr)
      assert.equal(lang.phrases.fr['app.name'], 'Application Test')
    })
  })

  describe('#supportedLanguages', () => {
    it('should return loaded language keys', async () => {
      const lang = new Lang()
      await lang.loadPhrases({ test: { rootDir: testDir } }, testDir)
      const languages = lang.supportedLanguages
      assert.ok(languages.includes('en'))
      assert.ok(languages.includes('fr'))
    })
  })

  describe('#loadDefinitions()', () => {
    it('should load string declarations from dependencies', async () => {
      const stringsDir = path.join(testDir, 'strings')
      await fs.ensureDir(stringsDir)
      await fs.writeJson(path.join(stringsDir, 'strings.json'), {
        'app.declared': { description: 'A declared key' }
      })
      const lang = new Lang()
      lang.loadDefinitions({ test: { rootDir: testDir } }, testDir)
      assert.equal(lang.definitions['app.declared'].description, 'A declared key')
    })
  })

  describe('#validate()', () => {
    it('should warn for declared keys with no translation', () => {
      const lang = createLang({ en: { 'app.present': 'x' } })
      lang.definitions = { 'app.present': {}, 'app.absent': {} }
      const warnings = []
      lang.log = (level, id, msg) => { if (level === 'warn') warnings.push(msg) }
      const { missing } = lang.validate({ warnMissing: true })
      assert.deepEqual(missing, ['app.absent'])
      assert.ok(warnings.some(w => w.includes('app.absent')))
    })

    it('should not flag error.* keys (errors are out of scope)', () => {
      const lang = createLang({ en: { 'app.a': 'x', 'error.SOME': 'y' } })
      lang.definitions = { 'app.a': {} }
      const { missing } = lang.validate({ warnMissing: false })
      assert.deepEqual(missing, [])
    })

    it('should not warn when warnMissing is false', () => {
      const lang = createLang({ en: {} })
      lang.definitions = { 'app.absent': {} }
      let warned = false
      lang.log = () => { warned = true }
      lang.validate({ warnMissing: false })
      assert.equal(warned, false)
    })
  })

  describe('#translate()', () => {
    it('should return translated string', () => {
      const lang = createLang({ en: { hello: 'Hello' } })
      assert.equal(lang.translate('en', 'hello'), 'Hello')
    })

    it('should substitute data placeholders', () => {
      // eslint-disable-next-line no-template-curly-in-string
      const lang = createLang({ en: { greeting: 'Hello ${name}' } })
      assert.equal(lang.translate('en', 'greeting', { name: 'World' }), 'Hello World')
    })

    it('should fall back to default lang when lang is not a string', () => {
      const lang = createLang({ en: { hello: 'Hello' } })
      assert.equal(lang.translate(undefined, 'hello'), 'Hello')
    })

    it('should return key and warn when key is missing', () => {
      let warned = false
      const lang = createLang({ en: {} })
      lang.log = () => { warned = true }
      assert.equal(lang.translate('en', 'missing.key'), 'missing.key')
      assert.ok(warned)
    })

    it('should return non-error, non-string values unchanged', () => {
      const lang = createLang({})
      assert.equal(lang.translate('en', 42), 42)
    })

    it('should translate an error using its code', () => {
      const lang = createLang({ en: { 'error.TEST': 'Translated error' } })
      const error = new Error('TEST')
      error.code = 'TEST'
      assert.equal(lang.translate('en', error), 'Translated error')
    })

    it('should fall back to error message when error has no code', () => {
      const lang = createLang({ en: {} })
      lang.log = () => {}
      assert.equal(lang.translate('en', new Error('boom')), 'boom')
    })

    it('should substitute a code-less error in data using its message', () => {
      // eslint-disable-next-line no-template-curly-in-string
      const lang = createLang({ en: { 'error.OUTER': 'Failed: ${cause}' } })
      lang.log = () => {}
      const outer = new Error('OUTER')
      outer.code = 'OUTER'
      outer.data = { cause: new Error('disk full') }
      assert.equal(lang.translate('en', outer), 'Failed: disk full')
    })
  })
})
