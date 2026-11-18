// Drawing only: the three.js scene for Puerto Alba — sun, sky, streets,
// buildings, cars, people, the police helicopter and the mission beacon.
// The world state comes in, pixels go out. No game rules live here.
import { CITY } from './config.js';
import { missionTarget } from './missions.js';

const THREE = window.THREE;

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function lerpColor(a, b, t) {
  return new THREE.Color(a).lerp(new THREE.Color(b), t);
}

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 120, 520);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1200);

  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x8a7a5a, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe0b3, 1.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -260; sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260; sun.shadow.camera.bottom = -260;
  sun.shadow.camera.far = 800;
  scene.add(sun);
  scene.add(sun.target);

  const carMeshes = new Map();
  const pedMeshes = new Map();
  const enemyMeshes = new Map();
  let playerMesh = null;
  let heliMesh = null;
  let beacon = null;
  let beaconRing = null;
  let bulletMeshes = [];
  let particleMeshes = [];
  let cityBuilt = null;

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const sphereGeo = new THREE.SphereGeometry(1, 10, 8);
  const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 10);
  const matCache = new Map();
  function mat(color) {
    if (!matCache.has(color)) matCache.set(color, new THREE.MeshLambertMaterial({ color }));
    return matCache.get(color);
  }
  function box(w, h, d, color, x, y, z, parent) {
    const m = new THREE.Mesh(boxGeo, mat(color));
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    (parent || scene).add(m);
    return m;
  }

  function buildCity(city) {
    const half = CITY.size / 2;
    // Ground: concrete city slab, sand beach east, sea beyond, harbour south.
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(CITY.size + 160, CITY.size + 160), mat(0x7a7f75));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(60, CITY.size + 160), mat(0xe8d9a0));
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(half + 30, 0.05, 0);
    sand.receiveShadow = true;
    scene.add(sand);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(160, CITY.size + 400), mat(0x2a7fa8));
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(half + 140, 0.02, 0);
    scene.add(sea);
    const harbour = new THREE.Mesh(new THREE.PlaneGeometry(CITY.size + 60, 50), mat(0x5a5f66));
    harbour.rotation.x = -Math.PI / 2;
    harbour.position.set(0, 0.06, CITY.harborZ + 10);
    harbour.receiveShadow = true;
    scene.add(harbour);

    // Roads: dark strips along every centreline.
    for (const c of city.xs) {
      const roadV = new THREE.Mesh(new THREE.PlaneGeometry(CITY.road, CITY.size), mat(0x33373d));
      roadV.rotation.x = -Math.PI / 2;
      roadV.position.set(c, 0.08, 0);
      roadV.receiveShadow = true;
      scene.add(roadV);
      const roadH = new THREE.Mesh(new THREE.PlaneGeometry(CITY.size, CITY.road), mat(0x33373d));
      roadH.rotation.x = -Math.PI / 2;
      roadH.position.set(0, 0.08, c);
      roadH.receiveShadow = true;
      scene.add(roadH);
      // Centre dashes.
      for (let d = -half; d < half; d += 12) {
        box(0.4, 0.02, 3, 0xd8c95a, c, 0.1, d);
        box(3, 0.02, 0.4, 0xd8c95a, d, 0.1, c);
      }
    }
    // Blocks: pale plaza slabs.
    for (let bx = 0; bx < CITY.blocks; bx += 1) {
      for (let bz = 0; bz < CITY.blocks; bz += 1) {
        const x0 = -half + CITY.road + bx * (CITY.block + CITY.road);
        const z0 = -half + CITY.road + bz * (CITY.block + CITY.road);
        const slab = new THREE.Mesh(new THREE.PlaneGeometry(CITY.block, CITY.block), mat(0x9a9a8e));
        slab.rotation.x = -Math.PI / 2;
        slab.position.set(x0 + CITY.block / 2, 0.07, z0 + CITY.block / 2);
        slab.receiveShadow = true;
        scene.add(slab);
      }
    }
    // Buildings with roofs.
    for (const b of city.buildings) {
      box(b.w, b.h, b.d, b.color, b.x, b.h / 2, b.z);
      box(b.w * 0.9, 0.8, b.d * 0.9, b.roof, b.x, b.h + 0.4, b.z);
      if (b.windows) {
        const rows = Math.max(1, Math.floor(b.h / 6));
        for (let r = 0; r < rows; r += 1) {
          box(b.w * 0.8, 1.2, 0.1, 0x2a3a4a, b.x, 3 + r * 6, b.z + b.d / 2 + 0.05);
        }
      }
    }
    // Street lamps.
    for (const l of city.lamps) {
      const pole = new THREE.Mesh(cylGeo, mat(0x2a2a2a));
      pole.scale.set(0.18, 5.5, 0.18);
      pole.position.set(l.x, 2.75, l.z);
      scene.add(pole);
      const lamp = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({ color: 0xffe9a0 }));
      lamp.scale.set(0.5, 0.5, 0.5);
      lamp.position.set(l.x, 5.6, l.z);
      lamp.userData.isLamp = true;
      scene.add(lamp);
    }
    // Palms: trunk + frond ball.
    for (const t of city.trees) {
      const trunk = new THREE.Mesh(cylGeo, mat(0x8a6a4a));
      trunk.scale.set(0.25, 4.5, 0.25);
      trunk.position.set(t.x, 2.25, t.z);
      trunk.castShadow = true;
      scene.add(trunk);
      const top = new THREE.Mesh(sphereGeo, mat(0x2e8b57));
      top.scale.set(2.4, 1.6, 2.4);
      top.position.set(t.x, 5.2, t.z);
      top.castShadow = true;
      scene.add(top);
    }
    // Harbour cranes and dock crates.
    for (const c of city.cranes) {
      box(3, 26, 3, 0xc0392b, c.x, 13, c.z);
      box(22, 2, 2, 0xc0392b, c.x + 8, 24, c.z);
    }
    for (const d of city.docks) box(d.w, 4, d.d, d.color, d.x, 2, d.z);
    // Lighthouse at the beach's north end.
    box(5, 22, 5, 0xf2e3c6, CITY.beachX + 8, 11, -CITY.size / 2 - 6);
    box(5.6, 2, 5.6, 0xc0392b, CITY.beachX + 8, 23, -CITY.size / 2 - 6);
    // Mission beacon: a glowing column + ring, moved to the target each frame.
    beacon = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 70, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }));
    scene.add(beacon);
    beaconRing = new THREE.Mesh(new THREE.TorusGeometry(4, 0.35, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xffd23f }));
    beaconRing.rotation.x = -Math.PI / 2;
    scene.add(beaconRing);
    cityBuilt = city;
  }

  function carMesh(car) {
    const g = new THREE.Group();
    const body = box(2.0, 0.85, 4.4, car.color, 0, 0.65, 0, g);
    box(1.7, 0.7, 2.2, 0x223344, 0, 1.35, -0.2, g);
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12);
    const wheelMat = mat(0x111111);
    for (const [wx, wz] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.42, wz);
      g.add(w);
    }
    if (car.isCop) {
      const bar = box(1.4, 0.25, 0.5, 0x222222, 0, 1.85, -0.2, g);
      const red = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ color: 0xff2222 }));
      red.scale.set(0.6, 0.22, 0.5);
      red.position.set(-0.35, 1.85, -0.2);
      red.userData.copLight = 'red';
      g.add(red);
      const blue = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ color: 0x2244ff }));
      blue.scale.set(0.6, 0.22, 0.5);
      blue.position.set(0.35, 1.85, -0.2);
      blue.userData.copLight = 'blue';
      g.add(blue);
      g.userData.red = red; g.userData.blue = blue;
    }
    // Headlights.
    const hl = new THREE.MeshBasicMaterial({ color: 0xfff6c0 });
    for (const hx of [-0.7, 0.7]) {
      const dot = new THREE.Mesh(sphereGeo, hl);
      dot.scale.set(0.22, 0.22, 0.22);
      dot.position.set(hx, 0.7, 2.21);
      g.add(dot);
    }
    scene.add(g);
    return g;
  }

  function personMesh(shirt, skin) {
    const g = new THREE.Group();
    box(0.62, 0.95, 0.38, shirt, 0, 1.05, 0, g);
    const head = new THREE.Mesh(sphereGeo, mat(skin));
    head.scale.set(0.26, 0.26, 0.26);
    head.position.set(0, 1.72, 0);
    head.castShadow = true;
    g.add(head);
    box(0.55, 0.7, 0.34, 0x2a2a3a, 0, 0.35, 0, g);
    scene.add(g);
    return g;
  }

  function syncCars(list, t) {
    const seen = new Set();
    for (const car of list) {
      seen.add(car);
      let g = carMeshes.get(car);
      if (!g) { g = carMesh(car); carMeshes.set(car, g); }
      g.position.set(car.x, 0, car.z);
      g.rotation.y = car.heading;
      if (car.isCop && g.userData.red) {
        const on = Math.floor(t * 6) % 2 === 0;
        g.userData.red.visible = on;
        g.userData.blue.visible = !on;
      }
    }
    for (const [car, g] of carMeshes) {
      if (!seen.has(car)) { scene.remove(g); carMeshes.delete(car); }
    }
  }

  function syncPeople(list, map, shirtOf, skinOf) {
    const seen = new Set();
    for (const p of list) {
      seen.add(p);
      let g = map.get(p);
      if (!g) { g = personMesh(shirtOf(p), skinOf(p)); map.set(p, g); }
      g.position.set(p.x, Math.abs(Math.sin(p.walkPhase || 0)) * 0.06, p.z);
      g.rotation.y = p.heading;
    }
    for (const [p, g] of map) {
      if (!seen.has(p)) { scene.remove(g); map.delete(p); }
    }
  }

  function syncHeli(heli, t) {
    if (!heli.active) {
      if (heliMesh) heliMesh.visible = false;
      return;
    }
    if (!heliMesh) {
      heliMesh = new THREE.Group();
      box(3.2, 1.4, 5.2, 0x1a2a4a, 0, 0, 0, heliMesh);
      box(1.2, 1.0, 2.4, 0x8fb8c9, 0, 0.4, 2.6, heliMesh);
      const rotor = new THREE.Mesh(boxGeo, mat(0x222222));
      rotor.scale.set(9, 0.12, 0.5);
      rotor.position.set(0, 0.9, 0);
      rotor.userData.isRotor = true;
      heliMesh.add(rotor);
      heliMesh.userData.rotor = rotor;
      const spot = new THREE.Mesh(new THREE.ConeGeometry(3, 18, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xfff6c0, transparent: true, opacity: 0.18, depthWrite: false }));
      spot.position.set(0, -9, 0);
      heliMesh.add(spot);
      scene.add(heliMesh);
    }
    heliMesh.visible = true;
    heliMesh.position.set(heli.x, heli.y, heli.z);
    heliMesh.rotation.y = heli.angle + Math.PI / 2;
    heliMesh.userData.rotor.rotation.y = heli.rotor;
  }

  function syncBullets(bullets) {
    while (bulletMeshes.length < bullets.length) {
      const m = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({ color: 0xffe066 }));
      m.scale.set(0.22, 0.22, 0.22);
      scene.add(m);
      bulletMeshes.push(m);
    }
    bullets.forEach((b, i) => {
      bulletMeshes[i].visible = true;
      bulletMeshes[i].position.set(b.x, 1.3, b.z);
    });
    for (let i = bullets.length; i < bulletMeshes.length; i += 1) bulletMeshes[i].visible = false;
  }

  function syncParticles(particles) {
    while (particleMeshes.length < particles.length) {
      const m = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
      m.scale.set(0.3, 0.3, 0.3);
      scene.add(m);
      particleMeshes.push(m);
    }
    particles.forEach((pt, i) => {
      particleMeshes[i].visible = true;
      particleMeshes[i].position.set(pt.x, 1.2 + (0.7 - pt.life), pt.z);
      particleMeshes[i].material.color.setHex(pt.color);
    });
    for (let i = particles.length; i < particleMeshes.length; i += 1) particleMeshes[i].visible = false;
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  function setLighting(world) {
    const tod = world.state.timeOfDay;
    let sky, fogC, sunColor, sunI, hemiI;
    if (world.isNight()) {
      sky = 0x0a1220; fogC = 0x0a1220; sunColor = 0x8fa8ff; sunI = 0.25; hemiI = 0.25;
    } else if (world.isSunset()) {
      const k = (tod - 0.62) / 0.16;
      sky = lerpColor(0x87ceeb, 0xff9a56, k).getHex();
      fogC = sky; sunColor = 0xff8844; sunI = 1.1; hemiI = 0.55;
    } else {
      sky = 0x87ceeb; fogC = 0x87ceeb; sunColor = 0xffe0b3; sunI = 1.6; hemiI = 0.9;
    }
    scene.background.setHex(sky);
    scene.fog.color.setHex(fogC);
    sun.color.setHex(sunColor);
    sun.intensity = sunI;
    hemi.intensity = hemiI;
    const ang = tod * Math.PI * 2 - Math.PI / 2;
    sun.position.set(Math.cos(ang) * 220, Math.max(30, Math.sin(ang) * 220 + 60), 120);
    scene.traverse((o) => {
      if (o.userData && o.userData.isLamp) o.visible = world.isNight() || world.isSunset();
    });
  }

  /** Paint one frame of the world; on the title screen the camera orbits the city. */
  function draw(world, screen) {
    const state = world.state;
    if (!cityBuilt) buildCity(world.city);
    setLighting(world);
    const t = state.elapsed;
    const pos = world.playerPos();

    syncCars([...state.cars, ...state.traffic, ...state.cops], t);
    syncPeople(state.peds, pedMeshes, (p) => p.shirt, (p) => p.skin);
    syncPeople(state.enemies, enemyMeshes, () => 0x8a1a1a, () => 0xc98d5f);
    syncHeli(state.heli, t);
    syncBullets(state.bullets);
    syncParticles(state.particles);

    // Player figure (hidden while driving — the car is the player).
    if (!playerMesh) {
      playerMesh = personMesh(0x0e8a7a, 0xe8b88a);
      // A white cap so the hero reads at a glance.
      const cap = new THREE.Mesh(sphereGeo, mat(0xf2f2f2));
      cap.scale.set(0.28, 0.14, 0.28);
      cap.position.set(0, 1.95, 0);
      playerMesh.add(cap);
    }
    playerMesh.visible = !state.player.inCar;
    if (playerMesh.visible) {
      playerMesh.position.set(state.player.x, Math.abs(Math.sin(t * 9)) * 0.05, state.player.z);
      playerMesh.rotation.y = state.player.heading;
    }

    // Mission beacon.
    const target = missionTarget(state.mission);
    if (target && beacon) {
      beacon.visible = true;
      beaconRing.visible = true;
      beacon.position.set(target.x, 30, target.z);
      beaconRing.position.set(target.x, 0.3, target.z);
      beaconRing.scale.setScalar(1 + Math.sin(t * 3) * 0.15);
    } else if (beacon) {
      beacon.visible = false;
      beaconRing.visible = false;
    }

    // Camera: third person behind the player, or an orbit for the title.
    const shake = state.shake || 0;
    const shX = (Math.random() - 0.5) * shake;
    const shY = (Math.random() - 0.5) * shake;
    if (screen === SCREEN_TITLE) {
      const a = t * 0.08;
      camera.position.set(Math.sin(a) * 190, 90, Math.cos(a) * 190);
      camera.lookAt(0, 0, 0);
    } else {
      const yaw = state.cameraYaw;
      const dist = state.cameraDist;
      const height = 3 + Math.sin(state.cameraPitch) * dist;
      camera.position.set(
        pos.x + Math.sin(yaw) * dist + shX,
        height + shY,
        pos.z + Math.cos(yaw) * dist,
      );
      camera.lookAt(pos.x - Math.sin(yaw) * 6, 1.6, pos.z - Math.cos(yaw) * 6);
    }
    sun.target.position.set(pos.x, 0, pos.z);
    sun.target.updateMatrixWorld();
    renderer.render(scene, camera);
  }

  return { draw };
}
