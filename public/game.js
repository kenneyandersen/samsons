"use strict";

/* ---------- Grundopsætning ---------- */

const W = 540;
const H = 800;
const STEP = 1 / 60;
const TAU = Math.PI * 2;

// Sværhedsgrad: lavere fart og antal og højere pause gør spillet lettere.
const ENEMY_BULLET_SPEED = 0.7;
const ENEMY_BULLET_COUNT = 0.7;
const ATTACK_PAUSE = 1.5;

const MAX_LIVES = 5;
const LIVES_CAP = 7;
const SHIELD_CAP = 3;
const SHIELD_SAFE_TIME = 1.5;
const MAX_HP = 360;
const HP_PER_PHASE = MAX_HP / 4;
const BOMB_COOLDOWN = 12;
const HEART_EVERY = 12;
const PICKUP_RADIUS = 34;
const PICKUP_FALL_SPEED = 110;
const POWER_TIME = 10;
const POWER_TIME_CAP = 20;
const KILLS_PER_DROP = 3;
const DAMAGE_PER_DROP = 25;

// Sneboldkanonens niveauer. Hvert skud er [forskydning til siden, vinkel].
const CANNON_LEVELS = [
  { shots: [[0, 0]], interval: 0.11, damage: 1 },
  { shots: [[-7, 0], [7, 0]], interval: 0.11, damage: 1 },
  { shots: [[-8, -0.12], [0, 0], [8, 0.12]], interval: 0.11, damage: 1 },
  { shots: [[-12, -0.24], [-6, -0.12], [0, 0], [6, 0.12], [12, 0.24]], interval: 0.11, damage: 1 },
  { shots: [[-12, -0.24], [-6, -0.12], [0, 0], [6, 0.12], [12, 0.24]], interval: 0.085, damage: 2 },
];
const POWERS = {
  rapid: { icon: "⚡", color: "#f2c14e", name: "Hurtigskud" },
  triple: { icon: "🔱", color: "#6fdc8c", name: "Ekstra skud" },
  big: { icon: "⛄", color: "#7fd1ff", name: "Kæmpesnebolde" },
};

const PLAYER_SPEED = 340;
const PLAYER_SLOW_SPEED = 150;
const PLAYER_DRAG_SPEED = 520;
const PLAYER_HIT_RADIUS = 3.5;
const PLAYER_MIN_Y = 340;
const PLAYER_MAX_Y = H - 50;
const RAPID_FIRE_FACTOR = 0.6;
const SHOT_SPEED = 780;
const SHOT_RADIUS = 5.5;
const SHOT_RADIUS_BIG = 12;
const SANTA_HIT_RADIUS = 62;

const BULLET_RADIUS = { coal: 7, candy: 7, present: 11, ornament: 10, reindeer: 22 };
const BULLET_SPIN = { candy: 7, present: 2.5, ornament: 0, coal: 0, reindeer: 0 };

// Bane 2: de sure gaver.
const GIFT_MAX_Y = 470;
const GIFT_CHARGE_SPEED = 330;
const GIFT_WINDUP = 0.9;
const GIFT_CONTACT_FACTOR = 0.6;
const GIFT_TYPES = {
  small: { r: 15, hp: 3, speed: 130, fireEvery: [1.8, 3], charges: true },
  big: { r: 27, hp: 9, speed: 95, fireEvery: [1.2, 2], split: { type: "small", count: 2 } },
  giant: { r: 64, hp: 110, speed: 70, fireEvery: [0.9, 0.9], split: { type: "big", count: 2 } },
};
const GIFT_WAVES = [
  { big: 3 },
  { big: 3, small: 3 },
  { big: 4, small: 4 },
  { big: 5, small: 6 },
  { giant: 1, small: 2 },
];

// Bane 3: hotellet. "#" er væg, "." er gulv.
const HOTEL_MAP = [
  "#########",
  "#...#...#",
  "#.#...#.#",
  "#.#.#.#.#",
  "#...#...#",
  "##.###.##",
  "#.......#",
  "#.##.##.#",
  "#.#...#.#",
  "#...#...#",
  "#.#.#.#.#",
  "#########",
];
const TILE = 60;
const HOTEL_TOP = 40;
const HOTEL_COLUMNS = HOTEL_MAP[0].length;
const HOTEL_ROWS = HOTEL_MAP.length;
const HOTEL_PLAYER_RADIUS = 12;
const HOTEL_CATCH_DISTANCE = 42;
const HOTEL_CATCHES = 3;
const HOTEL_SANTA_SPEED = [190, 215, 240];
const HOTEL_CHASER_SPEED = 95;
const HOTEL_MAX_CHASERS = 2;
const HOTEL_COAL_EVERY = 3;
const HOTEL_COAL_LIFETIME = 3;
const HOTEL_DROP_EVERY = 8;
const HOTEL_MAX_PICKUPS = 3;
const HOTEL_FIRE_INTERVAL = 0.3;
const HOTEL_FIRE_LEVEL_BONUS = 0.04;
const HOTEL_SHOT_SPEED = 620;
const HOTEL_STUN_TIME = 5;
const HOTEL_JOYSTICK_DEADZONE = 12;

const REWARDS = [
  ["🐶", "En hundehvalp"],
  ["🚀", "Et rumskib"],
  ["🦖", "En lille dinosaurus"],
  ["🤖", "En robot"],
  ["🍭", "1000 bolsjer"],
  ["🏰", "Et helt slot"],
  ["🧦", "Sokker. Ha ha."],
  ["🚲", "En cykel med raketter"],
  ["🎮", "Et nyt spil"],
  ["🐉", "En venlig drage"],
];

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayBody = document.getElementById("overlay-body");
const overlayHelp = document.getElementById("overlay-help");
const overlayStats = document.getElementById("overlay-stats");
const overlayGifts = document.getElementById("overlay-gifts");
const overlayButton = document.getElementById("overlay-button");
const muteButton = document.getElementById("mute");
const bombButton = document.getElementById("bomb");

const rand = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/* ---------- Gemte resultater ---------- */

const STORAGE_KEY = "samsons-julekamp";
const stats = { attempts: 0, wins: 0, bestTime: null, muted: false };

try {
  Object.assign(stats, JSON.parse(localStorage.getItem(STORAGE_KEY)) || {});
} catch {
  // Uden adgang til lager starter resultaterne bare forfra.
}

function saveStats() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Spillet virker fint uden gemte resultater.
  }
}

/* ---------- Julemandens angreb ---------- */
// Hver fase er en generator: den affyrer et mønster og "yield"er antal sekunder til det næste.

function* phaseCoal() {
  while (true) {
    for (let i = 0; i < 3; i++) {
      fan(aim(), 5, 0.42, 235, "coal");
      yield 0.5;
    }
    yield 0.4;
    ring(0, 19, 170, "coal");
    yield 0.6;
    ring(TAU / 38, 19, 170, "coal");
    yield 0.8;
    for (let i = 0; i < 3; i++) {
      dropPresent();
      yield 0.5;
    }
    yield 1;
  }
}

function* phaseCandy() {
  let angle = 0;
  let direction = 1;
  while (true) {
    for (let step = 0; step < 24; step++) {
      for (let arm = 0; arm < 3; arm++) {
        shoot(angle + (arm * TAU) / 3, 185, "candy");
      }
      angle += direction * 0.2;
      if (step % 8 === 0) {
        fan(aim(), 3, 0.24, 270, "coal");
      }
      yield 0.115;
    }
    direction = -direction;
    yield 0.7;
    throwOrnament(-0.5);
    throwOrnament(0.5);
    yield 1.2;
  }
}

function* phaseReindeer() {
  while (true) {
    for (let i = 0; i < 4; i++) {
      warnReindeer(game.player.y + rand(-30, 30), i % 2 ? 1 : -1);
      fan(aim(), 3, 0.3, 250, "coal");
      yield 0.75;
    }
    yield 0.6;
    for (let i = 0; i < 2; i++) {
      throwOrnament(rand(-0.8, 0.8));
      dropPresent();
      yield 0.8;
    }
    ring(rand(0, TAU), 20, 180, "candy");
    yield 1;
  }
}

function* phaseHoHo() {
  let angle = 0;
  while (true) {
    teleportSanta();
    yield 0.45;
    ring(rand(0, TAU), 23, 195, "coal");
    yield 0.45;
    fan(aim(), 6, 0.75, 285, "candy");
    yield 0.45;
    ring(rand(0, TAU), 21, 155, "candy");
    yield 0.7;

    teleportSanta();
    yield 0.4;
    warnReindeer(game.player.y, game.player.x < W / 2 ? 1 : -1);
    throwOrnament(-0.7);
    throwOrnament(0.7);
    yield 1.2;

    for (let step = 0; step < 16; step++) {
      for (let arm = 0; arm < 4; arm++) {
        shoot(angle + (arm * TAU) / 4, 195, "candy");
      }
      angle += 0.27;
      if (step % 8 === 0) {
        fan(aim(), 4, 0.4, 295, "coal");
      }
      yield 0.115;
    }
    yield 0.8;
  }
}

const PHASES = [
  { name: "Kul til alle", script: phaseCoal, dodgeEvery: 4, speed: 110, taunt: "Ho ho ho! Du står på listen!" },
  { name: "Bolsje-spiralen", script: phaseCandy, dodgeEvery: 3.5, speed: 100, taunt: "Slik er farligt for dig!" },
  { name: "Rensdyr-stormen", script: phaseReindeer, dodgeEvery: 3, speed: 130, taunt: "Mine rensdyr er sultne!" },
  { name: "HO HO HO!", script: phaseHoHo, dodgeEvery: 2.5, speed: 150, taunt: "NU BLIVER JEG SUR!" },
];

const HIT_TAUNTS = ["Haha! Ramt!", "Ingen gaver til dig!", "Uartig!", "Er det alt?", "Du får kun kul!"];
const LOSE_QUIPS = [
  "Du er nu officielt på den uartige liste.",
  "Julemanden griner stadig. Han er ikke engang forpustet.",
  "Du får en sok i år. Kun én.",
  "Nissen blev til julepynt.",
  "Prøv igen. Eller lad være. Han er ligeglad.",
];

function aim(from = game.santa) {
  return Math.atan2(game.player.y - from.y, game.player.x - from.x);
}

function spawn(kind, x, y, vx, vy, extra) {
  game.bullets.push({
    kind, x, y,
    vx: vx * ENEMY_BULLET_SPEED,
    vy: vy * ENEMY_BULLET_SPEED,
    r: BULLET_RADIUS[kind],
    rot: rand(0, TAU),
    spin: BULLET_SPIN[kind],
    ...extra,
  });
}

function shoot(angle, speed, kind, from = game.santa) {
  spawn(kind, from.x, from.y, Math.cos(angle) * speed, Math.sin(angle) * speed);
}

