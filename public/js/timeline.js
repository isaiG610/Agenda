// public/js/timeline.js
// ------------------------------------------------------------
// Week view drawn by hand on a <canvas>: one ROW per day of the
// visible week (Mon to Sun), hours on the horizontal axis.
// Activity = bar from start to end with its title inside.
// Reminder = diamond at its time with its title next to it.
// Today's row is highlighted and has the red "Now" line.
// Plus an HTML tooltip that follows the mouse (it can have several lines).
// Rubric: charts rendering, Event 01 (redrawn on every timer tick)
// and Event 04 (mouse tracking).
// ------------------------------------------------------------

import { formatClock, formatDay, formatDuration } from './format.js';

const LABEL_WIDTH = 96; // space for "Mon 23" on the left
const AXIS_HEIGHT = 34; // space for the hour labels on top
const ROW_HEIGHT = 60;
const BAR_MARGIN = 10; // space above and below each bar inside its row
const RIGHT_SPACE = 32; // room for the last hour label
const DIAMOND_SIZE = 10;
const MIN_LETTERS_INSIDE = 3; // if fewer letters fit inside the bar, the title goes outside
const DAYS_IN_WEEK = 7;
const MS_PER_HOUR = 3600000;
const MIN_HOURS_SHOWN = 6; // so a short week does not show giant bars
const EMPTY_WEEK_RANGE = { firstHour: 8, lastHour: 20 }; // 8 AM to 8 PM
const ACTIVITY_TYPE = 'activity'; // same value as ITEM_TYPES.ACTIVITY in app.js

// Same colors as styles.css (strong enough to read on a projector).
const ACTIVITY_COLOR = '#2448c4';
const REMINDER_COLOR = '#94500a';
const NOW_COLOR = '#b42318';
const TEXT_COLOR = '#1b2230';
const MUTED_COLOR = '#5d6573';
const GRID_COLOR = '#d6dae1';
const TODAY_COLOR = '#e9eefc';

// Remembers where each bar/diamond was drawn, so mousemove can find it.
let shapes = [];

// The 7 days of a week, starting on Monday (each at midnight).
// weekOffset: 0 = this week, -1 = last week, 1 = next week...
export function getWeekDays(now, weekOffset = 0) {
  const daysSinceMonday = (now.getDay() + 6) % 7; // getDay(): Sunday = 0
  const firstDay = now.getDate() - daysSinceMonday + weekOffset * DAYS_IN_WEEK;
  const days = [];
  for (let i = 0; i < DAYS_IN_WEEK; i++) {
    days.push(new Date(now.getFullYear(), now.getMonth(), firstDay + i));
  }
  return days;
}

// Midnight of the same day as "date".
function startOfDay(date) {
  const day = new Date(date);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate());
}

// Hours between midnight of "day" and "date" (e.g. 15:30 → 15.5).
function hoursSince(day, date) {
  return (new Date(date) - day) / MS_PER_HOUR;
}

function isSameDay(day, date) {
  return new Date(date).toDateString() === day.toDateString();
}

