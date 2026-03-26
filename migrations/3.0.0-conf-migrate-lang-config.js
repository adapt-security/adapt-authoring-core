import fs from 'fs/promises'
import path from 'path'
import { glob } from 'glob'

export default function (migration) {
  migration.describe('Move adapt-authoring-lang config keys to adapt-authoring-core')

  migration.run(async ({ appDir, dryRun, log }) => {
    const files = await glob('conf/*.config.js', { cwd: appDir, absolute: true })
    for (const filePath of files) {
      const config = (await import(filePath)).default
      const lang = config['adapt-authoring-lang']
      if (!lang) continue

      const core = config['adapt-authoring-core'] || {}
      let changed = false

      if ('defaultLang' in lang) {
        core.defaultLang = lang.defaultLang
        delete lang.defaultLang
        changed = true
        log('info', `${path.basename(filePath)}: moved defaultLang to adapt-authoring-core`)
      }

      if (!changed) continue

      config['adapt-authoring-core'] = core
      if (!Object.keys(lang).length) {
        delete config['adapt-authoring-lang']
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
