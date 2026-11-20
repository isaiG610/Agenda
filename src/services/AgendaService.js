// src/services/AgendaService.js
// ------------------------------------------------------------
// [EVENT 10] CRUD Data Change  (individual defense: Isai)
// All CRUD operations: MySQL first, then the Map cache, then an event.
// The service does NOT know that the log or the browser exist:
// it only emits. Rubric: persistence, POE (publisher), Map, worker.
// ------------------------------------------------------------

import { Worker } from 'node:worker_threads';
import { pool } from '../config/database.js';
import { appEvents } from '../events/AppEventEmitter.js';
import { EVENTS } from '../config/constants.js';
import { createItem, rowToItem, itemToRow } from '../utils/Serializer.js';

const INSERT_SQL = 'INSERT INTO agenda_items (type, title, date, description, location, minutes_before) VALUES (?, ?, ?, ?, ?, ?)';
const UPDATE_SQL = 'UPDATE agenda_items SET type = ?, title = ?, date = ?, description = ?, location = ?, minutes_before = ? WHERE id = ?';

function rowValues(row) {
  return [row.type, row.title, row.date, row.description, row.location, row.minutes_before];
}

class AgendaService {
  // [DATA STRUCTURE] Map id → item: O(1) lookup, and the timer reads memory, not MySQL.
  #items = new Map();

  // Every query goes through here. "?" placeholders prevent SQL injection.
  async #runQuery(sql, params = []) {
    try {
      const [result] = await pool.execute(sql, params);
      return result;
    } catch (error) {
      // When MySQL is down, mysql2 sends an empty message but a code (ECONNREFUSED).
      const reason = error.message || error.code;
      const dbError = new Error(`Database error: ${reason}. Is MySQL running?`);
      dbError.status = 500;
      throw dbError;
    }
  }

  // Model validation errors become "400 Bad Request".
  #buildItem(data) {
    try {
      return createItem(data);
    } catch (error) {
      error.status = 400;
      throw error;
    }
  }

  async loadAll() {
    const rows = await this.#runQuery('SELECT * FROM agenda_items');
    this.#items.clear();
    for (const row of rows) {
      const item = rowToItem(row);
      this.#items.set(item.id, item);
    }
    return this.#items.size;
  }

  getAll() {
    return Array.from(this.#items.values()).sort((a, b) => a.date - b.date);
  }

  getById(id) {
    const item = this.#items.get(Number(id));
    if (item === undefined) {
      const error = new Error(`Item ${id} not found.`);
      error.status = 404;
      throw error;
    }
    return item;
  }

  async create(data) {
    const item = this.#buildItem(data); // validate BEFORE touching the DB
    const result = await this.#runQuery(INSERT_SQL, rowValues(itemToRow(item)));
    const rows = await this.#runQuery('SELECT * FROM agenda_items WHERE id = ?', [result.insertId]);
    const saved = rowToItem(rows[0]);
    this.#items.set(saved.id, saved);
    // [EVENT 10] Emit ONLY after MySQL succeeded. Subscribers: audit + ui.
    appEvents.emit(EVENTS.ITEM_CREATED, saved.toJSON());
    return saved;
  }

  async update(id, data) {
    const itemId = this.getById(id).id; // 404 if it does not exist
    const item = this.#buildItem({ ...data, id: itemId });
    await this.#runQuery(UPDATE_SQL, [...rowValues(itemToRow(item)), itemId]);
    this.#items.set(itemId, item);
    // [EVENT 10] Emit ONLY after MySQL succeeded. Subscribers: audit + ui + timer.
    appEvents.emit(EVENTS.ITEM_UPDATED, item.toJSON());
    return item;
  }

  async remove(id) {
    const item = this.getById(id);
    await this.#runQuery('DELETE FROM agenda_items WHERE id = ?', [item.id]);
    this.#items.delete(item.id);
    // [EVENT 10] Emit ONLY after MySQL succeeded. Subscribers: audit + ui + timer.
    appEvents.emit(EVENTS.ITEM_DELETED, item.toJSON());
  }

  // [EVENT 12] Statistics are computed in a worker thread, so the main
  // event loop stays free. The worker answers with postMessage.
  getStats() {
    const workerData = this.getAll().map((item) => item.toJSON());
    return new Promise((resolve, reject) => {
      const workerUrl = new URL('../workers/StatsWorker.js', import.meta.url);
      const worker = new Worker(workerUrl, { workerData });
      worker.on('message', (stats) => {
        // "node --watch" sends its own internal messages through workers
        // (e.g. { 'watch:import': [...] }). They are not our stats: ignore them.
        if (stats.nextDays === undefined) {
          return;
        }
        appEvents.emit(EVENTS.STATS_READY, stats);
        resolve(stats);
      });
      worker.on('error', reject);
    });
  }
}

// Only one service for the whole app (same idea as the event emitter).
export const agendaService = new AgendaService();