// Hours shown on the axis, from the items of the VISIBLE week:
// start = earliest start (rounded down), end = latest end (rounded up).
// "now" is the current time if the visible week is this week (so the
// "Now" line is always inside the range), or null for other weeks.
// A week with nothing shows 8 AM to 8 PM (plus the current hour, if it is this week).
export function getHourRange(items, now) {
  let firstHour = 24;
  let lastHour = 0;
  if (items.length === 0) {
    firstHour = EMPTY_WEEK_RANGE.firstHour;
    lastHour = EMPTY_WEEK_RANGE.lastHour;
  }
  for (const item of items) {
    const day = startOfDay(item.date);
    firstHour = Math.min(firstHour, Math.floor(hoursSince(day, item.date)));
    lastHour = Math.max(lastHour, Math.ceil(hoursSince(day, item.endDate)));
  }
  if (now !== null) {
    const nowHours = hoursSince(startOfDay(now), now);
    firstHour = Math.min(firstHour, Math.floor(nowHours));
    lastHour = Math.max(lastHour, Math.ceil(nowHours));
  }
  // Minimum range: add hours at the end (up to midnight), then at the start.
  if (lastHour - firstHour < MIN_HOURS_SHOWN) {
    lastHour = Math.max(lastHour, Math.min(firstHour + MIN_HOURS_SHOWN, 24));
    firstHour = lastHour - MIN_HOURS_SHOWN;
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

// Cuts the text and adds "…" until it fits in maxWidth pixels.
function fitText(context, text, maxWidth) {
  if (context.measureText(text).width <= maxWidth) {
    return text;
  }
  let shorter = text;
  while (shorter.length > 0 && context.measureText(`${shorter}…`).width > maxWidth) {
    shorter = shorter.slice(0, -1);
  }
  return shorter.length > 0 ? `${shorter}…` : '';
}

function drawHourGrid(context, canvas, range, hourToX) {
  const pixelsPerHour = hourToX(range.firstHour + 1) - hourToX(range.firstHour);
  const labelEvery = pixelsPerHour >= 56 ? 1 : 2; // fewer labels if the hours are narrow
  context.font = '14px system-ui, sans-serif';
  context.textAlign = 'center';
  context.strokeStyle = GRID_COLOR;
  context.lineWidth = 1;
  for (let hour = range.firstHour; hour <= range.lastHour; hour++) {
    const x = hourToX(hour);
    context.beginPath();
    context.moveTo(x, AXIS_HEIGHT - 6);
    context.lineTo(x, canvas.height);
    context.stroke();
    if (hour % labelEvery === 0) {
      context.fillStyle = MUTED_COLOR;
      context.fillText(hourLabel(hour), x, AXIS_HEIGHT - 14);
    }
  }
}

// The background and the "Mon 23" label of one day. Today is highlighted.
function drawDayRow(context, canvas, day, top, isToday) {
  if (isToday) {
    context.fillStyle = TODAY_COLOR;
    context.fillRect(0, top, canvas.width, ROW_HEIGHT);
  }
  context.strokeStyle = GRID_COLOR;
  context.beginPath();
  context.moveTo(0, top + ROW_HEIGHT);
  context.lineTo(canvas.width, top + ROW_HEIGHT);
  context.stroke();
  const weekday = day.toLocaleDateString('en-US', { weekday: 'short' });
  context.font = isToday ? 'bold 16px system-ui, sans-serif' : '16px system-ui, sans-serif';
  context.textAlign = 'left';
  context.fillStyle = TEXT_COLOR;
  context.fillText(`${weekday} ${day.getDate()}`, 12, top + ROW_HEIGHT / 2 + 6);
}

// Activity: a bar from start to end with the title written inside it.
// If the bar is too short to show at least 3 letters, the title goes on its right side.
function drawActivity(context, canvas, item, day, top, hourToX) {
  const startX = hourToX(hoursSince(day, item.date));
  const endX = hourToX(hoursSince(day, item.endDate));
  const width = Math.max(endX - startX, 4);
  const textY = top + ROW_HEIGHT / 2 + 5;
  context.globalAlpha = 0.88; // a little transparent, so overlapping bars can be seen
  context.fillStyle = ACTIVITY_COLOR;
  context.fillRect(startX, top + BAR_MARGIN, width, ROW_HEIGHT - BAR_MARGIN * 2);
  context.globalAlpha = 1;
  context.font = 'bold 15px system-ui, sans-serif';
  context.textAlign = 'left';
  let right = startX + width;
  const insideText = fitText(context, item.title, width - 16);
  if (insideText.replace('…', '').length >= MIN_LETTERS_INSIDE) {
    context.fillStyle = '#ffffff';
    context.fillText(insideText, startX + 8, textY);
  } else {
    const title = fitText(context, item.title, canvas.width - RIGHT_SPACE - right - 6);
    context.fillText(title, right + 6, textY); // fillStyle is still ACTIVITY_COLOR
    right = right + 6 + context.measureText(title).width;
  }
  shapes.push({ left: startX, right, top, bottom: top + ROW_HEIGHT, item });
}

// Reminder: a diamond at its time with the title next to it.
function drawReminder(context, canvas, item, day, top, hourToX) {
  const x = hourToX(hoursSince(day, item.date));
  const centerY = top + ROW_HEIGHT / 2;
  context.fillStyle = REMINDER_COLOR;
  context.beginPath();
  context.moveTo(x, centerY - DIAMOND_SIZE);
  context.lineTo(x + DIAMOND_SIZE, centerY);
  context.lineTo(x, centerY + DIAMOND_SIZE);
  context.lineTo(x - DIAMOND_SIZE, centerY);
  context.closePath();
  context.fill();
  context.font = 'bold 15px system-ui, sans-serif';
  context.textAlign = 'left';
  const textX = x + DIAMOND_SIZE + 6;
  const title = fitText(context, item.title, canvas.width - RIGHT_SPACE - textX);
  context.fillText(title, textX, centerY + 5);
  const textWidth = context.measureText(title).width;
  shapes.push({ left: x - DIAMOND_SIZE, right: textX + textWidth, top, bottom: top + ROW_HEIGHT, item });
}

// The red "Now" line, only over today's row.
function drawNowLine(context, now, day, top, hourToX) {
  const x = hourToX(hoursSince(day, now));
  context.strokeStyle = NOW_COLOR;
  context.fillStyle = NOW_COLOR;
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(x, top);
  context.lineTo(x, top + ROW_HEIGHT);
  context.stroke();
  context.beginPath();
  context.arc(x, top + 4, 5, 0, Math.PI * 2); // small dot on top of the line
  context.fill();
  context.lineWidth = 1;
}

// Draws one week. weekOffset: 0 = this week, -1 = last week, 1 = next week...
// "now" decides which row is today and where the "Now" line goes.
export function drawTimeline(canvas, items, now, weekOffset = 0) {
  const context = canvas.getContext('2d');
  const days = getWeekDays(now, weekOffset);
  const weekItems = items.filter((item) => days.some((day) => isSameDay(day, item.date)));
  canvas.height = AXIS_HEIGHT + DAYS_IN_WEEK * ROW_HEIGHT; // also clears the canvas
  shapes = [];
  const range = getHourRange(weekItems, weekOffset === 0 ? now : null);
  const pixelsPerHour = (canvas.width - LABEL_WIDTH - RIGHT_SPACE) / (range.lastHour - range.firstHour);
  const hourToX = (hour) => LABEL_WIDTH + (hour - range.firstHour) * pixelsPerHour;

  for (let i = 0; i < days.length; i++) {
    drawDayRow(context, canvas, days[i], AXIS_HEIGHT + i * ROW_HEIGHT, isSameDay(days[i], now));
  }
  drawHourGrid(context, canvas, range, hourToX);
  for (let i = 0; i < days.length; i++) {
    const top = AXIS_HEIGHT + i * ROW_HEIGHT;
    for (const item of weekItems.filter((element) => isSameDay(days[i], element.date))) {
      if (item.type === ACTIVITY_TYPE) {
        drawActivity(context, canvas, item, days[i], top, hourToX);
      } else {
        drawReminder(context, canvas, item, days[i], top, hourToX);
      }
    }
    if (isSameDay(days[i], now)) {
      drawNowLine(context, now, days[i], top, hourToX);
    }
  }
}

// ---------- HTML tooltip ----------
// Adds one child element with plain text. textContent (not innerHTML),
// so text written by the user is never run as HTML.
function addText(parent, tagName, text) {
  const element = document.createElement(tagName);
  element.textContent = text;
  parent.appendChild(element);
  return element;
}

// Activity: 'Mon, Nov 23 · 3:00 PM – 5:00 PM (02:00 hrs)'. Reminder: 'Mon, Nov 23 · 9:30 PM'.
function whenText(item) {
  const start = `${formatDay(item.date)} · ${formatClock(item.date)}`;
  if (item.type === ACTIVITY_TYPE) {
    return `${start} – ${formatClock(item.endDate)} (${formatDuration(item.durationMinutes)})`;
  }
  return start;
}

// One line → a paragraph. Several lines → a bulleted list. Empty → "No description".
function addDescription(tooltip, description) {
  const lines = []; // the non-empty lines, without spaces at the ends
  for (const line of description.split('\n')) {
    if (line.trim() !== '') {
      lines.push(line.trim());
    }
  }
  if (lines.length === 0) {
    addText(tooltip, 'p', 'No description').className = 'tooltip-muted';
  } else if (lines.length === 1) {
    addText(tooltip, 'p', lines[0]);
  } else {
    const list = document.createElement('ul');
    for (const line of lines) {
      addText(list, 'li', line);
    }
    tooltip.appendChild(list);
  }
}

function fillTooltip(tooltip, item) {
  tooltip.replaceChildren(); // remove what the last item wrote
  addText(tooltip, 'strong', item.title);
  addText(tooltip, 'p', item.type === ACTIVITY_TYPE ? 'Activity' : 'Reminder').className = 'tooltip-muted';
  addText(tooltip, 'p', whenText(item));
  if (item.type === ACTIVITY_TYPE) {
    addText(tooltip, 'p', item.location);
  } else {
    addText(tooltip, 'p', `Alert ${formatDuration(item.minutesBefore)} before`);
  }
  addDescription(tooltip, item.description);
}

// Next to the mouse; if it does not fit on the right (or below), it goes to the other side.
function placeTooltip(tooltip, mouseX, mouseY) {
  let left = mouseX + 14;
  let top = mouseY + 14;
  if (left + tooltip.offsetWidth > window.innerWidth - 8) {
    left = mouseX - tooltip.offsetWidth - 14;
  }
  if (top + tooltip.offsetHeight > window.innerHeight - 8) {
    top = mouseY - tooltip.offsetHeight - 14;
  }
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

// Searches from the last shape drawn, because it is the one on top.
function findShape(mouseX, mouseY) {
  for (let i = shapes.length - 1; i >= 0; i--) {
    const shape = shapes[i];
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
  let shownItem = null; // the item in the tooltip now, so we only rebuild it when it changes
  canvas.addEventListener('mousemove', (event) => {
    // The canvas is scaled by CSS, so we convert screen pixels to canvas pixels.
    const rect = canvas.getBoundingClientRect();
    const mouseX = (event.clientX - rect.left) * (canvas.width / rect.width);
    const mouseY = (event.clientY - rect.top) * (canvas.height / rect.height);
    const shape = findShape(mouseX, mouseY);
    if (shape === null) {
      tooltip.hidden = true;
      shownItem = null;
      return;
    }
    if (shape.item !== shownItem) {
      fillTooltip(tooltip, shape.item);
      shownItem = shape.item;
    }
    tooltip.hidden = false; // visible first, so offsetWidth/offsetHeight are real
    placeTooltip(tooltip, event.clientX, event.clientY);
  });

  canvas.addEventListener('mouseleave', () => {
    tooltip.hidden = true;
    shownItem = null;
  });
}
