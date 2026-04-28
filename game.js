const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ================= RICHARD III THEME =================
const monologue = [
  "I am determined to prove a villain",
  "And make the king a king of shreds and patches",
  "I that am curtail'd of this fair proportion",
  "Cheated of feature by dissembling nature",
  "Deform'd, unfinish'd, sent before my time",
  "Into this breathing world, scarce half made up",
  "And that so lamely and unfashionable",
  "That dogs bark at me as I halt by them",
  "Simple truth, I can smile and murder whiles I smile",
  "Plots have I laid, inductions dangerous",
  "To take the king, and in that bloody seat..."
];

let currentLine = 0;
let monologueTimer = 0;

// ================= CAMERA SHAKE =================
let shake = 0;

function applyShake() {
  if (shake > 0) {
    const dx = (Math.random() - 0.5) * shake;
    const dy = (Math.random() - 0.5) * shake;
    ctx.translate(dx, dy);
    shake--;
  }
}

// ================= PARTICLES =================
let particles = [];

function spawnParticles(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 30,
      color,
      size: 2 + Math.random() * 3
    });
  }
}

function updateParticles() {
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
  });

  particles = particles.filter(p => p.life > 0);
}

function drawParticles() {
  particles.forEach(p => {
    ctx.globalAlpha = p.life / 30;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// ================= TILE MAP =================
const tileSize = 50;
const cols = Math.ceil(window.innerWidth / tileSize);
const rows = Math.ceil(window.innerHeight / tileSize);

// The Throne Room - your goal
const throneRoom = {
  x: window.innerWidth - 250,
  y: window.innerHeight / 2 - 100,
  w: 200,
  h: 200
};

function drawMap() {
  // Dark battlefield background
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      ctx.fillStyle = ((x + y) % 2 === 0) ? "#1a1a2a" : "#12121f";
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }

  // Throne room glow
  const gradient = ctx.createRadialGradient(
    throneRoom.x + throneRoom.w/2, throneRoom.y + throneRoom.h/2, 0,
    throneRoom.x + throneRoom.w/2, throneRoom.y + throneRoom.h/2, 150
  );
  gradient.addColorStop(0, "rgba(212, 175, 55, 0.3)");
  gradient.addColorStop(1, "rgba(212, 175, 55, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(throneRoom.x - 50, throneRoom.y - 50, throneRoom.w + 100, throneRoom.h + 100);

  ctx.strokeStyle = "#d4af37";
  ctx.lineWidth = 3;
  ctx.strokeRect(throneRoom.x, throneRoom.y, throneRoom.w, throneRoom.h);
  ctx.lineWidth = 1;

  // Throne text
  ctx.fillStyle = "#d4af37";
  ctx.font = "14px Arial";
  ctx.textAlign = "center";
  ctx.fillText("THE THRONE", throneRoom.x + throneRoom.w/2, throneRoom.y + throneRoom.h + 20);
}

// ================= GAME STATE =================
let gameRunning = false;
let score = 0;
let phase = 1; // Game phases: 1=early, 2=mid, 3=late/boss

let player = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  size: 18,
  speed: 4,
  dash: 15,
  dashCooldown: 0,
  hp: 3,
  invulnerable: 0
};

let enemies = [];
let boss = null;
let keys = {};

// Power-ups
let powerups = [];

// SLASH SYSTEM
let slashTimer = 0;
const slashRadius = 80;

// Combo system
let combo = 0;
let comboTimer = 0;

// ================= INPUT =================
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

// ================= SWORD SLASH =================
canvas.addEventListener("mousedown", () => {
  if (!gameRunning) return;

  slashTimer = 10;
  shake = 8;

  // Visual slash effect
  spawnParticles(player.x, player.y, "#d4af37", 15); // Gold particles

  // Track hits for combo
  let hits = 0;

  enemies = enemies.filter(e => {
    let dx = player.x - e.x;
    let dy = player.y - e.y;
    let d = Math.sqrt(dx * dx + dy * dy);

    if (d < slashRadius) {
      spawnParticles(e.x, e.y, "#8b0000", 20); // Blood red
      hits++;
      score += 50;
      return false;
    }
    return true;
  });

  // Update combo
  if (hits > 0) {
    combo += hits;
    comboTimer = 60;
  }

  if (boss) {
    let dx = player.x - boss.x;
    let dy = player.y - boss.y;
    let d = Math.sqrt(dx * dx + dy * dy);

    if (d < slashRadius) {
      boss.hp -= 2;
      spawnParticles(boss.x, boss.y, "#4b0082", 25);
      shake = 15;
      if (boss.hp <= 0) {
        spawnParticles(boss.x, boss.y, "#d4af37", 50);
        gameOver("win");
      }
    }
  }
});

// ================= START =================
document.getElementById("start").onclick = () => {
  document.getElementById("menu").style.display = "none";

  gameRunning = true;
  enemies = [];
  boss = null;
  score = 0;
  particles = [];

  player.x = window.innerWidth / 2;
  player.y = window.innerHeight / 2;

  loop();
};

// ================= SPAWN =================
function spawnEnemy() {
  // Spawn from edges
  let side = Math.floor(Math.random() * 4);
  let x, y;
  
  switch(side) {
    case 0: x = -30; y = Math.random() * window.innerHeight; break;
    case 1: x = window.innerWidth + 30; y = Math.random() * window.innerHeight; break;
    case 2: x = Math.random() * window.innerWidth; y = -30; break;
    case 3: x = Math.random() * window.innerWidth; y = window.innerHeight + 30; break;
  }

  // Different enemy types based on phase
  const type = Math.random();
  
  if (phase >= 3 && type > 0.7) {
    // Knights - bigger, slower, more HP
    enemies.push({
      x, y,
      size: 25,
      speed: 1 + Math.random(),
      type: "knight",
      hp: 2
    });
  } else if (phase >= 2 && type > 0.5) {
    // Guards - medium
    enemies.push({
      x, y,
      size: 20,
      speed: 1.5 + Math.random() * 1.5,
      type: "guard",
      hp: 1
    });
  } else {
    // Common enemies - soldiers
    enemies.push({
      x, y,
      size: 15,
      speed: 2 + Math.random() * 2,
      type: "soldier",
      hp: 1
    });
  }
}

function spawnPowerup() {
  powerups.push({
    x: 100 + Math.random() * (window.innerWidth - 200),
    y: 100 + Math.random() * (window.innerHeight - 200),
    type: Math.random() > 0.5 ? "heal" : "speed",
    size: 15
  });
}

function spawnBoss() {
  if (!boss) {
    // Henry Tudor - the rival
    boss = { 
      x: 100, 
      y: 100, 
      size: 50, 
      speed: 2.5, 
      hp: 30,
      name: "Henry Tudor"
    };
  }
}

// ================= MOVEMENT =================
function movePlayer() {
  let speed = player.speed;

  if (keys[" "] && player.dashCooldown <= 0) {
    speed = player.dash;
    player.dashCooldown = 35;
    shake = 3;
  }

  if (player.dashCooldown > 0) player.dashCooldown--;

  if (keys["w"]) player.y -= speed;
  if (keys["s"]) player.y += speed;
  if (keys["a"]) player.x -= speed;
  if (keys["d"]) player.x += speed;
}

function moveEnemies() {
  enemies.forEach(e => {
    let dx = player.x - e.x;
    let dy = player.y - e.y;
    let d = Math.sqrt(dx * dx + dy * dy);
    e.x += (dx / d) * e.speed;
    e.y += (dy / d) * e.speed;
  });

  if (boss) {
    let dx = player.x - boss.x;
    let dy = player.y - boss.y;
    let d = Math.sqrt(dx * dx + dy * dy);
    boss.x += (dx / d) * boss.speed;
    boss.y += (dy / d) * boss.speed;
  }
}

// ================= COLLISION =================
function checkCollision() {
  // Player invulnerability
  if (player.invulnerable > 0) player.invulnerable--;

  enemies.forEach(e => {
    let dx = player.x - e.x;
    let dy = player.y - e.y;
    let d = Math.sqrt(dx * dx + dy * dy);
    if (d < player.size + e.size && player.invulnerable <= 0) {
      player.hp--;
      player.invulnerable = 60;
      shake = 10;
      spawnParticles(player.x, player.y, "red", 15);
      
      if (player.hp <= 0) {
        gameOver("lose");
      }
    }
  });

  if (boss) {
    let dx = player.x - boss.x;
    let dy = player.y - boss.y;
    let d = Math.sqrt(dx * dx + dy * dy);
    if (d < player.size + boss.size && player.invulnerable <= 0) {
      player.hp--;
      player.invulnerable = 60;
      shake = 15;
      spawnParticles(player.x, player.y, "red", 20);
      
      if (player.hp <= 0) {
        gameOver("lose");
      }
    }
  }

  // Powerup collection
  powerups = powerups.filter(p => {
    let dx = player.x - p.x;
    let dy = player.y - p.y;
    let d = Math.sqrt(dx * dx + dy * dy);
    
    if (d < player.size + p.size) {
      if (p.type === "heal" && player.hp < 3) {
        player.hp = Math.min(player.hp + 1, 3);
        spawnParticles(player.x, player.y, "#00ff00", 10);
      } else if (p.type === "speed") {
        player.speed = 6;
        setTimeout(() => player.speed = 4, 5000);
        spawnParticles(player.x, player.y, "#00ffff", 10);
      }
      return false;
    }
    return true;
  });

  // Throne room - win condition
  if (
    player.x > throneRoom.x && player.x < throneRoom.x + throneRoom.w &&
    player.y > throneRoom.y && player.y < throneRoom.y + throneRoom.h
  ) {
    gameOver("win");
  }
}

// ================= GAME OVER =================
function gameOver(type) {
  gameRunning = false;

  const text = document.getElementById("menuText");
  const subtext = document.getElementById("subText");

  if (type === "win") {
    text.innerText = "Crown seated — Kingdom mine!";
    subtext.innerText = "Richard III, Act 5, Scene 7: 'I am a king!'";
  } else {
    text.innerText = "A horse, a horse! My kingdom for a horse!";
    subtext.innerText = "Richard III, Act 5, Scene 4: The final defeat";
  }

  document.getElementById("menu").style.display = "flex";
}

// ================= DRAW =================
function drawCrown(x, y) {
  // Richard's crown
  ctx.fillStyle = "#d4af37";
  ctx.shadowColor = "#d4af37";
  ctx.shadowBlur = 20;

  ctx.beginPath();
  ctx.moveTo(x - 16, y);
  ctx.lineTo(x - 8, y - 15);
  ctx.lineTo(x, y - 5);
  ctx.lineTo(x + 8, y - 15);
  ctx.lineTo(x + 16, y);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
}

function drawSlash() {
  if (!slashTimer) return;
  
  // Golden slash arc
  ctx.strokeStyle = `rgba(212, 175, 55, ${slashTimer / 10})`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(player.x, player.y, slashRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1;
  slashTimer--;
}

function drawPlayer() {
  // Flicker when invulnerable
  if (player.invulnerable > 0 && Math.floor(player.invulnerable / 5) % 2 === 0) return;

  // Richard's emblem
  ctx.fillStyle = "#d4af37";
  ctx.shadowColor = "#d4af37";
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Inner detail
  ctx.fillStyle = "#1a1a2a";
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.size * 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawEnemies() {
  enemies.forEach(e => {
    if (e.type === "knight") {
      ctx.fillStyle = "#4a4a6a";
    } else if (e.type === "guard") {
      ctx.fillStyle = "#6a4a4a";
    } else {
      ctx.fillStyle = "#8b0000";
    }
    
    ctx.fillRect(e.x - e.size/2, e.y - e.size/2, e.size, e.size);
    
    // Health indicator for tough enemies
    if (e.hp > 1) {
      ctx.fillStyle = "white";
      ctx.fillRect(e.x - e.size/2, e.y + e.size/2 + 5, e.size * (e.hp / 2), 3);
    }
  });
}

function drawBoss() {
  if (!boss) return;

  // Henry Tudor - blue/white for Lancaster
  ctx.fillStyle = "#4169e1";
  ctx.shadowColor = "#4169e1";
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(boss.x, boss.y, boss.size, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Boss health bar
  ctx.fillStyle = "#333";
  ctx.fillRect(boss.x - 40, boss.y - boss.size - 20, 80, 8);
  ctx.fillStyle = "#4169e1";
  ctx.fillRect(boss.x - 40, boss.y - boss.size - 20, 80 * (boss.hp / 30), 8);
  
  ctx.fillStyle = "white";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";
  ctx.fillText(boss.name, boss.x, boss.y - boss.size - 25);
}

function drawPowerups() {
  powerups.forEach(p => {
    ctx.fillStyle = p.type === "heal" ? "#00ff00" : "#00ffff";
    ctx.shadowColor = p.type === "heal" ? "#00ff00" : "#00ffff";
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "white";
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.fillText(p.type === "heal" ? "+" : "⚡", p.x, p.y + 4);
  });
}

function drawMonologue() {
  if (!gameRunning) return;
  
  monologueTimer++;
  if (monologueTimer > 300) {
    currentLine = (currentLine + 1) % monologue.length;
    monologueTimer = 0;
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.font = "italic 16px Georgia";
  ctx.textAlign = "center";
  ctx.fillText("\"" + monologue[currentLine] + "\"", window.innerWidth / 2, 50);
}

function draw() {
  ctx.save();
  applyShake();

  drawMap();
  drawPowerups();
  drawCrown(player.x, player.y);
  drawSlash();
  drawParticles();
  drawPlayer();
  drawEnemies();
  drawBoss();
  drawMonologue();

  ctx.restore();
}

// ================= LOOP =================
function loop() {
  if (!gameRunning) return;

  movePlayer();
  moveEnemies();
  checkCollision();
  updateParticles();
  draw();

  // Update combo timer
  if (comboTimer > 0) comboTimer--;
  else combo = 0;

  score++;

  // Update phase based on score
  if (score > 600) phase = 3;
  else if (score > 300) phase = 2;

  // Spawn enemies - more frequent in later phases
  let spawnRate = phase === 1 ? 120 : phase === 2 ? 80 : 50;
  if (score % spawnRate === 0) spawnEnemy();

  // Spawn powerups occasionally
  if (score % 500 === 0) spawnPowerup();

  // Spawn boss
  if (score > 900 && !boss) spawnBoss();

  // Update HUD
  let hpDisplay = "❤️".repeat(player.hp) + "🖤".repeat(3 - player.hp);
  let comboDisplay = combo > 1 ? ` | Combo: x${combo}` : "";
  document.getElementById("hud").innerText = `${hpDisplay} Score: ${score}${comboDisplay}`;

  requestAnimationFrame(loop);
}