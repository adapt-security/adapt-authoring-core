import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { tmpdir } from 'node:os'
import App from '../lib/App.js'

describe('App', () => {
  let app

  before(async () => {
    app = new App()
    await app.onReady()
  })

  describe('.instance', () => {
    it('should return an App instance', () => {
      assert.ok(App.instance instanceof App)
    })

    it('should return the same instance on repeated access', () => {
      assert.equal(App.instance, App.instance)
    })
  })

  describe('constructor', () => {
    it('should set name to adapt-authoring-core', () => {
      assert.equal(app.name, 'adapt-authoring-core')
    })

    it('should set rootDir to a non-empty string', () => {
      assert.equal(typeof app.rootDir, 'string')
      assert.ok(app.rootDir.length > 0)
    })

    it('should set git property via getGitInfo', () => {
      assert.equal(typeof app.git, 'object')
    })
  })

  describe('#getGitInfo()', () => {
    it('should return branch and commit when .git directory exists', () => {
      const gitInfo = app.getGitInfo()
      assert.ok('branch' in gitInfo)
      assert.ok('commit' in gitInfo)
      assert.equal(typeof gitInfo.branch, 'string')
      assert.equal(typeof gitInfo.commit, 'string')
    })

    it('should return an empty object when .git directory is missing', () => {
      const fakeApp = Object.create(App.prototype)
      fakeApp.rootDir = tmpdir()
      assert.deepEqual(fakeApp.getGitInfo(), {})
    })
  })

  describe('#get dependencies()', () => {
    it('should return an object', () => {
      assert.equal(typeof app.dependencies, 'object')
    })
  })

  describe('#start()', () => {
    it('should throw when app is already ready', async () => {
      await assert.rejects(app.start())
    })
  })

  describe('#waitForModule()', () => {
    it('should reject for an unknown module name', async () => {
      await assert.rejects(app.waitForModule('nonexistent-xyz'), { name: 'Error' })
    })
  })

  describe('#setReady()', () => {
    it('should reset _isStarting to false', async () => {
      const testApp = new App()
      testApp._isStarting = true
      await testApp.setReady()
      assert.equal(testApp._isStarting, false)
    })
  })
})
