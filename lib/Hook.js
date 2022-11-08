import _ from 'lodash';
/**
 * Allows observers to tap into to a specific piece of code, and execute their own arbitrary code
 */
class Hook {
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
    /** @ignore */ this._hookObservers = [];
    /** @ignore */ this._promiseObservers = [];
    /** @ignore */ this._options = Object.assign({ // force series execution for mutable hooks
      type: opts.mutable === true ? Hook.Types.Series : Hook.Types.Parallel, 
      mutable: false
    }, opts);
  }
  /**
   * Whether this hook has any observer functions
   * @return {Boolean}
   */
  get hasObservers() {
    return this._hookObservers.length > 0;
  }
  /**
   * Adds an observer to the hook
   * @param {Function} observer Callback to be called when the hook is invoked
   */
  tap(observer) {
    if(_.isFunction(observer)) this._hookObservers.push(observer);
  }
  /**
   * Removes an observer from the hook
   * @param {Function} observer
   */
  untap(observer) {
    const i = this._hookObservers.indexOf(observer);
    if(i > -1) this._hookObservers.splice(i,1);
  }
  /**
   * Returns a promise which is resolved when the hook is successfully invoked. If hook fails, the promise is rejected with the error
   * @returns Promise
   */
  onInvoke() {
    return new Promise((resolve, reject) => this._hookObservers.push([resolve, reject]));
  }
  /**
   * Invokes all observers
   * @param {...*} args Arguments to be passed to observers
   * @return {Promise}
   */
  async invoke(...args) {
    let error;
    try {
      if(this._options.type === Hook.Types.Parallel) {
        await Promise.all(this._hookObservers.map(o => o(...args)));
      } else {
        // if not mutable, send a deep copy of the args to avoid any meddling
        for(const o of this._hookObservers) await o(...this._options.mutable ? args : args.map(a => _.cloneDeep(a)));
      }
    } catch(e) {
      error = e;
    }
    this._promiseObservers.forEach(([resolve, reject]) => error ? reject(e) : resolve(...args));
    if(error) throw error;
  }
}

export default Hook;