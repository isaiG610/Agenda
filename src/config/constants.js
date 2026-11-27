// src/config/constants.js
// ------------------------------------------------------------
// Shared constants: event names, item types and timer settings.
// Rubric: POE (event catalog). Every module imports event names
// from here, so a typo becomes an import error instead of a silent bug.
// ------------------------------------------------------------

// [POE] Central list of every event in the app.
// Object.freeze makes the object read-only.
export const EVENTS = Object.freeze({
  SERVER_READY: 'server:ready',
  ITEM_CREATED: 'item:created',
  ITEM_UPDATED: 'item:updated',
  ITEM_DELETED: 'item:deleted',
  TIMER_TICK: 'timer:tick',
  REMINDER_DUE: 'reminder:due',
  STATS_READY: 'stats:ready',
  APP_ERROR: 'app:error',
  APP_SHUTDOWN: 'app:shutdown',
  FILE_CHANGED: 'file:changed',
});

export const ITEM_TYPES = Object.freeze({ ACTIVITY: 'activity', REMINDER: 'reminder' });

export const TIMER_INTERVAL_MS = 10000; // short on purpose so the live demo is visible
export const RECENT_ACTIVITY_LIMIT = 10;
