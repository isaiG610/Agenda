// src/models/AgendaItem.js
// ------------------------------------------------------------
// ABSTRACT base class for every item in the agenda.
// Rubric: POO (abstraction, encapsulation, inheritance, polymorphism).
// Uses private fields (#), getters and setters (encapsulation).
// ------------------------------------------------------------

import { toLocalDateString } from '../utils/dateUtils.js';

export class AgendaItem {
  // [POO] PRIVATE fields: nothing outside this class can touch them.
  #id;
  #title;
  #date;
  #description;

  constructor(id, title, date, description = '') {
    // [POO] Abstract class: "new AgendaItem()" is not allowed,
    // only "new Activity()" or "new Reminder()".
    if (new.target === AgendaItem) {
      throw new Error('AgendaItem is abstract. Create an Activity or a Reminder.');
    }
    this.#id = id;
    // We use the setters (no #) so the data is VALIDATED on creation.
    this.title = title;
    this.date = date;
    this.description = description;
  }

  // There is no setter for id → it cannot be changed after creation.
  get id() {
    return this.#id;
  }

  get title() {
    return this.#title;
  }

  // SETTER: validates before saving. Invalid data → throw an error.
  set title(value) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error('The title cannot be empty.');
    }
    if (value.trim().length > 100) {
      throw new Error('The title must be 100 characters or less.');
    }
    this.#title = value.trim();
  }

  get date() {
    return this.#date;
  }

  // Receives a string like '2026-12-05T10:00' (or a Date) and stores a Date object.
  set date(value) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Invalid date: ${value}`);
    }
    this.#date = parsed;
  }

  get description() {
    return this.#description;
  }

  // The database returns NULL for an empty description, so we store '' instead.
  set description(value) {
    if (value === undefined || value === null) {
      this.#description = '';
      return;
    }
    this.#description = String(value).trim();
  }

  // Shared getter: every child class inherits it.
  get formattedDate() {
    return this.#date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  }

  // [POO] ABSTRACT members: children MUST override them.
  get type() {
    throw new Error('Child classes must implement "get type()".');
  }

  getSummary() {
    throw new Error('Child classes must implement "getSummary()".');
  }

  // [POO] Default behavior: a generic item never alerts. Reminder overrides it.
  isDue(now) {
    return false;
  }

  // [POO] Default behavior: the item ends when it starts (a single point in time).
  // Activity overrides it with start + durationMinutes. We return a copy so
  // nobody can change our private #date from outside.
  getEndDate() {
    return new Date(this.#date.getTime());
  }

  // Called automatically by JSON.stringify (and by res.json in Express).
  // The date is local time 'YYYY-MM-DDTHH:mm' so it fits <input type="datetime-local">.
  toJSON() {
    return {
      id: this.#id,
      type: this.type,
      title: this.#title,
      date: toLocalDateString(this.#date),
      // [POO] Polymorphism: this.getEndDate() runs the child's version if it has one.
      endDate: toLocalDateString(this.getEndDate()),
      description: this.#description,
    };
  }
}
