// src/events/reminderTimer.js
// ------------------------------------------------------------
// [EVENT 01] Timer / Polling  (individual defense: Bryan)
// Every TIMER_INTERVAL_MS (10 s) the server "wakes up" by itself and:
//   1) generates a READING of the agenda and emits TIMER_TICK
//   2) checks every item with isDue() and emits REMINDER_DUE
// Nobody clicks anything: the event source is TIME itself.
// ------------------------------------------------------------

import { appEvents } from './AppEventEmitter.js';
import { EVENTS, TIMER_INTERVAL_MS } from '../config/constants.js';
import { agendaService } from '../services/AgendaService.js';

const MS_PER_MINUTE = 60000;

// [DATA STRUCTURE] Set of reminder ids that already alerted.
// A Set ignores duplicates, so each reminder alerts only ONCE.
const notifiedIds = new Set();
let timerId = null; // the id returned by setInterval, needed to stop it

// Builds one reading: a snapshot of the agenda at this moment.
// "items" arrive sorted by date, so the first future item is the next one.
export function createReading(items, now) {
  let itemsToday = 0;
  let remindersDue = 0;
  let nextItem = null;
  for (const item of items) {
    if (item.date.toDateString() === now.toDateString()) {
      itemsToday++;
    }
    if (item.isDue(now)) {
      remindersDue++;
    }
    if (nextItem === null && item.date > now) {
      nextItem = item;
    }
  }
  return {
    time: now.toISOString(),
    totalItems: items.length,
    itemsToday,
    nextItemTitle: nextItem === null ? 'None' : nextItem.title,
    minutesToNextItem: nextItem === null ? null : Math.round((nextItem.date - now) / MS_PER_MINUTE),
    remindersDue,
  };
}

// [POO] Polymorphism: we call isDue() without asking if it is a Meeting or a Reminder.
function checkReminders(items, now) {
  for (const item of items) {
    if (item.isDue(now) && !notifiedIds.has(item.id)) {
      notifiedIds.add(item.id);
      // [EVENT 08] Threshold crossed → alertListener, auditListener and uiListener react.
      appEvents.emit(EVENTS.REMINDER_DUE, item.toJSON());
    }
  }
}

// One "tick" of the clock. The timer reads the Map in memory, not MySQL.
function tick() {
  try {
    const now = new Date();
    const items = agendaService.getAll();
    // [EVENT 01] Publish the reading. uiListener sends it to the "Live readings" panel.
    appEvents.emit(EVENTS.TIMER_TICK, createReading(items, now));
    checkReminders(items, now);
  } catch (error) {
    appEvents.emit(EVENTS.APP_ERROR, { message: error.message, source: 'reminderTimer' });
  }
}

// If a reminder is edited or deleted, forget it so it can alert again.
function forgetItem(item) {
  notifiedIds.delete(item.id);
}

export function startReminderTimer() {
  if (timerId !== null) {
    return; // already running
  }
  appEvents.on(EVENTS.ITEM_UPDATED, forgetItem);
  appEvents.on(EVENTS.ITEM_DELETED, forgetItem);
  tick(); // first reading right away, then one every 10 s
  timerId = setInterval(tick, TIMER_INTERVAL_MS);
  console.log(`Reminder timer started (every ${TIMER_INTERVAL_MS / 1000} s).`);
}

// [EVENT 06] Cleanup: stop the interval and remove our subscriptions.
export function stopReminderTimer() {
  clearInterval(timerId);
  timerId = null;
  appEvents.off(EVENTS.ITEM_UPDATED, forgetItem);
  appEvents.off(EVENTS.ITEM_DELETED, forgetItem);
  console.log('Reminder timer stopped.');
}
