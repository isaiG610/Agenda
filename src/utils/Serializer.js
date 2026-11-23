// src/utils/Serializer.js
// ------------------------------------------------------------
// Converts data between its 3 shapes:
//   DB row (snake_case)  <->  class object (Meeting/Reminder)  <->  JSON
// Rubric: serialization + Factory pattern (createItem).
// ------------------------------------------------------------

import { Meeting } from '../models/Meeting.js';
import { Reminder } from '../models/Reminder.js';
import { ITEM_TYPES } from '../config/constants.js';

// [POO] FACTORY: the caller does not need to know which class to create.
// It passes plain data and gets back the right object.
export function createItem(data) {
  if (data.type === ITEM_TYPES.MEETING) {
    return new Meeting(data.id, data.title, data.date, data.location, data.description, data.durationMinutes);
  }
  if (data.type === ITEM_TYPES.REMINDER) {
    return new Reminder(data.id, data.title, data.date, data.minutesBefore, data.description);
  }
  const error = new Error(`Unknown item type: ${data.type}`);
  error.status = 400;
  throw error;
}

// MySQL row → object. snake_case columns become camelCase (minutes_before → minutesBefore).
export function rowToItem(row) {
  return createItem({
    id: row.id,
    type: row.type,
    title: row.title,
    date: row.date,
    description: row.description,
    location: row.location,
    minutesBefore: row.minutes_before,
    durationMinutes: row.duration_minutes,
  });
}

// Object → values for INSERT/UPDATE. Columns that do not apply stay NULL.
export function itemToRow(item) {
  const row = {
    type: item.type,
    title: item.title,
    date: item.date,
    description: item.description,
    location: null,
    minutes_before: null,
    duration_minutes: null,
  };
  if (item.type === ITEM_TYPES.MEETING) {
    row.location = item.location;
    row.duration_minutes = item.durationMinutes;
  } else {
    row.minutes_before = item.minutesBefore;
  }
  return row;
}
