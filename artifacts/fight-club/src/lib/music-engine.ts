export type MusicTrack = "lobby" | "battle" | "victory" | "off";

class MusicEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentTrack: MusicTrack = "off";
  private _muted = false;
  private _volume = 0.34;
  private cleanupFns: Array<() => void> = [];
  private transitioning = false;

  private ensureCtx() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._volume;
      this.masterGain.connect(this.ctx.destination);
    }
    return { ctx: this.ctx, master: this.masterGain! };
  }

  private stopAll(fadeSec = 0.6) {
    const fns = [...this.cleanupFns];
    this.cleanupFns = [];
    fns.forEach((fn) => fn());
    if (this.masterGain && this.ctx) {
      const t = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(t);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, t);
      this.masterGain.gain.linearRampToValueAtTime(0, t + fadeSec);
    }
  }

  private restoreGain(delaySec = 0.65) {
    setTimeout(() => {
      if (this.masterGain && this.ctx) {
        const t = this.ctx.currentTime;
        this.masterGain.gain.setValueAtTime(0, t);
        this.masterGain.gain.linearRampToValueAtTime(
          this._muted ? 0 : this._volume,
          t + 0.5
        );
      }
    }, delaySec * 1000);
  }

  async setTrack(track: MusicTrack) {
    if (track === this.currentTrack || this.transitioning) return;
    this.transitioning = true;

    this.stopAll(0.5);
    this.currentTrack = track;

    await new Promise<void>((r) => setTimeout(r, 600));
    this.transitioning = false;

    if (track === "off" || this._muted) {
      this.restoreGain(0.1);
      return;
    }

    const { ctx } = this.ensureCtx();
    if (ctx.state === "suspended") await ctx.resume();
    this.restoreGain(0.05);

    await new Promise<void>((r) => setTimeout(r, 100));
    if (this.currentTrack !== track) return;

    switch (track) {
      case "lobby":
        this.playLobby();
        break;
      case "battle":
        this.playBattle();
        break;
      case "victory":
        this.playVictory();
        break;
    }
  }

  // ─── helpers ────────────────────────────────────────────────────────────────

  private osc(
    type: OscillatorType,
    freq: number,
    gainVal: number,
    target?: AudioNode
  ): OscillatorNode {
    const { ctx, master } = this.ensureCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gainVal;
    o.connect(g);
    g.connect(target ?? master);
    o.start();
    this.cleanupFns.push(() => {
      try {
        g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
        setTimeout(() => { try { o.stop(); } catch {} }, 350);
      } catch {}
    });
    return o;
  }

  private scheduleNote(
    freq: number,
    type: OscillatorType,
    gainVal: number,
    startT: number,
    duration: number,
    target?: AudioNode
  ) {
    const { ctx, master } = this.ensureCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, startT);
    g.gain.linearRampToValueAtTime(gainVal, startT + 0.015);
    g.gain.setValueAtTime(gainVal * 0.8, startT + duration * 0.7);
    g.gain.linearRampToValueAtTime(0, startT + duration);
    o.connect(g);
    g.connect(target ?? master);
    o.start(startT);
    o.stop(startT + duration + 0.05);
  }

  private scheduleKick(t: number) {
    const { ctx, master } = this.ensureCtx();
    // Punchy bass-heavy kick: deeper sub-thump with click transient
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(28, t + 0.18);
    g.gain.setValueAtTime(0.6, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + 0.45);

    // Sub layer for chest-thump
    const sub = ctx.createOscillator();
    const subG = ctx.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(55, t);
    sub.frequency.exponentialRampToValueAtTime(22, t + 0.25);
    subG.gain.setValueAtTime(0.45, t);
    subG.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    sub.connect(subG);
    subG.connect(master);
    sub.start(t);
    sub.stop(t + 0.6);
  }

  private scheduleHeartbeat(t: number) {
    // Two-thump heartbeat for tension
    this.scheduleKick(t);
    const { ctx, master } = this.ensureCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(90, t + 0.18);
    o.frequency.exponentialRampToValueAtTime(28, t + 0.3);
    g.gain.setValueAtTime(0.32, t + 0.18);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o.connect(g);
    g.connect(master);
    o.start(t + 0.18);
    o.stop(t + 0.42);
  }

  private scheduleSnare(t: number) {
    const { ctx, master } = this.ensureCtx();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 3000;
    f.Q.value = 0.5;
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t);
  }

  // ─── LOBBY ── ominous, sub-bass-heavy, cinematic dread ─────────────────────
  private playLobby() {
    const { ctx, master } = this.ensureCtx();

    // Massive sub-bass on E0 (~20.6 Hz) — felt more than heard
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = "sine";
    subOsc.frequency.value = 20.6;
    subGain.gain.value = 0.55;
    subOsc.connect(subGain);
    subGain.connect(master);
    subOsc.start();

    // Bass drone on E1 (41 Hz) — sawtooth through resonant lowpass
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = "lowpass";
    droneFilter.frequency.value = 110;
    droneFilter.Q.value = 6;
    droneFilter.connect(master);

    const droneOsc = ctx.createOscillator();
    const droneGain = ctx.createGain();
    droneOsc.type = "sawtooth";
    droneOsc.frequency.value = 41.2;
    droneGain.gain.value = 0.5;
    droneOsc.connect(droneGain);
    droneGain.connect(droneFilter);
    droneOsc.start();

    // Slow LFO swelling the bass volume (breathing tension)
    const swellLfo = ctx.createOscillator();
    const swellLfoGain = ctx.createGain();
    swellLfo.type = "sine";
    swellLfo.frequency.value = 0.14; // ~7s cycle
    swellLfoGain.gain.value = 0.25;
    swellLfo.connect(swellLfoGain);
    swellLfoGain.connect(droneGain.gain);
    swellLfo.start();

    // Filter sweep LFO for movement
    const filtLfo = ctx.createOscillator();
    const filtLfoGain = ctx.createGain();
    filtLfo.type = "sine";
    filtLfo.frequency.value = 0.09;
    filtLfoGain.gain.value = 70;
    filtLfo.connect(filtLfoGain);
    filtLfoGain.connect(droneFilter.frequency);
    filtLfo.start();

    // Dissonant minor 2nd above (F1) — quiet, tense
    const tense = ctx.createOscillator();
    const tenseGain = ctx.createGain();
    tense.type = "triangle";
    tense.frequency.value = 43.65;
    tenseGain.gain.value = 0.08;
    tense.connect(tenseGain);
    tenseGain.connect(master);
    tense.start();

    this.cleanupFns.push(() => {
      try {
        const t = ctx.currentTime;
        subGain.gain.linearRampToValueAtTime(0, t + 0.4);
        droneGain.gain.linearRampToValueAtTime(0, t + 0.4);
        tenseGain.gain.linearRampToValueAtTime(0, t + 0.4);
        setTimeout(() => {
          try { subOsc.stop(); droneOsc.stop(); swellLfo.stop(); filtLfo.stop(); tense.stop(); } catch {}
        }, 450);
      } catch {}
    });

    // Slow heartbeat pulse every ~3.2s — adds dread without being a beat
    let beatRunning = true;
    const pulse = () => {
      if (!beatRunning) return;
      this.scheduleHeartbeat(ctx.currentTime + 0.05);
      const id = setTimeout(pulse, 3200);
      this.cleanupFns.push(() => clearTimeout(id));
    };
    setTimeout(pulse, 800);
    this.cleanupFns.push(() => { beatRunning = false; });

    // Sparse low cello-like motif — descending minor 2nd / tritone for tension
    // E3, F3 (m2), Bb3 (tritone), A3 — long, breathy, drenched in reverb
    const motif = [164.81, 174.61, 233.08, 220.0, 196.0, 164.81];
    let step = 0;

    const playMelNote = () => {
      const t = ctx.currentTime;
      const freq = motif[step % motif.length];
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const lp = ctx.createBiquadFilter();
      const delay = ctx.createDelay(2.0);
      const delayGain = ctx.createGain();
      const fb = ctx.createGain();
      o.type = "sawtooth";
      o.frequency.value = freq;
      lp.type = "lowpass";
      lp.frequency.value = 700;
      lp.Q.value = 2;
      delay.delayTime.value = 0.55;
      delayGain.gain.value = 0.4;
      fb.gain.value = 0.45;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.11, t + 0.9);
      g.gain.setValueAtTime(0.11, t + 3.0);
      g.gain.linearRampToValueAtTime(0, t + 5.5);
      o.connect(lp);
      lp.connect(g);
      g.connect(master);
      g.connect(delay);
      delay.connect(delayGain);
      delayGain.connect(master);
      delay.connect(fb);
      fb.connect(delay);
      o.start(t);
      o.stop(t + 5.7);
      step++;
    };

    setTimeout(playMelNote, 1500);
    const iv = setInterval(playMelNote, 6500);
    this.cleanupFns.push(() => clearInterval(iv));
  }

  // ─── BATTLE ── slow, menacing, sub-bass driven war drums ───────────────────
  private playBattle() {
    const { ctx, master } = this.ensureCtx();
    const BPM = 108;            // Slower = more menacing
    const BEAT = 60 / BPM;      // ~0.555s per 8th-note step

    // ── Continuous sub-bass pedal on E1 (41 Hz) — the rumble underneath
    const pedal = ctx.createOscillator();
    const pedalGain = ctx.createGain();
    pedal.type = "sine";
    pedal.frequency.value = 41.2;
    pedalGain.gain.value = 0.35;
    pedal.connect(pedalGain);
    pedalGain.connect(master);
    pedal.start();

    // ── Distorted bass channel through waveshaper for grit
    const bassFilter = ctx.createBiquadFilter();
    bassFilter.type = "lowpass";
    bassFilter.frequency.value = 280;
    bassFilter.Q.value = 5;

    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i * 2) / 1024 - 1;
      curve[i] = Math.tanh(x * 3.5);   // Soft saturation
    }
    shaper.curve = curve;
    shaper.oversample = "2x";

    const bassBus = ctx.createGain();
    bassBus.gain.value = 0.55;
    bassFilter.connect(shaper);
    shaper.connect(bassBus);
    bassBus.connect(master);

    // ── Slow filter sweep on bass for breathing tension
    const sweepLfo = ctx.createOscillator();
    const sweepLfoG = ctx.createGain();
    sweepLfo.type = "sine";
    sweepLfo.frequency.value = 0.18;
    sweepLfoG.gain.value = 180;
    sweepLfo.connect(sweepLfoG);
    sweepLfoG.connect(bassFilter.frequency);
    sweepLfo.start();

    this.cleanupFns.push(() => {
      try {
        const t = ctx.currentTime;
        pedalGain.gain.linearRampToValueAtTime(0, t + 0.4);
        bassBus.gain.linearRampToValueAtTime(0, t + 0.4);
        setTimeout(() => { try { pedal.stop(); sweepLfo.stop(); } catch {} }, 450);
      } catch {}
    });

    // E-minor riff — heavy, deliberate, ominous (low octaves)
    // 8th-note grid (16 steps per bar)
    const bassSeq = [
      41.2,  41.2,  0,    61.74, 41.2,  0,    49.0, 41.2,
      41.2,  0,     55.0, 0,     49.0, 41.2,  0,    61.74,
    ];
    // Sparse menacing high motif (cello-like) — long sustained notes
    const motifSeq: Array<[number, number]> = [
      [164.81, 4],   // E3, 4 beats
      [196.0,  3],   // G3, 3 beats
      [185.0,  2],   // F#3
      [146.83, 4],   // D3
      [164.81, 4],   // E3
      [233.08, 3],   // Bb3 (tritone — dread)
      [220.0,  2],   // A3
      [246.94, 4],   // B3
    ];

    let step = 0;
    let motifStep = 0;
    let running = true;

    const tick = () => {
      if (!running) return;
      const t = ctx.currentTime + 0.04;
      const i = step % bassSeq.length;
      const freq = bassSeq[i];

      // Bass note (skip rests)
      if (freq > 0) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sawtooth";
        o.frequency.value = freq;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.55, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + BEAT * 1.4);
        o.connect(g);
        g.connect(bassFilter);
        o.start(t);
        o.stop(t + BEAT * 1.5);
      }

      // BIG kick on every downbeat (every 4 steps), heartbeat-double on bar 4
      if (step % 4 === 0) this.scheduleKick(t);
      if (step % 16 === 12) this.scheduleHeartbeat(t);
      // Sparse snare on the 3rd of every bar for tension
      if (step % 16 === 8) this.scheduleSnare(t);

      // High motif — change every 4 steps based on motifSeq durations
      if (step % 4 === 0) {
        const [mfreq, mbeats] = motifSeq[motifStep % motifSeq.length];
        const dur = mbeats * BEAT * 2;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const lp = ctx.createBiquadFilter();
        o.type = "sawtooth";
        o.frequency.value = mfreq;
        lp.type = "lowpass";
        lp.frequency.value = 1100;
        lp.Q.value = 1.5;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.07, t + 0.4);
        g.gain.setValueAtTime(0.07, t + dur * 0.7);
        g.gain.linearRampToValueAtTime(0, t + dur);
        o.connect(lp); lp.connect(g); g.connect(master);
        o.start(t);
        o.stop(t + dur + 0.05);
        motifStep++;
      }

      step++;
      const id = setTimeout(tick, BEAT * 1000);
      this.cleanupFns.push(() => clearTimeout(id));
    };

    tick();
    this.cleanupFns.push(() => { running = false; });
  }

  // ─── VICTORY ────────────────────────────────────────────────────────────────
  private playVictory() {
    const { ctx, master } = this.ensureCtx();

    // Triumphant E-major ascending fanfare
    const fanfare: [number, number][] = [
      [329.63, 0.18], // E4
      [329.63, 0.18], // E4
      [493.88, 0.22], // B4
      [659.25, 0.30], // E5
      [587.33, 0.15], // D5
      [659.25, 0.22], // E5 — peak
      [554.37, 0.14],
      [493.88, 0.14],
      [440.0,  0.14],
      [415.30, 0.14],
      [493.88, 0.20],
      [659.25, 0.55], // big final note
    ];

    let t = ctx.currentTime + 0.2;
    fanfare.forEach(([freq, dur]) => {
      this.scheduleNote(freq, "sawtooth", 0.18, t, dur);
      // Add harmony a 5th below
      this.scheduleNote(freq * 0.667, "sine", 0.06, t, dur);
      t += dur + 0.02;
    });

    // Big final chord after fanfare
    const chordT = t + 0.1;
    [329.63, 415.30, 493.88, 659.25].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, chordT);
      g.gain.linearRampToValueAtTime(0.07 - i * 0.01, chordT + 0.3);
      g.gain.setValueAtTime(0.07 - i * 0.01, chordT + 1.5);
      g.gain.linearRampToValueAtTime(0, chordT + 2.5);
      o.connect(g);
      g.connect(master);
      o.start(chordT);
      o.stop(chordT + 2.6);
    });

    // After fanfare finishes, transition to soft victory ambient loop
    const fanfareDuration = (chordT + 2.6 - (ctx.currentTime + 0.2)) * 1000;
    const loopTimeout = setTimeout(() => {
      if (this.currentTrack === "victory") this.playVictoryLoop();
    }, fanfareDuration + 200);
    this.cleanupFns.push(() => clearTimeout(loopTimeout));
  }

  private playVictoryLoop() {
    if (this.currentTrack !== "victory") return;
    const { ctx, master } = this.ensureCtx();

    // Soft E-major chord hum
    const chordNotes = [164.81, 207.65, 246.94, 329.63]; // E3, G#3, B3, E4
    chordNotes.forEach((freq) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.value = 0.045;
      o.connect(g);
      g.connect(master);
      o.start();
      this.cleanupFns.push(() => {
        try {
          const t = ctx.currentTime;
          g.gain.linearRampToValueAtTime(0, t + 0.5);
          setTimeout(() => { try { o.stop(); } catch {} }, 550);
        } catch {}
      });
    });

    // Gentle melody over the top
    const loopMel = [329.63, 415.30, 493.88, 554.37, 493.88, 415.30];
    let step = 0;
    const playMel = () => {
      const t = ctx.currentTime;
      const freq = loopMel[step % loopMel.length];
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.06, t + 0.4);
      g.gain.setValueAtTime(0.06, t + 1.0);
      g.gain.linearRampToValueAtTime(0, t + 1.6);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + 1.7);
      step++;
    };
    playMel();
    const iv = setInterval(playMel, 1700);
    this.cleanupFns.push(() => clearInterval(iv));
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  setMuted(muted: boolean) {
    this._muted = muted;
    if (this.masterGain && this.ctx) {
      const t = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(t);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, t);
      this.masterGain.gain.linearRampToValueAtTime(
        muted ? 0 : this._volume,
        t + 0.4
      );
    }
    if (!muted && this.currentTrack !== "off") {
      const track = this.currentTrack;
      this.currentTrack = "off";
      this.setTrack(track);
    }
  }

  get muted() {
    return this._muted;
  }
  get track() {
    return this.currentTrack;
  }
}

export const musicEngine = new MusicEngine();
