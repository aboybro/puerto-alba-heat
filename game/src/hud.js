// HUD: DOM overlay (health, money, wanted stars, clock, weapon, mission
// banner, message log) plus a 2D canvas minimap of the city, the player,
// police, traffic and the mission marker.
import { CITY } from './config.js';

export function createHud() {
  const el = (id) => document.getElementById(id);
  const hpBar = el('hp-fill');
  const hpText = el('hp-text');
  const money = el('money');
  const stars = el('stars');
  const clock = el('clock');
  const weapon = el('weapon');
  const missionTitle = el('mission-title');
  const missionObj = el('mission-objective');
  const banner = el('banner');
  const bannerTitle = el('banner-title');
  const bannerText = el('banner-text');
  const log = el('log');
  const minimap = el('minimap');
  const mm = minimap.getContext('2d');
  const prompt = el('prompt');
  const crosshair = el('crosshair');
  let lastBanner = '';

  function showBanner(title, text, ms) {
    if (title === lastBanner) return;
    lastBanner = title;
    bannerTitle.textContent = title;
    bannerText.textContent = text;
    banner.classList.remove('hidden');
    setTimeout(() => { banner.classList.add('hidden'); lastBanner = ''; }, ms || 4200);
  }

  function addLog(text) {
    const div = document.createElement('div');
    div.textContent = text;
    log.prepend(div);
    while (log.children.length > 4) log.removeChild(log.lastChild);
  }

  function drawMinimap(state, city, mission) {
    const S = 168;
    const scale = S / (CITY.size + 140);
    const toX = (x) => S / 2 + x * scale;
    const toZ = (z) => S / 2 + z * scale;
    mm.fillStyle = '#0d2b3a';
    mm.fillRect(0, 0, S, S);
    // Sea + beach + harbour.
    mm.fillStyle = '#2a7fa8';
    mm.fillRect(toX(CITY.size / 2), 0, S - toX(CITY.size / 2), S);
    mm.fillStyle = '#e8d9a0';
    mm.fillRect(toX(CITY.size / 2), 0, 10, S);
    mm.fillStyle = '#3a5a6a';
    mm.fillRect(0, toZ(CITY.size / 2), S, S - toZ(CITY.size / 2));
    // Roads.
    mm.fillStyle = '#5a5a62';
    for (const c of city.xs) {
      mm.fillRect(toX(c) - 3, 0, 6, S);
      mm.fillRect(0, toZ(c) - 3, S, 6);
    }
    // Buildings.
    mm.fillStyle = '#c9b18a';
    for (const b of city.buildings) {
      mm.fillRect(toX(b.x - b.w / 2), toZ(b.z - b.d / 2), Math.max(1, b.w * scale), Math.max(1, b.d * scale));
    }
    // Mission marker.
    if (mission && mission.target) {
      const t = mission.target;
      const pulse = 4 + Math.sin(performance.now() / 240) * 2;
      mm.fillStyle = '#ffd23f';
      mm.beginPath();
      mm.arc(toX(t.x), toZ(t.z), pulse, 0, Math.PI * 2);
      mm.fill();
      mm.strokeStyle = '#fff';
      mm.stroke();
    }
    // Traffic dots, cops, player.
    mm.fillStyle = '#e8e8e8';
    for (const c of state.traffic) mm.fillRect(toX(c.x) - 1, toZ(c.z) - 1, 2, 2);
    mm.fillStyle = '#3a86ff';
    for (const c of state.cops) mm.fillRect(toX(c.x) - 2, toZ(c.z) - 2, 4, 4);
    mm.fillStyle = '#ff4d4d';
    for (const e of state.enemies) mm.fillRect(toX(e.x) - 2, toZ(e.z) - 2, 4, 4);
    const p = state.player;
    mm.fillStyle = '#ffffff';
    mm.beginPath();
    mm.arc(toX(p.x), toZ(p.z), 4, 0, Math.PI * 2);
    mm.fill();
    mm.strokeStyle = '#111';
    mm.stroke();
  }

  return {
    showBanner, addLog,
    setScreen(screen) {
      document.getElementById('screen-title').classList.toggle('hidden', screen !== 'title');
      document.getElementById('screen-pause').classList.toggle('hidden', screen !== 'paused');
      document.getElementById('screen-over').classList.toggle('hidden', screen !== 'over');
      document.getElementById('hud').classList.toggle('hidden', screen === 'title');
    },
    update(state, city, mission, timeText) {
      const hp = Math.max(0, Math.round(state.player.hp));
      hpBar.style.width = `${hp}%`;
      hpBar.style.background = hp > 50 ? '#37d67a' : hp > 25 ? '#f2c94c' : '#e5534b';
      hpText.textContent = `${hp}`;
      money.textContent = `$${state.money.toLocaleString('en-US')}`;
      stars.textContent = '★'.repeat(state.wanted) + '☆'.repeat(5 - state.wanted);
      stars.style.color = state.wanted > 0 ? '#ffd23f' : '#8b93a3';
      clock.textContent = timeText;
      weapon.textContent = state.player.weapon === 'pistol' ? 'Pistol · ∞' : 'Fists';
      crosshair.classList.toggle('hidden', state.player.weapon !== 'pistol');
      if (mission) {
        missionTitle.textContent = `Mission ${mission.id}: ${mission.title}`;
        missionObj.textContent = mission.objective;
      } else {
        missionTitle.textContent = 'All jobs done — Puerto Alba is yours';
        missionObj.textContent = 'Free roam: drive, explore, cause trouble.';
      }
      prompt.textContent = state.promptText || '';
      drawMinimap(state, city, mission);
    },
  };
}
