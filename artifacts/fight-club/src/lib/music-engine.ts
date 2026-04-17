export type MusicTrack = "lobby" | "battle" | "victory" | "off";

class MusicEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentTrack: MusicTrack = "off";
  private _muted = false;
  private _volume = 0.28;
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
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(100, t);
    o.frequency.exponentialRampToValueAtTime(35, t + 0.12);
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + 0.3);
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

  // ─── LOBBY ──────────────────────────────────────────────────────────────────
  private playLobby() {
    const { ctx, master } = this.ensureCtx();

    // Deep bass drone on E1 (41 Hz), sawtooth through lowpass
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = "lowpass";
    droneFilter.frequency.value = 120;
    droneFilter.Q.value = 3;
    droneFilter.connect(master);

    const droneOsc = ctx.createOscillator();
    const droneGain = ctx.createGain();
    droneOsc.type = "sawtooth";
    droneOsc.frequency.value = 41.2;
    droneGain.gain.value = 0.4;
    droneOsc.connect(droneGain);
    droneGain.connect(droneFilter);
    droneOsc.start();

    // LFO modulating filter for movement
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = "sine";
    lfo.frequency.value = 0.12;
    lfoGain.gain.value = 90;
    lfo.connect(lfoGain);
    lfoGain.connect(droneFilter.frequency);
    lfo.start();

    // Harmony drone E2
    const harm = ctx.createOscillator();
    const harmGain = ctx.createGain();
    harm.type = "sine";
    harm.frequency.value = 82.41;
    harmGain.gain.value = 0.12;
    harm.connect(harmGain);
    harmGain.connect(master);
    harm.start();

    this.cleanupFns.push(() => {
      try {
        const t = ctx.currentTime;
        droneGain.gain.linearRampToValueAtTime(0, t + 0.4);
        harmGain.gain.linearRampToValueAtTime(0, t + 0.4);
        setTimeout(() => {
          try { droneOsc.stop(); lfo.stop(); harm.stop(); } catch {}
        }, 450);
      } catch {}
    });

    // Slow haunting melody in E minor, long notes every 5 seconds
    const lobbyMelody = [196.0, 220.0, 246.94, 220.0, 185.0, 196.0, 164.81, 220.0];
    let step = 0;

    const playMelNote = () => {
      const t = ctx.currentTime;
      const freq = lobbyMelody[step % lobbyMelody.length];
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const reverb = ctx.createDelay(2.0);
      const reverbGain = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      reverb.delayTime.value = 0.45;
      reverbGain.gain.value = 0.35;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.09, t + 0.6);
      g.gain.setValueAtTime(0.09, t + 2.5);
      g.gain.linearRampToValueAtTime(0, t + 4.5);
      o.connect(g);
      g.connect(master);
      g.connect(reverb);
      reverb.connect(reverbGain);
      reverbGain.connect(master);
      o.start(t);
      o.stop(t + 4.6);
      step++;
    };

    playMelNote();
    const iv = setInterval(playMelNote, 5000);
    this.cleanupFns.push(() => clearInterval(iv));
  }

  // ─── BATTLE ─────────────────────────────────────────────────────────────────
  private playBattle() {
    const { ctx } = this.ensureCtx();
    const BPM = 140;
    const BEAT = 60 / BPM; // ~0.429s

    // E-minor bass pattern (16 notes cycling)
    const bassSeq = [82.41, 82.41, 87.31, 98.0, 82.41, 73.42, 82.41, 98.0,
                     110.0, 98.0, 82.41, 87.31, 73.42, 82.41, 98.0, 110.0];
    // Melody pattern (8 notes cycling)
    const melSeq = [329.63, 392.0, 440.0, 392.0, 329.63, 293.66, 329.63, 369.99,
                    440.0, 493.88, 440.0, 392.0, 329.63, 293.66, 246.94, 329.63];
    let step = 0;
    let running = true;

    const tick = () => {
      if (!running) return;
      const t = ctx.currentTime + 0.04;
      const b = step % bassSeq.length;
      const m = step % melSeq.length;

      this.scheduleNote(bassSeq[b], "sawtooth", 0.22, t, BEAT * 0.85);
      this.scheduleNote(melSeq[m], "square", 0.06, t, BEAT * 0.4);

      // Kick on 1 & 3
      if (step % 4 === 0 || step % 4 === 2) this.scheduleKick(t);
      // Snare on 2 & 4
      if (step % 4 === 1 || step % 4 === 3) this.scheduleSnare(t);

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
