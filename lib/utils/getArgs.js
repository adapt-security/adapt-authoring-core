import { parseArgs } from 'node:util'

/**
 * Returns the passed arguments, parsed for easy access
 * @return {Object} The parsed arguments
 */
export function getArgs () {
  const { values, positionals } = parseArgs({ strict: false, args: process.argv.slice(2) })
  return { ...values, params: positionals }
}
