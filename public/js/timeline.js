// public/js/timeline.js
// ------------------------------------------------------------
// Week view drawn by hand on a <canvas>: one ROW per day of the
// current week (Mon to Sun), hours on the horizontal axis.
// Meeting = bar from start to end with its title inside.
// Reminder = diamond at its time with its title next to it.
// Today's row is highlighted and has the red "Now" line.
// Plus our own tooltip that follows the mouse.
// Rubric: charts rendering, Event 01 (redrawn on every timer tick)
// and Event 04 (mouse tracking).
// ------------------------------------------------------------

import { formatClock, formatDuration } from './format.js';

const LABEL_WIDTH = 96; // space for "Mon 23" on the left
const AXIS_HEIGHT = 34; // space for the hour labels on top
const ROW_HEIGHT = 60;
const BAR_MARGIN = 10; // space above and below each bar inside its row
const RIGHT_SPACE = 32; // room for the last hour label
const DIAMOND_SIZE = 10;
const MIN_LETTERS_INSIDE = 3; // if fewer letters fit inside the bar, the title goes outside
const DAYS_IN_WEEK = 7;
const MS_PER_HOUR = 3600000;
const MEETING_TYPE = 'meeting'; // same value as ITEM_TYPES.MEETING in app.js

// Same colors as styles.css (strong enough to read on a projector).
const MEETING_COLOR = '#2448c4';
const REMINDER_COLOR = '#94500a';
const NOW_COLOR = '#b42318';
const TEXT_COLOR = '#1b2230';
const MUTED_COLOR = '#5d6573';
const GRID_COLOR = '#d6dae1';
const TODAY_COLOR = '#e9eefc';

// Remembers where each bar/diamond was drawn, so mousemove can find it.
let shapes = [];

// The 7 days of the current week, starting on Monday (each at midnight).
function getWeekDays(now) {
  const daysSinceMonday = (now.getDay() + 6) % 7; // getDay(): Sunday = 0
  const days = [];
  for (let i = 0; i < DAYS_IN_WEEK; i++) {
    days.push(new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday + i));
  }
  return days;
}

// Hours between midnight of "day" and "date" (e.g. 15:30 → 15.5).
function hoursSince(day, date) {
  return (new Date(date) - day) / MS_PER_HOUR;
}

function isSameDay(day, date) {
  return new Date(date).toDateString() === day.toDateString();
}

// Default range 6 AM to 12 AM, wider if something this week starts earlier or ends later.
function findHourRange(items, days) {
  let firstHour = 6;
  let lastHour = 24;
  for (const day of days) {
    for (const item of items.filter((element) => isSameDay(day, element.date))) {
      firstHour = Math.min(firstHour, Math.floor(hoursSince(day, item.date)));
      lastHour = Math.max(lastHour, Math.ceil(hoursSince(day, item.endDate)));
    }
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

// Meeting: a bar from start to end with the title written inside it.
// If the bar is too short to show at least 3 letters, the title goes on its right side.
function drawMeeting(context, canvas, item, day, top, hourToX) {
  const startX = hourToX(hoursSince(day, item.date));
  const endX = hourToX(hoursSince(day, item.endDate));
  const width = Math.max(endX - startX, 4);
  const textY = top + ROW_HEIGHT / 2 + 5;
  context.globalAlpha = 0.88; // a little transparent, so overlapping bars can be seen
  context.fillStyle = MEETING_COLOR;
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
    context.fillText(title, right + 6, textY); // fillStyle is still MEETING_COLOR
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

// Draws the current week. "now" decides which row is today and where "Now" goes.
export function drawTimeline(canvas, items, now) {
  const context = canvas.getContext('2d');
  const days = getWeekDays(now);
  canvas.height = AXIS_HEIGHT + DAYS_IN_WEEK * ROW_HEIGHT; // also clears the canvas
  shapes = [];
  const range = findHourRange(items, days);
  const pixelsPerHour = (canvas.width - LABEL_WIDTH - RIGHT_SPACE) / (range.lastHour - range.firstHour);
  const hourToX = (hour) => LABEL_WIDTH + (hour - range.firstHour) * pixelsPerHour;

  for (let i = 0; i < days.length; i++) {
    drawDayRow(context, canvas, days[i], AXIS_HEIGHT + i * ROW_HEIGHT, isSameDay(days[i], now));
  }
  drawHourGrid(context, canvas, range, hourToX);
  for (let i = 0; i < days.length; i++) {
    const top = AXIS_HEIGHT + i * ROW_HEIGHT;
    for (const item of items.filter((element) => isSameDay(days[i], element.date))) {
      if (item.type === MEETING_TYPE) {
        drawMeeting(context, canvas, item, days[i], top, hourToX);
      } else {
        drawReminder(context, canvas, item, days[i], top, hourToX);
      }
    }
    if (isSameDay(days[i], now)) {
      drawNowLine(context, now, days[i], top, hourToX);
    }
  }
}

// Meeting: 'Title · 3:00 PM – 5:00 PM · Room'. Reminder: 'Title · 9:30 PM · Alert 00:15 hrs before'.
function tooltipText(item) {
  if (item.type === MEETING_TYPE) {
    return `${item.title} · ${formatClock(item.date)} – ${formatClock(item.endDate)} · ${item.location}`;
  }
  return `${item.title} · ${formatClock(item.date)} · Alert ${formatDuration(item.minutesBefore)} before`;
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