const scaledCount = (count, minimum) => Math.max(minimum, Math.round(count * ENEMY_BULLET_COUNT));

function ring(offset, count, speed, kind, from) {
  const total = scaledCount(count, 3);
  for (let i = 0; i < total; i++) {
    shoot(offset + (i * TAU) / total, speed, kind, from);
  }
  sfx.shootBig();
}

function fan(center, count, spread, speed, kind, from) {
  const total = scaledCount(count, 2);
  for (let i = 0; i < total; i++) {
    shoot(center + (i / (total - 1) - 0.5) * spread, speed, kind, from);
  }
  sfx.shootBig();
}

function dropPresent() {
  const santa = game.santa;
  spawn("present", santa.x + rand(-30, 30), santa.y + 20, rand(-80, 80), 235, {
    fuse: rand(0.9, 1.6),
    burst: { count: 7, speed: 150, kind: "coal" },
  });
}

function throwOrnament(angleOffset) {
  const santa = game.santa;
  const angle = aim() + angleOffset;
  spawn("ornament", santa.x, santa.y, Math.cos(angle) * 460, Math.sin(angle) * 460, {
    drag: 2.4,
    fuse: 1.25,
    burst: { count: 10, speed: 160, kind: "candy" },
  });
}

function warnReindeer(y, direction) {
  game.warnings.push({ y: clamp(y, PLAYER_MIN_Y + 20, H - 70), direction, time: 1.6, total: 1.6 });
  sfx.warn();
}

function teleportSanta() {
  const santa = game.santa;
  burstParticles(santa.x, santa.y - 10, 24, "#ff5a5a", 260);
  santa.x = rand(90, W - 90);
  santa.y = rand(120, 215);
  santa.homeY = santa.y;
  santa.goalX = santa.x;
  burstParticles(santa.x, santa.y - 10, 24, "#ffd27a", 260);
  sfx.teleport();
}

/* ---------- Spiltilstand ---------- */

function newGame(stage = 1) {
  return {
    mode: "menu",
    stage,
    phase: 0,
    script: null,
    wait: 0,
    breather: 0,
    modeTime: 0,
    burstTime: 0,
    shake: 0,
    hurtFlash: 0,
    player: {
      x: W / 2, y: H - 120, lives: MAX_LIVES, invulnerable: 0, fireTime: 0, side: 1, dead: false,
      powers: { rapid: 0, triple: 0, big: 0 },
      shields: 0,
      facing: [0, -1],
    },
    pickups: [],
    kills: 0,
    damageSinceDrop: 0,
    dropTime: HOTEL_DROP_EVERY,
    bombCooldown: 0,
    bombFlash: 0,
    heartTime: HEART_EVERY,
    notice: null,
    santa: {
      x: W / 2, y: 135, homeY: 135, hp: MAX_HP, time: 0, goalX: W / 2, goalTime: 0,
      dash: 0, dodgeCooldown: 0, flash: 0, tilt: 0, gone: false, scale: 1, col: 1, row: 1,
    },
    bullets: [],
    shots: [],
    warnings: [],
    particles: [],
    gifts: [],
    waveIndex: 0,
    chasers: [],
    catches: 0,
    coalTime: HOTEL_COAL_EVERY,
    taunt: null,
    banner: null,
  };
}

let game = newGame();

// ?bane=2 eller ?bane=3 i adressen springer direkte til en bane, så den kan testes.
const firstStage = clamp(parseInt(new URLSearchParams(location.search).get("bane"), 10) || 1, 1, 3);
const skippedStages = firstStage > 1;
let checkpoint = firstStage;
let runTime = 0;

// Det, man beholder, når man dør: kanonen og hvor langt man er nået på banen.
let cannonLevel = 1;
const progress = { phase: 0, wave: 0, catches: 0 };

const keys = new Set();
let drag = null;

function startGame() {
  initAudio();
  stats.attempts += 1;
  saveStats();
  overlay.hidden = true;
  keys.clear();
  music.index = 0;
  music.bassIndex = 0;
  music.next = 0;
  music.bassNext = 0;
  startStage(checkpoint);
}

function startStage(stage) {
  checkpoint = stage;
  drag = null;
  game = newGame(stage);
  game.mode = "playing";
  if (stage === 1) {
    game.santa.hp = MAX_HP - progress.phase * HP_PER_PHASE;
    startPhase(progress.phase);
    return;
  }
  game.santa.gone = stage === 2;
  if (stage === 2) {
    startWave(progress.wave);
    game.banner = { title: "Bane 2", subtitle: "De sure gaver", time: 1.9 };
    game.breather = 1.9;
  } else {
    setupHotel();
  }
  sfx.phase();
}

function startPhase(index) {
  const phase = PHASES[index];
  progress.phase = index;
  game.phase = index;
  game.script = phase.script();
  game.wait = 0;
  game.breather = 1.7;
  game.banner = { title: `Fase ${index + 1}`, subtitle: phase.name, time: 1.7 };
  say(phase.taunt, 2.2);
  sfx.phase();
}

function say(text, time = 1.6) {
  game.taunt = { text, time };
}

function clearBullets(x, y, radius) {
  game.bullets = game.bullets.filter((bullet) => {
    if (Math.hypot(bullet.x - x, bullet.y - y) > radius) {
      return true;
    }
    burstParticles(bullet.x, bullet.y, 2, "#dfe8ff", 90);
    return false;
  });
}

function burstParticles(x, y, count, color, speed) {
  for (let i = 0; i < count && game.particles.length < 500; i++) {
    const angle = rand(0, TAU);
    const velocity = rand(speed * 0.3, speed);
    const life = rand(0.3, 0.8);
    game.particles.push({
      x, y, color, life, total: life,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      size: rand(2, 5),
    });
  }
}

/* ---------- Opdatering ---------- */

function update(dt) {
  updateSnow(dt);
  updateParticles(dt);
  game.santa.time += dt;
  game.shake = Math.max(0, game.shake - dt * 40);
  game.hurtFlash = Math.max(0, game.hurtFlash - dt * 2.5);
  game.bombFlash = Math.max(0, game.bombFlash - dt * 2.5);
  if (game.notice && (game.notice.time -= dt) <= 0) {
    game.notice = null;
  }

  if (game.taunt && (game.taunt.time -= dt) <= 0) {
    game.taunt = null;
  }
  if (game.banner && (game.banner.time -= dt) <= 0) {
    game.banner = null;
  }

  if (game.mode === "playing") {
    runTime += dt;
    if (game.stage === 1) {
      updatePlayer(dt);
      updateSanta(dt);
      runScript(dt);
      updateShots(dt);
      updateWarnings(dt);
      updateBullets(dt);
      updateBombAndHearts(dt);
      updatePickups(dt);
    } else if (game.stage === 2) {
      updateGiftStage(dt);
    } else {
      updateHotel(dt);
    }
  } else if (game.mode === "dying") {
    updateBullets(dt);
    game.modeTime -= dt;
    if (game.modeTime <= 0) {
      showGameOver();
    }
  } else if (game.mode === "victory") {
    updateVictory(dt);
  }
}

function updatePlayer(dt) {
  const player = game.player;
  const inHotel = game.stage === 3;
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  for (const power of Object.keys(player.powers)) {
    player.powers[power] = Math.max(0, player.powers[power] - dt);
  }

  let moveX = 0;
  let moveY = 0;
  if (drag && inHotel) {
    // I hotellets gange virker fingeren som joystick: hold den ud til siden for at løbe.
    const dx = drag.x - drag.startX;
    const dy = drag.y - drag.startY;
    const distance = Math.hypot(dx, dy);
    if (distance > HOTEL_JOYSTICK_DEADZONE) {
      moveX = (dx / distance) * PLAYER_SPEED * dt;
      moveY = (dy / distance) * PLAYER_SPEED * dt;
    }
  } else if (drag) {
    const dx = drag.x - player.x;
    const dy = drag.y - player.y;
    const distance = Math.hypot(dx, dy);
    const move = Math.min(distance, PLAYER_DRAG_SPEED * dt);
    if (distance > 0) {
      moveX = (dx / distance) * move;
      moveY = (dy / distance) * move;
    }
  } else {
    let dx = 0;
    let dy = 0;
    if (keys.has("ArrowLeft") || keys.has("KeyA")) dx -= 1;
    if (keys.has("ArrowRight") || keys.has("KeyD")) dx += 1;
    if (keys.has("ArrowUp") || keys.has("KeyW")) dy -= 1;
    if (keys.has("ArrowDown") || keys.has("KeyS")) dy += 1;
    const length = Math.hypot(dx, dy) || 1;
    const speed = keys.has("ShiftLeft") || keys.has("ShiftRight") ? PLAYER_SLOW_SPEED : PLAYER_SPEED;
    moveX = (dx / length) * speed * dt;
    moveY = (dy / length) * speed * dt;
  }

  if (inHotel) {
    // Flyt hver akse for sig, så nissen glider langs væggene.
    const startX = player.x;
    const startY = player.y;
    if (!hotelBlocked(player.x + moveX, player.y)) player.x += moveX;
    if (!hotelBlocked(player.x, player.y + moveY)) player.y += moveY;

    // Nissen skyder den vej, den sidst bevægede sig.
    const movedX = player.x - startX;
    const movedY = player.y - startY;
    if (movedX || movedY) {
      player.facing = Math.abs(movedX) >= Math.abs(movedY) ? [Math.sign(movedX), 0] : [0, Math.sign(movedY)];
    }
    firePlayer(dt);
    return;
  }

  player.x = clamp(player.x + moveX, 16, W - 16);
  player.y = clamp(player.y + moveY, PLAYER_MIN_Y, PLAYER_MAX_Y);
  firePlayer(dt);
}

function addShot(x, y, vx, vy, r, damage) {
  game.shots.push({ x, y, vx, vy, r, damage });
}

function firePlayer(dt) {
  const player = game.player;
  player.fireTime -= dt;
  if (player.fireTime > 0) {
    return;
  }
  sfx.shoot();

  if (game.stage === 3) {
    const [facingX, facingY] = player.facing;
    player.fireTime = HOTEL_FIRE_INTERVAL - (cannonLevel - 1) * HOTEL_FIRE_LEVEL_BONUS;
    addShot(player.x + facingX * 14, player.y + facingY * 14,
      facingX * HOTEL_SHOT_SPEED, facingY * HOTEL_SHOT_SPEED, SHOT_RADIUS, 1);
    return;
  }

  const { rapid, triple, big } = player.powers;
  const cannon = CANNON_LEVELS[cannonLevel - 1];
  player.fireTime += cannon.interval * (rapid > 0 ? RAPID_FIRE_FACTOR : 1);
  const radius = big > 0 ? SHOT_RADIUS_BIG : SHOT_RADIUS;
  const damage = cannon.damage + (big > 0 ? 1 : 0);
  const shots = triple > 0 ? [...cannon.shots, [-16, -0.42], [16, 0.42]] : cannon.shots;
  for (const [offset, angle] of shots) {
    addShot(player.x + offset, player.y - 26,
      Math.sin(angle) * SHOT_SPEED, -Math.cos(angle) * SHOT_SPEED, radius, damage);
  }
}

