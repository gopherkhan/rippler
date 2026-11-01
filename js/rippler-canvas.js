// rippler.js

const COLORS = [
  '#E27D60', // Dusty Coral
  '#7393B3', // Slate Blue (Replaces the light lime/mint)
  '#E8A87C', // Peach
  '#C38D9E', // Mauve
  '#41B3A3', // Muted Teal
  '#9C89B8', // Dusty Lavender
  '#D4A373', // Warm Sand (Replaces the light pink)
  '#B8BEDD'  // Periwinkle
];

const rad = 16;
const diameter = rad * 2;
const speed = 15;
const subInterval = 45;
const DEG_TO_RAD = Math.PI / 180;
const radius = 6;
const size = 30;
const halfSize = size / 2;
const buffer = size / 2;

let grid = [];
let spriteCache = {}; // Holds our pre-rendered canvases
let width = 0, height = 0, rows = 0, cols = 0;
let offsetX = 0, offsetY = 0;
let clickCount = 0;
let ctx;


function getContrastColor(hex) {
  hex = hex.replace('#', '');

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  if (luminance > 0.75) {
    // 1. LIGHTEST COLORS: A whisper-thin 15% darker tint
    const darkerR = Math.floor(r * 0.85);
    const darkerG = Math.floor(g * 0.85);
    const darkerB = Math.floor(b * 0.85);
    return `rgb(${darkerR}, ${darkerG}, ${darkerB})`;

  } else if (luminance > 0.45) {
    // 2. THRESHOLD MID-TONES: A lighter contrasting color
    // We mix the base color 60% of the way toward pure white
    const lighterR = Math.floor(r + (255 - r) * 0.6);
    const lighterG = Math.floor(g + (255 - g) * 0.6);
    const lighterB = Math.floor(b + (255 - b) * 0.6);
    return `rgb(${lighterR}, ${lighterG}, ${lighterB})`;

  } else {
    // 3. DARKEST COLORS: Crisp pure white
    return '#FFFFFF';
  }
}

// === SPRITE CACHING ===
// Run this once during initialization. It creates an invisible canvas
// for each color, draws the rounded rectangle with its stroke, and saves it.
function buildSprites() {
  COLORS.forEach(color => {
    const offscreen = document.createElement('canvas');
    offscreen.width = size + 4;
    offscreen.height = size + 4;
    const offCtx = offscreen.getContext('2d');

    offCtx.fillStyle = color;

    // Automatically assign the contrasting border color
    offCtx.strokeStyle = getContrastColor(color);
    offCtx.lineWidth = 1.2;

    offCtx.beginPath();
    offCtx.roundRect(2, 2, size, size, radius);
    offCtx.fill();
    offCtx.stroke();

    spriteCache[color] = offscreen;
  });
}

function drawCard(ctx, x, y, zRotationDeg, yRotationDeg, bgColor) {
  ctx.save();
  ctx.translate(x + halfSize, y + halfSize);
  ctx.rotate(zRotationDeg * DEG_TO_RAD);

  // Scale the context based on Y rotation
  const scale = Math.abs(Math.cos(yRotationDeg * DEG_TO_RAD));

  // Prevent scaling entirely to 0, which can sometimes throw rendering errors
  ctx.scale(Math.max(0.01, scale), 1);

  // Stamp the pre-rendered image.
  // We offset by -(halfSize + 2) to account for the 4px padding we added to the sprite.
  ctx.drawImage(spriteCache[bgColor], -(halfSize + 2), -(halfSize + 2));

  ctx.restore();
}

