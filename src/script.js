const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Set canvas size
canvas.width = 600;
canvas.height = 600;

// Constants
const CIRCLE_RADIUS = 250;
const CIRCLE_CENTER = { x: canvas.width / 2, y: canvas.height / 2 };
const GROWTH_AMOUNT = 2; // Add 2 pixels to radius each collision
const SPEED = 3;
const BOUNCE_RANDOMNESS = 0.2; // Controls how much randomness is added to bounces
const NUM_SHATTER_PIECES = 30;
const SHATTER_SPEED = 8;
const SHATTER_SIZE = 15;

// Add new constant for color cycling
const COLOR_CHANGE_SPEED = 2; // Increase for faster color changes

// Add new constant for multiply mode
const MULTIPLY_LIMIT = 10000;

// Define available container shapes and randomly select one at load
const SHAPES = ['circle', 'square', 'pentagon', 'hexagon', 'octagon'];
const containerShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];

// Add game state
let isGrowMode = true;
let balls = [
    {
        x: CIRCLE_CENTER.x - 100,
        y: CIRCLE_CENTER.y,
        radius: 20,
        velocityX: SPEED,
        velocityY: 0,
        hue: 0
    }
];

// Add this new array to store shatter pieces
let shatterPieces = [];

// Add button handler
const modeButton = document.getElementById('modeButton');
modeButton.addEventListener('click', () => {
    isGrowMode = !isGrowMode;
    modeButton.textContent = isGrowMode ? 'Grow Mode' : 'Multiply Mode';
    
    // Reset game state when switching modes
    balls = [{
        x: CIRCLE_CENTER.x - 100,
        y: CIRCLE_CENTER.y,
        radius: 20,
        velocityX: SPEED,
        velocityY: 0,
        hue: 0
    }];
    shatterPieces = [];
});

function drawRegularPolygon(x, y, radius, sides, rotation = 0) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = rotation + (i * 2 * Math.PI / sides);
    const pointX = x + radius * Math.cos(angle);
    const pointY = y + radius * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(pointX, pointY);
    } else {
      ctx.lineTo(pointX, pointY);
    }
  }
  ctx.closePath();
}

