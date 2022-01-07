import EventEmitter from 'events';
/** @ignore */ const _staticEmitter = new EventEmitter();
/**
 * Adds custom event handling to objects
 */
class Events {
  /**
   * Add an observer to a static event
   * @param {String} eventName
   * @param {Function} listener Callback function
   * @see https://nodejs.org/api/events.html#events_emitter_on_eventname_listener
   */
  static on(eventName, listener) {
    _staticEmitter.on(eventName, listener);
  }
  /**
   * Add an observer to a static event
   * @param {String} eventName
   * @param {Function} listener Callback function
   * @see https://nodejs.org/api/events.html#events_emitter_on_eventname_listener
   */
  static once(eventName, listener) {
    _staticEmitter.once(eventName, listener);
  }
  /**
   * Remove an observer to a static event
   * @param {String} eventName
   * @param {Function} listener Callback function
   * @see https://nodejs.org/api/events.html#events_emitter_on_eventname_listener
   */
  static off(eventName, listener) {
    _staticEmitter.off(eventName, listener);
  }
  /**
   * Trigger a static event
   * @param {String} eventName
   * @param {...*} rest Arguments to be passed to listeners
   * @see https://nodejs.org/api/events.html#events_emitter_emit_eventname_args
   */
  static emit(eventName, ...rest) {
    _staticEmitter.emit(eventName, ...rest);
  }
  /**
   * Creates a new Event instance
   */
  constructor() {
    /** @ignore */ this._emitter = new EventEmitter();
  }
  /**
   * Sets the number of listeners which can be added before a warning is logged (default is 10)
   * @param {Number} n Number of listeners
   * @see https://nodejs.org/api/events.html#events_emitter_setmaxlisteners_n
   */
  setMaxListeners(n) {
    this._emitter.setMaxListeners(n);
    _staticEmitter.setMaxListeners(n);
  }
  /**
   * Add an observer to an instance event
   * @param {String} eventName
   * @param {Function} listener Callback function
   * @see https://nodejs.org/api/events.html#events_emitter_on_eventname_listener
   */
  on(eventName, listener) {
    this._emitter.on(eventName, listener);
  }
  /**
   * Add an observer to an instance event
   * @param {String} eventName
   * @param {Function} listener Callback function
   * @see https://nodejs.org/api/events.html#events_emitter_on_eventname_listener
   */
  once(eventName, listener) {
    this._emitter.once(eventName, listener);
  }
  /**
   * Remove an observer to an instance event
   * @param {String} eventName
   * @param {Function} listener Callback function
   * @see https://nodejs.org/api/events.html#events_emitter_on_eventname_listener
   */
  off(eventName, listener) {
    this._emitter.off(eventName, listener);
  }
  /**
   * Trigger an instance event
   * @param {String} eventName
   * @param {...*} rest Arguments to be passed to listeners
   * @see https://nodejs.org/api/events.html#events_emitter_emit_eventname_args
   */
  emit(eventName, ...rest) {
    this._emitter.emit(eventName, ...rest);
  }
}

export default Events;