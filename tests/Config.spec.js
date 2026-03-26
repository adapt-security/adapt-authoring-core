import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import Config from '../lib/Config.js'
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('Config', () => {
  describe('constructor', () => {
    it('should initialise with empty config', () => {
      const config = new Config()
      assert.deepEqual(config.publicAttributes, [])
    })
  })

  describe('#has()', () => {
    it('should return true for existing keys', () => {
      const config = new Config()
      config._config['test.key'] = 'value'
      assert.equal(config.has('test.key'), true)
    })

    it('should return false for missing keys', () => {
      const config = new Config()
      assert.equal(config.has('missing.key'), false)
    })
  })

  describe('#get()', () => {
    it('should return value for existing key', () => {
      const config = new Config()
      config._config['test.key'] = 'value'
      assert.equal(config.get('test.key'), 'value')
    })

    it('should return undefined for missing key', () => {
      const config = new Config()
      assert.equal(config.get('missing'), undefined)
    })
  })

  describe('#getPublicConfig()', () => {
    it('should return only public attributes', () => {
      const config = new Config()
      config._config['mod.public'] = 'yes'
      config._config['mod.private'] = 'no'
      config.publicAttributes = ['mod.public']
      const result = config.getPublicConfig()
      assert.deepEqual(result, { 'mod.public': 'yes' })
    })
  })

  describe('.envVarToConfigKey()', () => {
    it('should convert ADAPT_AUTHORING_ prefixed vars', () => {
      const result = Config.envVarToConfigKey('ADAPT_AUTHORING_CORE__dataDir')
      assert.equal(result, 'adapt-authoring-core.dataDir')
    })

    it('should prefix non-adapt vars with env.', () => {
      const result = Config.envVarToConfigKey('NODE_ENV')
      assert.equal(result, 'env.NODE_ENV')
    })
  })

  describe('#storeEnvSettings()', () => {
    it('should store env vars in config', () => {
      const config = new Config()
      process.env.TEST_CONFIG_VAR = 'test_value'
      config.storeEnvSettings()
      assert.equal(config.get('env.TEST_CONFIG_VAR'), 'test_value')
      delete process.env.TEST_CONFIG_VAR
    })

    it('should parse JSON env values', () => {
      const config = new Config()
      process.env.TEST_JSON_VAR = '42'
      config.storeEnvSettings()
      assert.equal(config.get('env.TEST_JSON_VAR'), 42)
      delete process.env.TEST_JSON_VAR
    })
  })

  describe('#storeUserSettings()', () => {
    let confDir

    before(async () => {
      confDir = path.join(__dirname, 'data', 'config-test', 'conf')
      await fs.ensureDir(confDir)
    })

    after(async () => {
      await fs.remove(path.join(__dirname, 'data', 'config-test'))
    })

    it('should handle missing config file gracefully', async () => {
      const config = new Config()
      config.configFilePath = path.join(confDir, 'nonexistent.config.js')
      await assert.doesNotReject(() => config.storeUserSettings())
    })
  })

})