function useBomb() {
  if (game.mode !== "playing" || game.stage === 3 || game.bombCooldown > 0) {
    return;
  }
  game.bombCooldown = BOMB_COOLDOWN;
  game.bombFlash = 0.8;
  game.shake = 14;
  game.warnings = [];
  clearBullets(W / 2, H / 2, H);
  game.player.invulnerable = Math.max(game.player.invulnerable, 0.5);
  say("Mit kul!?");
  sfx.boom();
}

function updateBombAndHearts(dt) {
  game.bombCooldown = Math.max(0, game.bombCooldown - dt);
  game.heartTime -= dt;
  if (game.heartTime <= 0) {
    game.heartTime = HEART_EVERY;
    if (game.player.lives < LIVES_CAP) {
      game.pickups.push({ kind: "heart", x: rand(60, W - 60), y: -30, vy: PICKUP_FALL_SPEED, time: 0 });
    }
  }
}

function dropPickup(x, y) {
  const options = Object.keys(POWERS);
  if (cannonLevel < CANNON_LEVELS.length) {
    options.push("star", "star", "star");
  }
  if (game.player.lives < LIVES_CAP) {
    options.push("heart");
  }
  if (game.player.shields < SHIELD_CAP) {
    options.push("shield", "shield");
  }
  game.pickups.push({ kind: pick(options), x: clamp(x, 40, W - 40), y, vy: PICKUP_FALL_SPEED, time: 0 });
}

function updatePickups(dt) {
  const player = game.player;
  game.pickups = game.pickups.filter((pickup) => {
    pickup.y += pickup.vy * dt;
    pickup.time += dt;
    if (Math.hypot(pickup.x - player.x, pickup.y - player.y) < PICKUP_RADIUS) {
      collectPickup(pickup);
      return false;
    }
    return pickup.y < H + 30;
  });
}

function collectPickup(pickup) {
  const player = game.player;
  sfx.pickup();
  burstParticles(pickup.x, pickup.y, 14, "#ffe9a8", 200);
  if (pickup.kind === "heart") {
    player.lives = Math.min(LIVES_CAP, player.lives + 1);
    game.notice = { text: "+1 liv", time: 1.1 };
    return;
  }
  if (pickup.kind === "shield") {
    player.shields = Math.min(SHIELD_CAP, player.shields + 1);
    game.notice = { text: "Skjold!", time: 1.1 };
    return;
  }
  if (pickup.kind === "star") {
    cannonLevel = Math.min(CANNON_LEVELS.length, cannonLevel + 1);
    game.notice = { text: `Kanon niveau ${cannonLevel}!`, time: 1.3 };
    return;
  }
  // Kun én powerup ad gangen: tilsammen ville de gøre kanonen ti gange stærkere.
  const time = Math.min(POWER_TIME_CAP, player.powers[pickup.kind] + POWER_TIME);
  player.powers = { rapid: 0, triple: 0, big: 0, [pickup.kind]: time };
  game.notice = { text: POWERS[pickup.kind].name, time: 1.1 };
}

function updateSanta(dt) {
  const santa = game.santa;
  const phase = PHASES[game.phase];
  const before = santa.x;

  santa.flash = Math.max(0, santa.flash - dt);
  santa.dash = Math.max(0, santa.dash - dt);
  santa.dodgeCooldown = Math.max(0, santa.dodgeCooldown - dt);
  santa.goalTime -= dt;

  if (santa.goalTime <= 0) {
    santa.goalX = rand(80, W - 80);
    santa.goalTime = rand(0.6, 1.4);
  }

  if (santa.dodgeCooldown <= 0) {
    const threat = game.shots.find((shot) =>
      Math.abs(shot.x - santa.x) < 60 && shot.y > santa.y && shot.y - santa.y < 190);
    if (threat) {
      let side = Math.sign(santa.x - threat.x) || (Math.random() < 0.5 ? -1 : 1);
      if (santa.x + side * 150 < 70 || santa.x + side * 150 > W - 70) {
        side = -side;
      }
      santa.goalX = santa.x + side * 150;
      santa.goalTime = 0.5;
      santa.dash = 0.22;
      santa.dodgeCooldown = phase.dodgeEvery;
    }
  }

  const speed = santa.dash > 0 ? 720 : phase.speed;
  const delta = santa.goalX - santa.x;
  santa.x += Math.sign(delta) * Math.min(Math.abs(delta), speed * dt);
  santa.y = santa.homeY + Math.sin(santa.time * 2.1) * 18;
  santa.tilt += (clamp((santa.x - before) / dt / 900, -0.3, 0.3) - santa.tilt) * Math.min(1, dt * 12);
}

function runScript(dt) {
  if (game.breather > 0) {
    game.breather -= dt;
    return;
  }
  game.wait -= dt;
  while (game.wait <= 0) {
    game.wait += game.script.next().value * ATTACK_PAUSE;
  }
}

function updateShots(dt) {
  const santa = game.santa;
  const remaining = [];
  for (const shot of game.shots) {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    if (shot.y < -20) {
      continue;
    }
    if (Math.hypot(shot.x - santa.x, shot.y - (santa.y - 12)) < SANTA_HIT_RADIUS) {
      burstParticles(shot.x, shot.y, 3, "#ffffff", 150);
      if (game.breather <= 0) {
        damageSanta(shot.damage);
      }
      if (game.mode !== "playing") {
        return;
      }
      continue;
    }
    remaining.push(shot);
  }
  game.shots = remaining;
}

function damageSanta(damage) {
  const santa = game.santa;
  const floor = MAX_HP - (game.phase + 1) * HP_PER_PHASE;
  santa.hp = Math.max(floor, santa.hp - damage);
  santa.flash = 0.05;
  sfx.hit();

  game.damageSinceDrop += damage;
  if (game.damageSinceDrop >= DAMAGE_PER_DROP) {
    game.damageSinceDrop = 0;
    dropPickup(santa.x, santa.y + 40);
  }

  if (santa.hp > floor) {
    return;
  }
  if (santa.hp <= 0) {
    startVictory();
    return;
  }
  clearBullets(W / 2, H / 2, H);
  game.warnings = [];
  game.shake = 12;
  startPhase(game.phase + 1);
}

function updateWarnings(dt) {
  game.warnings = game.warnings.filter((warning) => {
    warning.time -= dt;
    if (warning.time > 0) {
      return true;
    }
    const startX = warning.direction > 0 ? -80 : W + 80;
    spawn("reindeer", startX, warning.y, warning.direction * 1050, 0, { dropTime: 0, facing: warning.direction });
    sfx.reindeer();
    return false;
  });
}

function updateBullets(dt) {
  const previous = game.bullets;
  game.bullets = [];

  for (const bullet of previous) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.rot += bullet.spin * dt;

    if (bullet.drag) {
      const slow = Math.max(0, 1 - bullet.drag * dt);
      bullet.vx *= slow;
      bullet.vy *= slow;
    }

    if (bullet.kind === "reindeer" && bullet.x > 0 && bullet.x < W) {
      bullet.dropTime -= dt;
      if (bullet.dropTime <= 0) {
        bullet.dropTime = 0.16;
        spawn("coal", bullet.x, bullet.y, 0, Math.random() < 0.5 ? -135 : 135);
      }
    }

    if (bullet.fuse !== undefined && (bullet.fuse -= dt) <= 0) {
      if (!bullet.burst) {
        continue;
      }
      const burstCount = scaledCount(bullet.burst.count, 3);
      for (let i = 0; i < burstCount; i++) {
        const angle = bullet.rot + (i * TAU) / burstCount;
        spawn(bullet.burst.kind, bullet.x, bullet.y,
          Math.cos(angle) * bullet.burst.speed, Math.sin(angle) * bullet.burst.speed);
      }
      burstParticles(bullet.x, bullet.y, 8, "#ffd27a", 180);
      sfx.pop();
      continue;
    }

    const margin = 100;
    if (bullet.x < -margin || bullet.x > W + margin || bullet.y < -margin || bullet.y > H + margin) {
      continue;
    }

    const player = game.player;
    if (game.mode === "playing" && player.invulnerable <= 0 &&
        Math.hypot(bullet.x - player.x, bullet.y - player.y) < bullet.r + PLAYER_HIT_RADIUS) {
      game.bullets.push(bullet);
      hurtPlayer();
      continue;
    }

    game.bullets.push(bullet);
  }
}

function hurtPlayer() {
  const player = game.player;

  if (player.shields > 0) {
    player.shields -= 1;
    player.invulnerable = SHIELD_SAFE_TIME;
    game.shake = 6;
    game.notice = { text: "Skjoldet holdt!", time: 1.1 };
    burstParticles(player.x, player.y, 26, "#bfe6ff", 260);
    clearBullets(player.x, player.y, 170);
    sfx.pop();
    return;
  }

  player.lives -= 1;
  game.shake = 16;
  game.hurtFlash = 0.7;
  burstParticles(player.x, player.y, 40, "#ff6b6b", 320);
  clearBullets(player.x, player.y, 170);
  sfx.hurt();

  if (player.lives > 0) {
    player.invulnerable = 3;
    say(pick(HIT_TAUNTS));
    return;
  }

  player.dead = true;
  game.mode = "dying";
  game.modeTime = 1.3;
  game.warnings = [];
  say("HO HO HO HO!", 2);
}

function startVictory() {
  game.mode = "victory";
  game.modeTime = game.stage === 1 ? 3.4 : 1.7;
  game.burstTime = 0;
  game.bullets = [];
  game.warnings = [];
  game.shots = [];
  game.pickups = [];
  if (game.stage === 1) {
    game.taunt = { text: "Mine gaver! ANGRIB!", time: 1.8 };
  } else if (game.stage === 3) {
    game.taunt = { text: "Okay, okay! Du får gaverne!", time: 1.7 };
  }
  sfx.win();
}

