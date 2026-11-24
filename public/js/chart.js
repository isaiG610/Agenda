// public/js/chart.js
// ------------------------------------------------------------
// Bar chart drawn by hand on a <canvas> (fillRect / fillText) and
// our own tooltip that follows the mouse.
// Rubric: tables/charts rendering, Event 04 (mouse tracking).
// ------------------------------------------------------------

const PADDING = 36;
const BAR_COLOR = '#1f4fbf'; // same colors as styles.css (sapphire)
const HOVER_COLOR = '#142a66'; // brand: deep sapphire
const TEXT_COLOR = '#172033';
const GRID_COLOR = '#d8deea';
const FONT = '16px "Atkinson Hyperlegible Next", system-ui, sans-serif';

// Remembers where each bar was drawn, so mousemove can find it.
let bars = [];
// The last data drawn, so we can redraw it with a highlighted bar.
let lastDays = [];

function findMaxCount(nextDays) {
  let max = 1; // at least 1, so we never divide by zero
  for (const day of nextDays) {
    if (day.count > max) {
      max = day.count;
    }
  }
  return max;
}

function drawAxis(context, canvas) {
  context.strokeStyle = GRID_COLOR;
  context.beginPath();
  context.moveTo(PADDING, canvas.height - PADDING);
  context.lineTo(canvas.width - PADDING, canvas.height - PADDING);
  context.stroke();
}

// Draws one bar per day. hoverIndex = the bar under the mouse (-1 = none).
export function drawChart(canvas, nextDays, hoverIndex = -1) {
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = FONT;
  context.textAlign = 'center';
  drawAxis(context, canvas);

  const maxCount = findMaxCount(nextDays);
  const slotWidth = (canvas.width - PADDING * 2) / nextDays.length;
  const barWidth = slotWidth * 0.6;
  const chartHeight = canvas.height - PADDING * 2;
  bars = [];

  for (let i = 0; i < nextDays.length; i++) {
    const day = nextDays[i];
    const barHeight = (day.count / maxCount) * chartHeight;
    const x = PADDING + i * slotWidth + (slotWidth - barWidth) / 2;
    const y = canvas.height - PADDING - barHeight;
    context.fillStyle = i === hoverIndex ? HOVER_COLOR : BAR_COLOR;
    context.fillRect(x, y, barWidth, barHeight);
    context.fillStyle = TEXT_COLOR;
    context.fillText(day.label, x + barWidth / 2, canvas.height - PADDING + 20);
    context.fillText(String(day.count), x + barWidth / 2, y - 8);
    bars.push({ x, width: barWidth, day });
  }
  lastDays = nextDays;
}

// A bar is "hit" when the mouse is inside its column (even if count is 0).
function findBarIndex(mouseX, mouseY, canvas) {
  const insideChart = mouseY >= PADDING && mouseY <= canvas.height - PADDING;
  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    if (insideChart && mouseX >= bar.x && mouseX <= bar.x + bar.width) {
      return i;
    }
  }
  return -1;
}

// [EVENT 04] Mouse tracking: mousemove shows the tooltip, mouseleave hides it.
export function enableChartTooltip(canvas, tooltip) {
  canvas.addEventListener('mousemove', (event) => {
    // The canvas is scaled by CSS, so we convert screen pixels to canvas pixels.
    const rect = canvas.getBoundingClientRect();
    const mouseX = (event.clientX - rect.left) * (canvas.width / rect.width);
    const mouseY = (event.clientY - rect.top) * (canvas.height / rect.height);
    const index = findBarIndex(mouseX, mouseY, canvas);
    if (index === -1) {
      tooltip.hidden = true;
      drawChart(canvas, lastDays);
      return;
    }
    const day = bars[index].day;
    tooltip.textContent = `${day.label}: ${day.count} item(s)`;
    tooltip.style.left = `${event.clientX + 14}px`;
    tooltip.style.top = `${event.clientY + 14}px`;
    tooltip.hidden = false;
    drawChart(canvas, lastDays, index);
  });

  canvas.addEventListener('mouseleave', () => {
    tooltip.hidden = true;
    drawChart(canvas, lastDays);
  });
}
