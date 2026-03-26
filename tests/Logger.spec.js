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

    it('should respect mute option', () => {
      const logger = new Logger({ mute: true })
      assert.equal(logger.config.mute, true)
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

  describe('.colourise()', () => {
    it('should return string unchanged when no colour function', () => {
      assert.equal(Logger.colourise('test', undefined), 'test')
    })

    it('should apply colour function', () => {
      const result = Logger.colourise('test', s => `[${s}]`)
      assert.equal(result, '[test]')
    })
  })

  describe('.getDateStamp()', () => {
    it('should return empty string when timestamp disabled', () => {
      assert.equal(Logger.getDateStamp({ timestamp: false }), '')
    })

    it('should return ISO format when configured', () => {
      const result = Logger.getDateStamp({ timestamp: true, dateFormat: 'iso' })
      assert.ok(result.length > 0)
    })
  })

  describe('#log()', () => {
    it('should not throw when muted', () => {
      const logger = new Logger({ mute: true })
      assert.doesNotThrow(() => logger.log('error', 'test', 'message'))
    })
  })
})