function updateVictory(dt) {
  const santa = game.santa;
  game.modeTime -= dt;
  game.burstTime -= dt;

  if (game.stage !== 1) {
    if (game.modeTime <= 0) {
      if (game.stage === 2) {
        startStage(3);
      } else {
        showWin();
      }
    }
    return;
  }

  if (!santa.gone && game.burstTime <= 0) {
    game.burstTime = 0.09;
    game.shake = 8;
    santa.flash = 0.04;
    burstParticles(santa.x + rand(-45, 45), santa.y + rand(-55, 30), 18, pick(["#ffd27a", "#ff5a5a", "#ffffff"]), 280);
    sfx.pop();
  }

  if (!santa.gone && game.modeTime < 1.9) {
    santa.gone = true;
    game.shake = 24;
    game.taunt = null;
    for (const color of ["#e0222f", "#2fae5f", "#f2c14e", "#ffffff"]) {
      burstParticles(santa.x, santa.y - 10, 100, color, 620);
    }
    sfx.boom();
  }

  if (game.modeTime <= 0) {
    startStage(2);
  }
}

function updateParticles(dt) {
  game.particles = game.particles.filter((particle) => {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 260 * dt;
    return particle.life > 0;
  });
}

/* ---------- Bane 2: de sure gaver ---------- */

function spawnGift(type, x, y, vx, vy) {
  const info = GIFT_TYPES[type];
  game.gifts.push({
    type, x, y, vx, vy,
    r: info.r,
    hp: info.hp,
    color: pick(["red", "green", "blue"]),
    flash: 0,
    time: rand(0, TAU),
    fireTime: rand(info.fireEvery[0], info.fireEvery[1]),
    chargeTime: rand(2.5, 5.5),
    windup: 0,
    charging: false,
    volleys: 0,
  });
}

function startWave(index) {
  const wave = GIFT_WAVES[index];
  progress.wave = index;
  game.waveIndex = index;
  for (const type of Object.keys(wave)) {
    const speed = GIFT_TYPES[type].speed;
    for (let i = 0; i < wave[type]; i++) {
      spawnGift(type, rand(70, W - 70), -70 - i * 20, Math.random() < 0.5 ? -speed : speed, speed);
    }
  }
  game.breather = 1.3;
  if (index > 0) {
    game.banner = { title: `Bølge ${index + 1} af ${GIFT_WAVES.length}`, subtitle: "Endnu flere!", time: 1.3 };
    sfx.phase();
  }
}

function updateGiftStage(dt) {
  updatePlayer(dt);
  if (game.breather > 0) {
    game.breather -= dt;
  } else {
    updateGifts(dt);
  }
  updateGiftShots(dt);
  updateBullets(dt);
  updateBombAndHearts(dt);
  updatePickups(dt);

  if (game.mode === "playing" && game.gifts.length === 0) {
    if (game.waveIndex + 1 < GIFT_WAVES.length) {
      game.bullets = [];
      startWave(game.waveIndex + 1);
    } else {
      startVictory();
    }
  }
}

function updateGifts(dt) {
  const player = game.player;

  for (const gift of game.gifts) {
    const info = GIFT_TYPES[gift.type];
    gift.flash = Math.max(0, gift.flash - dt);
    gift.time += dt;

    if (gift.windup > 0) {
      gift.windup -= dt;
      if (gift.windup <= 0) {
        const angle = aim(gift);
        gift.vx = Math.cos(angle) * GIFT_CHARGE_SPEED;
        gift.vy = Math.sin(angle) * GIFT_CHARGE_SPEED;
        gift.charging = true;
        sfx.shootBig();
      }
    } else {
      gift.x += gift.vx * dt;
      gift.y += gift.vy * dt;

      if (gift.charging) {
        if (gift.y > H + 40 || gift.y < -40 || gift.x < -40 || gift.x > W + 40) {
          gift.charging = false;
          gift.x = rand(70, W - 70);
          gift.y = -30;
          gift.vx = Math.random() < 0.5 ? -info.speed : info.speed;
          gift.vy = info.speed;
          gift.chargeTime = rand(2.5, 5.5);
        }
      } else {
        if ((gift.x < gift.r && gift.vx < 0) || (gift.x > W - gift.r && gift.vx > 0)) {
          gift.vx = -gift.vx;
        }
        if ((gift.y < 60 + gift.r && gift.vy < 0) || (gift.y > GIFT_MAX_Y && gift.vy > 0)) {
          gift.vy = -gift.vy;
        }
        if (info.charges && gift.y > 0 && (gift.chargeTime -= dt) <= 0) {
          gift.windup = GIFT_WINDUP;
        }
      }
    }

    if (!gift.charging && gift.windup <= 0 && gift.y > 0 && (gift.fireTime -= dt) <= 0) {
      gift.fireTime = rand(info.fireEvery[0], info.fireEvery[1]) * ATTACK_PAUSE;
      fireFromGift(gift);
    }

    if (player.invulnerable <= 0 && Math.hypot(gift.x - player.x, gift.y - player.y) < gift.r * GIFT_CONTACT_FACTOR + PLAYER_HIT_RADIUS) {
      hurtPlayer();
      if (game.mode !== "playing") {
        return;
      }
    }
  }
}

function fireFromGift(gift) {
  if (gift.type !== "giant") {
    if (gift.type === "big") {
      fan(aim(gift), 3, 0.3, 300, "coal", gift);
    } else {
      shoot(aim(gift), 320, "coal", gift);
    }
    return;
  }
  gift.volleys += 1;
  if (gift.volleys % 2) {
    ring(rand(0, TAU), 28, 210, "coal", gift);
  } else {
    fan(aim(gift), 9, 0.9, 320, "candy", gift);
  }
}

function updateGiftShots(dt) {
  game.shots = game.shots.filter((shot) => {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    if (shot.y < -20) {
      return false;
    }
    const target = game.gifts.find((gift) => gift.y > 0 && Math.hypot(shot.x - gift.x, shot.y - gift.y) < gift.r + shot.r);
    if (!target) {
      return true;
    }
    burstParticles(shot.x, shot.y, 3, "#ffffff", 150);
    damageGift(target, shot.damage);
    return false;
  });
}

function damageGift(gift, damage) {
  gift.hp -= damage;
  gift.flash = 0.05;
  sfx.hit();
  if (gift.hp > 0) {
    return;
  }

  game.gifts.splice(game.gifts.indexOf(gift), 1);
  burstParticles(gift.x, gift.y, 18 + gift.r, pick(["#e0222f", "#2fae5f", "#f2c14e"]), 300);
  sfx.pop();

  game.kills += 1;
  if (game.kills % KILLS_PER_DROP === 0) {
    dropPickup(gift.x, gift.y);
  }

  const split = GIFT_TYPES[gift.type].split;
  if (split) {
    const speed = GIFT_TYPES[split.type].speed;
    for (let i = 0; i < split.count; i++) {
      const angle = rand(0, TAU);
      spawnGift(split.type, clamp(gift.x + rand(-20, 20), 40, W - 40), Math.max(gift.y, 90),
        Math.cos(angle) * speed, Math.sin(angle) * speed);
    }
  }
  if (gift.type === "giant") {
    game.shake = 18;
  }
}

/* ---------- Bane 3: hotellet ---------- */

const hotelIndex = (col, row) => row * HOTEL_COLUMNS + col;
const isHotelWall = (col, row) => !HOTEL_MAP[row] || HOTEL_MAP[row][col] !== ".";
const tileCenterX = (col) => (col + 0.5) * TILE;
const tileCenterY = (row) => HOTEL_TOP + (row + 0.5) * TILE;
const tileCol = (x) => Math.floor(x / TILE);
const tileRow = (y) => Math.floor((y - HOTEL_TOP) / TILE);
const HOTEL_NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const HOTEL_FLOOR_TILES = HOTEL_MAP.flatMap((line, row) =>
  [...line].flatMap((tile, col) => (tile === "." ? [{ col, row }] : [])));

function hotelBlocked(x, y) {
  const r = HOTEL_PLAYER_RADIUS;
  return [[x - r, y - r], [x + r, y - r], [x - r, y + r], [x + r, y + r]]
    .some(([cornerX, cornerY]) => isHotelWall(tileCol(cornerX), tileRow(cornerY)));
}

function placeOnTile(entity, col, row) {
  entity.col = col;
  entity.row = row;
  entity.x = tileCenterX(col);
  entity.y = tileCenterY(row);
}

// Afstand fra et felt til alle andre, og hvor man kom fra.
function hotelDistances(col, row) {
  const size = HOTEL_COLUMNS * HOTEL_ROWS;
  const distance = new Array(size).fill(Infinity);
  const parent = new Array(size).fill(-1);
  const queue = [[col, row]];
  distance[hotelIndex(col, row)] = 0;

  for (let head = 0; head < queue.length; head++) {
    const [currentCol, currentRow] = queue[head];
    const current = hotelIndex(currentCol, currentRow);
    for (const [dx, dy] of HOTEL_NEIGHBOURS) {
      const nextCol = currentCol + dx;
      const nextRow = currentRow + dy;
      if (!isHotelWall(nextCol, nextRow) && distance[hotelIndex(nextCol, nextRow)] === Infinity) {
        distance[hotelIndex(nextCol, nextRow)] = distance[current] + 1;
        parent[hotelIndex(nextCol, nextRow)] = current;
        queue.push([nextCol, nextRow]);
      }
    }
  }
  return { distance, parent };
}

function playerDistances() {
  return hotelDistances(tileCol(game.player.x), tileRow(game.player.y)).distance;
}

function farthestTile(distance, exclude = -1) {
  let best = null;
  for (let row = 0; row < HOTEL_ROWS; row++) {
    for (let col = 0; col < HOTEL_COLUMNS; col++) {
      const index = hotelIndex(col, row);
      if (!isHotelWall(col, row) && index !== exclude && (!best || distance[index] > best.score)) {
        best = { col, row, index, score: distance[index] };
      }
    }
  }
  return best;
}

function setupHotel() {
  game.banner = { title: "Bane 3", subtitle: "Fang julemanden!", time: 2 };
  game.breather = 2;
  game.santa.scale = 0.42;
  game.player.x = tileCenterX(4);
  game.player.y = tileCenterY(6);
  placeOnTile(game.santa, 1, 1);
  game.catches = progress.catches;
  game.chasers = [];
  addChaser(7, 9);
  if (game.catches > 0) {
    addChaser(1, 9);
  }
  say("Du fanger mig aldrig!", 2);
}

function dropHotelPickup() {
  const options = [];
  if (cannonLevel < CANNON_LEVELS.length) {
    options.push("star");
  }
  if (game.player.lives < LIVES_CAP) {
    options.push("heart");
  }
  if (game.player.shields < SHIELD_CAP) {
    options.push("shield");
  }
  if (options.length === 0 || game.pickups.length >= HOTEL_MAX_PICKUPS) {
    return;
  }
  const tile = pick(HOTEL_FLOOR_TILES);
  game.pickups.push({ kind: pick(options), x: tileCenterX(tile.col), y: tileCenterY(tile.row), vy: 0, time: 0 });
}

