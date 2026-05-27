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
  // Decoded AudioBuffer cache keyed by URL. Lets us pre-warm large MP3s
  // (battle, victory) so the music starts instantly when the track switches
  // instead of waiting on a fetch + decode round-trip.
  private bufferCache = new Map<string, Promise<AudioBuffer | null>>();

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
        // `!this.transitioning` is critical: ctx state can transition to
        // "running" mid-setTrack (right after ensureCtx, during the 100ms
        // pre-play wait) while cleanupFns is still empty because playLobby/
        // playBattle/playVictory hasn't pushed its cleanup yet. Without this
        // guard we'd recursively kick off a SECOND setTrack for the same
        // track — the original then races through to playLobby too, and you
        // end up with two looping sources playing the same MP3 offset by
        // ~700ms (the classic "doubled music" bug).
        if (
          this.ctx?.state === "running" &&
          !this._muted &&
          this.currentTrack !== "off" &&
          this.cleanupFns.length === 0 &&
          !this.transitioning
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

    // Snappier crossfade when switching to victory — players want the win
    // sting to land the instant the screen reveals, not a full second later.
    const fadeSec = track === "victory" ? 0.18 : 0.5;
    const waitMs  = track === "victory" ? 200  : 600;

    try {
      this.stopAll(fadeSec);
      this.currentTrack = track;

      await new Promise<void>((r) => setTimeout(r, waitMs));

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
    } finally {
      // Hold `transitioning` true through the ENTIRE lifecycle (including
      // ensureCtx + the 100ms pre-play wait) so onstatechange can't fire a
      // recursive setTrack while we're still in the gap between
      // currentTrack assignment and the playLobby/Battle/Victory cleanup
      // push. See onstatechange comment in ensureCtx.
      this.transitioning = false;
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
    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
    this.playLoopedBuffer(`${base}/selection.mp3`, "lobby");
  }

  // Fetch + decode an MP3 once per URL; subsequent calls return the cached
  // promise. Used by both playBattle/playVictory and the pre-warm path.
  private loadBuffer(url: string): Promise<AudioBuffer | null> {
    const cached = this.bufferCache.get(url);
    if (cached) return cached;
    const { ctx } = this.ensureCtx();
    const p = fetch(url)
      .then(r => r.arrayBuffer())
      .then(buf => ctx.decodeAudioData(buf))
      .catch(() => null);
    this.bufferCache.set(url, p);
    return p;
  }

  // Play a looping pre-decoded buffer for the given track. Returns immediately
  // if the buffer is already cached (the common case for victory once battle
  // has pre-warmed it), otherwise waits for fetch+decode.
  private playLoopedBuffer(url: string, track: MusicTrack) {
    const { ctx, master } = this.ensureCtx();
    let source: AudioBufferSourceNode | null = null;
    let stopped = false;

    void this.loadBuffer(url).then(decoded => {
      if (!decoded || stopped || this.currentTrack !== track) return;
      source = ctx.createBufferSource();
      source.buffer = decoded;
      source.loop = true;
      source.connect(master);
      source.start();
    });

    this.cleanupFns.push(() => {
      stopped = true;
      try { source?.stop(); } catch { /**/ }
    });
  }

  // ─── BATTLE ── looping war-drum bed (MP3) ──────────────────────────────────
  private playBattle() {
    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
    this.playLoopedBuffer(`${base}/battle.mp3`, "battle");
    // Pre-warm the victory buffer in the background so the win sting can
    // start instantly the moment the fight ends — no fetch/decode wait.
    void this.loadBuffer(`${base}/victory.mp3`);
  }

  // ─── VICTORY ── trap victory anthem (looped MP3) ───────────────────────────
  private playVictory() {
    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
    this.playLoopedBuffer(`${base}/victory.mp3`, "victory");
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