function drawContainer() {
  ctx.beginPath();
  switch (containerShape) {
    case 'circle':
      ctx.arc(CIRCLE_CENTER.x, CIRCLE_CENTER.y, CIRCLE_RADIUS, 0, Math.PI * 2);
      break;
    case 'square':
      const halfSize = CIRCLE_RADIUS * Math.SQRT1_2;
      ctx.rect(CIRCLE_CENTER.x - halfSize, CIRCLE_CENTER.y - halfSize, halfSize * 2, halfSize * 2);
      break;
    case 'pentagon':
      drawRegularPolygon(CIRCLE_CENTER.x, CIRCLE_CENTER.y, CIRCLE_RADIUS, 5, -Math.PI / 2);
      break;
    case 'hexagon':
      drawRegularPolygon(CIRCLE_CENTER.x, CIRCLE_CENTER.y, CIRCLE_RADIUS, 6, 0);
      break;
    case 'octagon':
      drawRegularPolygon(CIRCLE_CENTER.x, CIRCLE_CENTER.y, CIRCLE_RADIUS, 8, Math.PI / 8);
      break;
  }
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawBalls() {
    balls.forEach(ball => {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${ball.hue}, 100%, 60%)`;
        ctx.fill();
    });
}

function createShatterEffect() {
    shatterPieces = [];
    // Use the first ball's position for the shatter effect
    const ball = balls[0];
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
            hue: ball.hue
        });
    }
    balls = []; // Clear all balls
}

function checkCollision(ball) {
    let collision = false;
    let nx = 0, ny = 0;

    switch (containerShape) {
        case 'circle':
            const dx = ball.x - CIRCLE_CENTER.x;
            const dy = ball.y - CIRCLE_CENTER.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance + ball.radius > CIRCLE_RADIUS) {
                collision = true;
                nx = dx / distance;
                ny = dy / distance;
                // Move ball back inside
                const overlap = (distance + ball.radius) - CIRCLE_RADIUS;
                ball.x -= nx * overlap;
                ball.y -= ny * overlap;
            }
            break;

        case 'square':
            const halfSize = CIRCLE_RADIUS * Math.SQRT1_2;
            const left = CIRCLE_CENTER.x - halfSize;
            const right = CIRCLE_CENTER.x + halfSize;
            const top = CIRCLE_CENTER.y - halfSize;
            const bottom = CIRCLE_CENTER.y + halfSize;

            if (ball.x - ball.radius < left) {
                collision = true;
                nx = 1;
                ny = 0;
                ball.x = left + ball.radius;
            } else if (ball.x + ball.radius > right) {
                collision = true;
                nx = -1;
                ny = 0;
                ball.x = right - ball.radius;
            }
            if (ball.y - ball.radius < top) {
                collision = true;
                nx = 0;
                ny = 1;
                ball.y = top + ball.radius;
            } else if (ball.y + ball.radius > bottom) {
                collision = true;
                nx = 0;
                ny = -1;
                ball.y = bottom + ball.radius;
            }
            break;

        case 'pentagon':
        case 'hexagon':
        case 'octagon':
            const sides = containerShape === 'pentagon' ? 5 : 
                         containerShape === 'hexagon' ? 6 : 8;
            const rotation = containerShape === 'pentagon' ? -Math.PI / 2 :
                           containerShape === 'octagon' ? Math.PI / 8 : 0;

            // Check if ball is too far from center first
            const centerDx = ball.x - CIRCLE_CENTER.x;
            const centerDy = ball.y - CIRCLE_CENTER.y;
            const centerDist = Math.sqrt(centerDx * centerDx + centerDy * centerDy);
            
            if (centerDist + ball.radius > CIRCLE_RADIUS) {
                // Find closest edge
                let minDist = Infinity;
                for (let i = 0; i < sides; i++) {
                    const angle1 = rotation + (i * 2 * Math.PI / sides);
                    const angle2 = rotation + ((i + 1) * 2 * Math.PI / sides);
                    
                    const x1 = CIRCLE_CENTER.x + CIRCLE_RADIUS * Math.cos(angle1);
                    const y1 = CIRCLE_CENTER.y + CIRCLE_RADIUS * Math.sin(angle1);
                    const x2 = CIRCLE_CENTER.x + CIRCLE_RADIUS * Math.cos(angle2);
                    const y2 = CIRCLE_CENTER.y + CIRCLE_RADIUS * Math.sin(angle2);

                    const edgeNormalX = -(y2 - y1);
                    const edgeNormalY = (x2 - x1);
                    const edgeLength = Math.sqrt(edgeNormalX * edgeNormalX + edgeNormalY * edgeNormalY);
                    
                    const normalX = edgeNormalX / edgeLength;
                    const normalY = edgeNormalY / edgeLength;
                    
                    const dist = (ball.x - x1) * normalX + (ball.y - y1) * normalY;
                    
                    if (Math.abs(dist) < Math.abs(minDist)) {
                        minDist = dist;
                        nx = normalX;
                        ny = normalY;
                    }
                }
                
                collision = true;
                const overlap = ball.radius - minDist;
                ball.x += nx * overlap;
                ball.y += ny * overlap;
            }
            break;
    }

    if (collision) {
        if (isGrowMode) {
            if (ball.radius >= CIRCLE_RADIUS - 5) {
                createShatterEffect();
                return true;
            }
            reflectBall(ball, nx, ny);
            ball.radius += GROWTH_AMOUNT;
            return false;
        } else {
            // Multiply mode
            if (balls.length >= MULTIPLY_LIMIT) {
                createShatterEffect();
                return true;
            }

            // Reflect the original ball first
            reflectBall(ball, nx, ny);

            // Create one new ball with a random spread angle
            const spreadAngle = Math.PI / 4; // 45 degree spread
            const baseAngle = Math.atan2(ball.velocityY, ball.velocityX);
            const newAngle = baseAngle + (Math.random() - 0.5) * spreadAngle;

            const newBall = {
                x: ball.x,
                y: ball.y,
                radius: 20,
                velocityX: Math.cos(newAngle) * SPEED,
                velocityY: Math.sin(newAngle) * SPEED,
                hue: (ball.hue + 30) % 360
            };

            // Add the new ball
            balls.push(newBall);
            
            return false; // Keep the original ball
        }
    }
    return false;
}

// Add this new helper function for ball reflection
function reflectBall(ball, nx, ny) {
    const dotProduct = ball.velocityX * nx + ball.velocityY * ny;
    ball.velocityX = ball.velocityX - 2 * dotProduct * nx;
    ball.velocityY = ball.velocityY - 2 * dotProduct * ny;

    // Add randomness to reflection
    const angle = (Math.random() - 0.5) * Math.PI / 6;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const newVx = ball.velocityX * cos - ball.velocityY * sin;
    const newVy = ball.velocityX * sin + ball.velocityY * cos;
    
    const speed = Math.sqrt(newVx * newVx + newVy * newVy);
    ball.velocityX = (newVx / speed) * SPEED;
    ball.velocityY = (newVy / speed) * SPEED;
}

function update() {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (shatterPieces.length > 0) {
        let allPiecesGone = true;
        shatterPieces.forEach((piece) => {
            piece.x += piece.velocityX;
            piece.y += piece.velocityY;
            piece.opacity -= 0.02;

            if (piece.opacity > 0) {
                allPiecesGone = false;
                ctx.save();
                ctx.translate(piece.x, piece.y);
                ctx.rotate(piece.rotation);
                ctx.beginPath();
                ctx.moveTo(-piece.size / 2, -piece.size / 2);
                ctx.lineTo(piece.size / 2, 0);
                ctx.lineTo(-piece.size / 2, piece.size / 2);
                ctx.closePath();
                ctx.fillStyle = `hsla(${piece.hue}, 100%, 60%, ${piece.opacity})`;
                ctx.fill();
                ctx.restore();
            }
        });

        if (allPiecesGone) {
            // Reset game when explosion is done
            balls = [{
                x: CIRCLE_CENTER.x - 100,
                y: CIRCLE_CENTER.y,
                radius: 20,
                velocityX: SPEED,
                velocityY: 0,
                hue: 0
            }];
            shatterPieces = [];
        }
    } else {
        // Update and filter balls
        const newBalls = [];
        for (const ball of balls) {
            ball.x += ball.velocityX;
            ball.y += ball.velocityY;
            ball.hue = (ball.hue + COLOR_CHANGE_SPEED) % 360;
            
            if (!checkCollision(ball)) {
                newBalls.push(ball);
            }
        }
        balls = newBalls;
    }

    drawContainer();
    drawBalls();

    requestAnimationFrame(update);
}

// Start the animation
update();
