const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Set canvas size
canvas.width = 600;
canvas.height = 600;

// Constants
const CIRCLE_RADIUS = 250;
const CIRCLE_CENTER = { x: canvas.width / 2, y: canvas.height / 2 };
const GROWTH_AMOUNT = 2; // Add 2 pixels to radius each collision
w 
const SPEED = 3;
const BOUNCE_RANDOMNESS = 0.2; // Controls how much randomness is added to bounces
const NUM_SHATTER_PIECES = 30;
const SHATTER_SPEED = 8;
const SHATTER_SIZE = 15;

// Ball properties
let ball = {
  x: CIRCLE_CENTER.x - 100, // Simplified starting position
  y: CIRCLE_CENTER.y,
  radius: 20,
  velocityX: SPEED,
  velocityY: 0,
};

// Add this new array to store shatter pieces
let shatterPieces = [];

function drawContainer() {
  ctx.beginPath();
  ctx.arc(CIRCLE_CENTER.x, CIRCLE_CENTER.y, CIRCLE_RADIUS, 0, Math.PI * 2);
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawBall() {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = "#ff4444";
  ctx.fill();
}

// Add this new function for the shatter effect
function createShatterEffect() {
  shatterPieces = [];
  for (let i = 0; i < NUM_SHATTER_PIECES; i++) {
    const angle = ((Math.PI * 2) / NUM_SHATTER_PIECES) * i;
    shatterPieces.push({
      x: ball.x,
      y: ball.y,
      velocityX: Math.cos(angle) * SHATTER_SPEED,
      velocityY: Math.sin(angle) * SHATTER_SPEED,
      size: SHATTER_SIZE + Math.random() * 10,
      rotation: Math.random() * Math.PI * 2,
      opacity: 1,
    });
  }
  // Hide the original ball
  ball.radius = 0;
}

function checkCollision() {
  const dx = ball.x - CIRCLE_CENTER.x;
  const dy = ball.y - CIRCLE_CENTER.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance + ball.radius > CIRCLE_RADIUS) {
    // Check if ball has reached circle size
    if (ball.radius >= CIRCLE_RADIUS - 5) {
      createShatterEffect();
      return;
    }

    // Move ball back inside
    const nx = dx / distance;
    const ny = dy / distance;
    const overlap = distance + ball.radius - CIRCLE_RADIUS;
    ball.x -= nx * overlap;
    ball.y -= ny * overlap;

    // Set completely random direction
    const randomAngle = Math.random() * Math.PI * 2;
    ball.velocityX = Math.cos(randomAngle) * SPEED;
    ball.velocityY = Math.sin(randomAngle) * SPEED;

    // Grow linearly instead of exponentially
    ball.radius += GROWTH_AMOUNT;
  }
}

function update() {
  // Clear the entire canvas with a white background
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Update and draw shatter pieces if they exist
  if (shatterPieces.length > 0) {
    let allPiecesGone = true;
    shatterPieces.forEach((piece) => {
      // Update position
      piece.x += piece.velocityX;
      piece.y += piece.velocityY;
      piece.opacity -= 0.02;

      if (piece.opacity > 0) {
        allPiecesGone = false;
        // Draw piece
        ctx.save();
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.rotation);
        ctx.beginPath();
        ctx.moveTo(-piece.size / 2, -piece.size / 2);
        ctx.lineTo(piece.size / 2, 0);
        ctx.lineTo(-piece.size / 2, piece.size / 2);
        ctx.closePath();
        ctx.fillStyle = `rgba(255, 68, 68, ${piece.opacity})`;
        ctx.fill();
        ctx.restore();
      }
    });

    // Stop animation if all pieces are gone
    if (allPiecesGone) {
      return;
    }
  } else {
    // Normal ball update
    ball.x += ball.velocityX;
    ball.y += ball.velocityY;
    checkCollision();
  }

  // Draw everything
  drawContainer();
  drawBall();

  // Continue animation
  requestAnimationFrame(update);
}

// Start the animation
update();
