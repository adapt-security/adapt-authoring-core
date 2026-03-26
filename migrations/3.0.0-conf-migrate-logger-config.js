import fs from 'fs/promises'
import path from 'path'
import { glob } from 'glob'

export default function (migration) {
  migration.describe('Move adapt-authoring-logger config keys to adapt-authoring-core')

  migration.run(async ({ appDir, dryRun, log }) => {
    const files = await glob('conf/*.config.js', { cwd: appDir, absolute: true })
    for (const filePath of files) {
      const config = (await import(filePath)).default
      const logger = config['adapt-authoring-logger']
      if (!logger) continue

      const core = config['adapt-authoring-core'] || {}
      let changed = false

      if ('levels' in logger) {
        core.logLevels = logger.levels
        delete logger.levels
        changed = true
        log('info', `${path.basename(filePath)}: moved levels → logLevels`)
      }
      if ('showTimestamp' in logger) {
        core.showLogTimestamp = logger.showTimestamp
        delete logger.showTimestamp
        changed = true
        log('info', `${path.basename(filePath)}: moved showTimestamp → showLogTimestamp`)
      }
      if ('mute' in logger) {
        delete logger.mute
        changed = true
        log('info', `${path.basename(filePath)}: removed mute (use empty logLevels array instead)`)
      }
      if ('dateFormat' in logger) {
        delete logger.dateFormat
        changed = true
        log('info', `${path.basename(filePath)}: removed dateFormat`)
      }

      if (!changed) continue

      config['adapt-authoring-core'] = core
      if (!Object.keys(logger).length) {
        delete config['adapt-authoring-logger']
      }

      const output = `export default ${JSON.stringify(config, null, 2)}\n`
      if (dryRun) {
        log('info', `[DRY RUN] would write ${filePath}`)
        continue
      }
      await fs.writeFile(filePath, output, 'utf8')
    }
  })
}
