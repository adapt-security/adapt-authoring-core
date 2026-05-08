/**
 * A generic error class for use in Adapt applications
 * @memberof core
 */
class AdaptError extends Error {
  /**
   * @constructor
   * @param {string} code The human-readable error code
   * @param {number} statusCode The HTTP status code
   * @param {object} metadata Metadata describing the error
   */
  constructor (code, statusCode = 500, metadata = {}) {
    super(code)
    /**
     * The error code
     * @type {String}
     */
    this.code = code
    /**
     * The HTTP status code
     * @type {String}
     */
    this.statusCode = statusCode
    /**
     * Whether this error should halt the application
     * @type {Boolean}
     */
    this.isFatal = metadata.isFatal ?? false
    /**
     * Metadata describing the error
     * @type {Object}
     */
    this.meta = metadata
  }

  /**
   * Chainable function to allow setting of data for use in user-friendly error messages later on.
   * @param {object} data
   * @returns {AdaptError}
   * @example
   * // note calling this function will also return
   * // the error itself to allow for easy error throwing
   * throw this.app.errors.MY_ERROR
   *   .setData({ hello: 'world' })
   */
  setData (data) {
    this.data = data
    return this
  }

  /** @override */
  toString () {
    return `${this.constructor.name}: ${this.code} ${this.data ? JSON.stringify(this.data) : ''}`
  }
}

export default AdaptError