function addChaser(col, row) {
  const chaser = { r: 15, type: "small", hp: 1, color: pick(["red", "green", "blue"]), flash: 0, time: rand(0, TAU), windup: 0, stun: 0 };
  placeOnTile(chaser, col, row);
  game.chasers.push(chaser);
}

function walkGrid(entity, speed, dt, chooseNext) {
  let remaining = speed * dt;
  for (let guard = 0; remaining > 0 && guard < 4; guard++) {
    const targetX = tileCenterX(entity.col);
    const targetY = tileCenterY(entity.row);
    const distance = Math.hypot(targetX - entity.x, targetY - entity.y);

    if (distance > remaining) {
      entity.x += ((targetX - entity.x) / distance) * remaining;
      entity.y += ((targetY - entity.y) / distance) * remaining;
      return;
    }
    entity.x = targetX;
    entity.y = targetY;
    remaining -= distance;

    const next = chooseNext(entity);
    if (next.col === entity.col && next.row === entity.row) {
      return;
    }
    entity.col = next.col;
    entity.row = next.row;
  }
}

// Julemanden løber mod det fjerneste felt, han kan nå før nissen.
function fleeStep(santa) {
  const fromPlayer = playerDistances();
  const { distance, parent } = hotelDistances(santa.col, santa.row);
  const start = hotelIndex(santa.col, santa.row);
  let target = -1;
  let bestScore = -1;

  for (let index = 0; index < distance.length; index++) {
    if (distance[index] < fromPlayer[index] && fromPlayer[index] !== Infinity) {
      const score = fromPlayer[index] + Math.random() * 0.5;
      if (score > bestScore) {
        bestScore = score;
        target = index;
      }
    }
  }

  if (target === -1 || target === start) {
    return { col: santa.col, row: santa.row };
  }
  while (parent[target] !== start) {
    target = parent[target];
  }
  return { col: target % HOTEL_COLUMNS, row: Math.floor(target / HOTEL_COLUMNS) };
}

function chaseStep(chaser) {
  const fromPlayer = playerDistances();
  let best = { col: chaser.col, row: chaser.row };
  let bestDistance = fromPlayer[hotelIndex(chaser.col, chaser.row)];
  for (const [dx, dy] of HOTEL_NEIGHBOURS) {
    const col = chaser.col + dx;
    const row = chaser.row + dy;
    if (!isHotelWall(col, row) && fromPlayer[hotelIndex(col, row)] < bestDistance) {
      best = { col, row };
      bestDistance = fromPlayer[hotelIndex(col, row)];
    }
  }
  return best;
}

function updateHotel(dt) {
  if (game.breather > 0) {
    game.breather -= dt;
    return;
  }

  const santa = game.santa;
  const player = game.player;
  updatePlayer(dt);
  walkGrid(santa, HOTEL_SANTA_SPEED[game.catches], dt, fleeStep);

  game.coalTime -= dt;
  if (game.coalTime <= 0) {
    game.coalTime = HOTEL_COAL_EVERY;
    spawn("coal", santa.x, santa.y, 0, 0, { fuse: HOTEL_COAL_LIFETIME });
  }

  game.dropTime -= dt;
  if (game.dropTime <= 0) {
    game.dropTime = HOTEL_DROP_EVERY;
    dropHotelPickup();
  }
  updatePickups(dt);

  updateHotelShots(dt);

  for (const chaser of game.chasers) {
    if (chaser.stun > 0) {
      chaser.stun = Math.max(0, chaser.stun - dt);
      continue;
    }
    chaser.time += dt;
    walkGrid(chaser, HOTEL_CHASER_SPEED, dt, chaseStep);
    if (player.invulnerable <= 0 && Math.hypot(chaser.x - player.x, chaser.y - player.y) < chaser.r + 6) {
      hurtPlayer();
      if (game.mode !== "playing") {
        return;
      }
    }
  }

  updateBullets(dt);

  if (game.mode === "playing" && Math.hypot(santa.x - player.x, santa.y - player.y) < HOTEL_CATCH_DISTANCE) {
    catchSanta();
  }
}

function updateHotelShots(dt) {
  game.shots = game.shots.filter((shot) => {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    if (isHotelWall(tileCol(shot.x), tileRow(shot.y))) {
      burstParticles(shot.x, shot.y, 3, "#ffffff", 110);
      return false;
    }
    // En frossen pakke lader skud passere, så den ikke kan holdes frossen for evigt.
    const target = game.chasers.find((chaser) =>
      chaser.stun <= 0 && Math.hypot(shot.x - chaser.x, shot.y - chaser.y) < chaser.r + shot.r);
    if (!target) {
      return true;
    }
    target.stun = HOTEL_STUN_TIME;
    burstParticles(target.x, target.y, 16, "#bfe6ff", 200);
    sfx.hit();
    return false;
  });
}

function catchSanta() {
  game.catches += 1;
  progress.catches = game.catches;
  game.shots = [];
  game.bullets = [];
  game.shake = 10;
  burstParticles(game.santa.x, game.santa.y, 30, "#f2c14e", 280);

  if (game.catches >= HOTEL_CATCHES) {
    startVictory();
    return;
  }

  const fromPlayer = playerDistances();
  const hideout = farthestTile(fromPlayer);
  const chaserStart = farthestTile(fromPlayer, hideout.index);
  placeOnTile(game.santa, hideout.col, hideout.row);
  if (game.chasers.length < HOTEL_MAX_CHASERS) {
    addChaser(chaserStart.col, chaserStart.row);
  }

  game.player.invulnerable = 1.5;
  game.breather = 1.3;
  game.banner = { title: `Fanget ${game.catches} af ${HOTEL_CATCHES}`, subtitle: "Han slap fri!", time: 1.3 };
  say(pick(["Ha! For langsom!", "Fang mig så!", "Jeg kender alle gangene!"]));
  sfx.teleport();
}

/* ---------- Menuer ---------- */

function damagePercent() {
  return Math.floor(((MAX_HP - game.santa.hp) / MAX_HP) * 100);
}

function formatTime(seconds) {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function statsLine() {
  if (stats.attempts === 0) {
    return "";
  }
  const parts = [`Forsøg: ${stats.attempts}`, `Sejre: ${stats.wins}`];
  if (stats.bestTime !== null) {
    parts.push(`Bedste tid: ${formatTime(stats.bestTime)}`);
  }
  return parts.join(" · ");
}

function showOverlay({ title, body, button, help = false, gifts = false, action, delay = 0 }) {
  overlayTitle.textContent = title;
  overlayBody.textContent = body;
  overlayHelp.hidden = !help;
  overlayGifts.hidden = !gifts;
  overlayStats.textContent = statsLine();
  overlayButton.textContent = button;
  overlayButton.disabled = delay > 0;
  overlay.hidden = false;
  overlayButton.onclick = action;
  // En kort forsinkelse, så en panisk tast ikke straks starter næste forsøg.
  setTimeout(() => {
    overlayButton.disabled = false;
    overlayButton.focus();
  }, delay);
}

function showMenu() {
  showOverlay({
    title: "Samsons julekamp",
    body: "Den onde julemand har stjålet julen. Du er en lille nisse med sneboldkanon. Det her går ikke godt.",
    button: "Start kampen",
    help: true,
    action: startGame,
  });
}

function showGameOver() {
  game.mode = "gameover";
  const progress = [
    `Du fortsætter fra fase ${game.phase + 1}, og kanonen beholder du.`,
    `Du fortsætter fra bølge ${game.waveIndex + 1}, og kanonen beholder du.`,
    `Du har fanget ham ${game.catches} af ${HOTEL_CATCHES} gange, og det beholder du.`,
  ][game.stage - 1];
  showOverlay({
    title: "Julemanden vandt",
    body: `${pick(LOSE_QUIPS)} ${progress}`,
    button: "Prøv igen",
    action: startGame,
    delay: 700,
  });
}

function fillRewardGifts() {
  const rewards = [...REWARDS].sort(() => Math.random() - 0.5).slice(0, 6);
  overlayGifts.replaceChildren(...rewards.map(([icon, name]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "🎁";
    button.setAttribute("aria-label", "Åbn gave");
    button.addEventListener("click", () => {
      const label = document.createElement("small");
      label.textContent = name;
      button.replaceChildren(icon, label);
      button.removeAttribute("aria-label");
      button.disabled = true;
      sfx.win();
    }, { once: true });
    return button;
  }));
}

function showWin() {
  game.mode = "won";
  if (!skippedStages) {
    stats.wins += 1;
    if (stats.bestTime === null || runTime < stats.bestTime) {
      stats.bestTime = runTime;
    }
    saveStats();
  }
  fillRewardGifts();
  showOverlay({
    title: "Du fangede julemanden!",
    body: `Nu må han aflevere alle gaverne. Du brugte ${formatTime(runTime)}. Åbn dem!`,
    button: "Spil igen",
    gifts: true,
    action: () => {
      checkpoint = 1;
      runTime = 0;
      cannonLevel = 1;
      Object.assign(progress, { phase: 0, wave: 0, catches: 0 });
      startGame();
    },
    delay: 700,
  });
}

function pauseGame() {
  if (game.mode !== "playing") {
    return;
  }
  game.mode = "paused";
  keys.clear();
  drag = null;
  showOverlay({
    title: "Pause",
    body: "Julemanden venter. Han er tålmodig.",
    button: "Fortsæt",
    help: true,
    action: resumeGame,
  });
}

function resumeGame() {
  game.mode = "playing";
  overlay.hidden = true;
}

/* ---------- Styring ---------- */

const GAME_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"]);

window.addEventListener("keydown", (event) => {
  if (game.mode === "playing" && GAME_KEYS.has(event.code)) {
    event.preventDefault();
  }
  keys.add(event.code);
  if (event.repeat) {
    return;
  }
  if (event.code === "Escape" || event.code === "KeyP") {
    if (game.mode === "playing") {
      pauseGame();
    } else if (game.mode === "paused") {
      resumeGame();
    }
  } else if (event.code === "KeyM") {
    toggleMute();
  } else if (event.code === "Space" || event.code === "KeyB") {
    useBomb();
  }
});

bombButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  useBomb();
});

window.addEventListener("keyup", (event) => keys.delete(event.code));
window.addEventListener("blur", pauseGame);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pauseGame();
  }
});

function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * W,
    y: ((event.clientY - rect.top) / rect.height) * H,
  };
}

canvas.addEventListener("pointerdown", (event) => {
  if (game.mode !== "playing" || drag) {
    return;
  }
  // Nissen følger fingerens bevægelse, så fingeren ikke dækker for den.
  const position = pointerPosition(event);
  drag = {
    id: event.pointerId,
    offsetX: game.player.x - position.x,
    offsetY: game.player.y - position.y,
    startX: game.player.x,
    startY: game.player.y,
    x: game.player.x,
    y: game.player.y,
  };
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (drag && event.pointerId === drag.id) {
    const position = pointerPosition(event);
    drag.x = position.x + drag.offsetX;
    drag.y = position.y + drag.offsetY;
  }
});

