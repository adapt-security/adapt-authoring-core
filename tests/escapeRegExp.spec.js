import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { escapeRegExp } from '../lib/utils/escapeRegExp.js'

describe('escapeRegExp()', () => {
  it('should escape dots', () => {
    assert.equal(escapeRegExp('file.js'), 'file\\.js')
  })

  it('should escape asterisks', () => {
    assert.equal(escapeRegExp('a*b'), 'a\\*b')
  })

  it('should escape parentheses', () => {
    assert.equal(escapeRegExp('(group)'), '\\(group\\)')
  })

  it('should escape square brackets', () => {
    assert.equal(escapeRegExp('[abc]'), '\\[abc\\]')
  })

  it('should escape all special characters', () => {
    const special = '.*+\\-?^${}()|[]'
    const escaped = escapeRegExp(special)
    // The escaped string should work as a literal regex match
    const re = new RegExp(escaped)
    assert.ok(re.test(special))
  })

  it('should return plain strings unchanged', () => {
    assert.equal(escapeRegExp('hello'), 'hello')
  })
})
