// Story missions: seven jobs for the Alba crew, played in order. Each has a
// briefing, an objective marker, a check (reach a place, tail a car, lose the
// cops, beat the thugs) and a cash reward. Progress is saved in localStorage.
import { CITY } from './config.js';

export const MISSIONS = [
  {
    id: 1, title: 'First Drop', giver: 'Marisol Vega',
    briefing: 'Marisol needs a package at the north marina. Take any car — borrow one if you must — and get it there.',
    objective: 'Drive to the north marina marker',
    reward: 400, target: { x: -30, z: -CITY.size / 2 - 8 }, kind: 'reach',
  },
  {
    id: 2, title: 'The Pickup', giver: 'Marisol Vega',
    briefing: 'A friend waits by the beach promenade with a case. Pick him up and bring him to the plaza.',
    objective: 'Reach the beach promenade, then the plaza',
    reward: 500, target: { x: 210, z: 40 }, kind: 'reach2',
    target2: { x: -30, z: -30 },
  },
  {
    id: 3, title: 'Tail Job', giver: 'Dario Sol',
    briefing: 'Dario wants eyes on a coral coupe cruising the avenues. Stay close behind it — don’t spook it.',
    objective: 'Tail the coral coupe for 12 seconds',
    reward: 650, target: { x: 60, z: 60 }, kind: 'tail', tailSeconds: 12,
  },
  {
    id: 4, title: 'Hot Wheels', giver: 'Dario Sol',
    briefing: 'The Alba police are on to us. Grab a car, get a wanted level and lose them. Stay out of sight.',
    objective: 'Lose your wanted level (stay hidden 10 s)',
    reward: 700, target: { x: 0, z: 0 }, kind: 'escape', hideSeconds: 10,
  },
  {
    id: 5, title: 'Dockside Trouble', giver: 'Marisol Vega',
    briefing: 'Rival crew at the harbour. Take your pistol (2) and clear all four of them out.',
    objective: 'Defeat the 4 harbour thugs',
    reward: 900, target: { x: -60, z: CITY.harborZ }, kind: 'combat',
  },
  {
    id: 6, title: 'Fare Game', giver: 'Tia Rosa',
    briefing: 'Tia Rosa’s cab is in the shop. Ferry her customer from the plaza to the airport road, fast but safe.',
    objective: 'Reach the customer, then the east gate',
    reward: 600, target: { x: -30, z: -30 }, kind: 'reach2',
    target2: { x: CITY.size / 2 + 10, z: 120 },
  },
  {
    id: 7, title: 'The Alba Run', giver: 'Marisol Vega',
    briefing: 'The big one. Grab the case at the harbour, then run the east road to the lighthouse with the cops on you.',
    objective: 'Grab the case, then reach the lighthouse',
    reward: 1500, target: { x: -160, z: CITY.harborZ + 14 }, kind: 'reach2',
    target2: { x: CITY.beachX + 30, z: -CITY.size / 2 - 20 },
  },
];

export function missionState(save) {
  return {
    index: save && typeof save.missionIndex === 'number' ? save.missionIndex : 0,
    stage: 0, // 0 = heading to target, 1 = heading to target2
    tailTime: 0,
    hideTime: 0,
    done: save && save.missionIndex >= MISSIONS.length,
    message: '',
    messageTime: 0,
  };
}

export function currentMission(ms) {
  return ms.index < MISSIONS.length ? MISSIONS[ms.index] : null;
}

export function missionTarget(ms) {
  const m = currentMission(ms);
  if (!m) return null;
  if (m.kind === 'reach2' && ms.stage === 1) return m.target2;
  return m.target;
}

// Advance the mission from the world state. Returns 'complete' | 'stage' | null.
export function updateMission(ms, world, dt) {
  const m = currentMission(ms);
  if (!m) return null;
  const p = world.playerPos();
  const target = missionTarget(ms);
  const dist = target ? Math.hypot(p.x - target.x, p.z - target.z) : Infinity;

  if (m.kind === 'tail') {
    const tail = world.tailCar;
    if (tail) {
      const d = Math.hypot(p.x - tail.x, p.z - tail.z);
      if (d < 26) {
        ms.tailTime += dt;
        if (ms.tailTime >= m.tailSeconds) return 'complete';
      } else ms.tailTime = Math.max(0, ms.tailTime - dt * 2);
    }
    return null;
  }
  if (m.kind === 'escape') {
    if (world.state.wanted === 0) {
      ms.hideTime += dt;
      if (ms.hideTime >= m.hideSeconds) return 'complete';
    } else ms.hideTime = 0;
    return null;
  }
  if (m.kind === 'combat') {
    if (world.enemies.length === 0 && world.state.combatSpawned) return 'complete';
    return null;
  }
  if (dist < 9) {
    if (m.kind === 'reach2' && ms.stage === 0) {
      ms.stage = 1;
      ms.message = 'Next stop marked on the map.';
      ms.messageTime = 4;
      return 'stage';
    }
    return 'complete';
  }
  return null;
}

export function completeMission(ms, state) {
  const m = currentMission(ms);
  if (!m) return 0;
  state.money += m.reward;
  state.completedMissions += 1;
  ms.index += 1;
  ms.stage = 0;
  ms.tailTime = 0;
  ms.hideTime = 0;
  ms.done = ms.index >= MISSIONS.length;
  ms.message = m.doneMessage || `Job done — $${m.reward} earned.`;
  ms.messageTime = 5;
  return m.reward;
}
