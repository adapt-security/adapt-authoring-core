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

  describe('#checkDeprecatedConfig()', () => {
    let deprecatedDir

    before(async () => {
      deprecatedDir = path.join(__dirname, 'data', 'deprecated-test')
      await fs.ensureDir(path.join(deprecatedDir, 'conf'))
      await fs.writeJson(path.join(deprecatedDir, 'conf', 'deprecated.json'), {
        oldKey: 'test-module.newKey',
        removedKey: null
      })
    })

    after(async () => {
      await fs.remove(deprecatedDir)
    })

    it('should warn on moved keys', async () => {
      let output = ''
      const originalLog = console.log
      console.log = (msg) => { output += msg }
      const config = new Config()
      await config.checkDeprecatedConfig(
        { 'test-module': { oldKey: 'value' } },
        { test: { name: 'test-module', rootDir: deprecatedDir } }
      )
      console.log = originalLog
      assert.ok(output.includes("'test-module.oldKey' has moved to 'test-module.newKey'"))
    })

    it('should warn on removed keys', async () => {
      let output = ''
      const originalLog = console.log
      console.log = (msg) => { output += msg }
      const config = new Config()
      await config.checkDeprecatedConfig(
        { 'test-module': { removedKey: true } },
        { test: { name: 'test-module', rootDir: deprecatedDir } }
      )
      console.log = originalLog
      assert.ok(output.includes('has been removed'))
    })

    it('should not warn when no deprecated keys present', async () => {
      let output = ''
      const originalLog = console.log
      console.log = (msg) => { output += msg }
      const config = new Config()
      await config.checkDeprecatedConfig(
        { 'test-module': { safeKey: 'value' } },
        { test: { name: 'test-module', rootDir: deprecatedDir } }
      )
      console.log = originalLog
      assert.equal(output, '')
    })

    it('should use _module override to check a different module section', async () => {
      const overrideDir = path.join(__dirname, 'data', 'deprecated-override')
      await fs.ensureDir(path.join(overrideDir, 'conf'))
      await fs.writeJson(path.join(overrideDir, 'conf', 'deprecated.json'), {
        _module: 'old-module',
        oldKey: 'new-module.newKey'
      })
      let output = ''
      const originalLog = console.log
      console.log = (msg) => { output += msg }
      const config = new Config()
      await config.checkDeprecatedConfig(
        { 'old-module': { oldKey: 'value' } },
        { test: { name: 'new-module', rootDir: overrideDir } }
      )
      console.log = originalLog
      assert.ok(output.includes("'old-module.oldKey' has moved to 'new-module.newKey'"))
      await fs.remove(overrideDir)
    })

    it('should throw when _fatal is true and deprecated keys are found', async () => {
      const fatalDir = path.join(__dirname, 'data', 'deprecated-fatal')
      await fs.ensureDir(path.join(fatalDir, 'conf'))
      await fs.writeJson(path.join(fatalDir, 'conf', 'deprecated.json'), {
        _fatal: true,
        oldKey: 'test-module.newKey'
      })
      const config = new Config()
      await assert.rejects(
        config.checkDeprecatedConfig(
          { 'test-module': { oldKey: 'value' } },
          { test: { name: 'test-module', rootDir: fatalDir } }
        )
      )
      await fs.remove(fatalDir)
    })

    it('should not throw when _fatal is true but no deprecated keys are found', async () => {
      const fatalDir = path.join(__dirname, 'data', 'deprecated-fatal2')
      await fs.ensureDir(path.join(fatalDir, 'conf'))
      await fs.writeJson(path.join(fatalDir, 'conf', 'deprecated.json'), {
        _fatal: true,
        oldKey: 'test-module.newKey'
      })
      const config = new Config()
      await assert.doesNotReject(
        config.checkDeprecatedConfig(
          { 'test-module': { safeKey: 'value' } },
          { test: { name: 'test-module', rootDir: fatalDir } }
        )
      )
      await fs.remove(fatalDir)
    })
  })
})