function handleResize(canvas) {
  const rect = canvas.getBoundingClientRect();
  width = canvas.width = rect.width;
  height = canvas.height = rect.height;

  // 1. Calculate how many cols/rows fit safely inside the canvas with the buffer
  cols = Math.floor((width - buffer * 2) / diameter);
  rows = Math.floor((height - buffer * 2) / diameter);

  // 2. Calculate the EXACT visual pixel footprint of the cards
  // (cols - 1) gives us the spacing between cards, + size adds the final card's width
  const visualWidth = (cols - 1) * diameter + size;
  const visualHeight = (rows - 1) * diameter + size;

  // 3. Perfectly center that visual footprint inside the canvas
  offsetX = (width - visualWidth) / 2;
  offsetY = (height - visualHeight) / 2;

  grid = new Array(rows);

  for (let r = 0; r < rows; r++) {
    grid[r] = new Array(cols);
    for (let c = 0; c < cols; c++) {
      grid[r][c] = {
        col: c, row: r,
        x: offsetX + (c * diameter),
        y: offsetY + (r * diameter),
        yRot: 0, targetYRot: 0, zRot: 0,
        srcRow: 0, srcCol: 0,
        color: COLORS[0], lastTriggerId: 0
      };
    }
  }
}

function triggerCard(row, col, srcRow, srcCol, triggerId) {
  const card = grid[row][col];

  if (card.lastTriggerId >= triggerId) return;

  card.lastTriggerId = triggerId;
  card.targetYRot += subInterval;
  card.color = COLORS[triggerId % COLORS.length];

  card.srcRow = srcRow;
  card.srcCol = srcCol;

  const deltaY = row - srcRow;
  const deltaX = col - srcCol;
  card.zRot = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
}

function triggerNeighbors(row, col, triggerId) {
  const card = grid[row][col];

  for (let r = row - 1; r <= row + 1; r++) {
    for (let c = col - 1; c <= col + 1; c++) {
      if (r >= 0 && r < rows && c >= 0 && c < cols && !(r === row && c === col)) {
        triggerCard(r, c, card.srcRow, card.srcCol, triggerId);
      }
    }
  }
}

function renderLoop() {
  ctx.clearRect(0, 0, width, height);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const card = grid[r][c];

      if (card.yRot < card.targetYRot) {
        card.yRot += speed;

        if (card.yRot >= card.targetYRot) {
          card.yRot = card.targetYRot;

          if (Math.round(card.yRot) % 180 !== 0) {
            triggerNeighbors(card.row, card.col, card.lastTriggerId);
            card.targetYRot += subInterval;
          }
        }
      }

      drawCard(ctx, card.x, card.y, card.zRot, card.yRot, card.color);
    }
  }

  requestAnimationFrame(renderLoop);
}

let isPointerDown = false;
let lastHoveredRow = -1;
let lastHoveredCol = -1;

function processPointerEvent(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = (event.clientX - rect.left) - offsetX;
  const mouseY = (event.clientY - rect.top) - offsetY;

  const col = Math.floor(mouseX / diameter);
  const row = Math.floor(mouseY / diameter);

  // Check bounds
  if (row >= 0 && row < rows && col >= 0 && col < cols) {
    // Only trigger if we've moved to a NEW card since the last frame
    if (row !== lastHoveredRow || col !== lastHoveredCol) {
      lastHoveredRow = row;
      lastHoveredCol = col;
      clickCount++;
      triggerCard(row, col, row, col, clickCount);
    }
  }
}

export function initRippler(canvasElement) {
  ctx = canvasElement.getContext('2d');
  buildSprites();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => handleResize(canvasElement), 200);
  });

  // --- NEW POINTER EVENT LISTENERS ---
  canvasElement.addEventListener('pointerdown', (e) => {
    isPointerDown = true;
    // Release capture so dragging outside the canvas doesn't break
    canvasElement.releasePointerCapture(e.pointerId);
    processPointerEvent(e, canvasElement);
  });

  canvasElement.addEventListener('pointermove', (e) => {
    if (!isPointerDown) return;
    processPointerEvent(e, canvasElement);
  });

  window.addEventListener('pointerup', () => {
    isPointerDown = false;
    lastHoveredRow = -1;
    lastHoveredCol = -1;
  });

  // Reset if the mouse leaves the canvas area
  canvasElement.addEventListener('pointerleave', () => {
    lastHoveredRow = -1;
    lastHoveredCol = -1;
  });

  handleResize(canvasElement);
  requestAnimationFrame(renderLoop);
}
