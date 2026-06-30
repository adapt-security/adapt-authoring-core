import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import Config from '../lib/Config.js'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'

const dataDir = fileURLToPath(new URL('./data', import.meta.url))

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

  describe('#resolveDirectory()', () => {
    it('should resolve $ROOT', () => {
      const config = new Config()
      config.rootDir = '/app'
      assert.equal(config.resolveDirectory('$ROOT/APP_DATA/data'), path.resolve('/app', 'APP_DATA/data'))
    })

    it('should resolve $DATA', () => {
      const config = new Config()
      config.rootDir = '/app'
      config._config['adapt-authoring-core.dataDir'] = '/app/APP_DATA/data'
      assert.equal(config.resolveDirectory('$DATA/uploads'), path.resolve('/app/APP_DATA/data', 'uploads'))
    })

    it('should resolve $TEMP', () => {
      const config = new Config()
      config.rootDir = '/app'
      config._config['adapt-authoring-core.tempDir'] = '/app/APP_DATA/temp'
      assert.equal(config.resolveDirectory('$TEMP/cache'), path.resolve('/app/APP_DATA/temp', 'cache'))
    })

    it('should not resolve unresolved variables', () => {
      const config = new Config()
      config.rootDir = '/app'
      assert.equal(config.resolveDirectory('$DATA/uploads'), '$DATA/uploads')
    })

    it('should return non-variable paths unchanged', () => {
      const config = new Config()
      config.rootDir = '/app'
      assert.equal(config.resolveDirectory('/absolute/path'), '/absolute/path')
    })
  })

  describe('#storeUserSettings()', () => {
    it('should handle missing config file gracefully', async () => {
      const config = new Config()
      config.configFilePath = '/nonexistent/path/config.js'
      await assert.doesNotReject(() => config.storeUserSettings())
    })

    it('should load and flatten settings from the config file', async () => {
      const config = new Config()
      config.configFilePath = path.join(dataDir, 'user-config.js')
      await config.storeUserSettings()
      assert.equal(config.get('adapt-authoring-core.dataDir'), '/app/APP_DATA/data')
      assert.equal(config.get('adapt-authoring-server.port'), 5000)
    })

    it('should load a config file whose path contains URL-significant characters', async () => {
      // import() parses a bare path as a URL, so '#' (and Windows drive letters, core#122) break it
      const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'adapt-cfg-#'))
      const file = path.join(dir, 'config.js')
      try {
        await fs.writeFile(file, "export default { 'adapt-authoring-core': { dataDir: '/from/weird/path' } }\n")
        const config = new Config()
        config.configFilePath = file
        await config.storeUserSettings()
        assert.equal(config.get('adapt-authoring-core.dataDir'), '/from/weird/path')
      } finally {
        await fs.rm(dir, { recursive: true, force: true })
      }
    })
  })
})
