export default function (migration) {
  migration.describe('Move adapt-authoring-lang config keys to adapt-authoring-core')

  migration
    .where('adapt-authoring-lang')
    .mutate(config => {
      const lang = config['adapt-authoring-lang']
      const core = config['adapt-authoring-core'] ||= {}

      if (lang.defaultLang && !core.defaultLang) {
        core.defaultLang = lang.defaultLang
        delete config['adapt-authoring-lang']
      }
    })
}
