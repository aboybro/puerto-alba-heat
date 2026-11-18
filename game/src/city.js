// Puerto Alba itself: a sun-soaked coastal grid city, generated from a seed.
// Roads run both ways on a 7x7 block grid; the east edge is a beach, the
// south edge a harbour with docks and cranes. Buildings are boxes with
// varied heights and warm stucco colours; lamps, palms and parked cars line
// the streets. Pure data + static meshes: no textures, no network.
import { CITY } from './config.js';

const BUILDING_COLORS = [0xf2e3c6, 0xe8b48a, 0xd97b5f, 0x9fc3d8, 0xf6d9a0, 0xc9a06a, 0x7fb3a0, 0xe8e0d0, 0xb98a6e, 0x8fb8c9];
const ROOF_COLORS = [0x8a4a3a, 0x5a6e7a, 0x7a5a3a, 0x4a5a6a];

export function roadCenters() {
  // Centrelines of the roads, in both directions.
  const n = CITY.blocks + 1;
  const pitch = CITY.block + CITY.road;
  const start = -CITY.size / 2 + CITY.road / 2;
  const xs = [];
  for (let i = 0; i < n; i += 1) xs.push(start + i * pitch);
  return xs;
}

export function createCity(random) {
  const xs = roadCenters();
  const half = CITY.size / 2;
  const buildings = [];
  const lamps = [];
  const trees = [];
  const parks = [];

  for (let bx = 0; bx < CITY.blocks; bx += 1) {
    for (let bz = 0; bz < CITY.blocks; bz += 1) {
      const x0 = -half + CITY.road + bx * (CITY.block + CITY.road);
      const z0 = -half + CITY.road + bz * (CITY.block + CITY.road);
      // A few blocks are plazas with palms instead of towers.
      if (random.next() < 0.12) {
        parks.push({ x: x0 + CITY.block / 2, z: z0 + CITY.block / 2 });
        for (let t = 0; t < 5; t += 1) {
          trees.push({ x: x0 + 8 + random.next() * (CITY.block - 16), z: z0 + 8 + random.next() * (CITY.block - 16) });
        }
        continue;
      }
      const nB = random.int(1, 3);
      for (let b = 0; b < nB; b += 1) {
        const w = random.range(12, 22);
        const d = random.range(12, 22);
        const h = random.range(8, 34);
        const x = x0 + w / 2 + random.next() * Math.max(1, CITY.block - w - 4);
        const z = z0 + d / 2 + random.next() * Math.max(1, CITY.block - d - 4);
        buildings.push({
          x, z, w, d, h,
          color: random.pick(BUILDING_COLORS),
          roof: random.pick(ROOF_COLORS),
          windows: random.next() < 0.7,
        });
      }
      if (random.next() < 0.7) {
        trees.push({ x: x0 + 6 + random.next() * 8, z: z0 + 6 + random.next() * 8 });
      }
    }
  }
  // Street lamps along every road, every other block.
  for (const x of xs) {
    for (let bz = 0; bz < CITY.blocks; bz += 1) {
      const z = -half + CITY.road + bz * (CITY.block + CITY.road) + CITY.block / 2;
      if ((bxIndex(x) + bz) % 2 === 0) lamps.push({ x: x + CITY.road / 2 - 0.8, z });
    }
  }
  function bxIndex(x) { return xs.indexOf(x); }

  // Harbour cranes and dock boxes on the south edge.
  const cranes = [];
  for (let i = 0; i < 3; i += 1) cranes.push({ x: -120 + i * 120, z: CITY.harborZ + 6 });
  const docks = [];
  for (let i = 0; i < 5; i += 1) docks.push({ x: -160 + i * 80, z: CITY.harborZ + 14, w: 30, d: 10, color: random.pick([0x7a5a3a, 0x5a6e7a, 0x9a7a4a]) });

  return { buildings, lamps, trees, parks, cranes, docks, xs, half };
}

// Axis-aligned building test: is point (x,z) inside a building footprint?
export function hitsBuilding(city, x, z, pad) {
  for (const b of city.buildings) {
    if (Math.abs(x - b.x) < b.w / 2 + pad && Math.abs(z - b.z) < b.d / 2 + pad) return b;
  }
  return null;
}

export function clampToCity(x, z, pad) {
  const lim = CITY.size / 2 + 60;
  return {
    x: Math.max(-lim, Math.min(lim, x)),
    z: Math.max(-lim, Math.min(lim, z)),
  };
}

// Nearest road centreline point to (x,z): traffic and walking snap to roads.
export function nearestRoadPoint(city, x, z) {
  let best = null;
  let bestD = Infinity;
  for (const c of city.xs) {
    const d1 = Math.abs(x - c);
    if (d1 < bestD) { bestD = d1; best = { x: c, z, vertical: true }; }
    const d2 = Math.abs(z - c);
    if (d2 < bestD) { bestD = d2; best = { x, z: c, vertical: false }; }
  }
  return best;
}
