// public/js/app.js
// ------------------------------------------------------------
// Browser side of the dashboard: DOM events, fetch calls to the
// REST API and the SSE connection that keeps everything live.
// Rubric: GUI + Events 02, 03, 04, 05 and 11.
// ------------------------------------------------------------

import { drawChart, enableChartTooltip } from './chart.js';

// Copy of the server event names (src/config/constants.js).
// The browser cannot import files from the src/ folder.
const SERVER_EVENTS = Object.freeze({
  ITEM_CREATED: 'item:created',
  ITEM_UPDATED: 'item:updated',
  ITEM_DELETED: 'item:deleted',
  TIMER_TICK: 'timer:tick',
  REMINDER_DUE: 'reminder:due',
  STATS_READY: 'stats:ready',
});
const ITEM_TYPES = Object.freeze({ MEETING: 'meeting', REMINDER: 'reminder' });
const MAX_READINGS = 10;
const TOAST_DURATION_MS = 6000;
const DETAILS_HINT = 'Hover a row to see its details.'; // same text as index.html

const form = document.querySelector('#item-form');
const fields = {
  type: document.querySelector('#type'),
  title: document.querySelector('#title'),
  date: document.querySelector('#date'),
  location: document.querySelector('#location'),
  minutesBefore: document.querySelector('#minutesBefore'),
  description: document.querySelector('#description'),
};
const tableBody = document.querySelector('#items-body');
const detailsBar = document.querySelector('#details-bar');
const canvas = document.querySelector('#stats-chart');

let items = []; // last list received from the server
let editingId = null; // null = creating a new item, a number = editing that id
let detailsId = null; // id of the item shown in the details bar (null = none)
const readings = []; // newest first, max 10

// ---------- Small helpers ----------
async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  if (response.status === 204) {
    return null; // "No Content" (after a delete)
  }
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

function formatDate(text) {
  const options = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(text).toLocaleString('en-US', options);
}

function formatTime(isoText) {
  return new Date(isoText).toLocaleTimeString('en-US');
}

function getExtra(item) {
  if (item.type === ITEM_TYPES.MEETING) {
    return `Location: ${item.location}`;
  }
  return `Alert ${item.minutesBefore} min before`;
}

function setText(selector, value) {
  document.querySelector(selector).textContent = value;
}

// ---------- Table ----------
async function loadItems() {
  try {
    items = await requestJson('/api/items');
    renderTable();
  } catch (error) {
    showToast(`Could not load items: ${error.message}`, 'error');
  }
}

function addCell(row, text) {
  const cell = document.createElement('td');
  cell.textContent = text; // textContent (not innerHTML) so user text is never run as HTML
  row.appendChild(cell);
  return cell;
}

function createRow(item) {
  const row = document.createElement('tr');
  row.dataset.id = item.id;
  const typeCell = addCell(row, '');
  typeCell.innerHTML = `<span class="badge ${item.type}">${item.type}</span>`;
  addCell(row, item.title);
  addCell(row, formatDate(item.date));
  addCell(row, getExtra(item));
  const actions = addCell(row, '');
  // data-action + data-id: ONE listener on the table handles every button.
  actions.innerHTML = `<button data-action="edit" data-id="${item.id}">Edit</button>
    <button data-action="delete" data-id="${item.id}" class="danger">Delete</button>`;
  return row;
}

function renderTable() {
  showDetails(detailsId); // after a CRUD change: refresh the details bar, or clear it if the item is gone
  tableBody.innerHTML = '';
  if (items.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5">No items yet. Create one with the form.</td></tr>';
    return;
  }
  for (const item of items) {
    tableBody.appendChild(createRow(item));
  }
}

function showDetails(id) {
  const item = items.find((element) => element.id === id);
  if (item === undefined) {
    // The item no longer exists (deleted here or in another tab): show the hint again.
    detailsId = null;
    detailsBar.textContent = DETAILS_HINT;
    return;
  }
  detailsId = id;
  const description = item.description || 'No description';
  detailsBar.textContent = `${item.type.toUpperCase()} · ${item.title} · ${formatDate(item.date)} · ${getExtra(item)} · ${description}`;
}

// ---------- Stats, activity and readings ----------
function renderStats(stats) {
  setText('#meeting-count', stats.meetings);
  setText('#reminder-count', stats.reminders);
  drawChart(canvas, stats.nextDays);
}

async function loadStats() {
  try {
    renderStats(await requestJson('/api/stats'));
  } catch (error) {
    showToast(`Could not load stats: ${error.message}`, 'error');
  }
}

function fillList(selector, lines) {
  const list = document.querySelector(selector);
  list.innerHTML = '';
  for (const line of lines) {
    const entry = document.createElement('li');
    entry.innerHTML = `<time>${formatTime(line.time)}</time>`;
    entry.append(line.text);
    list.appendChild(entry);
  }
}

async function loadActivity() {
  try {
    const activity = await requestJson('/api/activity');
    fillList('#activity-list', activity.map((entry) => ({ time: entry.time, text: entry.message })));
  } catch (error) {
    showToast(`Could not load activity: ${error.message}`, 'error');
  }
}

// [EVENT 01] Each reading generated by the server timer arrives here.
function renderReading(reading) {
  readings.unshift(reading); // newest first
  if (readings.length > MAX_READINGS) {
    readings.pop();
  }
  setText('#reading-time', formatTime(reading.time));
  setText('#reading-total', reading.totalItems);
  setText('#reading-today', reading.itemsToday);
  setText('#reading-due', reading.remindersDue);
  setText('#reading-next', reading.nextItemTitle);
  setText('#reading-minutes', reading.minutesToNextItem === null ? '-' : `${reading.minutesToNextItem} min`);
  const lines = readings.map((r) => ({ time: r.time, text: `${r.totalItems} items · ${r.itemsToday} today · ${r.remindersDue} due` }));
  fillList('#readings-list', lines);
}

