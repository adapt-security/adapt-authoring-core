import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import Logger from '../lib/Logger.js'

describe('Logger', () => {
  describe('constructor', () => {
    it('should create with defaults', () => {
      const logger = new Logger()
      assert.ok(logger.config)
      assert.ok(logger.logHook)
      assert.equal(logger.config.mute, false)
    })

    it('should mute when levels is empty', () => {
      const logger = new Logger({ levels: [] })
      assert.equal(logger.config.mute, true)
    })

    it('should not mute when levels are provided', () => {
      const logger = new Logger({ levels: ['error'] })
      assert.equal(logger.config.mute, false)
    })

    it('should configure levels from options', () => {
      const logger = new Logger({ levels: ['error', 'warn'] })
      assert.equal(logger.config.levels.error.enable, true)
      assert.equal(logger.config.levels.debug.enable, false)
    })
  })

  describe('.isLevelEnabled()', () => {
    it('should return true when level is in config', () => {
      assert.equal(Logger.isLevelEnabled(['error', 'warn'], 'error'), true)
    })

    it('should return false when level is not in config', () => {
      assert.equal(Logger.isLevelEnabled(['error'], 'debug'), false)
    })

    it('should return false when level is negated', () => {
      assert.equal(Logger.isLevelEnabled(['error', '!error'], 'error'), false)
    })
  })

  describe('.getModuleOverrides()', () => {
    it('should return matching overrides', () => {
      const config = ['error', 'debug.mymod', '!debug.other']
      assert.deepEqual(Logger.getModuleOverrides(config, 'debug'), ['debug.mymod', '!debug.other'])
    })

    it('should return empty array when no overrides', () => {
      assert.deepEqual(Logger.getModuleOverrides(['error'], 'debug'), [])
    })
  })

  describe('.isLoggingEnabled()', () => {
    it('should return true when level is enabled', () => {
      const levels = { error: { enable: true, moduleOverrides: [] } }
      assert.equal(Logger.isLoggingEnabled(levels, 'error', 'test'), true)
    })

    it('should return false when level is disabled', () => {
      const levels = { error: { enable: false, moduleOverrides: [] } }
      assert.equal(Logger.isLoggingEnabled(levels, 'error', 'test'), false)
    })

    it('should allow module-specific override', () => {
      const levels = { debug: { enable: false, moduleOverrides: ['debug.mymod'] } }
      assert.equal(Logger.isLoggingEnabled(levels, 'debug', 'mymod'), true)
    })

    it('should allow module-specific disable override', () => {
      const levels = { debug: { enable: true, moduleOverrides: ['!debug.mymod'] } }
      assert.equal(Logger.isLoggingEnabled(levels, 'debug', 'mymod'), false)
    })
  })

  describe('#log()', () => {
    it('should not throw when muted via empty levels', () => {
      const logger = new Logger({ levels: [] })
      assert.doesNotThrow(() => logger.log('error', 'test', 'message'))
    })
  })
})
