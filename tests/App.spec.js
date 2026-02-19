import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import App from '../lib/App.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('App', () => {
  let testRootDir
  let originalRootDir

  before(async () => {
    testRootDir = path.join(__dirname, 'data', 'app-test')
    await fs.ensureDir(testRootDir)
    await fs.writeJson(path.join(testRootDir, 'package.json'), {
      name: 'test-app',
      version: '1.0.0'
    })
    await fs.writeJson(path.join(testRootDir, 'adapt-authoring.json'), {
      essentialApis: []
    })
    originalRootDir = process.env.ROOT_DIR
    process.env.ROOT_DIR = testRootDir
  })

  after(async () => {
    if (originalRootDir !== undefined) {
      process.env.ROOT_DIR = originalRootDir
    } else {
      delete process.env.ROOT_DIR
    }
    await fs.remove(testRootDir)
  })

  describe('.instance', () => {
    it('should return an App instance', () => {
      const app = App.instance
      assert.ok(app instanceof App)
    })

    it('should return the same instance on subsequent calls', () => {
      const app1 = App.instance
      const app2 = App.instance
      assert.equal(app1, app2)
    })
  })

  describe('#dependencies', () => {
    it('should return the dependency configs from dependencyloader', () => {
      const app = App.instance
      assert.equal(typeof app.dependencies, 'object')
      assert.equal(app.dependencies, app.dependencyloader.configs)
    })
  })

  describe('#getGitInfo()', () => {
    it('should return an object', () => {
      const app = App.instance
      const info = app.getGitInfo()
      assert.equal(typeof info, 'object')
    })

    it('should return empty object when .git directory does not exist', () => {
      const app = App.instance
      const origRootDir = app.rootDir
      app.rootDir = '/nonexistent/path'
      const info = app.getGitInfo()
      app.rootDir = origRootDir
      assert.deepEqual(info, {})
    })
  })

  describe('#waitForModule()', () => {
    it('should delegate to dependencyloader.waitForModule', async () => {
      const app = App.instance
      let calledWith
      const origWaitForModule = app.dependencyloader.waitForModule.bind(app.dependencyloader)
      app.dependencyloader.waitForModule = async (name) => {
        calledWith = name
        return { name }
      }
      const result = await app.waitForModule('test-mod')
      app.dependencyloader.waitForModule = origWaitForModule

      assert.equal(calledWith, 'test-mod')
      assert.deepEqual(result, { name: 'test-mod' })
    })

    it('should return array when multiple module names are passed', async () => {
      const app = App.instance
      const origWaitForModule = app.dependencyloader.waitForModule.bind(app.dependencyloader)
      app.dependencyloader.waitForModule = async (name) => ({ name })
      const result = await app.waitForModule('mod-a', 'mod-b')
      app.dependencyloader.waitForModule = origWaitForModule

      assert.ok(Array.isArray(result))
      assert.equal(result.length, 2)
      assert.deepEqual(result[0], { name: 'mod-a' })
      assert.deepEqual(result[1], { name: 'mod-b' })
    })
  })
})