function endDrag(event) {
  if (drag && event.pointerId === drag.id) {
    drag = null;
  }
}

canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

/* ---------- Lyd ---------- */

const audio = { context: null, master: null, noise: null };
const music = { index: 0, bassIndex: 0, next: 0, bassNext: 0 };

// "Jingle Bells" (1857, fri af ophavsret) i mol, som [midi-tone, antal slag].
const MELODY = [
  [63, 1], [63, 1], [63, 2], [63, 1], [63, 1], [63, 2],
  [63, 1], [67, 1], [60, 1.5], [62, 0.5], [63, 4],
  [65, 1], [65, 1], [65, 1.5], [65, 0.5], [65, 1], [63, 1], [63, 1], [63, 0.5], [63, 0.5],
  [63, 1], [62, 1], [62, 1], [63, 1], [62, 2], [67, 2],
];
const BASS = [36, 43, 36, 43, 36, 43, 36, 43, 41, 48, 36, 43, 43, 50, 43, 50];

function initAudio() {
  if (audio.context) {
    audio.context.resume();
    return;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }
  audio.context = new AudioContextClass();
  audio.master = audio.context.createGain();
  audio.master.gain.value = stats.muted ? 0 : 0.8;
  audio.master.connect(audio.context.destination);

  const length = audio.context.sampleRate;
  audio.noise = audio.context.createBuffer(1, length, audio.context.sampleRate);
  const samples = audio.noise.getChannelData(0);
  for (let i = 0; i < length; i++) {
    samples[i] = Math.random() * 2 - 1;
  }
}

function tone(frequency, duration, { type = "square", volume = 0.08, slideTo = null, at = 0 } = {}) {
  if (!audio.context) {
    return;
  }
  const start = at || audio.context.currentTime;
  const oscillator = audio.context.createOscillator();
  const gain = audio.context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (slideTo) {
    oscillator.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
  }
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(audio.master);
  oscillator.start(start);
  oscillator.stop(start + duration);
}

function noise(duration, volume, cutoff) {
  if (!audio.context) {
    return;
  }
  const source = audio.context.createBufferSource();
  const filter = audio.context.createBiquadFilter();
  const gain = audio.context.createGain();
  const now = audio.context.currentTime;
  source.buffer = audio.noise;
  filter.type = "lowpass";
  filter.frequency.value = cutoff;
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  source.connect(filter).connect(gain).connect(audio.master);
  source.start(now, Math.random() * 0.5, duration);
}

const sfx = {
  shoot: () => tone(880, 0.04, { volume: 0.012, slideTo: 520 }),
  hit: () => tone(240, 0.05, { type: "triangle", volume: 0.05 }),
  pickup: () => tone(660, 0.22, { type: "triangle", volume: 0.14, slideTo: 1320 }),
  shootBig: () => tone(170, 0.12, { type: "sawtooth", volume: 0.035, slideTo: 90 }),
  pop: () => noise(0.12, 0.09, 1800),
  warn: () => tone(1046, 0.5, { type: "triangle", volume: 0.09 }),
  reindeer: () => noise(0.4, 0.14, 900),
  teleport: () => tone(300, 0.22, { type: "sine", volume: 0.12, slideTo: 1300 }),
  hurt: () => { noise(0.45, 0.3, 700); tone(300, 0.45, { type: "sawtooth", volume: 0.12, slideTo: 60 }); },
  boom: () => { noise(1.2, 0.5, 500); tone(120, 1.1, { type: "sawtooth", volume: 0.2, slideTo: 30 }); },
  phase: () => [392, 311, 261].forEach((freq, i) => tone(freq, 0.3, {
    type: "sawtooth", volume: 0.07, at: audio.context ? audio.context.currentTime + i * 0.13 : 0,
  })),
  win: () => [523, 659, 784, 1046].forEach((freq, i) => tone(freq, 0.45, {
    type: "triangle", volume: 0.12, at: audio.context ? audio.context.currentTime + i * 0.16 : 0,
  })),
};

const midiFrequency = (note) => 440 * 2 ** ((note - 69) / 12);

function scheduleMusic() {
  if (!audio.context || game.mode !== "playing") {
    return;
  }
  const now = audio.context.currentTime;
  const beat = 60 / (160 + (game.stage === 1 ? game.phase : game.stage) * 20);

  if (music.next < now) {
    music.next = now + 0.05;
    music.bassNext = music.next;
  }
  while (music.next < now + 0.2) {
    const [note, beats] = MELODY[music.index];
    tone(midiFrequency(note + 12), beats * beat * 0.9, { type: "triangle", volume: 0.05, at: music.next });
    music.next += beats * beat;
    music.index = (music.index + 1) % MELODY.length;
  }
  while (music.bassNext < now + 0.2) {
    tone(midiFrequency(BASS[music.bassIndex]), beat * 1.6, { type: "square", volume: 0.035, at: music.bassNext });
    music.bassNext += beat * 2;
    music.bassIndex = (music.bassIndex + 1) % BASS.length;
  }
}

function updateMuteLabel() {
  muteButton.textContent = stats.muted ? "Lyd: fra" : "Lyd: til";
  muteButton.setAttribute("aria-pressed", String(stats.muted));
}

function toggleMute() {
  stats.muted = !stats.muted;
  saveStats();
  updateMuteLabel();
  if (audio.master) {
    audio.master.gain.value = stats.muted ? 0 : 0.8;
  }
}

muteButton.addEventListener("click", () => {
  toggleMute();
  muteButton.blur();
});

/* ---------- Kulisser ---------- */

function makeLayer(width, height, draw) {
  const layer = document.createElement("canvas");
  layer.width = width * 2;
  layer.height = height * 2;
  const layerContext = layer.getContext("2d");
  layerContext.scale(2, 2);
  draw(layerContext);
  return layer;
}

const background = makeLayer(W, H, (g) => {
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#0a0e2c");
  sky.addColorStop(0.6, "#1e1642");
  sky.addColorStop(1, "#40204a");
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);

  for (let i = 0; i < 130; i++) {
    g.fillStyle = `rgba(255,255,255,${(0.2 + Math.random() * 0.6).toFixed(2)})`;
    g.fillRect(Math.random() * W, Math.random() * 520, 1.5, 1.5);
  }

  const glow = g.createRadialGradient(92, 300, 20, 92, 300, 150);
  glow.addColorStop(0, "rgba(255,120,90,0.35)");
  glow.addColorStop(1, "rgba(255,120,90,0)");
  g.fillStyle = glow;
  g.fillRect(0, 140, 260, 320);
  g.fillStyle = "#e88a6a";
  g.beginPath();
  g.arc(92, 300, 44, 0, TAU);
  g.fill();
  g.fillStyle = "rgba(160,70,60,0.5)";
  for (const [x, y, r] of [[78, 288, 9], [108, 312, 12], [100, 280, 5]]) {
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
  }

  g.fillStyle = "#1a1b47";
  g.beginPath();
  g.moveTo(0, 640);
  g.quadraticCurveTo(140, 560, 290, 640);
  g.quadraticCurveTo(420, 590, W, 630);
  g.lineTo(W, H);
  g.lineTo(0, H);
  g.fill();

  for (const [x, width, height] of [[28, 66, 46], [116, 54, 38], [196, 76, 54], [300, 58, 42], [388, 72, 50], [474, 50, 36]]) {
    const base = 744;
    g.fillStyle = "#15133a";
    g.fillRect(x, base - height, width, height);
    g.fillStyle = "#cfd8ef";
    g.beginPath();
    g.moveTo(x - 7, base - height);
    g.lineTo(x + width / 2, base - height - 26);
    g.lineTo(x + width + 7, base - height);
    g.fill();
    g.fillStyle = "#c98b3a";
    g.fillRect(x + width * 0.2, base - height * 0.7, 11, 13);
    g.fillRect(x + width * 0.62, base - height * 0.7, 11, 13);
  }

  g.fillStyle = "#333a68";
  g.beginPath();
  g.moveTo(0, 748);
  g.quadraticCurveTo(W / 2, 722, W, 750);
  g.lineTo(W, H);
  g.lineTo(0, H);
  g.fill();
});

const hotelLayer = makeLayer(W, H, (g) => {
  g.fillStyle = "#0d0a14";
  g.fillRect(0, 0, W, H);

  for (let row = 0; row < HOTEL_ROWS; row++) {
    for (let col = 0; col < HOTEL_COLUMNS; col++) {
      const x = col * TILE;
      const y = HOTEL_TOP + row * TILE;
      if (HOTEL_MAP[row][col] === ".") {
        g.fillStyle = (row + col) % 2 ? "#5e1c2e" : "#54182a";
        g.fillRect(x, y, TILE, TILE);
        g.fillStyle = "rgba(242,193,78,0.22)";
        g.beginPath();
        g.moveTo(x + 30, y + 21);
        g.lineTo(x + 39, y + 30);
        g.lineTo(x + 30, y + 39);
        g.lineTo(x + 21, y + 30);
        g.fill();
      } else {
        g.fillStyle = "#2c1d24";
        g.fillRect(x, y, TILE, TILE);
        g.fillStyle = "#47303a";
        g.fillRect(x + 1, y + 1, TILE - 2, 12);
      }
    }
  }

  // Senge i rummene nederst.
  for (const col of [1, 3, 5, 7]) {
    const x = col * TILE + 12;
    const y = HOTEL_TOP + 10 * TILE + 8;
    g.fillStyle = "#3f6fb0";
    g.fillRect(x, y, 36, 44);
    g.fillStyle = "#f4f1ea";
    g.fillRect(x + 5, y + 4, 26, 11);
  }

  g.fillStyle = "#f2c14e";
  g.font = "900 26px system-ui, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("HOTEL JULEGÅRDEN", W / 2, HOTEL_TOP + 34);
});

