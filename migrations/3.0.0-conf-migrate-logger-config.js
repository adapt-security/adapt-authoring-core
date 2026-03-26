export default function (migration) {
  migration.describe('Move adapt-authoring-logger config keys to adapt-authoring-core')

  migration
    .where('adapt-authoring-logger')
    .mutate(config => {
      const logger = config['adapt-authoring-logger']
      const core = config['adapt-authoring-core'] ||= {}

      if ('levels' in logger) {
        core.logLevels = logger.levels
        delete logger.levels
      }
      if ('showTimestamp' in logger) {
        core.showLogTimestamp = logger.showTimestamp
        delete logger.showTimestamp
      }
      delete logger.mute
      delete logger.dateFormat

      if (!Object.keys(logger).length) {
        delete config['adapt-authoring-logger']
      }
    })
}
