import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import Errors from '../lib/Errors.js'
import AdaptError from '../lib/AdaptError.js'
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('Errors', () => {
  let testDir

  before(async () => {
    testDir = path.join(__dirname, 'data', 'errors-test')
    const errorsDir = path.join(testDir, 'errors')
    await fs.ensureDir(errorsDir)
    await fs.writeJson(path.join(errorsDir, 'test.json'), {
      TEST_ERROR: {
        description: 'A test error',
        statusCode: 400,
        data: { id: 'The item ID' }
      },
      FATAL_ERROR: {
        description: 'A fatal error',
        statusCode: 500,
        isFatal: true
      }
    })
  })

  after(async () => {
    await fs.remove(testDir)
  })

  describe('constructor', () => {
    it('should load error definitions from dependencies', () => {
      const deps = { test: { name: 'test', rootDir: testDir } }
      const errors = new Errors({ dependencies: deps })
      assert.ok(errors.TEST_ERROR)
      assert.ok(errors.FATAL_ERROR)
    })

    it('should return AdaptError instances', () => {
      const deps = { test: { name: 'test', rootDir: testDir } }
      const errors = new Errors({ dependencies: deps })
      assert.ok(errors.TEST_ERROR instanceof AdaptError)
    })

    it('should return fresh instances on each access', () => {
      const deps = { test: { name: 'test', rootDir: testDir } }
      const errors = new Errors({ dependencies: deps })
      assert.notEqual(errors.TEST_ERROR, errors.TEST_ERROR)
    })

    it('should set statusCode from definition', () => {
      const deps = { test: { name: 'test', rootDir: testDir } }
      const errors = new Errors({ dependencies: deps })
      assert.equal(errors.TEST_ERROR.statusCode, 400)
    })

    it('should set isFatal from definition', () => {
      const deps = { test: { name: 'test', rootDir: testDir } }
      const errors = new Errors({ dependencies: deps })
      assert.equal(errors.FATAL_ERROR.isFatal, true)
      assert.equal(errors.TEST_ERROR.isFatal, false)
    })

    it('should warn on duplicate error codes', () => {
      const dupDir = path.join(__dirname, 'data', 'errors-dup')
      const errorsDir = path.join(dupDir, 'errors')
      fs.ensureDirSync(errorsDir)
      fs.writeJsonSync(path.join(errorsDir, 'dup.json'), {
        TEST_ERROR: { description: 'duplicate', statusCode: 500 }
      })
      const deps = {
        test: { name: 'test', rootDir: testDir },
        dup: { name: 'dup', rootDir: dupDir }
      }
      let warned = false
      new Errors({ dependencies: deps, log: () => { warned = true } }) // eslint-disable-line no-new
      assert.ok(warned)
      fs.removeSync(dupDir)
    })

    it('should handle empty dependencies', () => {
      const errors = new Errors({ dependencies: {} })
      assert.deepEqual(Object.keys(errors), [])
    })
  })
})
