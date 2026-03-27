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

  describe('.storeStrings()', () => {
    it('should store a string under lang.key', () => {
      const phrases = {}
      Lang.storeStrings(phrases, 'en.hello', 'world')
      assert.equal(phrases.en.hello, 'world')
    })

    it('should create lang bucket if missing', () => {
      const phrases = {}
      Lang.storeStrings(phrases, 'de.greeting', 'Hallo')
      assert.ok(phrases.de)
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
  })
})
