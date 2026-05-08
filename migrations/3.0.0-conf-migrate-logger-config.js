export default function (migration) {
  migration.describe('Move adapt-authoring-logger config keys to adapt-authoring-core')

  migration
    .where('adapt-authoring-logger')
    .replace('levels', 'adapt-authoring-core', 'logLevels')
    .replace('showTimestamp', 'adapt-authoring-core', 'showLogTimestamp')
    .remove('mute', 'dateFormat')
}
