# Writing tests

Instructions for writing tests in this module.

## Stack

- **Test runner:** [`node:test`](https://nodejs.org/api/test.html) (built into Node.js)
- **Assertions:** [`node:assert/strict`](https://nodejs.org/api/assert.html#strict-assertion-mode)

No external test dependencies are needed. Do not introduce Mocha, Jest, or other test frameworks.

> **Note:** Some older modules in the project use Mocha + Should.js. New tests in this module use the built-in Node.js test library instead.

## File placement and naming

- Tests live in a `tests/` directory at the module root
- One test file per source module, named `<moduleName>.spec.js`
- Test data/fixtures go in `tests/data/`

```
my-module/
├── lib/
│   ├── myModule.js
│   └── myUtils.js
└── tests/
    ├── data/
    │   └── fixtures.json
    ├── myModule.spec.js
    └── myUtils.spec.js
```

## File structure

Every test file follows this structure:

```js
import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import MyModule from '../lib/myModule.js'

describe('My Module', () => {
  let instance

  before(() => {
    instance = new MyModule()
  })

  describe('#methodName()', () => {
    it('should describe expected behaviour', () => {
      assert.equal(instance.methodName(), 'expected')
    })
  })
})
```

Key rules:

- Import `describe`, `it`, `before`, `after` etc. from `node:test`
- Import `assert` from `node:assert/strict` (strict mode uses `deepStrictEqual` by default)
- Use ES module `import` syntax — this project is `"type": "module"`
- Group tests by method using nested `describe` blocks, prefixed with `#` for instance methods
- Store shared state in `let` variables scoped to the `describe` block

## Assertions

Use `node:assert/strict`. Common patterns:

```js
// equality (uses Object.is)
assert.equal(actual, expected)

// deep equality (objects/arrays)
assert.deepEqual(actual, { key: 'value' })

// booleans
assert.equal(result, true)
assert.equal(result, false)

// truthy / falsy
assert.ok(value)
assert.ok(!value)

// type checks
assert.equal(typeof value, 'object')
assert.ok(Array.isArray(value))
assert.ok(value instanceof MyClass)

// expected errors (sync)
assert.throws(() => dangerousCall(), { name: 'TypeError' })

// expected errors (async)
await assert.rejects(asyncCall(), { name: 'Error' })

// not equal
assert.notEqual(a, b)
assert.notDeepEqual(obj1, obj2)
```

## Dynamic test generation

When testing a function against multiple inputs, generate tests in a loop:

```js
const validInputs = ['a@b.com', 'test@example.org']
const invalidInputs = ['not-an-email', '@missing.user']

validInputs.forEach((input) => {
  it(`should accept ${input}`, () => {
    assert.equal(validate(input), true)
  })
})

invalidInputs.forEach((input) => {
  it(`should reject ${input}`, () => {
    assert.equal(validate(input), false)
  })
})
```

## Async tests

`node:test` supports `async/await` directly:

```js
it('should connect successfully', async () => {
  const result = await instance.connect()
  assert.equal(typeof result, 'object')
})
```

## Test data

Place fixture files in `tests/data/`. Use `import` or `fs` to load them:

```js
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixtures = JSON.parse(readFileSync(join(__dirname, 'data', 'fixtures.json')))
```

## What to test

- All public methods on exported classes and utilities
- Both success and error paths
- Edge cases (empty input, missing arguments, invalid types)
- That errors are thrown or returned where expected (use `assert.throws` / `assert.rejects`)

## What NOT to do

- Don't test private/internal methods (prefixed with `_`)
- Don't add external test dependencies — `node:test` and `node:assert` are sufficient
- Don't write tests that depend on execution order between `describe` blocks
- Don't mock more than necessary — prefer testing real behaviour

## Add script to package.json

The tests should be accessible via an npm script in package.json:
```
"scripts": {
  "test": "node --test tests/"
}
```

## Add GitHub workflow

The following workflow should be added to /.github:
```
name: Tests
on: push
jobs:
  default:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@master
      - uses: actions/setup-node@master
        with:
          node-version: 'lts/*'
          cache: 'npm'
      - run: npm ci
      - run: npm test
```

## Running tests

```bash
# run the test suite
npm test

# run the linter
npx standard
```

Both must pass before submitting a pull request.
