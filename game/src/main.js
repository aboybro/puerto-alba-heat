// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The game
// moves between four screens: title, play, paused and game over.
//
// ?seed=N fixes the city. ?shot=cover|drive|foot|night (with &seed=N) stages that scene instead
// of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_MISSION, EVENT_OVER } from './world.js';
import { ACTION_CONFIRM, ACTION_ENTER_CAR, ACTION_MUTE, ACTION_PAUSE, ACTION_PUNCH, ACTION_SHOOT, ACTION_WEAPON, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createAudio } from './audio.js';
import { createHud } from './hud.js';
import { loadSave, readBest, writeBest } from './save.js';
import { stageShot } from './shots.js';
import { currentMission } from './missions.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261118;

window.__errors = [];
window.addEventListener('error', (e) => { window.__errors.push(String(e.message)); });

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const save = loadSave();
const world = createWorld(createRandom(seed), save);
const renderer = createRenderer(canvas);
const audio = createAudio();
const hud = createHud();

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen);
    hud.update(world.state, world.city, currentMission(world.state.mission), world.timeText());
    hud.setScreen(scene.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) { status.textContent = message; }
  function refreshHud() {
    hud.update(world.state, world.city, currentMission(world.state.mission), world.timeText());
    hud.setScreen(screen);
  }

  function startGame() {
    world.reset();
    // Keep the saved mission progress: a fresh run resumes the story.
    if (save && typeof save.missionIndex === 'number') world.state.mission.index = save.missionIndex;
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    audio.startRadio();
    const m = currentMission(world.state.mission);
    if (m) hud.showBanner(`Mission ${m.id}: ${m.title}`, `${m.giver}: ${m.briefing}`, 6000);
    announce('Playing Puerto Alba.');
    refreshHud();
  }

  function endGame() {
    screen = SCREEN_OVER;
    audio.stopRadio();
    const earned = world.state.money;
    if (earned > best) { best = earned; writeBest(best); }
    document.getElementById('over-stats').textContent =
      `Money $${earned.toLocaleString('en-US')} · Missions done ${world.state.completedMissions} · Best $${best.toLocaleString('en-US')}`;
    announce(`Busted. Money $${earned}.`);
    refreshHud();
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      audio.setMuted(!audio.isMuted());
      hud.addLog(audio.isMuted() ? 'Sound muted (M)' : 'Sound on (M)');
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
      refreshHud();
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
      refreshHud();
    }
    return {
      enterCar: !!(actions & ACTION_ENTER_CAR),
      punch: !!(actions & ACTION_PUNCH),
      shoot: !!(actions & ACTION_SHOOT),
      weapon: !!(actions & ACTION_WEAPON),
    };
  }

  function step(oneActions) {
    const events = world.step(STEP, input, oneActions, audio);
    if (events & EVENT_OVER) endGame();
    else if (events & EVENT_MISSION) {
      const m = currentMission(world.state.mission);
      if (m) hud.showBanner(`Mission ${m.id}: ${m.title}`, `${m.giver}: ${m.briefing}`, 6000);
      else hud.showBanner('All jobs done', 'Puerto Alba is yours. Free roam, hero.', 5000);
      hud.addLog('Mission complete — cash banked.');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const oneActions = handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step(oneActions);
        oneActions.enterCar = false; oneActions.punch = false; oneActions.shoot = false; oneActions.weapon = false;
        accumulator -= STEP;
      }
      refreshHud();
    } else if (screen === SCREEN_TITLE) {
      world.state.elapsed += Math.min(0.05, accumulator);
      accumulator = 0;
      refreshHud();
    } else {
      accumulator = 0;
    }
    renderer.draw(world, screen);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
      refreshHud();
    }
  });

  announce('Puerto Alba. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
