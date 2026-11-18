// Pedestrians: locals strolling the sidewalks, who flee when a shot is fired
// or a car bears down on them. Plain data; rendering lives in render.js.
import { CITY } from './config.js';
import { roadCenters } from './city.js';

const SHIRTS = [0xe74c3c, 0x3498db, 0xf1c40f, 0x2ecc71, 0xecf0f1, 0xe67e22, 0x9b59b6, 0x1abc9c];
const SKINS = [0xe8b88a, 0xc98d5f, 0x8a5a3b, 0xf2c9a0];

export function spawnPedestrians(random, city) {
  const xs = roadCenters();
  const peds = [];
  for (let i = 0; i < 26; i += 1) {
    const vertical = random.next() < 0.5;
    const line = random.pick(xs);
    const along = random.range(-CITY.size / 2 + 20, CITY.size / 2 - 20);
    const side = random.next() < 0.5 ? -1 : 1;
    const off = side * (CITY.road / 2 + 2.5);
    peds.push({
      x: vertical ? line + off : along,
      z: vertical ? along : line + off,
      heading: random.range(0, Math.PI * 2),
      speed: random.range(1.2, 2.2),
      shirt: random.pick(SHIRTS),
      skin: random.pick(SKINS),
      fleeing: 0,
      walkPhase: random.range(0, Math.PI * 2),
    });
  }
  return peds;
}

// One step: stroll along the sidewalk; flee from `danger` (player/car/gunfire).
export function updatePedestrians(peds, dt, danger, city) {
  const lim = CITY.size / 2 + 10;
  for (const p of peds) {
    let hx = Math.sin(p.heading);
    let hz = Math.cos(p.heading);
    if (danger) {
      const dx = p.x - danger.x;
      const dz = p.z - danger.z;
      const d = Math.hypot(dx, dz);
      if (d < 14) {
        p.fleeing = 2;
        p.heading = Math.atan2(dx / (d || 1), dz / (d || 1));
        hx = Math.sin(p.heading);
        hz = Math.cos(p.heading);
      }
    }
    const speed = p.fleeing > 0 ? 5.5 : p.speed;
    p.fleeing = Math.max(0, p.fleeing - dt);
    p.x += hx * speed * dt;
    p.z += hz * speed * dt;
    p.walkPhase += dt * (p.fleeing > 0 ? 12 : 6);
    if (Math.abs(p.x) > lim || Math.abs(p.z) > lim) {
      p.heading += Math.PI;
      p.x = Math.max(-lim, Math.min(lim, p.x));
      p.z = Math.max(-lim, Math.min(lim, p.z));
    }
  }
}
