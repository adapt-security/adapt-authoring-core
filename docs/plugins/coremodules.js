export default class CoreModules {
  async run () {
    this.manualFile = 'coremodules.md'
    this.replace = {
      VERSION: this.app.pkg.version,
      MODULES: this.generateMd()
    }
  }

  generateMd () {
    return Object.keys(this.app.dependencies).sort().reduce((s, name) => {
      const { version, description, homepage } = this.app.dependencies[name]
      const badge = homepage ? `[![Tests](${homepage}/actions/workflows/tests.yml/badge.svg)](${homepage}/actions/workflows/tests.yml)` : ''
      return `${s}\n| ${homepage ? `[${name}](${homepage})` : name} | ${version} | ${description} | ${badge} |`
    }, '| Name | Version | Description | Tests |\n| - | :-: | - | :-: |')
  }
}