function makeAngryGift(color, ribbon, white) {
  const c = (value) => (white ? "#ffffff" : value);
  return makeLayer(150, 150, (g) => {
    g.translate(75, 75);
    g.fillStyle = c(color);
    g.fillRect(-56, -40, 112, 100);
    g.fillStyle = c(ribbon);
    g.fillRect(-9, -40, 18, 100);
    g.fillRect(-64, -52, 128, 22);
    g.fillStyle = c(color);
    g.fillRect(-64, -52, 50, 22);
    g.fillRect(14, -52, 50, 22);

    g.fillStyle = c(ribbon);
    for (const side of [-1, 1]) {
      g.beginPath();
      g.moveTo(0, -52);
      g.quadraticCurveTo(side * 42, -86, side * 44, -56);
      g.quadraticCurveTo(side * 26, -48, 0, -52);
      g.fill();
    }

    g.fillStyle = c("#ffffff");
    g.beginPath();
    g.ellipse(-27, -4, 17, 14, 0, 0, TAU);
    g.ellipse(27, -4, 17, 14, 0, 0, TAU);
    g.fill();
    g.fillStyle = c("#c30010");
    g.beginPath();
    g.arc(-23, -2, 7, 0, TAU);
    g.arc(23, -2, 7, 0, TAU);
    g.fill();

    g.strokeStyle = c("#17110f");
    g.lineWidth = 9;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(-46, -24);
    g.lineTo(-10, -9);
    g.moveTo(46, -24);
    g.lineTo(10, -9);
    g.stroke();

    g.fillStyle = c("#17110f");
    g.fillRect(-36, 24, 72, 24);
    g.fillStyle = c("#ffffff");
    for (let x = -36; x < 36; x += 12) {
      g.beginPath();
      g.moveTo(x, 24);
      g.lineTo(x + 12, 24);
      g.lineTo(x + 6, 40);
      g.fill();
    }
  });
}

const giftSprites = {
  red: makeAngryGift("#c81e2c", "#f2c14e"),
  green: makeAngryGift("#1f8f50", "#e8e6e0"),
  blue: makeAngryGift("#2b62c4", "#f2c14e"),
  flash: makeAngryGift("#ffffff", "#ffffff", true),
  frozen: makeAngryGift("#9fd8ff", "#e8f6ff"),
};

function makeSprite(size, draw) {
  return makeLayer(size, size, (g) => {
    g.translate(size / 2, size / 2);
    draw(g);
  });
}

const sprites = {
  coal: makeSprite(26, (g) => {
    g.fillStyle = "#ff7a2f";
    g.beginPath();
    g.arc(0, 0, 9, 0, TAU);
    g.fill();
    g.fillStyle = "#2a1712";
    g.beginPath();
    g.arc(0, 0, 6, 0, TAU);
    g.fill();
    g.fillStyle = "#ffcf70";
    g.fillRect(-2, -3, 2, 2);
    g.fillRect(1, 1, 2, 2);
  }),
  candy: makeSprite(26, (g) => {
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.arc(0, 0, 9, 0, TAU);
    g.fill();
    g.fillStyle = "#e0222f";
    for (let i = 0; i < 4; i++) {
      const angle = (i * TAU) / 4;
      g.beginPath();
      g.moveTo(0, 0);
      g.arc(0, 0, 9, angle, angle + 0.8);
      g.fill();
    }
  }),
  present: makeSprite(36, (g) => {
    g.fillStyle = "#23a35a";
    g.fillRect(-12, -12, 24, 24);
    g.fillStyle = "#f2c14e";
    g.fillRect(-3, -12, 6, 24);
    g.fillRect(-12, -3, 24, 6);
    g.strokeStyle = "#ffffff";
    g.lineWidth = 1.5;
    g.strokeRect(-12, -12, 24, 24);
  }),
  ornament: makeSprite(36, (g) => {
    g.fillStyle = "#f2c14e";
    g.beginPath();
    g.arc(0, 1, 12, 0, TAU);
    g.fill();
    g.fillStyle = "#c81e2c";
    g.fillRect(-11, -2, 22, 6);
    g.fillStyle = "#cfd3e0";
    g.fillRect(-3, -15, 6, 5);
    g.fillStyle = "rgba(255,255,255,0.8)";
    g.beginPath();
    g.arc(-5, -5, 3, 0, TAU);
    g.fill();
  }),
};

const snow = Array.from({ length: 70 }, () => ({
  x: Math.random() * W,
  y: Math.random() * H,
  size: rand(0.8, 2.2),
  speed: rand(25, 75),
  sway: rand(0, TAU),
}));

function updateSnow(dt) {
  for (const flake of snow) {
    flake.y += flake.speed * dt;
    flake.sway += dt;
    flake.x += Math.sin(flake.sway) * 12 * dt;
    if (flake.y > H) {
      flake.y = -4;
      flake.x = Math.random() * W;
    }
  }
}

/* ---------- Tegning ---------- */

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
}

window.addEventListener("resize", resizeCanvas);

function circle(x, y, radius) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
}

function ellipse(x, y, radiusX, radiusY) {
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, 0, 0, TAU);
  ctx.fill();
}

function stroke(width, color, points) {
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
}

function drawSanta() {
  const santa = game.santa;
  if (santa.gone) {
    return;
  }
  const white = santa.flash > 0;
  const c = (color) => (white ? "#ffffff" : color);
  const enraged = game.phase === 3;

  ctx.save();
  ctx.translate(santa.x, santa.y + Math.sin(santa.time * 5) * 2);
  ctx.rotate(santa.tilt);
  ctx.scale(santa.scale, santa.scale);

  stroke(4, c("#c9c9d6"), [[-56, 38], [48, 38]]);
  ctx.strokeStyle = c("#c9c9d6");
  ctx.beginPath();
  ctx.moveTo(48, 38);
  ctx.quadraticCurveTo(68, 38, 72, 20);
  ctx.stroke();
  stroke(4, c("#c9c9d6"), [[-30, 26], [-30, 38]]);
  stroke(4, c("#c9c9d6"), [[26, 26], [26, 38]]);

  ctx.fillStyle = c("#5b0f1a");
  ctx.beginPath();
  ctx.moveTo(-50, 0);
  ctx.lineTo(40, 0);
  ctx.quadraticCurveTo(62, -2, 60, -22);
  ctx.quadraticCurveTo(74, 8, 44, 27);
  ctx.lineTo(-44, 27);
  ctx.quadraticCurveTo(-56, 16, -50, 0);
  ctx.fill();
  stroke(3, c("#e3b341"), [[-47, 7], [46, 7]]);

  const shake = Math.sin(santa.time * 18) * 4;
  stroke(12, c("#a80f1b"), [[-24, -26], [-44, -46 + shake]]);
  stroke(12, c("#a80f1b"), [[24, -26], [46, -42 - shake]]);
  ctx.fillStyle = c("#17110f");
  circle(-46, -49 + shake, 8);
  circle(49, -45 - shake, 8);

  ctx.fillStyle = c("#b3121d");
  ellipse(0, -14, 30, 28);
  ctx.fillStyle = c("#17110f");
  ctx.fillRect(-29, -9, 58, 8);
  ctx.fillStyle = c("#e3b341");
  ctx.fillRect(-6, -11, 12, 12);

  ctx.fillStyle = c(enraged ? "#e8836b" : "#e7b89b");
  circle(0, -48, 17);

  ctx.fillStyle = c("#e8e6e0");
  ctx.beginPath();
  [[-19, -52], [-23, -33], [-13, -37], [-11, -21], [-4, -30], [0, -15], [4, -30], [11, -21], [13, -37], [23, -33], [19, -52], [10, -46], [-10, -46]]
    .forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.fill();

  ctx.fillStyle = c("#1a0c0c");
  ctx.fillRect(-10, -45, 20, 8);
  ctx.fillStyle = c("#ffffff");
  for (let x = -10; x < 10; x += 5) {
    ctx.beginPath();
    ctx.moveTo(x, -45);
    ctx.lineTo(x + 5, -45);
    ctx.lineTo(x + 2.5, -39);
    ctx.fill();
  }

  if (enraged && !white) {
    ctx.fillStyle = "rgba(255,50,30,0.35)";
    circle(-7, -54, 10);
    circle(7, -54, 10);
  }
  ctx.fillStyle = c("#ffdf3e");
  circle(-7, -54, 4.2);
  circle(7, -54, 4.2);
  ctx.fillStyle = c("#c30010");
  circle(-7, -54, 2.2);
  circle(7, -54, 2.2);
  stroke(4, c("#17110f"), [[-15, -62], [-3, -57]]);
  stroke(4, c("#17110f"), [[15, -62], [3, -57]]);

  ctx.fillStyle = c("#b3121d");
  ctx.beginPath();
  ctx.moveTo(-18, -62);
  ctx.quadraticCurveTo(-10, -94, 28, -84);
  ctx.quadraticCurveTo(8, -78, 18, -62);
  ctx.fill();
  ctx.fillStyle = c("#f4f1ea");
  ctx.beginPath();
  ctx.roundRect(-20, -68, 40, 9, 4);
  ctx.fill();
  circle(30, -82, 6);

  ctx.restore();
}

function drawPlayer() {
  const player = game.player;
  if (player.dead || (player.invulnerable > 0 && Math.floor(player.invulnerable * 12) % 2 === 0)) {
    return;
  }

  ctx.save();
  ctx.translate(player.x, player.y);

  if (player.shields > 0) {
    ctx.fillStyle = "rgba(127,209,255,0.22)";
    circle(0, -4, 36);
    ctx.strokeStyle = "#bfe6ff";
    ctx.lineWidth = 1 + player.shields * 1.5;
    ctx.beginPath();
    ctx.arc(0, -4, 36, 0, TAU);
    ctx.stroke();
  }

  // Kanonen bliver større og mere gylden for hvert niveau.
  const cannonWidth = 5 + cannonLevel * 2;
  ctx.fillStyle = cannonLevel >= 3 ? "#d9a93a" : "#6c7380";
  ctx.fillRect(8, -26, cannonWidth, 24);
  ctx.fillStyle = cannonLevel >= 3 ? "#fff0b0" : "#3d434e";
  ctx.fillRect(7, -29, cannonWidth + 2, 5);

  ctx.fillStyle = "#3a2318";
  ellipse(-6, 20, 6, 3.5);
  ellipse(6, 20, 6, 3.5);
  ctx.fillStyle = "#2f9a55";
  ellipse(0, 9, 12, 12);

  ctx.fillStyle = "#f0c9a8";
  circle(0, -8, 9.5);
  ctx.fillStyle = "#f4f1ea";
  ellipse(0, -2, 8.5, 5);

  ctx.fillStyle = "#e0222f";
  ctx.beginPath();
  ctx.moveTo(-11, -11);
  ctx.quadraticCurveTo(-6, -36, -18, -36);
  ctx.quadraticCurveTo(4, -34, 11, -11);
  ctx.fill();
  ctx.fillStyle = "#f4f1ea";
  circle(-18, -36, 3.5);

  ctx.fillStyle = "#1b1b2d";
  circle(-3.5, -9, 1.5);
  circle(3.5, -9, 1.5);

  if (game.stage === 3) {
    const [facingX, facingY] = player.facing;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(facingX * 36, facingY * 36);
    ctx.lineTo(facingX * 26 + facingY * 7, facingY * 26 + facingX * 7);
    ctx.lineTo(facingX * 26 - facingY * 7, facingY * 26 - facingX * 7);
    ctx.fill();
  }

  ctx.fillStyle = "#c2185b";
  circle(0, 0, PLAYER_HIT_RADIUS + 1.8);
  ctx.fillStyle = "#ffffff";
  circle(0, 0, PLAYER_HIT_RADIUS);

  ctx.restore();
}

