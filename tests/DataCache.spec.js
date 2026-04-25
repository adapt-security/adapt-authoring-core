import { afterEach, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import App from '../lib/App.js'
import DataCache from '../lib/DataCache.js'

function stubApp (mongodbStub, logCalls) {
  const mockApp = {
    waitForModule: async () => mongodbStub,
    logger: {
      log: (...args) => logCalls.push(args)
    }
  }
  const original = Object.getOwnPropertyDescriptor(App, 'instance')
  Object.defineProperty(App, 'instance', { get: () => mockApp, configurable: true })
  return () => Object.defineProperty(App, 'instance', original)
}

describe('DataCache', () => {
  describe('#prune()', () => {
    it('should remove expired entries from the cache', () => {
      const instance = Object.create(DataCache.prototype)
      instance.lifespan = 100
      instance.cache = {
        expired: { data: [1], timestamp: Date.now() - 200 },
        valid: { data: [2], timestamp: Date.now() }
      }
      instance.prune()
      assert.equal(instance.cache.expired, undefined)
      assert.ok(instance.cache.valid)
    })

    it('should keep entries that have not expired', () => {
      const instance = Object.create(DataCache.prototype)
      instance.lifespan = 10000
      instance.cache = {
        a: { data: [1], timestamp: Date.now() },
        b: { data: [2], timestamp: Date.now() }
      }
      instance.prune()
      assert.ok(instance.cache.a)
      assert.ok(instance.cache.b)
    })

    it('should handle an empty cache', () => {
      const instance = Object.create(DataCache.prototype)
      instance.lifespan = 100
      instance.cache = {}
      instance.prune()
      assert.deepEqual(instance.cache, {})
    })
  })

  describe('#get()', () => {
    let findCalls
    let logCalls
    let restore
    const mongoStub = {
      find: async (...args) => {
        findCalls.push(args)
        return [{ _id: 'stub' }]
      }
    }

    beforeEach(() => {
      findCalls = []
      logCalls = []
      restore = stubApp(mongoStub, logCalls)
    })

    afterEach(() => restore())

    it('should query the DB and log a miss on first call', async () => {
      const cache = new DataCache({ enable: true, lifespan: 10000, verboseLogs: true })
      const result = await cache.get({ _id: '1' }, { collectionName: 'users' }, {})
      assert.deepEqual(result, [{ _id: 'stub' }])
      assert.equal(findCalls.length, 1)
      assert.equal(cache.misses, 1)
      assert.equal(cache.hits, 0)
      assert.equal(logCalls[0][0], 'verbose')
      assert.equal(logCalls[0][1], 'datacache')
      assert.equal(logCalls[0][2], 'miss')
    })

    it('should return cached data and log a hit on a repeat call', async () => {
      const cache = new DataCache({ enable: true, lifespan: 10000, verboseLogs: true })
      await cache.get({ _id: '1' }, { collectionName: 'users' }, {})
      await cache.get({ _id: '1' }, { collectionName: 'users' }, {})
      assert.equal(findCalls.length, 1)
      assert.equal(cache.hits, 1)
      assert.equal(cache.misses, 1)
      assert.equal(logCalls[1][2], 'hit')
    })

    it('should not log when verboseLogs is not set', async () => {
      const cache = new DataCache({ enable: true, lifespan: 10000 })
      await cache.get({ _id: '1' }, { collectionName: 'users' }, {})
      await cache.get({ _id: '1' }, { collectionName: 'users' }, {})
      assert.equal(logCalls.length, 0)
    })

    it('should re-query the DB after an entry expires', async () => {
      const cache = new DataCache({ enable: true, lifespan: 10 })
      await cache.get({ _id: '1' }, { collectionName: 'users' }, {})
      await new Promise(resolve => setTimeout(resolve, 20))
      await cache.get({ _id: '1' }, { collectionName: 'users' }, {})
      assert.equal(findCalls.length, 2)
      assert.equal(cache.hits, 0)
      assert.equal(cache.misses, 2)
    })

    it('should always query the DB when the cache is disabled', async () => {
      const cache = new DataCache({ enable: false, lifespan: 10000 })
      await cache.get({ _id: '1' }, { collectionName: 'users' }, {})
      await cache.get({ _id: '1' }, { collectionName: 'users' }, {})
      assert.equal(findCalls.length, 2)
      assert.equal(cache.hits, 0)
      assert.equal(cache.misses, 2)
    })

    it('should treat different queries as distinct cache entries', async () => {
      const cache = new DataCache({ enable: true, lifespan: 10000 })
      await cache.get({ _id: '1' }, { collectionName: 'users' }, {})
      await cache.get({ _id: '2' }, { collectionName: 'users' }, {})
      assert.equal(findCalls.length, 2)
      assert.equal(cache.misses, 2)
      assert.equal(cache.hits, 0)
    })
  })
})