function refreshAll() {
  loadItems();
  loadStats();
  loadActivity();
}

// ---------- Form ----------
function toggleTypeFields() {
  const isMeeting = fields.type.value === ITEM_TYPES.MEETING;
  document.querySelector('#location-field').hidden = !isMeeting;
  document.querySelector('#minutes-field').hidden = isMeeting;
}

function clearForm() {
  form.reset();
  editingId = null;
  setText('#form-title', 'New item');
  toggleTypeFields();
}

function readForm() {
  return {
    type: fields.type.value,
    title: fields.title.value,
    date: fields.date.value,
    location: fields.location.value,
    minutesBefore: Number(fields.minutesBefore.value),
    description: fields.description.value,
  };
}

// The server validates (models + setters); here we only show its message.
async function saveItem() {
  const isNew = editingId === null;
  const url = isNew ? '/api/items' : `/api/items/${editingId}`;
  const options = {
    method: isNew ? 'POST' : 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(readForm()),
  };
  try {
    await requestJson(url, options);
    showToast(isNew ? 'Item created.' : 'Item updated.', 'success');
    clearForm(); // the table refreshes by itself when the SSE event arrives
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function editItem(id) {
  const item = items.find((element) => element.id === id);
  if (item === undefined) {
    return;
  }
  editingId = id;
  fields.type.value = item.type;
  fields.title.value = item.title;
  fields.date.value = item.date; // already 'YYYY-MM-DDTHH:mm'
  fields.description.value = item.description;
  fields.location.value = item.type === ITEM_TYPES.MEETING ? item.location : '';
  fields.minutesBefore.value = item.type === ITEM_TYPES.REMINDER ? item.minutesBefore : 10;
  toggleTypeFields();
  setText('#form-title', `Editing: ${item.title}`);
  fields.title.focus();
}

async function deleteItem(id) {
  const item = items.find((element) => element.id === id);
  if (item === undefined || !confirm(`Delete "${item.title}"?`)) {
    return;
  }
  try {
    await requestJson(`/api/items/${id}`, { method: 'DELETE' });
    showToast('Item deleted.', 'success');
    if (editingId === id) {
      clearForm();
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function showToast(message, kind = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${kind}`;
  toast.textContent = message;
  toast.addEventListener('click', () => toast.remove());
  document.querySelector('#toast-container').appendChild(toast);
  setTimeout(() => toast.remove(), TOAST_DURATION_MS);
}

// ---------- Server-Sent Events ----------
function setStatus(text, isLive) {
  const badge = document.querySelector('#connection-status');
  badge.textContent = text;
  badge.classList.toggle('live', isLive);
}

function handleReminderDue(event) {
  const reminder = JSON.parse(event.data);
  showToast(`Reminder: "${reminder.title}" at ${formatDate(reminder.date)}`, 'alert');
  loadActivity();
}

// [EVENT 11] The server pushes events; each one re-renders what changed.
function connectToServerEvents() {
  const source = new EventSource('/api/events');
  source.addEventListener('open', () => setStatus('Live', true));
  // EventSource reconnects by itself (e.g. after a server restart).
  source.addEventListener('error', () => setStatus('Reconnecting…', false));
  source.addEventListener(SERVER_EVENTS.ITEM_CREATED, refreshAll);
  source.addEventListener(SERVER_EVENTS.ITEM_UPDATED, refreshAll);
  source.addEventListener(SERVER_EVENTS.ITEM_DELETED, refreshAll);
  source.addEventListener(SERVER_EVENTS.TIMER_TICK, (event) => renderReading(JSON.parse(event.data)));
  source.addEventListener(SERVER_EVENTS.STATS_READY, (event) => renderStats(JSON.parse(event.data)));
  source.addEventListener(SERVER_EVENTS.REMINDER_DUE, handleReminderDue);
}

// ---------- DOM event listeners ----------
function registerDomEvents() {
  form.addEventListener('submit', (event) => {
    event.preventDefault(); // no page reload
    saveItem();
  });
  document.querySelector('#cancel-button').addEventListener('click', clearForm);
  fields.type.addEventListener('change', toggleTypeFields);

  // Event delegation: one click listener for every Edit/Delete button.
  tableBody.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (button === null) {
      return;
    }
    const id = Number(button.dataset.id);
    if (button.dataset.action === 'edit') {
      editItem(id);
    } else if (button.dataset.action === 'delete') {
      deleteItem(id);
    }
  });

  // [EVENT 04] Mouse tracking on table rows → details bar.
  tableBody.addEventListener('mouseover', (event) => {
    const row = event.target.closest('tr');
    if (row !== null && row.dataset.id !== undefined) {
      showDetails(Number(row.dataset.id));
    }
  });

  // [EVENT 03] Keyboard hotkeys: Ctrl/Cmd + S saves, Escape clears.
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault(); // stop the browser "Save page" dialog
      saveItem();
    } else if (event.key === 'Escape') {
      clearForm();
    }
  });

  // [EVENT 05] Focus / Blur: highlight the form while the user types in it.
  form.addEventListener('focusin', () => form.classList.add('focused'));
  form.addEventListener('focusout', (event) => {
    if (!form.contains(event.relatedTarget)) {
      form.classList.remove('focused');
    }
  });

  // [EVENT 05] Coming back to the tab → reload the data.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      refreshAll();
    }
  });

  enableChartTooltip(canvas, document.querySelector('#chart-tooltip'));
}

// [EVENT 02] System load (browser side): the page is ready → start everything.
document.addEventListener('DOMContentLoaded', () => {
  registerDomEvents();
  toggleTypeFields();
  refreshAll();
  connectToServerEvents();
});
