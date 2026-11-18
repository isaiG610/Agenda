// src/server.js
// ------------------------------------------------------------
// Entry point. For now it only TESTS the models and data structures.
// Later (phase 5), the Express server will live here.
// ------------------------------------------------------------

import { AgendaItem } from './models/AgendaItem.js';
import { Meeting } from './models/Meeting.js';
import { Reminder } from './models/Reminder.js';
import { Queue, Stack } from './collections/DataStructures.js';

// 1) The abstract class cannot be instantiated.
try {
  new AgendaItem(1, 'Generic item', '2026-12-05T10:00');
} catch (error) {
  console.log('Caught error:', error.message);
}

// 2) Children can. Polymorphism: same method call, different behavior.
const inTwoMinutes = new Date(Date.now() + 2 * 60000);
const items = [
  new Meeting(1, 'Deliver POE project', '2026-12-05T10:00', 'CUT', 'Bring laptop'),
  new Reminder(2, 'Call Isai', inTwoMinutes, 5),
];
for (const item of items) {
  console.log(item.getSummary(), '| due now?', item.isDue(new Date()));
  console.log(JSON.stringify(item));
}

// 3) Setter validation still works.
try {
  items[0].location = '   ';
} catch (error) {
  console.log('Caught error:', error.message);
}

// 4) Queue (FIFO) and Stack (LIFO, max 3).
const queue = new Queue();
queue.enqueue('first');
queue.enqueue('second');
console.log('Queue dequeue:', queue.dequeue(), '| size left:', queue.size);

const stack = new Stack(3);
for (const action of ['a', 'b', 'c', 'd']) {
  stack.push(action);
}
console.log('Stack (newest first):', stack.toArray());
