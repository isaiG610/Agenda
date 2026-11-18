// src/events/listeners/uiListener.js
// ------------------------------------------------------------
// Subscriber: forwards events to every open browser tab using
// Server-Sent Events (SSE).
// Rubric: Event 11 (GUI render), Set data structure.
// ------------------------------------------------------------

import { appEvents } from '../AppEventEmitter.js';
import { EVENTS } from '../../config/constants.js';

// [DATA STRUCTURE] Set: each connected tab (its response object) is stored
// once, and adding/removing is simple.
const clients = new Set();

export function addClient(response) {
  clients.add(response);
}

export function removeClient(response) {
  clients.delete(response);
}

// [EVENT 06] Cleanup: closes every open SSE connection on shutdown.
export function closeAllClients() {
  for (const client of clients) {
    client.end();
  }
  clients.clear();
}

// SSE text format: "event: <name>\ndata: <json>\n\n".
function broadcast(eventName, data) {
  const message = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    client.write(message);
  }
}

// [EVENT 11] Every event below makes the browser re-render something.
export function registerUiListener() {
  const eventsToForward = [
    EVENTS.ITEM_CREATED,
    EVENTS.ITEM_UPDATED,
    EVENTS.ITEM_DELETED,
    EVENTS.TIMER_TICK,
    EVENTS.REMINDER_DUE,
    EVENTS.STATS_READY,
  ];
  for (const eventName of eventsToForward) {
    appEvents.on(eventName, (data) => broadcast(eventName, data));
  }
}
