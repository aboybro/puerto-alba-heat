# Puerto Alba

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/aboybro/puerto-alba-heat/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/aboybro/puerto-alba-heat/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original open-world crime game, entered in
[make.fun's "Make GTA 6" bounty](https://make.fun/bounty/gta6-01).

## The game

You are **Rico Alba**, a driver for Marisol Vega's crew in **Puerto Alba**,
a sun-soaked coastal city of avenues, plazas, a beach promenade and a
working harbour. Seven story jobs stand between you and the big score:
deliveries, a tail job, losing the heat, a dockside shootout, a cab fare
and the final Alba Run to the lighthouse. Steal cars, outrun the Alba
police, and don't get busted. Everything — the city, the crew, the cars,
the story — is original: no Rockstar names, characters, maps or music.

- **Open world:** a 7×7 block grid city with a beach, a harbour with
  cranes, street lamps, palms, plazas and a lighthouse, from midday sun
  through sunset to night.
- **On foot and by car:** third-person walking (WASD + mouse camera) and
  arcade driving — press E to take any parked car, steer, brake, crash.
- **Traffic and life:** AI cars cruise the avenues, pedestrians stroll
  the sidewalks and flee from gunfire and speeding cars.
- **Wanted level:** stars 1–5 for stealing, hitting and shooting. Police
  interceptors chase and ram you; at 3 stars and up the police helicopter
  circles overhead with a searchlight. Lay low and the heat decays.
- **Missions and story:** 7 sequential jobs with briefings, a gold beacon
  and a minimap marker, cash rewards and progress saved in your browser.
- **Combat:** fists and a pistol, rival thugs who shoot back, bullets,
  particles and screen shake.
- **HUD:** health, money, wanted stars, clock, weapon, mission panel and
  a live minimap (city, you, police, traffic, objective).
- **Feel:** synthesized WebAudio — engine hum, sirens, gunshots and a
  little radio loop — plus particles, screen shake, day/sunset/night
  lighting, start screen, pause, game over and save/load.

## Controls

- WASD / arrows: move / drive · Shift: run · drag mouse: orbit camera
- E: enter / exit a car · Click: shoot · F: punch · 1 / 2: fists / pistol
- P or Esc: pause · M: mute · Space / click: start, restart after busted

## Run it

No build step and no network: serve `game/` with any static server and open
`index.html` in desktop Chrome, or run `node serve.ts` and open
http://localhost:8080.

## Layout

- `game/index.html` — page, HUD overlay and canvas
- `game/src/main.js` — boot, game loop, screens and input wiring
- `game/src/world.js` — simulation: player, cars, police, missions, clock
- `game/src/city.js` — Puerto Alba: grid, buildings, beach, harbour
- `game/src/render.js` — three.js scene, lighting, camera, syncing
- `game/src/vehicles.js` — driving physics, parked cars, traffic AI
- `game/src/pedestrians.js` — sidewalk walkers who flee danger
- `game/src/police.js` — wanted level, cop chases, helicopter
- `game/src/missions.js` — the 7 story jobs and their objectives
- `game/src/combat.js` — fists, pistol, thugs, bullets, particles
- `game/src/hud.js` — DOM HUD and the 2D minimap
- `game/src/audio.js` — synthesized WebAudio: engine, siren, radio
- `game/src/save.js` — localStorage save / load
- `game/src/config.js` — tuning constants
- `game/src/random.js` — seeded RNG
- `game/src/input.js` — keyboard and mouse state
- `game/src/shots.js` — screenshot staging (autopilot plays real runs)
- `game/vendor/three.min.js` — vendored three.js r160
- `main.ts` — entry program: copies `game/` and `screenshots/` to `/output`
  and writes `dossier.json`
