// public/js/format.js
// ------------------------------------------------------------
// Small helpers so the whole page shows dates, clock times and
// durations in the same way.
// Rubric: GUI (consistent rendering).
// ------------------------------------------------------------

// Adds a leading zero: 5 → '05'.
function pad(number) {
  return String(number).padStart(2, '0');
}

// Minutes → 'HH:MM hrs'. Examples: 120 → '02:00 hrs', 45 → '00:45 hrs', 679 → '11:19 hrs'.
export function formatDuration(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${pad(hours)}:${pad(minutes)} hrs`;
}

// A date (or date text) → clock time without seconds: '10:41 PM'.
export function formatClock(value) {
  return new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// A date (or date text) → 'Mon, Nov 23'.
export function formatDay(value) {
  return new Date(value).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// A date (or date text) → 'Mon, Nov 23 · 3:00 PM' (used in the table).
export function formatDate(value) {
  return `${formatDay(value)} · ${formatClock(value)}`;
}
