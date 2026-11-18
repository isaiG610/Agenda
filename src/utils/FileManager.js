// src/utils/FileManager.js
// ------------------------------------------------------------
// Asynchronous file writing with fs/promises.
// Rubric: persistence to files (logs/audit.log) without blocking
// the event loop.
// ------------------------------------------------------------

import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

// Adds one line at the end of a file. Creates the folder if it does not exist.
// It never throws: a failed log line must not stop the app.
export async function appendLine(filePath, text) {
  try {
    await mkdir(path.dirname(filePath), { recursive: true });
    await appendFile(filePath, `${text}\n`, 'utf8');
  } catch (error) {
    console.error(`Could not write to ${filePath}: ${error.message}`);
  }
}
