import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import Lang from '../lib/Lang.js'
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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

  describe('.translate()', () => {
    it('should return translated string', () => {
      const phrases = { en: { hello: 'Hello' } }
      const result = Lang.translate(phrases, 'en', () => {}, 'en', 'hello')
      assert.equal(result, 'Hello')
    })

    it('should substitute data placeholders', () => {
      // eslint-disable-next-line no-template-curly-in-string
      const phrases = { en: { greeting: 'Hello ${name}' } }
      const result = Lang.translate(phrases, 'en', () => {}, 'en', 'greeting', { name: 'World' })
      assert.equal(result, 'Hello World')
    })

    it('should fall back to default lang when lang is not a string', () => {
      const phrases = { en: { hello: 'Hello' } }
      const result = Lang.translate(phrases, 'en', () => {}, undefined, 'hello')
      assert.equal(result, 'Hello')
    })

    it('should return key and warn when key is missing', () => {
      const phrases = { en: {} }
      let warned = false
      const result = Lang.translate(phrases, 'en', () => { warned = true }, 'en', 'missing.key')
      assert.equal(result, 'missing.key')
      assert.ok(warned)
    })
  })

  describe('.translateError()', () => {
    it('should return non-error values unchanged', () => {
      const result = Lang.translateError({}, 'en', () => {}, 'en', 'plain string')
      assert.equal(result, 'plain string')
    })

    it('should translate an error using its code', () => {
      const phrases = { en: { 'error.TEST': 'Translated error' } }
      const error = new Error('TEST')
      error.code = 'TEST'
      const result = Lang.translateError(phrases, 'en', () => {}, 'en', error)
      assert.equal(result, 'Translated error')
    })
  })
})
