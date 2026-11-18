// src/events/AppEventEmitter.js
// ------------------------------------------------------------
// The ONE event bus of the whole app (Singleton).
// Rubric: POE (publish/subscribe with Node's EventEmitter).
// ------------------------------------------------------------

import { EventEmitter } from 'node:events';

// [POE] Our own class, so it is easy to extend later if needed.
class AppEventEmitter extends EventEmitter {}

// [POE] Singleton: ES modules are evaluated only ONCE and then cached,
// so every file that imports "appEvents" gets this exact same object.
// Publishers call appEvents.emit(...), subscribers call appEvents.on(...).
export const appEvents = new AppEventEmitter();
