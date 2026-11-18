// src/utils/dateUtils.js
// ------------------------------------------------------------
// Date helper shared by the models and the Serializer.
// Rubric: serialization. It lives in its own file (not in Serializer.js)
// because Serializer imports the models; if the models imported
// Serializer too, the two files would depend on each other (a cycle).
// ------------------------------------------------------------

// Adds a leading zero: 5 → '05'.
function pad(number) {
  return String(number).padStart(2, '0');
}

// Date → local 'YYYY-MM-DDTHH:mm' (the format of <input type="datetime-local">).
// We do NOT use toISOString() because it converts to UTC and the hour would shift.
export function toLocalDateString(date) {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1); // months start at 0
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
