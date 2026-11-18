// Synthesized WebAudio: engine hum, police siren, gunshots, punches, pickup
// chimes and a simple radio sequencer. No audio files, no network.
export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let radioTimer = null;
  let muted = false;
  let radioOn = false;

  // A tiny sun-soaked radio loop: Am – F – C – G bass with a plucky lead.
  const RADIO_BASS = [110, 87.31, 130.81, 98];
  const RADIO_LEAD = [440, 523.25, 659.25, 523.25, 587.33, 659.25, 783.99, 659.25];
  let radioStep = 0;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 50;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'sine';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      return true;
    } catch { return false; }
  }

  function blip(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noiseBurst(dur, vol, low) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = low || 2400;
    const g = ctx.createGain();
    g.gain.value = vol || 0.4;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
  }

  function radioTick() {
    if (!radioOn || muted) return;
    const bar = Math.floor(radioStep / 2) % RADIO_BASS.length;
    const lead = RADIO_LEAD[radioStep % RADIO_LEAD.length];
    if (radioStep % 2 === 0) blip(RADIO_BASS[bar], 0.42, 'triangle', 0.16);
    blip(lead, 0.22, 'square', 0.05);
    radioStep += 1;
  }

  return {
    unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume(); },
    setMuted(m) {
      muted = m;
      if (master) master.gain.value = m ? 0 : 0.5;
    },
    isMuted() { return muted; },
    setEngine(speed01, on) {
      if (!ensure()) return;
      const target = on ? 0.03 + speed01 * 0.09 : 0;
      engineGain.gain.setTargetAtTime(muted ? 0 : target, ctx.currentTime, 0.08);
      engineOsc.frequency.setTargetAtTime(48 + speed01 * 130, ctx.currentTime, 0.1);
    },
    setSiren(on, t) {
      if (!ensure()) return;
      sirenGain.gain.setTargetAtTime(on && !muted ? 0.045 : 0, ctx.currentTime, 0.1);
      if (on) sirenOsc.frequency.setTargetAtTime(650 + Math.sin(t * 3.2) * 220, ctx.currentTime, 0.05);
    },
    shoot() { noiseBurst(0.14, 0.5, 3000); blip(180, 0.08, 'square', 0.25, 60); },
    punch() { noiseBurst(0.08, 0.3, 900); },
    hit() { blip(140, 0.18, 'sawtooth', 0.25, 70); },
    pickup() { blip(660, 0.1, 'sine', 0.22); blip(990, 0.16, 'sine', 0.22); },
    cash() { blip(880, 0.09, 'sine', 0.2); setTimeout(() => blip(1318, 0.14, 'sine', 0.2), 90); },
    wanted() { blip(520, 0.2, 'square', 0.16, 780); },
    crash() { noiseBurst(0.25, 0.5, 700); },
    startRadio() {
      if (!ensure() || radioTimer) return;
      radioOn = true;
      radioTimer = setInterval(radioTick, 250);
    },
    stopRadio() { radioOn = false; if (radioTimer) { clearInterval(radioTimer); radioTimer = null; } },
  };
}