function drawBullet(bullet) {
  if (bullet.kind === "reindeer") {
    drawReindeer(bullet);
    return;
  }
  const sprite = sprites[bullet.kind];
  if (bullet.kind === "ornament" && bullet.fuse < 0.35 && Math.floor(bullet.fuse * 20) % 2 === 0) {
    ctx.fillStyle = "#ffffff";
    circle(bullet.x, bullet.y, 14);
  }
  const size = sprite.width / 2;
  ctx.save();
  ctx.translate(bullet.x, bullet.y);
  ctx.rotate(bullet.rot);
  ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
  ctx.restore();
}

function drawReindeer(bullet) {
  ctx.save();
  ctx.translate(bullet.x, bullet.y);
  ctx.scale(bullet.facing, 1);

  const gallop = Math.sin(game.santa.time * 40) * 8;
  stroke(5, "#4a2c1a", [[-20, 8], [-28 - gallop, 25]]);
  stroke(5, "#4a2c1a", [[20, 8], [28 + gallop, 25]]);
  ctx.fillStyle = "#6a4128";
  ellipse(0, 0, 31, 15);
  ctx.fillStyle = "#7a4c30";
  ellipse(31, -13, 13, 9);
  stroke(3, "#d8c9a8", [[27, -20], [20, -38], [11, -44]]);
  stroke(3, "#d8c9a8", [[23, -30], [32, -41]]);
  ctx.fillStyle = "#ff2030";
  circle(44, -13, 5);
  ctx.fillStyle = "#ffdf3e";
  circle(32, -16, 3);

  ctx.restore();
}

function drawWarnings() {
  for (const warning of game.warnings) {
    const pulse = 0.2 + 0.2 * Math.abs(Math.sin(warning.time * 16));
    ctx.fillStyle = `rgba(255,40,50,${pulse})`;
    ctx.fillRect(0, warning.y - 26, W, 52);
    ctx.fillStyle = "#ffdf3e";
    ctx.font = "900 34px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("!", warning.direction > 0 ? 24 : W - 24, warning.y);
  }
}

function drawTaunt() {
  if (!game.taunt || game.santa.gone) {
    return;
  }
  ctx.font = "700 15px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const width = ctx.measureText(game.taunt.text).width + 22;
  const x = clamp(game.santa.x - width / 2, 8, W - width - 8);
  const y = clamp(game.santa.y + 50 * game.santa.scale, 40, H - 70);
  ctx.fillStyle = "#f6f4ee";
  ctx.beginPath();
  ctx.roundRect(x, y, width, 28, 8);
  ctx.fill();
  ctx.fillStyle = "#7c0f18";
  ctx.fillText(game.taunt.text, x + width / 2, y + 14);
}

function drawGift(gift) {
  const scale = gift.r / 60;
  const size = 150 * scale;
  let sprite = giftSprites[gift.color];
  if (gift.stun > 1 || (gift.stun > 0 && Math.floor(gift.stun * 10) % 2 === 0)) {
    sprite = giftSprites.frozen;
  } else if (gift.flash > 0 || (gift.windup > 0 && Math.floor(gift.windup * 16) % 2 === 0)) {
    sprite = giftSprites.flash;
  }
  const shake = gift.windup > 0 ? rand(-3, 3) : Math.sin(gift.time * 6) * gift.r * 0.06;
  ctx.drawImage(sprite, gift.x - size / 2 + shake, gift.y - size / 2, size, size);

  if (gift.stun > 0) {
    ctx.fillStyle = "rgba(5,7,26,0.75)";
    ctx.fillRect(gift.x - 17, gift.y - 28, 34, 6);
    ctx.fillStyle = "#bfe6ff";
    ctx.fillRect(gift.x - 16, gift.y - 27, 32 * (gift.stun / HOTEL_STUN_TIME), 4);
  }

  if (gift.type === "giant") {
    ctx.fillStyle = "rgba(5,7,26,0.75)";
    ctx.fillRect(gift.x - 62, gift.y - 92, 124, 10);
    ctx.fillStyle = "#e0222f";
    ctx.fillRect(gift.x - 60, gift.y - 90, 120 * (gift.hp / GIFT_TYPES.giant.hp), 6);
  }
}

function drawHudStatus() {
  if (game.stage === 1) {
    const barX = 18;
    const barWidth = W - 36;
    ctx.fillStyle = "rgba(5,7,26,0.75)";
    ctx.fillRect(barX - 3, 13, barWidth + 6, 18);
    ctx.fillStyle = "#e0222f";
    ctx.fillRect(barX, 16, barWidth * (game.santa.hp / MAX_HP), 12);
    ctx.fillStyle = "#05071a";
    for (let i = 1; i < 4; i++) {
      ctx.fillRect(barX + (barWidth * i) / 4 - 1.5, 13, 3, 18);
    }
    return;
  }

  ctx.fillStyle = "#f6f4ee";
  ctx.font = "800 20px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (game.stage === 2) {
    ctx.fillText(`Bølge ${game.waveIndex + 1} af ${GIFT_WAVES.length} · Sure gaver: ${game.gifts.length}`, W / 2, 22);
  } else {
    ctx.fillText(`Fang julemanden: ${game.catches} af ${HOTEL_CATCHES}`, W / 2, 22);
  }
}

function drawHud() {
  drawHudStatus();

  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = "700 20px system-ui, sans-serif";
  for (let i = 0; i < Math.max(MAX_LIVES, game.player.lives); i++) {
    ctx.fillStyle = i < game.player.lives ? "#ff4757" : "rgba(255,255,255,0.2)";
    ctx.fillText("♥", 14 + i * 20, H - 24);
  }
  ctx.fillStyle = "#f6f4ee";
  ctx.font = "700 18px system-ui, sans-serif";
  ctx.fillText(formatTime(runTime), 160, H - 23);
  ctx.fillText(`⭐ ${cannonLevel}`, 214, H - 23);

  let powerX = 272;
  if (game.player.shields > 0) {
    ctx.fillText(`🛡️ ${game.player.shields}`, powerX, H - 23);
    powerX += 56;
  }
  for (const [power, time] of Object.entries(game.player.powers)) {
    if (time > 0) {
      ctx.fillText(`${POWERS[power].icon} ${Math.ceil(time)}`, powerX, H - 23);
      powerX += 66;
    }
  }
}

const PICKUP_STYLES = {
  star: { icon: "⭐", color: "#fff3c4" },
  shield: { icon: "🛡️", color: "#bfe6ff" },
};

function drawPickup(pickup) {
  const y = pickup.y;
  const x = pickup.x + Math.sin(pickup.time * 4) * 6;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (pickup.kind === "heart") {
    ctx.fillStyle = "#ffffff";
    circle(x, y, 19);
    ctx.fillStyle = "#e0222f";
    ctx.font = "700 30px system-ui, sans-serif";
    ctx.fillText("♥", x, y + 1);
    return;
  }
  const style = PICKUP_STYLES[pickup.kind] || POWERS[pickup.kind];
  ctx.fillStyle = style.color;
  circle(x, y, 19);
  ctx.fillStyle = "#17110f";
  ctx.font = "22px system-ui, sans-serif";
  ctx.fillText(style.icon, x, y + 1);
}

function drawNotice() {
  if (!game.notice) {
    return;
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffe9a8";
  ctx.font = "800 20px system-ui, sans-serif";
  ctx.fillText(game.notice.text, clamp(game.player.x, 90, W - 90), game.player.y - 56);
}

function drawBanner() {
  if (!game.banner) {
    return;
  }
  ctx.globalAlpha = Math.min(1, game.banner.time * 2.5);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#f2c14e";
  ctx.font = "800 26px system-ui, sans-serif";
  ctx.fillText(game.banner.title, W / 2, 330);
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 44px system-ui, sans-serif";
  ctx.fillText(game.banner.subtitle, W / 2, 374);
  ctx.globalAlpha = 1;
}

function render() {
  const scale = canvas.width / W;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const indoors = game.stage === 3;
  ctx.drawImage(indoors ? hotelLayer : background, 0, 0, W, H);

  if (game.shake > 0) {
    ctx.translate(rand(-game.shake, game.shake), rand(-game.shake, game.shake));
  }

  if (!indoors) {
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (const flake of snow) {
      ctx.fillRect(flake.x, flake.y, flake.size, flake.size);
    }
  }

  const inGame = game.mode !== "menu";
  if (inGame) {
    drawWarnings();
  }
  drawSanta();
  if (inGame) {
    ctx.fillStyle = "#ffffff";
    for (const shot of game.shots) {
      circle(shot.x, shot.y, shot.r);
    }
    game.gifts.forEach(drawGift);
    game.chasers.forEach(drawGift);
    game.pickups.forEach(drawPickup);
    drawPlayer();
    game.bullets.forEach(drawBullet);
  }

  for (const particle of game.particles) {
    ctx.globalAlpha = particle.life / particle.total;
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  }
  ctx.globalAlpha = 1;

  if (inGame) {
    drawTaunt();
    drawNotice();
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    drawHud();
    drawBanner();
  }

  if (game.bombFlash > 0) {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = `rgba(255,255,255,${Math.min(1, game.bombFlash)})`;
    ctx.fillRect(0, 0, W, H);
  }

  if (game.hurtFlash > 0) {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = `rgba(255,30,40,${game.hurtFlash * 0.5})`;
    ctx.fillRect(0, 0, W, H);
  }
}

/* ---------- Hovedløkke ---------- */

let lastFrame = null;
let accumulator = 0;
let bombLabel = "";

function updateBombButton() {
  const visible = game.mode === "playing" && game.stage !== 3;
  if (bombButton.hidden === visible) {
    bombButton.hidden = !visible;
  }
  const label = game.bombCooldown > 0 ? `Bombe ${Math.ceil(game.bombCooldown)}` : "Bombe";
  if (label !== bombLabel) {
    bombLabel = label;
    bombButton.textContent = label;
    bombButton.disabled = game.bombCooldown > 0;
  }
}

function frame(now) {
  if (lastFrame !== null && game.mode !== "paused") {
    accumulator += Math.min((now - lastFrame) / 1000, 0.1);
    while (accumulator >= STEP) {
      update(STEP);
      accumulator -= STEP;
    }
  }
  lastFrame = now;
  scheduleMusic();
  updateBombButton();
  render();
  requestAnimationFrame(frame);
}

updateMuteLabel();
resizeCanvas();
showMenu();
requestAnimationFrame(frame);
