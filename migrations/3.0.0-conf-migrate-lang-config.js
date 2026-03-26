export default function (migration) {
  migration.describe('Move adapt-authoring-lang config keys to adapt-authoring-core')

  migration
    .where('adapt-authoring-lang')
    .mutate(config => {
      const lang = config['adapt-authoring-lang']
      const core = config['adapt-authoring-core'] ||= {}

      if ('defaultLang' in lang) {
        core.defaultLang = lang.defaultLang
        delete lang.defaultLang
      }

      if (!Object.keys(lang).length) {
        delete config['adapt-authoring-lang']
      }
    })
}
