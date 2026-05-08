export default function (migration) {
  migration.describe('Move adapt-authoring-lang config keys to adapt-authoring-core')

  migration
    .where('adapt-authoring-lang')
    .replace('defaultLang', 'adapt-authoring-core')
}
