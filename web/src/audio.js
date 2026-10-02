// audio.js — procedural WebAudio ambience for the Nightspire-22 tower.
// License-clean: every sound is synthesized in code from filtered noise.
// No external audio files, no downloads, no samples.
//
// Layers:
//   - fireBed   : low looping rumble under the forge (lowpassed noise)
//   - crackle   : random ember pops near the forge (bandpassed noise bursts)
//   - murmur    : soft market wash (lowpassed noise + slow LFO)
//   - wind      : balcony-height wind (bandpassed noise, gain follows altitude)
//
// Autoplay-safe: createAudio() builds nothing until start() is called from a
// user gesture (the "Enter the Nightspire" click). Mute toggles the master.

export function createAudio() {
  let ctx = null;
  let master = null;
  let windGain = null;
  let crackleTimer = null;
  let muted = false;
  let baseLevel = 0.5;

  function noiseBuffer(seconds = 2) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function loopSource(buf, rate = 1) {
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.playbackRate.value = rate;
    s.start();
    return s;
  }

  function start() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = muted ? 0 : baseLevel;
    master.connect(ctx.destination);

    const noise = noiseBuffer(2.5);

    // ---- fire bed: constant low rumble ----
    {
      const src = loopSource(noise, 0.4);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 220; lp.Q.value = 0.4;
      const g = ctx.createGain(); g.gain.value = 0.10;
      src.connect(lp); lp.connect(g); g.connect(master);
    }

    // ---- crackle: random ember pops ----
    let crackleGain;
    {
      const src = loopSource(noise, 1.3);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 2100; bp.Q.value = 0.9;
      crackleGain = ctx.createGain(); crackleGain.gain.value = 0;
      src.connect(bp); bp.connect(crackleGain); crackleGain.connect(master);
    }
    // schedule pops on a jittered interval
    const pop = () => {
      if (!ctx || ctx.state !== 'running') return;
      const t = ctx.currentTime;
      const n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const dt = Math.random() * 0.12;
        const peak = 0.05 + Math.random() * 0.22;
        const dur = 0.03 + Math.random() * 0.12;
        crackleGain.gain.setValueAtTime(0.0001, t + dt);
        crackleGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + dt + 0.008);
        crackleGain.gain.exponentialRampToValueAtTime(0.0001, t + dt + dur);
      }
    };
    crackleTimer = setInterval(pop, 140);

    // ---- market murmur: soft wash with slow breathing LFO ----
    {
      const src = loopSource(noise, 0.55);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.3;
      const g = ctx.createGain(); g.gain.value = 0.035;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.11;
      const lfoG = ctx.createGain(); lfoG.gain.value = 0.018;
      lfo.connect(lfoG); lfoG.connect(g.gain); lfo.start();
      src.connect(lp); lp.connect(g); g.connect(master);
    }

    // ---- wind: bandpassed noise, gain driven by altitude (setWind) ----
    {
      const src = loopSource(noise, 0.7);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 0.5;
      // slow wander of the filter so the wind feels alive
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.07;
      const lfoG = ctx.createGain(); lfoG.gain.value = 190;
      lfo.connect(lfoG); lfoG.connect(bp.frequency); lfo.start();
      windGain = ctx.createGain(); windGain.gain.value = 0;
      src.connect(bp); bp.connect(windGain); windGain.connect(master);
    }
  }

  function setWind(x) {
    if (!ctx || !windGain) return;
    const v = Math.max(0, Math.min(1, x)) * 0.14;
    windGain.gain.setTargetAtTime(v, ctx.currentTime, 0.8);
  }

  function setMuted(m) {
    muted = !!m;
    if (ctx && master) master.gain.setTargetAtTime(muted ? 0 : baseLevel, ctx.currentTime, 0.05);
  }

  function toggleMute() {
    setMuted(!muted);
    return muted;
  }

  function dispose() {
    if (crackleTimer) { clearInterval(crackleTimer); crackleTimer = null; }
    if (ctx) { ctx.close().catch(() => {}); ctx = null; }
  }

  return {
    start,
    setWind,
    setMuted,
    toggleMute,
    dispose,
    get muted() { return muted; },
    get ready() { return !!ctx; },
  };
}
