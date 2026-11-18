// Combat: fists and a pistol, enemy thugs, bullets, muzzle sparks and hit
// particles. All plain data; render.js draws bullets, enemies and particles.
import { PLAYER } from './config.js';

export function makeEnemy(random, x, z) {
  return {
    x, z, heading: random.range(0, Math.PI * 2),
    hp: 60, maxHp: 60, speed: random.range(2.4, 3.4),
    shootTimer: random.range(1, 2.5), alive: true,
    punchTimer: 0,
  };
}

export function spawnThugs(random, x, z, count) {
  const list = [];
  for (let i = 0; i < count; i += 1) {
    list.push(makeEnemy(random, x + random.range(-14, 14), z + random.range(-10, 10)));
  }
  return list;
}

// A bullet: straight line, fixed life, hits the first enemy or building.
export function fireBullet(state, from, heading, isPlayer) {
  state.bullets.push({
    x: from.x, z: from.z, heading,
    speed: 55, life: 1.6, isPlayer,
  });
}

export function updateBullets(state, dt, city, hitsBuilding) {
  for (const b of state.bullets) {
    b.x += Math.sin(b.heading) * b.speed * dt;
    b.z += Math.cos(b.heading) * b.speed * dt;
    b.life -= dt;
    if (hitsBuilding(city, b.x, b.z, 0.2)) b.life = 0;
    for (const e of state.enemies) {
      if (!e.alive) continue;
      if (Math.hypot(e.x - b.x, e.z - b.z) < 1.1) {
        e.hp -= b.isPlayer ? 34 : 0;
        b.life = 0;
        state.particles.push({ x: b.x, z: b.z, vx: 0, vy: 2, vz: 0, life: 0.4, color: 0xff5533 });
        if (e.hp <= 0) {
          e.alive = false;
          state.particles.push({ x: e.x, z: e.z, vx: 0, vy: 3, vz: 0, life: 0.7, color: 0x888888 });
        }
        break;
      }
    }
    // Enemy bullets can hit the player.
    if (!b.isPlayer && Math.hypot(state.player.x - b.x, state.player.z - b.z) < 1.0) {
      state.player.hp -= 12;
      state.shake = Math.max(state.shake, 0.5);
      b.life = 0;
    }
  }
  state.bullets = state.bullets.filter((b) => b.life > 0);
  state.enemies = state.enemies.filter((e) => e.alive);
}

// Thugs walk at the player and shoot when close enough.
export function updateEnemies(state, dt, audio) {
  for (const e of state.enemies) {
    const dx = state.player.x - e.x;
    const dz = state.player.z - e.z;
    const d = Math.hypot(dx, dz) || 1;
    if (d > 3) {
      e.heading = Math.atan2(dx, dz);
      e.x += Math.sin(e.heading) * e.speed * dt;
      e.z += Math.cos(e.heading) * e.speed * dt;
    }
    e.shootTimer -= dt;
    if (e.shootTimer <= 0 && d < 26) {
      e.shootTimer = 2.2;
      fireBullet(state, { x: e.x, z: e.z }, Math.atan2(dx, dz), false);
      if (audio) audio.shoot();
    }
    if (d < 1.8) {
      e.punchTimer -= dt;
      if (e.punchTimer <= 0) {
        e.punchTimer = 1.1;
        state.player.hp -= 8;
        state.shake = Math.max(state.shake, 0.4);
        if (audio) audio.hit();
      }
    }
  }
}

// A fist swing: anything within 2.2 m in front takes 25 damage.
export function punch(state, audio) {
  const p = state.player;
  const fx = Math.sin(p.heading);
  const fz = Math.cos(p.heading);
  let hitAny = false;
  for (const e of state.enemies) {
    const dx = e.x - p.x;
    const dz = e.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 2.4 && (dx * fx + dz * fz) / (d || 1) > 0.3) {
      e.hp -= 25;
      hitAny = true;
      state.particles.push({ x: e.x, z: e.z, vx: 0, vy: 2, vz: 0, life: 0.3, color: 0xffcc33 });
      if (e.hp <= 0) e.alive = false;
    }
  }
  for (const ped of state.peds) {
    const dx = ped.x - p.x;
    const dz = ped.z - p.z;
    if (Math.hypot(dx, dz) < 2.2) {
      ped.fleeing = 3;
      ped.heading = Math.atan2(dx, dz);
      hitAny = true;
    }
  }
  state.enemies = state.enemies.filter((e) => e.alive);
  if (audio) audio.punch();
  return hitAny;
}

export function updateParticles(state, dt) {
  for (const pt of state.particles) {
    pt.life -= dt;
    pt.x += (pt.vx || 0) * dt;
    pt.z += (pt.vz || 0) * dt;
  }
  state.particles = state.particles.filter((pt) => pt.life > 0);
}
