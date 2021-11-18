import _ from 'lodash';
/**
 * Allows observers to tap into to a specific piece of code, and execute their own arbitrary code
 */
export default class Hook {
  /**
   * Types of supported Hook
   * @type {Object}
   * @property {String} Parallel
   * @property {String} Series
   */
  static get Types() {
    return {
      Parallel: 'parallel',
      Series: 'series'
    };
  }
  /** @constructor */
  constructor(opts) {
    /** @ignore */ this._observers = [];
    /** @ignore */ this._options = Object.assign({ type: Hook.Types.Parallel, mutable: false }, opts);
  }
  /**
   * Adds an observer to the hook
   * @param {Function} observer Callback to be called when the hook is invoked
   */
  tap(observer) {
    if(_.isFunction(observer)) this._observers.push(observer);
  }
  /**
   * Removes an observer from the hook
   * @param {Function} observer
   */
  untap(observer) {
    const i = this._observers.indexOf(observer);
    if(i > -1) this._observers.splice(i,1);
  }
  /**
   * Invokes all observers
   * @param {...*} args Arguments to be passed to observers
   * @return {Promise}
   */
  invoke(...args) {
    if(this._options.type === Hook.Types.Parallel) {
      return Promise.all(this._observers.map(o => o(...args)));
    }
    return new Promise(async (resolve, reject) => {
      for(const o of this._observers) {
        try { // if not mutable, send a deep copy of the args to avoid any meddling
          await o(...this._options.mutable ? args : args.map(a => _.cloneDeep(a)));
        } catch(e) {
          reject(e);
        }
      }
      resolve(...args);
    });
  }
}