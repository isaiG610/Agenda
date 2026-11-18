// src/models/Meeting.js
// ------------------------------------------------------------
// A meeting: an AgendaItem that also has a location.
// Rubric: POO (inheritance with extends/super, polymorphism).
// ------------------------------------------------------------

import { AgendaItem } from './AgendaItem.js';
import { ITEM_TYPES } from '../config/constants.js';

export class Meeting extends AgendaItem {
  #location;

  constructor(id, title, date, location, description = '') {
    // [POO] super() runs the parent constructor (validates id, title, date...).
    super(id, title, date, description);
    this.location = location;
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

  // [POO] Override of the abstract getter.
  get type() {
    return ITEM_TYPES.MEETING;
  }

  // [POO] Override: each class describes itself in its own way.
  getSummary() {
    return `Meeting "${this.title}" at ${this.#location} on ${this.formattedDate}`;
  }

  // [POO] Override: parent fields + our own field.
  toJSON() {
    return { ...super.toJSON(), location: this.#location };
  }
}
