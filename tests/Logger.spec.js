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

  describe('.levels', () => {
    it('should order levels by descending severity', () => {
      assert.deepEqual(Logger.levels, ['error', 'warn', 'success', 'info', 'debug', 'verbose'])
    })

    it('should derive levelColours from the same source, in the same order', () => {
      assert.deepEqual(Object.keys(Logger.levelColours), Logger.levels)
    })

    it('should map every level to a colour function', () => {
      Logger.levels.forEach(level => assert.equal(typeof Logger.levelColours[level], 'function'))
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

    it('should not include line-level (3-segment) entries', () => {
      const config = ['debug.mymod', 'debug.mymod.LOAD', '!debug.other.SAVE']
      assert.deepEqual(Logger.getModuleOverrides(config, 'debug'), ['debug.mymod'])
    })

    it('should not include id-wide entries', () => {
      const config = ['debug.mymod', 'mymod', '!other']
      assert.deepEqual(Logger.getModuleOverrides(config, 'debug'), ['debug.mymod'])
    })
  })

  describe('.getLineOverrides()', () => {
    it('should return only 3-segment entries for the level', () => {
      const config = ['debug', 'debug.mymod', 'debug.mymod.LOAD', '!debug.other.SAVE', 'verbose.foo.BAR']
      assert.deepEqual(Logger.getLineOverrides(config, 'debug'), ['debug.mymod.LOAD', '!debug.other.SAVE'])
    })

    it('should return empty array when no line overrides', () => {
      assert.deepEqual(Logger.getLineOverrides(['debug', 'debug.mymod'], 'debug'), [])
    })
  })

  describe('.getIdOverrides()', () => {
    it('should return entries whose first segment is not a known level', () => {
      const config = ['debug', 'debug.mymod', 'mymod', '!other', 'datacache']
      assert.deepEqual(Logger.getIdOverrides(config), ['mymod', '!other', 'datacache'])
    })

    it('should not include bare level entries', () => {
      assert.deepEqual(Logger.getIdOverrides(['debug', '!verbose']), [])
    })

    it('should not include level-prefixed entries', () => {
      assert.deepEqual(Logger.getIdOverrides(['debug.mymod', '!verbose.foo.BAR']), [])
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

    it('should mute a specific line via line-level override', () => {
      const levels = { verbose: { enable: true, moduleOverrides: [], lineOverrides: ['!verbose.server.REQUEST_DURATION'] } }
      assert.equal(Logger.isLoggingEnabled(levels, 'verbose', 'server', 'REQUEST_DURATION'), false)
      assert.equal(Logger.isLoggingEnabled(levels, 'verbose', 'server', 'ADD_ROUTE'), true)
    })

    it('should enable a specific line when level is otherwise disabled', () => {
      const levels = { verbose: { enable: false, moduleOverrides: [], lineOverrides: ['verbose.server.ADD_ROUTE'] } }
      assert.equal(Logger.isLoggingEnabled(levels, 'verbose', 'server', 'ADD_ROUTE'), true)
      assert.equal(Logger.isLoggingEnabled(levels, 'verbose', 'server', 'OTHER'), false)
    })

    it('should let line-level mute beat per-level module enable', () => {
      const levels = { verbose: { enable: true, moduleOverrides: ['verbose.server'], lineOverrides: ['!verbose.server.REQUEST_DURATION'] } }
      assert.equal(Logger.isLoggingEnabled(levels, 'verbose', 'server', 'REQUEST_DURATION'), false)
    })

    it('should mute via id-wide override at any level', () => {
      const levels = { verbose: { enable: true, moduleOverrides: [], lineOverrides: [] } }
      assert.equal(Logger.isLoggingEnabled(levels, 'verbose', 'datacache', undefined, ['!datacache']), false)
    })

    it('should let per-level module enable beat id-wide mute', () => {
      const levels = { verbose: { enable: false, moduleOverrides: ['verbose.datacache'], lineOverrides: [] } }
      assert.equal(Logger.isLoggingEnabled(levels, 'verbose', 'datacache', undefined, ['!datacache']), true)
    })

    it('should let id-wide enable beat global level mute', () => {
      const levels = { verbose: { enable: false, moduleOverrides: [], lineOverrides: [] } }
      assert.equal(Logger.isLoggingEnabled(levels, 'verbose', 'datacache', undefined, ['datacache']), true)
    })
  })

  describe('#log()', () => {
    it('should not throw when muted via empty levels', () => {
      const logger = new Logger({ levels: [] })
      assert.doesNotThrow(() => logger.log('error', 'test', 'message'))
    })

    it('should mute a specific line via config', () => {
      const calls = []
      const origInfo = console.info
      console.info = (...args) => calls.push(args)
      try {
        const logger = new Logger({ levels: ['info', '!info.server.REQUEST_DURATION'], showTimestamp: false })
        logger.log('info', 'server', 'REQUEST_DURATION', 'GET', '/foo')
        logger.log('info', 'server', 'ADD_ROUTE', 'GET', '/foo')
        assert.equal(calls.length, 1)
        assert.match(calls[0].join(' '), /ADD_ROUTE/)
      } finally {
        console.info = origInfo
      }
    })

    it('should mute an id at every level via config', () => {
      const calls = []
      const origInfo = console.info
      const origWarn = console.warn
      console.info = (...args) => calls.push(['info', args])
      console.warn = (...args) => calls.push(['warn', args])
      try {
        const logger = new Logger({ levels: ['info', 'warn', '!datacache'], showTimestamp: false })
        logger.log('info', 'datacache', 'hit')
        logger.log('warn', 'datacache', 'miss')
        logger.log('info', 'server', 'ok')
        assert.equal(calls.length, 1)
        assert.equal(calls[0][0], 'info')
        assert.match(calls[0][1].join(' '), /server/)
      } finally {
        console.info = origInfo
        console.warn = origWarn
      }
    })
  })
})
