// Vehicles: drivable cars, parked cars to steal, and AI traffic that loops
// the road grid. A car is plain data (x, z, heading, speed); rendering lives
// in render.js. Driving is simple arcade physics: accelerate, steer by speed,
// drag, and a hard stop on buildings.
import { CAR, CITY } from './config.js';
import { hitsBuilding, clampToCity, roadCenters } from './city.js';

const CAR_COLORS = [0xc0392b, 0x2e86c1, 0xf1c40f, 0x27ae60, 0xecf0f1, 0x1a1a1a, 0xe67e22, 0x8e44ad, 0x16a085, 0xbdc3c7];
const CAR_NAMES = ['Alba GT', 'Solano', 'Brisa', 'Coral Coupe', 'Palmera', 'Viento', 'Marina', 'Toro'];

export function makeCar(random, x, z, heading, opts) {
  const o = opts || {};
  return {
    x, z, heading, speed: 0,
    color: o.color ?? random.pick(CAR_COLORS),
    name: o.name ?? random.pick(CAR_NAMES),
    isPlayer: false,
    isCop: !!o.isCop,
    isTraffic: !!o.isTraffic,
    route: o.route || null, // traffic: { axis: 'x'|'z', line, dir }
    stuck: 0,
    crashed: false,
  };
}

export function spawnParkedCars(random, city) {
  const cars = [];
  const xs = roadCenters();
  for (let i = 0; i < 10; i += 1) {
    const vertical = random.next() < 0.5;
    const line = random.pick(xs);
    const along = random.range(-CITY.size / 2 + 30, CITY.size / 2 - 30);
    const off = (random.next() < 0.5 ? -1 : 1) * (CITY.road / 2 - 2.2);
    const x = vertical ? line + off : along;
    const z = vertical ? along : line + off;
    cars.push(makeCar(random, x, z, vertical ? 0 : Math.PI / 2));
  }
  return cars;
}

export function spawnTraffic(random, city) {
  const cars = [];
  const xs = roadCenters();
  for (let i = 0; i < 14; i += 1) {
    const vertical = random.next() < 0.5;
    const line = random.pick(xs);
    const along = random.range(-CITY.size / 2 + 20, CITY.size / 2 - 20);
    const dir = random.next() < 0.5 ? 1 : -1;
    const off = dir * 2.6;
    const x = vertical ? line + off : along;
    const z = vertical ? along : line + off;
    const car = makeCar(random, x, z, vertical ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2), { isTraffic: true });
    car.speed = random.range(7, 11);
    car.route = { axis: vertical ? 'z' : 'x', line, dir };
    cars.push(car);
  }
  return cars;
}

function forward(car) {
  return { x: Math.sin(car.heading), z: Math.cos(car.heading) };
}

// Drive the player's car one step. Returns true when it hit something hard.
export function driveCar(car, axis, dt, city, others) {
  const f = forward(car);
  const target = axis.y > 0 ? CAR.accel : axis.y < 0 ? -CAR.brake : 0;
  car.speed += target * dt;
  car.speed -= car.speed * CAR.drag * dt;
  if (axis.y === 0 && Math.abs(car.speed) < 0.4) car.speed = 0;
  car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, car.speed));
  const steer = axis.x * CAR.turn * Math.min(1, Math.abs(car.speed) / 8);
  car.heading -= steer * dt * Math.sign(car.speed || 1);
  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  const clamped = clampToCity(nx, nz, 2);
  if (hitsBuilding(city, clamped.x, clamped.z, 2.2)) {
    car.speed *= -0.25;
    return true;
  }
  for (const o of others) {
    if (o === car) continue;
    const dx = clamped.x - o.x;
    const dz = clamped.z - o.z;
    const d = Math.hypot(dx, dz);
    if (d < 3.4 && d > 0.01) {
      // Shove the other car aside instead of stopping dead: a parked car
      // must never block a road forever, and a ram should feel like a ram.
      const push = (3.4 - d) * 0.7;
      o.x -= (dx / d) * push;
      o.z -= (dz / d) * push;
      car.speed *= 0.7;
    }
  }
  car.x = clamped.x;
  car.z = clamped.z;
  return false;
}

// Traffic: cruise along its road; at the city edge turn onto a new road.
export function updateTraffic(car, dt, city, random) {
  const f = forward(car);
  const speed = 8 + Math.sin(car.heading * 3) * 0.5;
  car.speed = speed;
  let nx = car.x + f.x * speed * dt;
  let nz = car.z + f.z * speed * dt;
  const lim = CITY.size / 2 - 4;
  if (Math.abs(nx) > lim || Math.abs(nz) > lim) {
    // Turn around at the edge: pick a fresh road and head back.
    const xs = roadCenters();
    const line = random.pick(xs);
    const vertical = random.next() < 0.5;
    const dir = random.next() < 0.5 ? 1 : -1;
    car.route = { axis: vertical ? 'z' : 'x', line, dir };
    car.heading = vertical ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    nx = vertical ? line + dir * 2.6 : car.x;
    nz = vertical ? car.z : line + dir * 2.6;
    car.x = Math.max(-lim, Math.min(lim, nx));
    car.z = Math.max(-lim, Math.min(lim, nz));
    return;
  }
  car.x = nx;
  car.z = nz;
}
