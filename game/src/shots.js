// The screenshot scenes behind ?shot=cover|drive|foot|night. Each one plays
// the real rules forward from a fresh world for a fixed time, steered by a
// simple autopilot, so the frame is what a short run really looks like and
// the same seed always gives the same frame.
import { STEP } from './config.js';
import { roadCenters } from './city.js';
import { SCREEN_PLAY } from './render.js';

const DRIVE_STEPS = 60 * 14;

function fakeInput(getAxis) {
  return {
    axis: () => (typeof getAxis === 'function' ? getAxis() : getAxis),
    heldShoot: () => false,
    takeDrag: () => ({ x: 0, y: 0, wheel: 0 }),
  };
}
const NO_ACTIONS = { enterCar: false, punch: false, shoot: false, weapon: false };

// Put the player's car on a road near the city centre, facing north up the
// avenue, camera behind it — so the drive stays in the city.
function placePlayerCar(world) {
  const s = world.state;
  const car = s.cars[0];
  const road = roadCenters()[3];
  car.x = road;
  car.z = 110;
  car.heading = Math.PI;
  car.speed = 0;
  s.player.inCar = true;
  s.playerCar = car;
  car.isPlayer = true;
  s.cameraYaw = 0;
  return car;
}

// Drive toward (tx, tz), steering like a driver: turn toward the target and
// ease off when close, so the car stays on the streets.
function driveTo(world, tx, tz, maxSteps) {
  const input = fakeInput(() => {
    const car = world.state.playerCar;
    const dx = tx - car.x;
    const dz = tz - car.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 12) return { x: 0, y: 0, run: false };
    const want = Math.atan2(dx, dz);
    let diff = want - car.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    // Steering: heading decreases with positive axis.x, so steer negative to turn right.
    return { x: Math.max(-1, Math.min(1, -diff * 1.5)), y: 1, run: false };
  });
  for (let i = 0; i < maxSteps; i += 1) {
    const car = world.state.playerCar;
    if (Math.hypot(tx - car.x, tz - car.z) < 15) break; // stop on the road, don't coast past
    world.step(STEP, input, NO_ACTIONS, null);
  }
}

function walkForward(world, steps) {
  const input = fakeInput({ x: 0, y: 1, run: false });
  for (let i = 0; i < steps; i += 1) {
    world.step(STEP, input, NO_ACTIONS, null);
  }
}

// Put the police helicopter ahead of the player, in the camera's view.
function heliInView(world) {
  const s = world.state;
  if (!s.heli.active) return;
  s.heli.angle = Math.PI + 0.3;
  const pos = world.playerPos();
  s.heli.x = pos.x + Math.sin(s.heli.angle) * 22;
  s.heli.z = pos.z + Math.cos(s.heli.angle) * 22;
  s.heli.y = 12;
}

// Put two cop cars right behind the player's car, in the camera's view.
function copsInView(world) {
  const s = world.state;
  const car = s.playerCar;
  if (!car) return;
  const fx = Math.sin(car.heading);
  const fz = Math.cos(car.heading);
  const rx = -Math.cos(car.heading);
  const rz = Math.sin(car.heading);
  s.cops.slice(0, 2).forEach((cop, i) => {
    const side = i === 0 ? -1 : 1;
    cop.x = car.x - fx * 4 + rx * 7 * side;
    cop.z = car.z - fz * 4 + rz * 7 * side;
    cop.heading = car.heading;
    cop.speed = 20;
  });
}

/**
 * Set `world` to the named scene (cover, drive, foot or night; any other name
 * is cover) and return the screen to draw over it.
 */
export function stageShot(name, world) {
  const s = world.state;
  world.reset();
  s.timeOfDay = 0.35; // bright midday sun
  // The avenue run: straight up the road at x = -30 to mid-city, camera
  // raised so the street, the buildings and the beacon all read.
  const AVENUE_X = roadCenters()[3];
  if (name === 'drive') {
    placePlayerCar(world);
    s.cameraPitch = 0.45;
    s.cameraDist = 13;
    driveTo(world, AVENUE_X, -150, DRIVE_STEPS);
    // A clean daytime drive: any stray brush with a pedestrian is forgiven.
    s.wanted = 0;
    s.cops.length = 0;
    return { screen: SCREEN_PLAY };
  }
  if (name === 'foot') {
    // On foot at the first mission's drop-off, pistol out, midday, camera
    // looking at the gold beacon.
    const m = world.currentMission();
    if (m) {
      s.player.x = m.target.x - 14;
      s.player.z = m.target.z + 18;
      s.cameraYaw = Math.atan2(s.player.x - m.target.x, s.player.z - m.target.z);
      s.player.weapon = 'pistol';
    }
    walkForward(world, 60);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'night') {
    // Night chase: wanted 3, helicopter overhead, cop cars closing in.
    s.timeOfDay = 0.92;
    placePlayerCar(world);
    s.cameraPitch = 0.45;
    s.cameraDist = 13;
    world.addWanted(3, null);
    driveTo(world, AVENUE_X, -150, DRIVE_STEPS);
    copsInView(world);
    heliInView(world);
    return { screen: SCREEN_PLAY };
  }
  // cover: a police chase at wanted 4, from the car, mission marker on the map.
  placePlayerCar(world);
  s.cameraPitch = 0.45;
  s.cameraDist = 13;
  world.addWanted(4, null);
  driveTo(world, AVENUE_X, -150, DRIVE_STEPS);
  copsInView(world);
  heliInView(world);
  return { screen: SCREEN_PLAY };
}
