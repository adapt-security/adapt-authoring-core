export default class FastModule {
  constructor (app, config) {
    this.app = app
    this.config = config
    this.name = config.name
    this._isReady = false
  }

  async onReady () {
    this._isReady = true
    return this
  }
}
