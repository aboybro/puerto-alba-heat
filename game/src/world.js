// The game's rules and state, with no drawing and no browser in it: the
// player on foot and in a car, traffic, pedestrians, police, wanted level,
// missions, combat and the clock. step() advances one fixed step and returns
// what happened as bit flags, so the caller can react without the world
// knowing about screens or sound.
import { CAR, CITY, DAY_LENGTH, MONEY_START, PLAYER, STEP, WANTED } from './config.js';
import { createCity, hitsBuilding, clampToCity } from './city.js';
import { driveCar, makeCar, spawnParkedCars, spawnTraffic, updateTraffic } from './vehicles.js';
import { spawnPedestrians, updatePedestrians } from './pedestrians.js';
import { copsWanted, heliWanted, spawnCop, updateCop, updateHeli } from './police.js';
import { MISSIONS, completeMission, currentMission, missionState, missionTarget, updateMission } from './missions.js';
import { fireBullet, punch, spawnThugs, updateBullets, updateEnemies, updateParticles } from './combat.js';
import { writeSave } from './save.js';

export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_MISSION = 4;
export const EVENT_CRIME = 8;

export function createWorld(random, save) {
  const city = createCity(random);
  const state = {
    player: { x: 0, z: 30, heading: 0, hp: PLAYER.maxHp, inCar: false, weapon: 'pistol', ammo: Infinity },
    cameraYaw: Math.PI, cameraPitch: 0.32, cameraDist: 11,
    cars: [], traffic: [], cops: [],
    heli: { x: 0, y: 26, z: 0, angle: 0, rotor: 0, active: false },
    peds: [], enemies: [], bullets: [], particles: [],
    money: MONEY_START, wanted: 0, wantedTimer: 0,
    timeOfDay: 0.32, elapsed: 0,
    mission: missionState(save),
    completedMissions: save && typeof save.completedMissions === 'number' ? save.completedMissions : 0,
    combatSpawned: false, tailCar: null,
    shake: 0, promptText: '', saveTimer: 0,
    fireTimer: 0, punchTimer: 0, crimeTimer: 0,
    lastMissionIndex: -1,
  };
  if (save) {
    if (typeof save.money === 'number') state.money = save.money;
    if (typeof save.timeOfDay === 'number') state.timeOfDay = save.timeOfDay;
  }

  function reset() {
    state.player.x = 0; state.player.z = 30;
    state.player.heading = 0; state.player.hp = PLAYER.maxHp;
    state.player.inCar = false; state.player.weapon = 'pistol';
    state.cameraYaw = Math.PI;
    state.cars = spawnParkedCars(random, city);
    state.traffic = spawnTraffic(random, city);
    state.cops = [];
    state.heli.active = false;
    state.peds = spawnPedestrians(random, city);
    state.enemies = []; state.bullets = []; state.particles = [];
    state.wanted = 0; state.wantedTimer = 0;
    state.elapsed = 0; state.combatSpawned = false; state.tailCar = null;
    state.shake = 0; state.fireTimer = 0; state.punchTimer = 0;
    state.lastMissionIndex = -1;
    state.mission.stage = 0; state.mission.tailTime = 0; state.mission.hideTime = 0;
  }

  function playerPos() {
    if (state.player.inCar && state.playerCar) return { x: state.playerCar.x, z: state.playerCar.z };
    return { x: state.player.x, z: state.player.z };
  }

  function addWanted(n, audio) {
    const before = state.wanted;
    state.wanted = Math.max(0, Math.min(5, state.wanted + n));
    state.wantedTimer = 0;
    if (state.wanted > before && audio) audio.wanted();
    return state.wanted;
  }

  function nearestCar(x, z, maxD) {
    let best = null;
    let bestD = maxD;
    for (const c of [...state.cars, ...state.traffic]) {
      const d = Math.hypot(c.x - x, c.z - z);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  function enterCar(car, audio) {
    state.player.inCar = true;
    state.playerCar = car;
    car.isPlayer = true;
    addWanted(WANTED.stealCar, audio);
    state.promptText = `${car.name} — WASD to drive, E to get out`;
    if (audio) audio.pickup();
  }

  function exitCar() {
    const car = state.playerCar;
    if (!car) return;
    car.isPlayer = false;
    const fx = Math.sin(car.heading + Math.PI / 2);
    const fz = Math.cos(car.heading + Math.PI / 2);
    state.player.x = car.x + fx * 3;
    state.player.z = car.z + fz * 3;
    state.player.heading = car.heading;
    state.player.inCar = false;
    state.playerCar = null;
    state.promptText = 'On foot — E near a car to drive it';
  }

  function moveOnFoot(axis, dt) {
    const p = state.player;
    const speed = axis.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
    // Camera-relative movement: forward is away from the camera.
    const sin = Math.sin(state.cameraYaw);
    const cos = Math.cos(state.cameraYaw);
    const mx = (-sin * axis.y + cos * axis.x) * speed * dt;
    const mz = (-cos * axis.y - sin * axis.x) * speed * dt;
    if (mx !== 0 || mz !== 0) p.heading = Math.atan2(mx, mz);
    const nx = p.x + mx;
    const nz = p.z + mz;
    const clamped = clampToCity(nx, nz, 1);
    if (!hitsBuilding(city, clamped.x, p.z, PLAYER.radius)) p.x = clamped.x;
    if (!hitsBuilding(city, p.x, clamped.z, PLAYER.radius)) p.z = clamped.z;
    // Bumping into a parked car stops the walk.
    for (const c of [...state.cars, ...state.traffic]) {
      const dx = p.x - c.x;
      const dz = p.z - c.z;
      const d = Math.hypot(dx, dz);
      if (d < 2.2 && d > 0.01) {
        p.x = c.x + (dx / d) * 2.2;
        p.z = c.z + (dz / d) * 2.2;
      }
    }
  }

  function missionHooks(audio) {
    const m = currentMission(state.mission);
    if (!m) return;
    if (state.lastMissionIndex !== state.mission.index) {
      state.lastMissionIndex = state.mission.index;
      state.combatSpawned = false;
      state.tailCar = null;
      if (m.kind === 'combat') {
        state.enemies = spawnThugs(random, m.target.x, m.target.z, 4);
        state.combatSpawned = true;
      }
      if (m.kind === 'tail') {
        const tail = state.traffic[0];
        if (tail) {
          tail.color = 0xff6f61;
          tail.name = 'Coral Coupe';
          state.tailCar = tail;
        }
      }
      if (audio) audio.pickup();
    }
  }

  function autosave() {
    writeSave({
      money: state.money,
      missionIndex: state.mission.index,
      completedMissions: state.completedMissions,
      timeOfDay: state.timeOfDay,
    });
  }

  function step(dt, input, actions, audio) {
    let events = 0;
    state.elapsed += dt;
    state.timeOfDay = (state.timeOfDay + dt / DAY_LENGTH) % 1;
    state.crimeTimer = Math.max(0, state.crimeTimer - dt);
    state.fireTimer = Math.max(0, state.fireTimer - dt);
    state.punchTimer = Math.max(0, state.punchTimer - dt);
    state.shake = Math.max(0, state.shake - dt * 2);

    // Camera orbit from the mouse drag.
    const drag = input.takeDrag();
    state.cameraYaw -= drag.x * 0.005;
    state.cameraPitch = Math.max(0.08, Math.min(1.1, state.cameraPitch + drag.y * 0.003));
    state.cameraDist = Math.max(6, Math.min(18, state.cameraDist + drag.wheel));

    const axis = input.axis();
    const pos = playerPos();

    missionHooks(audio);
    const m = currentMission(state.mission);

    // --- Enter / exit car ---
    if (actions.enterCar) {
      if (state.player.inCar) exitCar();
      else {
        const car = nearestCar(pos.x, pos.z, 4.5);
        if (car) enterCar(car, audio);
        else state.promptText = 'No car close by — walk to a parked car';
      }
    }

    // --- Movement ---
    if (state.player.inCar && state.playerCar) {
      const car = state.playerCar;
      const crashed = driveCar(car, axis, dt, city, [...state.cars, ...state.traffic, ...state.cops]);
      if (crashed && Math.abs(car.speed) > 6) {
        state.shake = Math.max(state.shake, 0.4);
        if (audio) audio.crash();
      }
      // Running over a pedestrian is a crime.
      for (const ped of state.peds) {
        if (Math.hypot(ped.x - car.x, ped.z - car.z) < 2.4 && state.crimeTimer === 0) {
          ped.fleeing = 3;
          state.crimeTimer = 2;
          addWanted(WANTED.hitPed, audio);
          events |= EVENT_CRIME;
        }
      }
    } else {
      moveOnFoot(axis, dt);
    }

    // --- Combat ---
    if (actions.punch && state.punchTimer === 0) {
      state.punchTimer = 0.4;
      if (punch(state, audio) && state.crimeTimer === 0) {
        state.crimeTimer = 2;
        addWanted(1, audio);
      }
    }
    if (actions.weapon) {
      state.player.weapon = state.player.weapon === 'pistol' ? 'fists' : 'pistol';
      state.promptText = state.player.weapon === 'pistol' ? 'Pistol ready — click to shoot' : 'Fists — F to punch';
    }
    const wantShoot = (actions.shoot || input.heldShoot()) && state.player.weapon === 'pistol' && state.fireTimer === 0;
    if (wantShoot) {
      state.fireTimer = 0.25;
      const aim = state.player.inCar ? state.playerCar.heading : state.cameraYaw + Math.PI;
      const from = { x: pos.x + Math.sin(aim) * 1.2, z: pos.z + Math.cos(aim) * 1.2 };
      fireBullet(state, from, aim, true);
      state.shake = Math.max(state.shake, 0.12);
      if (audio) audio.shoot();
      if (state.crimeTimer === 0) {
        state.crimeTimer = 2;
        addWanted(WANTED.shoot, audio);
        events |= EVENT_CRIME;
      }
    }

    // --- Traffic, pedestrians, police ---
    for (const c of state.traffic) updateTraffic(c, dt, city, random);
    updatePedestrians(state.peds, dt, input.heldShoot() || state.fireTimer > 0.2 ? pos : null, city);

    const wantCops = copsWanted(state.wanted);
    while (state.cops.length < wantCops) {
      const angle = random.range(0, Math.PI * 2);
      const cx = pos.x + Math.sin(angle) * random.range(40, 70);
      const cz = pos.z + Math.cos(angle) * random.range(40, 70);
      state.cops.push(spawnCop(random, cx, cz));
    }
    while (state.cops.length > wantCops) state.cops.pop();
    for (const cop of state.cops) {
      const dist = updateCop(cop, pos, dt, city);
      if (dist < 3.2) {
        // A ram: hurts on foot, shakes the car, slows it.
        if (state.player.inCar && state.playerCar) {
          state.playerCar.speed *= 0.6;
          state.shake = Math.max(state.shake, 0.5);
          if (audio) audio.crash();
        } else if (state.crimeTimer === 0) {
          state.player.hp -= 6 * dt * 10;
          state.shake = Math.max(state.shake, 0.4);
        }
      }
    }
    state.heli.active = heliWanted(state.wanted);
    if (state.heli.active) updateHeli(state.heli, pos, dt, state.wanted);

    // Wanted decays when the player stays out of trouble: one star per
    // quiet stretch, however close the chase got.
    if (state.wanted > 0) {
      state.wantedTimer += dt;
      if (state.wantedTimer > WANTED.decaySeconds) {
        state.wanted -= 1;
        state.wantedTimer = 0;
        state.promptText = state.wanted === 0 ? 'You lost them. Clean.' : `Heat dropping — ${state.wanted} star${state.wanted > 1 ? 's' : ''} left`;
      }
    }

    // --- Missions ---
    const result = updateMission(state.mission, { state, playerPos, tailCar: state.tailCar, enemies: state.enemies }, dt);
    if (result === 'complete') {
      const reward = completeMission(state.mission, state);
      events |= EVENT_MISSION;
      if (audio) audio.cash();
      state.promptText = `Job done — $${reward} earned`;
      autosave();
    } else if (result === 'stage') {
      if (audio) audio.pickup();
    }

    // --- Enemies, bullets, particles ---
    updateEnemies(state, dt, audio);
    updateBullets(state, dt, city, (c, x, z, pad) => !!hitsBuilding(c, x, z, pad));
    updateParticles(state, dt);

    // --- Audio beds ---
    if (audio) {
      audio.setEngine(state.player.inCar ? Math.abs(state.playerCar.speed) / CAR.maxSpeed : 0, state.player.inCar);
      audio.setSiren(state.wanted > 0, state.elapsed);
    }

    if (state.player.hp <= 0) {
      state.player.hp = 0;
      events |= EVENT_OVER;
    }

    // Prompt when standing near a car on foot.
    if (!state.player.inCar) {
      const car = nearestCar(pos.x, pos.z, 4.5);
      if (car) state.promptText = `Press E to drive the ${car.name}`;
    }

    state.saveTimer += dt;
    if (state.saveTimer > 5) { state.saveTimer = 0; autosave(); }
    return events;
  }

  reset();
  return {
    state, city, reset, step, playerPos, addWanted, missionTarget,
    currentMission: () => currentMission(state.mission),
    timeText() {
      const t = state.timeOfDay * 24;
      const h = Math.floor(t);
      const min = Math.floor((t - h) * 60);
      return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    },
    isNight() { return state.timeOfDay > 0.78 || state.timeOfDay < 0.06; },
    isSunset() { return state.timeOfDay > 0.62 && state.timeOfDay <= 0.78; },
  };
}
