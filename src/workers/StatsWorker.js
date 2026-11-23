// src/workers/StatsWorker.js
// ------------------------------------------------------------
// Runs in a SEPARATE thread (worker_threads). Receives the items as
// plain JSON and sends back the statistics for the chart and counters.
// Rubric: Event 12 (worker message).
// ------------------------------------------------------------

import { parentPort, workerData } from 'node:worker_threads';
import { ITEM_TYPES } from '../config/constants.js';

const DAYS_TO_SHOW = 7;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function countByType(items, type) {
  let count = 0;
  for (const item of items) {
    if (item.type === type) {
      count++;
    }
  }
  return count;
}

function countOnDay(items, day) {
  let count = 0;
  for (const item of items) {
    if (new Date(item.date).toDateString() === day.toDateString()) {
      count++;
    }
  }
  return count;
}

// Today + the next 6 days, e.g. [{ label: 'Mon 24', count: 2 }, ...].
function buildNextDays(items) {
  const today = new Date();
  const nextDays = [];
  for (let i = 0; i < DAYS_TO_SHOW; i++) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const label = `${DAY_NAMES[day.getDay()]} ${day.getDate()}`;
    nextDays.push({ label, count: countOnDay(items, day) });
  }
  return nextDays;
}

// [EVENT 12] postMessage sends the result back to the main thread.
parentPort.postMessage({
  activities: countByType(workerData, ITEM_TYPES.ACTIVITY),
  reminders: countByType(workerData, ITEM_TYPES.REMINDER),
  nextDays: buildNextDays(workerData),
});
