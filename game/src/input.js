// Keyboard + mouse state. WASD/arrows move, mouse drag orbits the camera,
// E enters/exits a car, F punches, click shoots, 1/2 switch fists/pistol,
// P or Esc pauses, M mutes, R restarts after game over.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER_CAR = 4;
export const ACTION_PUNCH = 8;
export const ACTION_SHOOT = 16;
export const ACTION_MUTE = 32;
export const ACTION_WEAPON = 64;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseDown = false;
  let dragX = 0;
  let dragY = 0;
  let wheel = 0;

  function onKeyDown(e) {
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code === 'Space' || e.code === 'Enter') { actions |= ACTION_CONFIRM; e.preventDefault(); }
    if (e.code === 'KeyP' || e.code === 'Escape') actions |= ACTION_PAUSE;
    if (e.code === 'KeyE') actions |= ACTION_ENTER_CAR;
    if (e.code === 'KeyF') actions |= ACTION_PUNCH;
    if (e.code === 'KeyM') actions |= ACTION_MUTE;
    if (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'KeyQ') actions |= ACTION_WEAPON;
  }
  function onKeyUp(e) { keys.delete(e.code); }
  function onMouseDown(e) {
    if (e.target !== canvas) return;
    mouseDown = true;
    if (e.button === 0) actions |= ACTION_SHOOT;
  }
  function onMouseMove(e) {
    if (!mouseDown) return;
    dragX += e.movementX || 0;
    dragY += e.movementY || 0;
  }
  function onMouseUp() { mouseDown = false; }
  function onWheel(e) { wheel += Math.sign(e.deltaY); }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('blur', () => { keys.clear(); mouseDown = false; });

  return {
    // Movement axis in camera space: x = strafe right, y = forward.
    axis() {
      let x = 0, y = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y -= 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      const len = Math.hypot(x, y) || 1;
      return { x: x / len, y: y / len, run: keys.has('ShiftLeft') || keys.has('ShiftRight') };
    },
    heldShoot() { return mouseDown; },
    takeDrag() { const d = { x: dragX, y: dragY, wheel }; dragX = 0; dragY = 0; wheel = 0; return d; },
    takeActions() { const a = actions; actions = 0; return a; },
  };
}
