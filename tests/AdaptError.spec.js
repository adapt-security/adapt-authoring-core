import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import AdaptError from '../lib/AdaptError.js'

describe('AdaptError', () => {
  describe('constructor', () => {
    it('should set code and default statusCode', () => {
      const error = new AdaptError('TEST_ERROR')
      assert.equal(error.code, 'TEST_ERROR')
      assert.equal(error.statusCode, 500)
      assert.equal(error.isFatal, false)
    })

    it('should set custom statusCode', () => {
      const error = new AdaptError('NOT_FOUND', 404)
      assert.equal(error.statusCode, 404)
    })

    it('should set isFatal from metadata', () => {
      const error = new AdaptError('FATAL_ERROR', 500, { isFatal: true })
      assert.equal(error.isFatal, true)
    })

    it('should default isFatal to false when not in metadata', () => {
      const error = new AdaptError('ERROR', 500, { description: 'test' })
      assert.equal(error.isFatal, false)
    })

    it('should store metadata', () => {
      const meta = { description: 'test error', data: { id: 'test' } }
      const error = new AdaptError('ERROR', 500, meta)
      assert.deepEqual(error.meta, meta)
    })

    it('should extend Error', () => {
      const error = new AdaptError('TEST')
      assert.ok(error instanceof Error)
    })
  })

  describe('#setData()', () => {
    it('should set data and return self for chaining', () => {
      const error = new AdaptError('TEST')
      const result = error.setData({ id: '123' })
      assert.equal(result, error)
      assert.deepEqual(error.data, { id: '123' })
    })
  })

  describe('#toString()', () => {
    it('should include code without data', () => {
      const error = new AdaptError('TEST')
      assert.ok(error.toString().includes('TEST'))
    })

    it('should include stringified data when set', () => {
      const error = new AdaptError('TEST')
      error.setData({ id: '123' })
      assert.ok(error.toString().includes('123'))
    })
  })
})
