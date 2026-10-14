/**
 * ZenPipes Procedural Web Audio Synthesizer
 * Pure Web Audio API: Water droplets, bamboo resonance, fluid streams, and completion harmonies.
 * 100% offline with zero external audio assets.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ZenPipesAudio = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  let ctx = null;
  let muted = false;

  const PENTATONIC = [
    261.63, // C4
    293.66, // D4
    329.63, // E4
    392.00, // G4
    440.00, // A4
    523.25, // C5
    587.33, // D5
    659.25, // E5
    783.99, // G5
    880.00  // A5
  ];

  function initContext() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        ctx = new AudioCtx();
      }
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  function setMuted(val) {
    muted = !!val;
    try {
      localStorage.setItem('zenpipes_muted', muted ? '1' : '0');
    } catch (e) {}
  }

  function isMuted() {
    return muted;
  }

  function loadMuteState() {
    try {
      muted = localStorage.getItem('zenpipes_muted') === '1';
    } catch (e) {
      muted = false;
    }
    return muted;
  }

  /**
   * Bamboo click + water droplet on pipe rotate
   */
  function playRotate(r, c) {
    if (muted) return;
    initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const note = PENTATONIC[(r + c * 2) % PENTATONIC.length];

    // Bamboo wood impulse (triangle sweep)
    const woodGain = ctx.createGain();
    woodGain.gain.setValueAtTime(0.18, now);
    woodGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    woodGain.connect(ctx.destination);

    const woodOsc = ctx.createOscillator();
    woodOsc.type = 'triangle';
    woodOsc.frequency.setValueAtTime(420, now);
    woodOsc.frequency.exponentialRampToValueAtTime(140, now + 0.12);
    woodOsc.connect(woodGain);
    woodOsc.start(now);
    woodOsc.stop(now + 0.12);

    // Droplet tone (sine frequency drop)
    const dropGain = ctx.createGain();
    dropGain.gain.setValueAtTime(0.14, now + 0.02);
    dropGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    dropGain.connect(ctx.destination);

    const dropOsc = ctx.createOscillator();
    dropOsc.type = 'sine';
    dropOsc.frequency.setValueAtTime(note * 1.5, now + 0.02);
    dropOsc.frequency.exponentialRampToValueAtTime(note, now + 0.35);
    dropOsc.connect(dropGain);
    dropOsc.start(now + 0.02);
    dropOsc.stop(now + 0.35);
  }

  function playUndo() {
    if (muted) return;
    initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    gain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.22);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  function playReset() {
    if (muted) return;
    initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    gain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.3);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  function playHint() {
    if (muted) return;
    initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const chord = [392.00, 523.25, 659.25, 783.99]; // G-C-E-G water chime
    chord.forEach((f, idx) => {
      const delay = idx * 0.05;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.08, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.4);
      gain.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + delay);
      osc.connect(gain);
      osc.start(now + delay);
      osc.stop(now + delay + 0.4);
    });
  }

  function playWin() {
    if (muted) return;
    initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Harmonic cascade of water stream
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
    notes.forEach((f, idx) => {
      const delay = idx * 0.09;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.18, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 1.2);
      gain.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + delay);
      osc.connect(gain);
      osc.start(now + delay);
      osc.stop(now + delay + 1.2);
    });
  }

  if (typeof window !== 'undefined') {
    loadMuteState();
  }

  return {
    initContext,
    setMuted,
    isMuted,
    loadMuteState,
    playRotate,
    playUndo,
    playReset,
    playHint,
    playWin
  };
}));
