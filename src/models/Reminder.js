// src/models/Reminder.js
// ------------------------------------------------------------
// A reminder: an AgendaItem that alerts X minutes before its date.
// Rubric: POO (inheritance, polymorphism with isDue) and
// Event 08 (custom threshold alert).
// ------------------------------------------------------------

import { AgendaItem } from './AgendaItem.js';
import { ITEM_TYPES } from '../config/constants.js';

const MS_PER_MINUTE = 60000;

export class Reminder extends AgendaItem {
  #minutesBefore;

  constructor(id, title, date, minutesBefore = 10, description = '') {
    super(id, title, date, description);
    this.minutesBefore = minutesBefore;
  }

  get minutesBefore() {
    return this.#minutesBefore;
  }

  // Must be a whole number >= 0 (it comes from a form, so we convert it).
  set minutesBefore(value) {
    const minutes = Number(value);
    if (!Number.isInteger(minutes) || minutes < 0) {
      throw new Error('Minutes before must be a whole number (0 or more).');
    }
    this.#minutesBefore = minutes;
  }

  get type() {
    return ITEM_TYPES.REMINDER;
  }

  getSummary() {
    return `Reminder "${this.title}" on ${this.formattedDate} (alert ${this.#minutesBefore} min before)`;
  }

  // [POO] [EVENT 08] KEY POLYMORPHISM: the timer calls item.isDue(now) on
  // every item without asking its class. Only reminders can return true:
  // when "now" is inside the window [date - minutesBefore, date).
  isDue(now) {
    const alertTime = this.date.getTime() - this.#minutesBefore * MS_PER_MINUTE;
    return now.getTime() >= alertTime && now.getTime() < this.date.getTime();
  }

  toJSON() {
    return { ...super.toJSON(), minutesBefore: this.#minutesBefore };
  }
}
