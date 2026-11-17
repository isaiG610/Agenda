// src/server.js
// ------------------------------------------------------------
// Entry point. For now it only TESTS the AgendaItem class.
// Later, the Express server will live here.
// ------------------------------------------------------------

// import: brings the class from another file (ES Modules).
// Note: in ES Modules the .js extension is REQUIRED.
import { AgendaItem } from './models/AgendaItem.js';

// 1) Create an object (instance) from the class
const item = new AgendaItem(1, 'Deliver POE project', '2026-12-05T10:00', 'Bring laptop');

// 2) Read data using the getters
console.log('ID:', item.id);
console.log('Title:', item.title);
console.log('Date:', item.date.toLocaleString('en-US'));

// 3) Change a value using the setter
item.title = 'Deliver POE project (final version)';
console.log('New title:', item.title);

// 4) Try to save an invalid value.
// try/catch: "try this; if it fails, catch the error and keep running".
try {
  item.title = '   ';
} catch (error) {
  console.log('Caught error:', error.message);
}

// 5) id has no setter, so JavaScript does NOT allow changing it.
try {
  item.id = 999;
} catch (error) {
  console.log('Caught error:', error.message);
}
console.log('ID is still:', item.id);