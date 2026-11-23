// public/js/timeline.js
// ------------------------------------------------------------
// "Today" timeline drawn by hand on a <canvas> (Gantt style):
// one row per item of today, hours on the horizontal axis,
// a bar for each meeting, a diamond for each reminder and a
// vertical "Now" line. Plus our own tooltip that follows the mouse.
// Rubric: charts rendering, Event 01 (redrawn on every timer tick)
// and Event 04 (mouse tracking).
// ------------------------------------------------------------

const LABEL_WIDTH = 190; // space for the titles on the left
const AXIS_HEIGHT = 30; // space for the hour labels on top
const ROW_HEIGHT = 36;
const BOTTOM_SPACE = 26; // space for the "Now" label
const RIGHT_SPACE = 20;
const DIAMOND_SIZE = 9;
const MS_PER_HOUR = 3600000;
const MEETING_TYPE = 'meeting'; // same value as ITEM_TYPES.MEETING in app.js

// Same colors as styles.css
const MEETING_COLOR = '#2448c4';
const REMINDER_COLOR = '#94500a';
const NOW_COLOR = '#b42318';
const TEXT_COLOR = '#1b2230';
const MUTED_COLOR = '#5d6573';
const GRID_COLOR = '#d6dae1';
const STRIPE_COLOR = '#f5f6f8';

// Remembers where each bar/diamond was drawn, so mousemove can find it.
let shapes = [];

// Items whose start date is today, sorted by start time.
function getTodayItems(items, now) {
  const today = items.filter((item) => new Date(item.date).toDateString() === now.toDateString());
  return today.sort((a, b) => new Date(a.date) - new Date(b.date));
}

// A date → hours since midnight of "now" (e.g. 15:30 → 15.5).
function toHours(date, now) {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return (date - midnight) / MS_PER_HOUR;
}

// Default range 6:00–24:00, wider if something starts earlier or ends later.
function findHourRange(todayItems, now) {
  let firstHour = 6;
  let lastHour = 24;
  for (const item of todayItems) {
    firstHour = Math.min(firstHour, Math.floor(toHours(new Date(item.date), now)));
    lastHour = Math.max(lastHour, Math.ceil(toHours(new Date(item.endDate), now)));
  }
  return { firstHour, lastHour };
}

// 15 → '3 PM', 0 or 24 → '12 AM'
function hourLabel(hour) {
  const hourOfDay = hour % 24;
  const suffix = hourOfDay < 12 ? 'AM' : 'PM';
  const twelveHour = hourOfDay % 12 === 0 ? 12 : hourOfDay % 12;
  return `${twelveHour} ${suffix}`;
}

function drawEmpty(canvas, context) {
  canvas.height = 90;
  context.font = '16px system-ui, sans-serif';
  context.fillStyle = MUTED_COLOR;
  context.textAlign = 'center';
  context.fillText('Nothing scheduled for today', canvas.width / 2, 50);
}

function drawHourGrid(context, canvas, range, hourToX) {
  context.font = '13px system-ui, sans-serif';
  context.textAlign = 'center';
  context.strokeStyle = GRID_COLOR;
  context.lineWidth = 1;
  for (let hour = range.firstHour; hour <= range.lastHour; hour++) {
    const x = hourToX(hour);
    context.beginPath();
    context.moveTo(x, AXIS_HEIGHT - 6);
    context.lineTo(x, canvas.height - BOTTOM_SPACE);
    context.stroke();
    if (hour % 2 === 0) {
      context.fillStyle = MUTED_COLOR;
      context.fillText(hourLabel(hour), x, AXIS_HEIGHT - 12);
    }
  }
}

function drawDiamond(context, x, centerY) {
  context.beginPath();
  context.moveTo(x, centerY - DIAMOND_SIZE);
  context.lineTo(x + DIAMOND_SIZE, centerY);
  context.lineTo(x, centerY + DIAMOND_SIZE);
  context.lineTo(x - DIAMOND_SIZE, centerY);
  context.closePath();
  context.fill();
}

// Light gray background on every other row, so each row is easy to follow.
function drawStripes(context, canvas, rowCount) {
  context.fillStyle = STRIPE_COLOR;
  for (let i = 0; i < rowCount; i += 2) {
    context.fillRect(0, AXIS_HEIGHT + i * ROW_HEIGHT, canvas.width, ROW_HEIGHT);
  }
}

