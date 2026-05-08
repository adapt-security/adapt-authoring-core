import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { getArgs } from '../lib/utils/getArgs.js'

describe('getArgs()', () => {
  it('should return an object with parsed arguments', () => {
    const args = getArgs()
    assert.equal(typeof args, 'object')
  })

  it('should include params as an array', () => {
    const args = getArgs()
    assert.ok(Array.isArray(args.params))
  })
})
