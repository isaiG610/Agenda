// src/events/listeners/auditListener.js
// ------------------------------------------------------------
// Subscriber: writes important events to logs/audit.log (one JSON
// line each) and keeps the "recent activity" list for the dashboard.
// Rubric: POE (subscribers), Queue and Stack, file persistence.
// ------------------------------------------------------------

import { fileURLToPath } from 'node:url';
import { appEvents } from '../AppEventEmitter.js';
import { EVENTS, RECENT_ACTIVITY_LIMIT } from '../../config/constants.js';
import { Queue, Stack } from '../../collections/DataStructures.js';
import { appendLine } from '../../utils/FileManager.js';

// Path built from THIS file's location, so it works from any folder.
const LOG_FILE = fileURLToPath(new URL('../../../logs/audit.log', import.meta.url));

// [DATA STRUCTURE] Queue: lines waiting to be written, in arrival order.
const pendingLines = new Queue();
// [DATA STRUCTURE] Stack: last 10 actions, the newest one on top.
const recentActivity = new Stack(RECENT_ACTIVITY_LIMIT);
let isWriting = false;

// Writes the queued lines ONE BY ONE, so two events never mix in the file.
async function processQueue() {
  if (isWriting) {
    return; // the loop that is already running will take the new lines
  }
  isWriting = true;
  try {
    while (!pendingLines.isEmpty()) {
      await appendLine(LOG_FILE, pendingLines.dequeue());
    }
  } catch (error) {
    console.error(`Audit log error: ${error.message}`);
  } finally {
    isWriting = false;
  }
}

function recordEvent(eventName, message, data) {
  const time = new Date().toISOString();
  pendingLines.enqueue(JSON.stringify({ time, event: eventName, message, data }));
  recentActivity.push({ time, event: eventName, message });
  processQueue();
}

// [POE] Named handler functions (style 1).
function handleItemCreated(item) {
  recordEvent(EVENTS.ITEM_CREATED, `Created ${item.type} "${item.title}"`, item);
}

function handleItemUpdated(item) {
  recordEvent(EVENTS.ITEM_UPDATED, `Updated ${item.type} "${item.title}"`, item);
}

function handleItemDeleted(item) {
  recordEvent(EVENTS.ITEM_DELETED, `Deleted ${item.type} "${item.title}"`, item);
}

// Used by GET /api/activity.
export function getRecentActivity() {
  return recentActivity.toArray();
}

export function registerAuditListener() {
  appEvents.on(EVENTS.ITEM_CREATED, handleItemCreated);
  appEvents.on(EVENTS.ITEM_UPDATED, handleItemUpdated);
  appEvents.on(EVENTS.ITEM_DELETED, handleItemDeleted);

  // [POE] Anonymous arrow handlers (style 2).
  appEvents.on(EVENTS.SERVER_READY, (info) => {
    recordEvent(EVENTS.SERVER_READY, `Server ready on port ${info.port}`, info);
  });
  appEvents.on(EVENTS.REMINDER_DUE, (reminder) => {
    recordEvent(EVENTS.REMINDER_DUE, `Reminder due: "${reminder.title}"`, reminder);
  });
  appEvents.on(EVENTS.APP_ERROR, (errorInfo) => {
    recordEvent(EVENTS.APP_ERROR, `Error: ${errorInfo.message}`, errorInfo);
  });
  appEvents.on(EVENTS.APP_SHUTDOWN, (info) => {
    recordEvent(EVENTS.APP_SHUTDOWN, 'Server shutting down', info);
  });
  // TIMER_TICK is NOT logged on purpose: one line every 10 s would flood the file.
}
