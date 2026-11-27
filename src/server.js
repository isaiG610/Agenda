// src/server.js
// ------------------------------------------------------------
// Entry point: Express REST API, SSE endpoint, startup, shutdown
// and global error handling.
// Rubric: API + persistence, Event 02 (system load), Event 06
// (cleanup), Event 09 (unhandled exceptions), error handling.
// ------------------------------------------------------------

import express from 'express';
import { fileURLToPath } from 'node:url';
import { testConnection, closePool } from './config/database.js';
import { EVENTS } from './config/constants.js';
import { appEvents } from './events/AppEventEmitter.js';
import { agendaService } from './services/AgendaService.js';
import { startReminderTimer, stopReminderTimer } from './events/reminderTimer.js';
import { startFileWatcher, stopFileWatcher } from './events/fileWatcher.js';
import { registerAuditListener, getRecentActivity, flushAuditLog } from './events/listeners/auditListener.js';
import { registerAlertListener } from './events/listeners/alertListener.js';
import { registerUiListener, addClient, removeClient, closeAllClients } from './events/listeners/uiListener.js';

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_FOLDER = fileURLToPath(new URL('../public', import.meta.url));

const app = express();
let server = null;

app.use(express.json());
app.use(express.static(PUBLIC_FOLDER));

// ---------- REST API ----------
// Every route: try { ... } catch (error) { next(error); } → error middleware.

app.get('/api/items', (req, res, next) => {
  try {
    res.json(agendaService.getAll()); // res.json calls toJSON() on each item
  } catch (error) {
    next(error);
  }
});

app.get('/api/items/:id', (req, res, next) => {
  try {
    res.json(agendaService.getById(req.params.id));
  } catch (error) {
    next(error);
  }
});

app.post('/api/items', async (req, res, next) => {
  try {
    const item = await agendaService.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

app.put('/api/items/:id', async (req, res, next) => {
  try {
    const item = await agendaService.update(req.params.id, req.body);
    res.json(item);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/items/:id', async (req, res, next) => {
  try {
    await agendaService.remove(req.params.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get('/api/stats', async (req, res, next) => {
  try {
    res.json(await agendaService.getStats());
  } catch (error) {
    next(error);
  }
});

app.get('/api/activity', (req, res, next) => {
  try {
    res.json(getRecentActivity());
  } catch (error) {
    next(error);
  }
});

// [EVENT 11] SSE: the connection stays open and uiListener writes events into it.
app.get('/api/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders();
  res.write(': connected\n\n'); // an SSE comment, ignored by the browser
  addClient(res);
  req.on('close', () => removeClient(res)); // the tab was closed
});

// ---------- Global error middleware (4 parameters = error handler) ----------
app.use((error, req, res, next) => {
  const status = error.status || 500;
  appEvents.emit(EVENTS.APP_ERROR, { message: error.message, status, route: req.originalUrl });
  res.status(status).json({ error: error.message });
});

// [EVENT 09] Last safety net: log the error and keep the server running.
process.on('uncaughtException', (error) => {
  console.error(`[uncaughtException] ${error.message}`);
  appEvents.emit(EVENTS.APP_ERROR, { message: error.message, source: 'uncaughtException' });
});

process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  console.error(`[unhandledRejection] ${message}`);
  appEvents.emit(EVENTS.APP_ERROR, { message, source: 'unhandledRejection' });
});

// [EVENT 02] System load: everything starts in order.
async function startServer() {
  try {
    const connected = await testConnection();
    if (!connected) {
      console.error('Cannot connect to MySQL. Check your .env file.');
      process.exit(1);
    }
    const total = await agendaService.loadAll();
    console.log(`Loaded ${total} items from MySQL.`);
    // The audit listener goes first so recent activity is ready before the browser asks for it.
    registerAuditListener();
    registerAlertListener();
    registerUiListener();
    startReminderTimer();
    startFileWatcher();
    server = app.listen(PORT, () => {
      console.log(`Server ready at http://localhost:${PORT}`);
      appEvents.emit(EVENTS.SERVER_READY, { port: PORT, items: total });
    });
    server.on('error', (error) => {
      console.error(`Cannot start the server: ${error.message}`);
      process.exit(1);
    });
  } catch (error) {
    console.error(`Startup failed: ${error.message}`);
    process.exit(1);
  }
}

// [EVENT 06] Destroy / Cleanup when the user presses Ctrl+C.
async function shutdown() {
  console.log('\nShutting down...');
  appEvents.emit(EVENTS.APP_SHUTDOWN, { reason: 'SIGINT' });
  stopFileWatcher(); // stop watching first, so no new event arrives after the flush
  await flushAuditLog(); // the shutdown line must reach audit.log before exit
  stopReminderTimer();
  closeAllClients();
  console.log('SSE clients closed.');
  await closePool();
  if (server !== null) {
    server.close();
  }
  console.log('Bye!');
  process.exit(0);
}

process.on('SIGINT', shutdown);

startServer();
