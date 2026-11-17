// src/models/AgendaItem.js
// ------------------------------------------------------------
// Represents ONE item in the agenda (a meeting, a reminder...).
// Uses private fields (#), getters and setters (encapsulation).
// ------------------------------------------------------------

export class AgendaItem {
  // PRIVATE fields: the # means nothing outside this class
  // can read or change them directly.
  #id;
  #title;
  #date;
  #description;

  // The constructor runs when we call: new AgendaItem(...)
  constructor(id, title, date, description = '') {
    this.#id = id;
    // We use the setters (no #) so the data is VALIDATED on creation.
    this.title = title;
    this.date = date;
    this.description = description;
  }

  // GETTER: lets us READ the value like a property: item.id
  // There is no setter for id → it cannot be changed after creation.
  get id() {
    return this.#id;
  }

  get title() {
    return this.#title;
  }

  // SETTER: runs on ASSIGNMENT: item.title = 'new title'
  // We validate before saving. If the data is invalid, we throw an error.
  set title(value) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error('The title cannot be empty.');
    }
    this.#title = value.trim();
  }

  get date() {
    return this.#date;
  }

  // Receives a string like '2026-12-05T10:00' and converts it to a Date object.
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

  set description(value) {
    this.#description = String(value).trim();
  }
}