// One row: title on the left, then a bar (meeting) or a diamond (reminder).
function drawRow(context, item, index, hourToX, now) {
  const top = AXIS_HEIGHT + index * ROW_HEIGHT;
  const centerY = top + ROW_HEIGHT / 2;
  const isPast = new Date(item.endDate) < now;
  context.font = '15px system-ui, sans-serif';
  context.textAlign = 'left';
  context.fillStyle = isPast ? MUTED_COLOR : TEXT_COLOR;
  context.fillText(item.title, 10, centerY + 5, LABEL_WIDTH - 20); // last value = max width
  // Items that already ended are drawn lighter.
  context.globalAlpha = isPast ? 0.45 : 1;
  const startX = hourToX(toHours(new Date(item.date), now));
  if (item.type === MEETING_TYPE) {
    const endX = hourToX(toHours(new Date(item.endDate), now));
    context.fillStyle = MEETING_COLOR;
    context.fillRect(startX, top + 8, Math.max(endX - startX, 4), ROW_HEIGHT - 16);
    shapes.push({ left: startX, right: endX, top, bottom: top + ROW_HEIGHT, item });
  } else {
    context.fillStyle = REMINDER_COLOR;
    drawDiamond(context, startX, centerY);
    shapes.push({ left: startX - DIAMOND_SIZE, right: startX + DIAMOND_SIZE, top, bottom: top + ROW_HEIGHT, item });
  }
  context.globalAlpha = 1;
}

function drawNowLine(context, canvas, nowX) {
  context.strokeStyle = NOW_COLOR;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(nowX, AXIS_HEIGHT - 6);
  context.lineTo(nowX, canvas.height - BOTTOM_SPACE + 4);
  context.stroke();
  context.font = 'bold 13px system-ui, sans-serif';
  context.textAlign = 'center';
  context.fillStyle = NOW_COLOR;
  context.fillText('Now', nowX, canvas.height - 6);
}

// Draws today's items. "now" moves the red line (it comes from the server timer).
export function drawTimeline(canvas, items, now) {
  const context = canvas.getContext('2d');
  const todayItems = getTodayItems(items, now);
  shapes = [];
  if (todayItems.length === 0) {
    drawEmpty(canvas, context);
    return;
  }
  // The height depends on how many rows there are (changing it also clears the canvas).
  canvas.height = AXIS_HEIGHT + todayItems.length * ROW_HEIGHT + BOTTOM_SPACE;
  const range = findHourRange(todayItems, now);
  const pixelsPerHour = (canvas.width - LABEL_WIDTH - RIGHT_SPACE) / (range.lastHour - range.firstHour);
  const hourToX = (hour) => LABEL_WIDTH + (hour - range.firstHour) * pixelsPerHour;

  drawStripes(context, canvas, todayItems.length);
  drawHourGrid(context, canvas, range, hourToX);
  for (let i = 0; i < todayItems.length; i++) {
    drawRow(context, todayItems[i], i, hourToX, now);
  }
  const nowHours = toHours(now, now);
  if (nowHours >= range.firstHour && nowHours <= range.lastHour) {
    drawNowLine(context, canvas, hourToX(nowHours));
  }
}

function formatTime(dateText) {
  return new Date(dateText).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// Meeting: "Title · 3:00 PM – 5:00 PM · Room". Reminder: "Title · 9:30 PM · Reminder".
function tooltipText(item) {
  if (item.type === MEETING_TYPE) {
    return `${item.title} · ${formatTime(item.date)} – ${formatTime(item.endDate)} · ${item.location}`;
  }
  return `${item.title} · ${formatTime(item.date)} · Reminder`;
}

function findShape(mouseX, mouseY) {
  for (const shape of shapes) {
    const insideX = mouseX >= shape.left && mouseX <= shape.right;
    const insideY = mouseY >= shape.top && mouseY <= shape.bottom;
    if (insideX && insideY) {
      return shape;
    }
  }
  return null;
}

// [EVENT 04] Mouse tracking: mousemove shows the tooltip, mouseleave hides it.
export function enableTimelineTooltip(canvas, tooltip) {
  canvas.addEventListener('mousemove', (event) => {
    // The canvas is scaled by CSS, so we convert screen pixels to canvas pixels.
    const rect = canvas.getBoundingClientRect();
    const mouseX = (event.clientX - rect.left) * (canvas.width / rect.width);
    const mouseY = (event.clientY - rect.top) * (canvas.height / rect.height);
    const shape = findShape(mouseX, mouseY);
    if (shape === null) {
      tooltip.hidden = true;
      return;
    }
    tooltip.textContent = tooltipText(shape.item);
    tooltip.style.left = `${event.clientX + 14}px`;
    tooltip.style.top = `${event.clientY + 14}px`;
    tooltip.hidden = false;
  });

  canvas.addEventListener('mouseleave', () => {
    tooltip.hidden = true;
  });
}
