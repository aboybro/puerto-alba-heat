// Puerto Alba — tuning constants. One coastal city, one grid, one sun.
export const CITY = {
  blocks: 7,          // blocks per side
  block: 46,          // block size in metres
  road: 14,           // road width
  size: 7 * 46 + 8 * 14, // full city extent (434)
  beachX: 434 / 2 + 26,  // sand strip east of the grid
  harborZ: 434 / 2 + 18, // docks south of the grid
};

export const STEP = 1 / 60;
export const SAVE_KEY = 'puerto-alba-save-v1';
export const BEST_KEY = 'puerto-alba-best-v1';

// Player / car tuning.
export const PLAYER = {
  walkSpeed: 7,
  runSpeed: 11,
  radius: 0.7,
  maxHp: 100,
};
export const CAR = {
  accel: 22,
  brake: 34,
  maxSpeed: 38,
  maxReverse: 12,
  turn: 1.9,
  drag: 0.6,
};

// Wanted: stars 0-5, decay when unseen, heat per crime.
export const WANTED = {
  stealCar: 1,
  hitPed: 1,
  shoot: 1,
  killCop: 2,
  decaySeconds: 26,
};

export const MONEY_START = 250;
export const DAY_LENGTH = 240; // seconds per full day cycle

// Mission reward table lives in missions.js; these are the shared knobs.
export const TRAFFIC_COUNT = 14;
export const PED_COUNT = 26;
export const COP_MAX = 5;
