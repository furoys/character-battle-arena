export type MusicTrack = "lobby" | "battle" | "victory" | "off";

class MusicEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentTrack: MusicTrack = "off";
  private _muted = false;
  private _volume = 0.34;
  private _ducked = false;
  private cleanupFns: Array<() => void> = [];
  private transitioning = false;

  constructor() {
    // Capture-phase listener: the moment the user touches anything, call
    // ctx.resume() synchronously (user-gesture token is alive at this point).
    // We never remove this listener — it's a no-op once the ctx is running.
    const unlockOnGesture = () => {
      if (!this.ctx || this.ctx.state !== "suspended" || this._muted) return;
      void this.ctx.resume(); // triggers onstatechange → starts the track
    };
    document.addEventListener("click", unlockOnGesture, true);
    document.addEventListener("touchstart", unlockOnGesture, true);
  }

  private ensureCtx() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0; // always start at 0; restoreGain fades in
      this.masterGain.connect(this.ctx.destination);

      // When the context transitions to "running" (first user gesture unlocks it,
      // or ctx.resume() succeeds after mute), start the pending track if nothing
      // is already producing audio.
      this.ctx.onstatechange = () => {
        if (
          this.ctx?.state === "running" &&
          !this._muted &&
          this.currentTrack !== "off" &&
          this.cleanupFns.length === 0
        ) {
          const t = this.currentTrack;
          this.currentTrack = "off";
          void this.setTrack(t);
        }
      };
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
        const target = this._muted ? 0 : this._ducked ? this._volume * 0.12 : this._volume;
        this.masterGain.gain.linearRampToValueAtTime(target, t + 0.5);
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

    // If the AudioContext is still suspended (browser autoplay policy), don't
    // try to start oscillators — onstatechange will call setTrack again once
    // the user's first gesture allows ctx.resume() to succeed.
    if (ctx.state !== "running") return;

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
    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

    let source: AudioBufferSourceNode | null = null;
    let stopped = false;

    fetch(`${base}/battle.mp3`)
      .then(r => r.arrayBuffer())
      .then(buf => {
        if (stopped || this.currentTrack !== "battle") return Promise.resolve(undefined as AudioBuffer | undefined);
        return ctx.decodeAudioData(buf);
      })
      .then(decoded => {
        if (!decoded || stopped || this.currentTrack !== "battle") return;
        source = ctx.createBufferSource();
        source.buffer = decoded;
        source.loop = true;
        source.connect(master);
        source.start();
      })
      .catch(() => { /* silent fail if fetch/decode errors */ });

    this.cleanupFns.push(() => {
      stopped = true;
      try { source?.stop(); } catch { /**/ }
    });
  }

  // ─── VICTORY ── trap victory anthem (looped MP3) ───────────────────────────
  private playVictory() {
    const { ctx, master } = this.ensureCtx();
    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

    let source: AudioBufferSourceNode | null = null;
    let stopped = false;

    fetch(`${base}/victory.mp3`)
      .then(r => r.arrayBuffer())
      .then(buf => {
        if (stopped || this.currentTrack !== "victory") return Promise.resolve(undefined as AudioBuffer | undefined);
        return ctx.decodeAudioData(buf);
      })
      .then(decoded => {
        if (!decoded || stopped || this.currentTrack !== "victory") return;
        source = ctx.createBufferSource();
        source.buffer = decoded;
        source.loop = true;
        source.connect(master);
        source.start();
      })
      .catch(() => { /* silent fail if fetch/decode errors */ });

    this.cleanupFns.push(() => {
      stopped = true;
      try { source?.stop(); } catch { /**/ }
    });
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  // Temporarily lower music volume while narration is speaking, then restore.
  // Fades smoothly so the transition isn't jarring.
  duck(active: boolean, fadeSec = 0.45) {
    this._ducked = active;
    if (this._muted || !this.ctx || !this.masterGain) return;
    const target = active ? this._volume * 0.12 : this._volume;
    const t = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(t);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, t);
    this.masterGain.gain.linearRampToValueAtTime(target, t + fadeSec);
  }

  setMuted(muted: boolean) {
    this._muted = muted;

    if (!this.ctx) return; // ctx not created yet — the flag alone is enough

    if (muted) {
      // ctx.suspend() halts ALL audio output at the hardware level — no amount
      // of scheduled gain automation can leak through. Oscillators stay in
      // cleanupFns so they resume seamlessly when un-muted.
      if (this.masterGain) {
        // Also zero the gain so there's no momentary blip if ctx is later
        // resumed from a different path (e.g. onstatechange).
        const t = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(t);
        this.masterGain.gain.setValueAtTime(0, t);
      }
      void this.ctx.suspend();
    } else {
      // ctx.resume() called from the mute-button click = a user gesture, so
      // it works even when the context was suspended by the browser's autoplay
      // policy (never had a prior interaction). onstatechange handles
      // restarting the track when oscillators were cleared.
      void this.ctx.resume();
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
