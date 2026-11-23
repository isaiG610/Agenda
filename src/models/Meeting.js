// src/models/Meeting.js
// ------------------------------------------------------------
// A meeting: an AgendaItem that also has a location and a duration.
// Rubric: POO (inheritance with extends/super, polymorphism).
// ------------------------------------------------------------

import { AgendaItem } from './AgendaItem.js';
import { ITEM_TYPES } from '../config/constants.js';

const MS_PER_MINUTE = 60000;

export class Meeting extends AgendaItem {
  #location;
  #durationMinutes;

  constructor(id, title, date, location, description = '', durationMinutes = 60) {
    // [POO] super() runs the parent constructor (validates id, title, date...).
    super(id, title, date, description);
    this.location = location;
    this.durationMinutes = durationMinutes;
  }

  get location() {
    return this.#location;
  }

  set location(value) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error('The location cannot be empty for a meeting.');
    }
    if (value.trim().length > 100) {
      throw new Error('The location must be 100 characters or less.');
    }
    this.#location = value.trim();
  }

  get durationMinutes() {
    return this.#durationMinutes;
  }

  // Must be a whole number greater than 0 (it comes from a form, so we convert it).
  set durationMinutes(value) {
    const minutes = Number(value);
    if (!Number.isInteger(minutes) || minutes <= 0) {
      throw new Error('Duration must be a whole number of minutes (more than 0).');
    }
    this.#durationMinutes = minutes;
  }

  // [POO] Override of the abstract getter.
  get type() {
    return ITEM_TYPES.MEETING;
  }

  // [POO] Override: each class describes itself in its own way.
  getSummary() {
    return `Meeting "${this.title}" at ${this.#location} on ${this.formattedDate}`;
  }

  // [POO] Override: a meeting ends "durationMinutes" after it starts.
  getEndDate() {
    return new Date(this.date.getTime() + this.#durationMinutes * MS_PER_MINUTE);
  }

  // [POO] Override: parent fields + our own fields.
  toJSON() {
    return { ...super.toJSON(), location: this.#location, durationMinutes: this.#durationMinutes };
  }
}
