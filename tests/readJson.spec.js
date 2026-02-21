import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

import { readJson } from '../lib/utils/readJson.js'

describe('readJson()', () => {
  it('should read and parse a valid JSON file', async () => {
    const tmpFile = path.join(os.tmpdir(), `readJson-test-${Date.now()}.json`)
    await fs.writeFile(tmpFile, JSON.stringify({ name: 'test', version: '1.0.0' }))
    try {
      const result = await readJson(tmpFile)
      assert.equal(result.name, 'test')
      assert.equal(result.version, '1.0.0')
    } finally {
      await fs.unlink(tmpFile)
    }
  })

  it('should throw on non-existent file', async () => {
    await assert.rejects(
      () => readJson('/tmp/does-not-exist-readjson.json'),
      { code: 'ENOENT' }
    )
  })

  it('should throw on invalid JSON', async () => {
    const tmpFile = path.join(os.tmpdir(), `readJson-invalid-${Date.now()}.json`)
    await fs.writeFile(tmpFile, '{ not valid json }')
    try {
      await assert.rejects(
        () => readJson(tmpFile),
        SyntaxError
      )
    } finally {
      await fs.unlink(tmpFile)
    }
  })
})
