import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { toShortName } from '../lib/utils/toShortName.js'

describe('toShortName()', () => {
  it('should strip the adapt-authoring- prefix', () => {
    assert.equal(toShortName('adapt-authoring-server'), 'server')
  })

  it('should only strip an anchored prefix', () => {
    assert.equal(toShortName('x-adapt-authoring-y'), 'x-adapt-authoring-y')
  })

  it('should return a name without the prefix unchanged', () => {
    assert.equal(toShortName('server'), 'server')
  })

  it('should return an empty string unchanged', () => {
    assert.equal(toShortName(''), '')
  })

  it('should return undefined unchanged', () => {
    assert.equal(toShortName(undefined), undefined)
  })

  it('should return null unchanged', () => {
    assert.equal(toShortName(null), null)
  })
})
