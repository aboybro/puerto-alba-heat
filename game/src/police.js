// Police: wanted level, patrol cars that chase and ram the player, and the
// police helicopter that circles at high wanted levels. Plain data + rules;
// rendering lives in render.js.
import { COP_MAX } from './config.js';
import { makeCar } from './vehicles.js';

export function wantedFor(stars) {
  return Math.max(0, Math.min(5, stars));
}

// How many cop cars the current wanted level fields.
export function copsWanted(stars) {
  return stars <= 0 ? 0 : stars === 1 ? 1 : stars === 2 ? 2 : stars === 3 ? 3 : stars === 4 ? 4 : COP_MAX;
}

export function heliWanted(stars) {
  return stars >= 3;
}

export function spawnCop(random, x, z) {
  const car = makeCar(random, x, z, 0, { isCop: true, color: 0x1a2a4a, name: 'APD Interceptor' });
  car.speed = 0;
  return car;
}

// Chase: steer toward the player, faster than traffic, ramming on contact.
export function updateCop(car, playerPos, dt, city) {
  const dx = playerPos.x - car.x;
  const dz = playerPos.z - car.z;
  const dist = Math.hypot(dx, dz) || 1;
  const want = Math.atan2(dx, dz);
  let diff = want - car.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
  const target = Math.min(30, 16 + dist * 0.08);
  car.speed += (target - car.speed) * dt * 0.8;
  car.x += Math.sin(car.heading) * car.speed * dt;
  car.z += Math.cos(car.heading) * car.speed * dt;
  const lim = 300;
  car.x = Math.max(-lim, Math.min(lim, car.x));
  car.z = Math.max(-lim, Math.min(lim, car.z));
  return dist;
}

// Helicopter: circle above the player, slowly descending as wanted rises.
export function updateHeli(heli, playerPos, dt, stars) {
  heli.angle += dt * 0.55;
  const radius = 26 - stars * 1.5;
  heli.x = playerPos.x + Math.sin(heli.angle) * radius;
  heli.z = playerPos.z + Math.cos(heli.angle) * radius;
  heli.y += ((24 - stars) - heli.y) * dt * 0.5;
  heli.rotor += dt * 22;
}
