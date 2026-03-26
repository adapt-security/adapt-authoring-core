export default class Errors {
  async run () {
    this.manualFile = 'errorsref.md'
    this.contents = Object.keys(this.app.errors)
    this.replace = { ERRORS: this.generateMd() }
  }

  generateMd () {
    return Object.keys(this.app.errors).reduce((md, k) => {
      const e = this.app.errors[k]
      return `${md}\n| \`${e.code}\` | ${e.meta.description} | ${e.statusCode} | <ul>${this.dataToMd(e.meta.data)}</ul> |`
    }, '| Error code | Description | HTTP status code | Supplemental data |\n| - | - | :-: | - |')
  }

  dataToMd (data, s = '') {
    if (!data) return s
    return Object.entries(data).reduce((s, [k, v]) => {
      return `${s}<li>\`${k}\`: ${typeof v === 'object' ? this.dataToMd(v, s) : v}</li>`
    }, s)
  }
}
