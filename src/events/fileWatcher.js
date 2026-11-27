// src/events/fileWatcher.js
// ------------------------------------------------------------
// [EVENT 07] File Watcher: watches database/schema.sql with fs.watch
// and emits FILE_CHANGED when the file is saved.
// It watches ONLY the schema file, never logs/audit.log, so the
// audit listener writing the event cannot trigger the watcher again.
// Rubric: POE (event catalog 07), fs.watch.
// ------------------------------------------------------------

import { watch } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { appEvents } from './AppEventEmitter.js';
import { EVENTS } from '../config/constants.js';

// Path built from THIS file's location, so it works from any folder.
const SCHEMA_FILE = fileURLToPath(new URL('../../database/schema.sql', import.meta.url));

let watcher = null;
// Editors often save a file twice in a row; ignore repeats within 500 ms.
let lastEventAt = 0;

export function startFileWatcher() {
  if (watcher !== null) {
    return;
  }
  try {
    watcher = watch(SCHEMA_FILE, (eventType) => {
      const now = Date.now();
      if (now - lastEventAt < 500) {
        return;
      }
      lastEventAt = now;
      console.log(`[file watcher] database/schema.sql changed (${eventType}).`);
      appEvents.emit(EVENTS.FILE_CHANGED, { file: 'database/schema.sql', eventType });
    });
    watcher.on('error', (error) => {
      console.error(`[file watcher] ${error.message}`);
    });
  } catch (error) {
    // A missing schema file must not stop the server from starting.
    console.error(`[file watcher] Could not watch database/schema.sql: ${error.message}`);
    watcher = null;
  }
}

export function stopFileWatcher() {
  if (watcher !== null) {
    watcher.close();
    watcher = null;
  }
}
