// src/collections/DataStructures.js
// ------------------------------------------------------------
// Two small data structures built on top of a private array.
// Rubric: data structures (Queue = FIFO, Stack = LIFO).
// ------------------------------------------------------------

// [DATA STRUCTURE] Queue: First In, First Out (like a line at the bank).
// Used by auditListener so log lines are written one by one, in order.
export class Queue {
  #elements = [];

  enqueue(element) {
    this.#elements.push(element); // add at the end
  }

  dequeue() {
    return this.#elements.shift(); // take from the front
  }

  isEmpty() {
    return this.#elements.length === 0;
  }

  get size() {
    return this.#elements.length;
  }
}

// [DATA STRUCTURE] Stack: Last In, First Out (like a pile of plates).
// Used by auditListener for "recent activity": newest action first.
export class Stack {
  #elements = [];
  #maxSize;

  constructor(maxSize = 10) {
    this.#maxSize = maxSize;
  }

  push(element) {
    this.#elements.push(element);
    // When full, drop the OLDEST element (the one at the bottom).
    if (this.#elements.length > this.#maxSize) {
      this.#elements.shift();
    }
  }

  // Returns a copy, newest first, so nobody can modify the inner array.
  toArray() {
    return this.#elements.slice().reverse();
  }

  get size() {
    return this.#elements.length;
  }
}
