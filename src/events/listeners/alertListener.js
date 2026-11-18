// src/events/listeners/alertListener.js
// ------------------------------------------------------------
// Subscriber: reacts to REMINDER_DUE with a visible console alert.
// Rubric: Event 08 (custom threshold alert).
// ------------------------------------------------------------

import { appEvents } from '../AppEventEmitter.js';
import { EVENTS } from '../../config/constants.js';

const MS_PER_MINUTE = 60000;

export function registerAlertListener() {
  // [EVENT 08] The threshold was crossed: time left <= minutesBefore.
  appEvents.on(EVENTS.REMINDER_DUE, (reminder) => {
    const msLeft = new Date(reminder.date).getTime() - Date.now();
    const minutesLeft = Math.max(0, Math.round(msLeft / MS_PER_MINUTE));
    console.log(`[ALERT] Reminder "${reminder.title}" starts in ${minutesLeft} min.`);
  });
}
