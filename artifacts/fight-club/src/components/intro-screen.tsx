import { useEffect, useRef } from "react";
import { useListCharacters } from "@workspace/api-client-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface IntroChar {
  name: string;
  imageUrl: string | null;
  universe: string;
  archetype: Archetype;
  img: HTMLImageElement | null;
}

type Archetype = "melee" | "flyer" | "tech" | "brute" | "cosmic";

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  color: string;
  type: "spark" | "smoke" | "ember";
}

// ─── React wrapper ────────────────────────────────────────────────────────────
export function IntroScreen({ onDone }: { onDone: () => void }) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const wrapRef    = useRef<HTMLDivElement>(null);
  const doneRef    = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const { data: characters } = useListCharacters();

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    cleanupRef.current?.();
    onDone();
  };

  useEffect(() => {
    if (!characters || characters.length === 0) return;
    const canvas = canvasRef.current!;
    const wrap   = wrapRef.current!;
    cleanupRef.current = runIntro(canvas, wrap, characters as any[], finish);
    return () => cleanupRef.current?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characters]);

  // Auto-skip after 20 s as a safety net
  useEffect(() => {
    const t = setTimeout(finish, 20_000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={wrapRef}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "#000",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
      {/* Skip button */}
      <button
        onClick={finish}
        style={{
          position: "absolute", bottom: 24, right: 24,
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 13, letterSpacing: "0.25em",
          color: "rgba(255,255,255,0.4)",
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.15)",
          padding: "6px 16px",
          cursor: "pointer",
          textTransform: "uppercase",
          transition: "color 0.2s, border-color 0.2s",
          zIndex: 10,
        }}
        onMouseEnter={e => {
          (e.target as HTMLButtonElement).style.color = "#fff";
          (e.target as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.5)";
        }}
        onMouseLeave={e => {
          (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.4)";
          (e.target as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.15)";
        }}
      >
        SKIP ▶
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PURE JS ANIMATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  red:    "#ff0055",
  orange: "#ff6600",
  cyan:   "#00f0ff",
  gold:   "#ffc800",
  white:  "#ffffff",
  bg:     "#000000",
};

// ─── Easing helpers ───────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number)    { return a + (b - a) * t; }
function clamp(v: number, lo: number, hi: number) { return v < lo ? lo : v > hi ? hi : v; }
function ease3(t: number)  { return 1 - Math.pow(1 - clamp(t,0,1), 3); }  // ease-out cubic
function ease2in(t: number){ return Math.pow(clamp(t,0,1), 2); }           // ease-in quad
// Scene progress: returns [0,1] for t within [start,end]
function sp(t: number, start: number, end: number) {
  return clamp((t - start) / (end - start), 0, 1);
}

// ─── Archetype detector ───────────────────────────────────────────────────────
function detectArchetype(name: string, universe: string): Archetype {
  const n = name.toLowerCase();
  if (/galactus|darkseid|thanos|beerus|anti.monitor|living tribunal|eternity|beyonder|saitama|anos|rimuru|anti.spiral|meruem|whis/.test(n)) return "cosmic";
  if (/hulk|broly|doomsday|godzilla|king kong|juggernaut|apocalypse|colossus|brute|blackheart|kaiju|titan/.test(n)) return "brute";
  if (/thor|superman|iron man|green lantern|captain marvel|falcon|storm|silver surfer|nova|supergirl|ms.marvel|flying|fly/.test(n)) return "flyer";
  if (/batman|cyborg|bumblebee|optimus|master chief|solid snake|robocop|terminator|judge dredd|ironman/.test(n)) return "tech";
  return "melee";
}

// ─── Archetype-aware character picker ─────────────────────────────────────────
function pickByArchetype(pool: IntroChar[], type: Archetype, used: Set<number>): IntroChar | null {
  const matches = pool.filter((c, i) => c.archetype === type && !used.has(i) && c.img);
  if (matches.length > 0) return matches[Math.floor(Math.random() * matches.length)];
  // Fall back to any loaded char not yet used
  const fallback = pool.filter((_, i) => !used.has(i) && pool[i].img);
  return fallback.length > 0 ? fallback[Math.floor(Math.random() * fallback.length)] : null;
}

// ─── Draw helpers ─────────────────────────────────────────────────────────────

/** Solid dark background with subtle vignette */
function drawBg(ctx: CanvasRenderingContext2D, W: number, H: number, pulse = 0) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  if (pulse > 0) {
    const r = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W * 0.8);
    r.addColorStop(0, `rgba(180,0,40,${pulse * 0.18})`);
    r.addColorStop(1, "transparent");
    ctx.fillStyle = r;
    ctx.fillRect(0, 0, W, H);
  }
  // Vignette
  const v = ctx.createRadialGradient(W/2, H/2, H * 0.3, W/2, H/2, H * 0.9);
  v.addColorStop(0, "transparent");
  v.addColorStop(1, "rgba(0,0,0,0.75)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

/** Scanlines overlay */
function drawScanlines(ctx: CanvasRenderingContext2D, W: number, H: number, alpha = 0.07) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#000";
  for (let y = 0; y < H; y += 4) {
    ctx.fillRect(0, y, W, 1);
  }
  ctx.restore();
}

/** Radial speed lines from a center point */
function drawSpeedLines(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  count: number, minR: number, maxR: number,
  color: string, alpha: number
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.sin(i * 1.3) * 0.2;
    const len   = minR + Math.random() * (maxR - minR);
    ctx.lineWidth = 0.5 + Math.random() * 1.2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * minR, cy + Math.sin(angle) * minR);
    ctx.lineTo(cx + Math.cos(angle) * len,  cy + Math.sin(angle) * len);
    ctx.stroke();
  }
  ctx.restore();
}

/** Horizontal energy beam */
function drawBeam(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  color: string, width: number, alpha: number
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  // Outer glow
  ctx.shadowBlur  = 30;
  ctx.shadowColor = color;
  ctx.strokeStyle = color;
  ctx.lineWidth   = width;
  ctx.lineCap     = "round";
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  // Mid glow
  ctx.shadowBlur = 12;
  ctx.strokeStyle = `rgba(255,200,100,${alpha})`;
  ctx.lineWidth   = width * 0.5;
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  // White core
  ctx.shadowBlur  = 4;
  ctx.strokeStyle = "#fff";
  ctx.lineWidth   = width * 0.18;
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  ctx.restore();
}

/** Circular slash arc */
function drawSlash(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  aStart: number, aEnd: number,
  color: string, width: number, alpha: number
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowBlur  = 20;
  ctx.shadowColor = color;
  ctx.strokeStyle = color;
  ctx.lineWidth   = width;
  ctx.lineCap     = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, r, aStart, aEnd);
  ctx.stroke();
  // White core
  ctx.shadowBlur  = 6;
  ctx.strokeStyle = "#fff";
  ctx.lineWidth   = width * 0.25;
  ctx.beginPath();
  ctx.arc(cx, cy, r, aStart, aEnd);
  ctx.stroke();
  ctx.restore();
}

/** Expanding shockwave ring */
function drawShockwave(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number, alpha: number, color = C.orange
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.shadowBlur  = 20;
  ctx.shadowColor = color;
  ctx.lineWidth   = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Full-screen white flash */
function drawImpactFlash(ctx: CanvasRenderingContext2D, W: number, H: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle   = "#fff";
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** Glowing text */
function drawGlowText(
  ctx: CanvasRenderingContext2D,
  text: string, x: number, y: number,
  font: string, color: string, glowColor: string, alpha: number, align: CanvasTextAlign = "center"
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font        = font;
  ctx.textAlign   = align;
  ctx.textBaseline = "middle";
  ctx.shadowBlur  = 40;
  ctx.shadowColor = glowColor;
  ctx.fillStyle   = color;
  ctx.fillText(text, x, y);
  ctx.shadowBlur  = 15;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** Draw a character image, anchored bottom-center at (cx, by) */
function drawCharacter(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number, by: number,
  scale: number, alpha: number,
  flipX = false,
  glowColor: string | null = null
) {
  if (alpha <= 0 || scale <= 0) return;
  const w = img.naturalWidth  * scale;
  const h = img.naturalHeight * scale;
  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.translate(cx, by);
  if (flipX) ctx.scale(-1, 1);
  if (glowColor) {
    ctx.shadowBlur  = 50;
    ctx.shadowColor = glowColor;
  }
  ctx.drawImage(img, -w / 2, -h, w, h);
  ctx.restore();
}

/** Draw a character silhouette (solid color fill) */
function drawSilhouette(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number, by: number,
  scale: number, alpha: number,
  color = "#000"
) {
  if (alpha <= 0 || scale <= 0) return;
  const offscreen = document.createElement("canvas");
  const w = img.naturalWidth  * scale;
  const h = img.naturalHeight * scale;
  offscreen.width  = w;
  offscreen.height = h;
  const octx = offscreen.getContext("2d")!;
  octx.drawImage(img, 0, 0, w, h);
  octx.globalCompositeOperation = "source-in";
  octx.fillStyle = color;
  octx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.translate(cx, by);
  ctx.drawImage(offscreen, -w / 2, -h, w, h);
  ctx.restore();
}

/** Spawn a burst of sparks */
function spawnSparks(
  particles: Particle[], cx: number, cy: number,
  count: number, speed: number, color = C.orange
) {
  for (let i = 0; i < count; i++) {
    const a  = Math.random() * Math.PI * 2;
    const sp = speed * (0.4 + Math.random() * 0.6);
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - speed * 0.3,
      life: 1, maxLife: 1,
      size: 2 + Math.random() * 4,
      color,
      type: "spark",
    });
  }
}

/** Spawn smoke puffs */
function spawnSmoke(particles: Particle[], cx: number, cy: number, count: number) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: cx + (Math.random() - 0.5) * 60,
      y: cy + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -0.8 - Math.random() * 1.2,
      life: 1, maxLife: 1,
      size: 20 + Math.random() * 40,
      color: "rgba(120,60,0,0.3)",
      type: "smoke",
    });
  }
}

/** Update and draw all particles, returns pruned list */
function tickParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  dt: number
): Particle[] {
  const alive: Particle[] = [];
  for (const p of particles) {
    p.x    += p.vx;
    p.y    += p.vy;
    p.life -= dt * (p.type === "smoke" ? 0.6 : 1.4);
    if (p.life <= 0) continue;
    const a = p.life / p.maxLife;
    if (p.type === "spark") {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.shadowBlur  = 8;
      ctx.shadowColor = p.color;
      ctx.fillStyle   = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.restore();
    } else {
      const r = p.size * (2 - a);
      ctx.save();
      ctx.globalAlpha = a * 0.25;
      ctx.fillStyle   = `rgba(100,60,20,1)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    alive.push(p);
  }
  return alive;
}

/** Apply CSS shake to the container element */
function shake(el: HTMLElement, intensity: number) {
  const x = (Math.random() - 0.5) * intensity;
  const y = (Math.random() - 0.5) * intensity;
  el.style.transform = `translate(${x}px, ${y}px)`;
}

/** Random element from array */
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN INTRO ENGINE
// ═══════════════════════════════════════════════════════════════════════════════
function runIntro(
  canvas: HTMLCanvasElement,
  wrap:   HTMLElement,
  rawChars: Array<{ name: string; imageUrl: string | null; universe: string }>,
  onComplete: () => void
): () => void {
  let stopped = false;
  let raf = 0;
  let particles: Particle[] = [];
  let lastTs = 0;
  let elapsed = 0;        // seconds
  let shakeDecay = 0;     // current shake intensity
  let globalFade = 1;     // 1 = opaque, 0 = transparent (for final fade-to-black)
  let introFade  = 0;     // 0→1 initial fade-in

  // ─── Canvas sizing ──────────────────────────────────────────────────────────
  function resize() {
    canvas.width  = canvas.offsetWidth  * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
  }
  resize();
  const onResize = () => resize();
  window.addEventListener("resize", onResize);

  const ctx = canvas.getContext("2d")!;

  // ─── Preload characters ─────────────────────────────────────────────────────
  const introChars: IntroChar[] = rawChars
    .filter(c => c.imageUrl)
    .map(c => ({
      name: c.name,
      imageUrl: c.imageUrl,
      universe: c.universe || "",
      archetype: detectArchetype(c.name, c.universe || ""),
      img: null,
    }));

  // Fallback roster if the real one is too small
  const FALLBACK: Array<Omit<IntroChar, "img">> = [
    { name: "Goku",        imageUrl: null, universe: "Dragon Ball",  archetype: "cosmic"  },
    { name: "Batman",      imageUrl: null, universe: "DC Comics",    archetype: "tech"    },
    { name: "Kratos",      imageUrl: null, universe: "God of War",   archetype: "brute"   },
    { name: "Iron Man",    imageUrl: null, universe: "Marvel",       archetype: "flyer"   },
    { name: "Naruto",      imageUrl: null, universe: "Naruto",       archetype: "melee"   },
    { name: "Thanos",      imageUrl: null, universe: "Marvel",       archetype: "cosmic"  },
    { name: "Wolverine",   imageUrl: null, universe: "Marvel",       archetype: "melee"   },
    { name: "Thor",        imageUrl: null, universe: "Marvel",       archetype: "flyer"   },
  ];

  const pool: IntroChar[] = introChars.length >= 6
    ? introChars
    : [...introChars, ...FALLBACK.map(f => ({ ...f, img: null as null }))];

  // Shuffle pool
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Preload images
  let imagesLoaded = false;
  let loadedCount  = 0;
  const toLoad = pool.filter(c => c.imageUrl);

  function maybeStart() {
    loadedCount++;
    if (loadedCount >= Math.min(toLoad.length, 4)) {
      imagesLoaded = true;
    }
  }

  if (toLoad.length === 0) {
    imagesLoaded = true;
  } else {
    for (const c of toLoad) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload  = () => { c.img = img; maybeStart(); };
      img.onerror = () => maybeStart();
      img.src     = c.imageUrl!;
    }
  }

  // ─── Character assignment for each scene ────────────────────────────────────
  // We do lazy assignment once images start loading
  let assigned = false;
  let sceneChars: {
    s2: IntroChar | null;   // melee/fighter reveal
    s3: IntroChar | null;   // flyer/beam
    s4: IntroChar | null;   // brute
    s5: IntroChar[];        // montage (4)
    s6: IntroChar | null;   // cosmic
  } = { s2: null, s3: null, s4: null, s5: [], s6: null };

  function assignChars() {
    if (assigned) return;
    assigned = true;
    const used = new Set<number>();
    const find = (type: Archetype) => {
      const idx = pool.findIndex((c, i) => c.archetype === type && !used.has(i) && c.img);
      if (idx >= 0) { used.add(idx); return pool[idx]; }
      const fb  = pool.findIndex((c, i) => !used.has(i) && c.img);
      if (fb >= 0)  { used.add(fb);  return pool[fb];  }
      return null;
    };
    sceneChars.s2 = find("melee");
    sceneChars.s3 = find("flyer") || find("tech");
    sceneChars.s4 = find("brute");
    for (let i = 0; i < 4; i++) {
      const types: Archetype[] = ["melee", "tech", "flyer", "brute"];
      const c = find(types[i % 4]);
      if (c) sceneChars.s5.push(c);
    }
    sceneChars.s6 = find("cosmic");
  }

  // ─── Timeline constants (seconds) ───────────────────────────────────────────
  const T = {
    fadeIn:      { s: 0.0,  e: 1.2 },  // black -> visible
    logo:        { s: 0.2,  e: 2.5 },  // A·v·A glitch flicker
    s2reveal:    { s: 1.8,  e: 4.2 },  // first fighter + WHOEVER
    s3attack:    { s: 4.0,  e: 6.8 },  // beam attack + WHEREVER
    s4brute:     { s: 6.5,  e: 9.2 },  // brute slam
    s5montage:   { s: 9.0,  e: 13.0 }, // 4-char montage
    s6cosmic:    { s: 12.8, e: 15.5 }, // cosmic giant
    titleReveal: { s: 15.2, e: 18.5 }, // AVA BATTLE ARENA
    fadeOut:     { s: 17.8, e: 19.5 }, // fade to black
    end:         19.5,
  };

  // Persistent state per scene
  let beamX    = 0;    // beam travel position
  let shockR   = 0;    // shockwave radius
  let shockA   = 0;    // shockwave alpha
  let bruteLanded = false;
  let montageIdx  = 0; // current montage char
  let titleLetters = 0;

  // ─── Main draw loop ──────────────────────────────────────────────────────────
  function draw(ts: number) {
    if (stopped) return;
    const dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;

    if (!imagesLoaded) {
      raf = requestAnimationFrame(draw);
      // Show loading pulse
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const p = (Math.sin(ts / 400) * 0.5 + 0.5);
      drawGlowText(ctx, "A·v·A", canvas.width/2, canvas.height/2,
        `${Math.floor(40 * (canvas.width / 400))}px 'Bebas Neue'`, "#fff", C.red, p * 0.5);
      return;
    }

    assignChars();
    elapsed += dt;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const t  = elapsed;

    // Intro fade-in
    introFade = ease3(sp(t, T.fadeIn.s, T.fadeIn.e));
    // Final fade-out
    if (t > T.fadeOut.s) {
      globalFade = 1 - ease2in(sp(t, T.fadeOut.s, T.fadeOut.e));
    }

    // Apply global fade and shake to wrapper
    wrap.style.opacity    = String(clamp(introFade * globalFade, 0, 1));
    if (shakeDecay > 0.5) {
      shake(wrap, shakeDecay);
      shakeDecay *= 0.85;
    } else {
      wrap.style.transform = "translate(0,0)";
      shakeDecay = 0;
    }

    // ── Background ────────────────────────────────────────────────────────────
    const bgPulse = t > T.s3attack.s && t < T.s3attack.e
      ? Math.sin((t - T.s3attack.s) * 8) * 0.5 + 0.5
      : 0;
    drawBg(ctx, W, H, bgPulse);

    // ── SCENE 1: Logo flicker ─────────────────────────────────────────────────
    if (t < T.logo.e) {
      const logoP = sp(t, T.logo.s, T.logo.e);
      const logoAlpha = logoP < 0.7 ? ease3(logoP / 0.7) : 1 - ease3((logoP - 0.7) / 0.3);
      // Glitch offset
      const gx = (Math.random() - 0.5) * 6 * (1 - logoP);
      const gy = (Math.random() - 0.5) * 4 * (1 - logoP);
      const fontSize = Math.floor(cx * 0.28);
      drawGlowText(ctx, "A·v·A", cx + gx, cy + gy,
        `${fontSize}px 'Bebas Neue'`, "#fff", C.red, logoAlpha * 0.9);
      // Red scan flash
      if (Math.random() < 0.03) {
        ctx.save();
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = C.red;
        ctx.fillRect(0, Math.random() * H, W, 2);
        ctx.restore();
      }
    }

    // ── SCENE 2: First fighter reveal ─────────────────────────────────────────
    if (t >= T.s2reveal.s && t < T.s2reveal.e + 0.5) {
      const p  = sp(t, T.s2reveal.s, T.s2reveal.e);
      const c  = sceneChars.s2;
      const enterP = ease3(sp(t, T.s2reveal.s, T.s2reveal.s + 1));
      // Speed lines
      if (enterP < 0.8) {
        drawSpeedLines(ctx, cx, H * 0.65, 60, cx * 0.1, cx * 0.9,
          C.white, (1 - enterP) * 0.35);
      }
      // Fighter
      if (c?.img) {
        const scale = lerp(1.4, 0.9, ease3(enterP)) * (H / c.img.naturalHeight) * 0.75;
        const fx    = cx + lerp(-W * 0.5, 0, ease3(enterP));
        const glowC = t < T.s2reveal.s + 0.5 ? C.white : null;
        drawCharacter(ctx, c.img, fx, H * 0.98, scale, enterP, false, glowC);
        // Name label
        if (p > 0.3) {
          const na = ease3(sp(t, T.s2reveal.s + 0.5, T.s2reveal.s + 1.2));
          drawGlowText(ctx, c.name.toUpperCase(), cx, H * 0.88,
            `${Math.floor(H * 0.028)}px 'Bebas Neue'`, "#fff", C.red, na * 0.8);
        }
      }
      // "WHOEVER." text reveal
      if (p > 0.55) {
        const wa = ease3(sp(t, T.s2reveal.s + 1.0, T.s2reveal.s + 1.6));
        drawGlowText(ctx, "WHOEVER.", cx, H * 0.12,
          `${Math.floor(H * 0.055)}px 'Bebas Neue'`, "#fff", C.red, wa);
      }
    }

    // ── SCENE 3: Beam attack ──────────────────────────────────────────────────
    if (t >= T.s3attack.s && t < T.s3attack.e + 0.4) {
      const c  = sceneChars.s3;
      const enterP = ease3(sp(t, T.s3attack.s, T.s3attack.s + 0.8));

      // Fighter on right, flipped
      if (c?.img) {
        const scale = (H / c.img.naturalHeight) * 0.7;
        const fx    = cx + lerp(W * 0.6, W * 0.25, ease3(enterP));
        drawCharacter(ctx, c.img, fx, H * 0.98, scale, enterP, true, C.cyan);
      }

      // Beam fires
      const beamStart = T.s3attack.s + 1.0;
      if (t >= beamStart) {
        const bp = ease3(sp(t, beamStart, beamStart + 0.6));
        beamX = lerp(W * 0.25, -W * 0.1, bp);
        const beamAlpha = 1 - ease3(sp(t, beamStart + 0.4, beamStart + 0.8));
        const beamY     = H * 0.55;
        drawBeam(ctx, beamX, beamY, beamX - W * 0.6, beamY, C.cyan, H * 0.012, beamAlpha);
        // Impact flash at far left
        if (bp > 0.85) {
          drawImpactFlash(ctx, W, H, (bp - 0.85) / 0.15 * 0.6);
          if (!bruteLanded) {
            spawnSparks(particles, 0, beamY, 30, 12, C.cyan);
            bruteLanded = true; // reuse flag
          }
        }
      }

      // "WHEREVER." text
      const wp = sp(t, T.s3attack.s + 1.5, T.s3attack.s + 2.2);
      if (wp > 0) {
        drawGlowText(ctx, "WHEREVER.", cx, H * 0.12,
          `${Math.floor(H * 0.055)}px 'Bebas Neue'`, "#fff", C.orange, ease3(wp));
      }

      // Slash arcs mid-scene
      if (t > T.s3attack.s + 0.9 && t < T.s3attack.s + 1.5) {
        const sp2 = (t - (T.s3attack.s + 0.9)) / 0.6;
        drawSlash(ctx, cx * 0.8, H * 0.5, H * 0.18, -0.5, 0.8,
          C.white, H * 0.005, ease3(sp2) * (1 - ease3(sp2)) * 4);
      }
    }
    bruteLanded = false; // reset flag each frame (spark spawn guard happens inline)

    // ── SCENE 4: Brute entrance ───────────────────────────────────────────────
    if (t >= T.s4brute.s && t < T.s4brute.e + 0.5) {
      const c     = sceneChars.s4;
      const enterP = ease3(sp(t, T.s4brute.s, T.s4brute.s + 0.9));
      const thud   = T.s4brute.s + 0.8;

      // Shadow first
      if (enterP > 0.2 && c?.img) {
        const shadowA = ease3(sp(t, T.s4brute.s + 0.1, T.s4brute.s + 0.5));
        const scale   = (H / c.img.naturalHeight) * 0.88;
        // Shadow silhouette drop
        const sy = lerp(-H * 0.5, H * 0.98, ease3(enterP));
        drawSilhouette(ctx, c.img, cx, sy, scale, shadowA * 0.6, "rgba(255,0,60,0.4)");
        // Actual fighter
        if (enterP > 0.6) {
          drawCharacter(ctx, c.img, cx, sy, scale, ease3(sp(t, T.s4brute.s + 0.6, T.s4brute.s + 1.0)), false, C.red);
        }
      }

      // Landing thud: screen shake + shockwave
      if (t >= thud && t < thud + 0.15 && !stopped) {
        shakeDecay = 18;
        if (shockR === 0) {
          shockR = 1;
          spawnSparks(particles, cx, H * 0.95, 50, 14, C.orange);
          spawnSmoke(particles, cx, H * 0.9, 12);
        }
      }
      if (shockR > 0) {
        shockR  = Math.min(shockR + dt * 500, W * 0.8);
        shockA  = Math.max(shockA + (shockR < 200 ? 0.05 : -dt * 3), 0);
        if (shockR < W * 0.6) drawShockwave(ctx, cx, H * 0.95, shockR, shockA);
        if (shockA <= 0) { shockR = 0; shockA = 0; }
      }

      // "FIGHT." text flash
      if (t > T.s4brute.s + 1.5 && t < T.s4brute.s + 2.5) {
        const fa = ease3(sp(t, T.s4brute.s + 1.5, T.s4brute.s + 1.9)) *
                   (1 - ease3(sp(t, T.s4brute.s + 2.1, T.s4brute.s + 2.5)));
        drawGlowText(ctx, "FIGHT.", cx, cy,
          `${Math.floor(H * 0.12)}px 'Bebas Neue'`, "#fff", C.red, fa);
      }
    }

    // ── SCENE 5: Montage ──────────────────────────────────────────────────────
    if (t >= T.s5montage.s && t < T.s5montage.e) {
      const total = sceneChars.s5.length;
      if (total > 0) {
        const segLen  = (T.s5montage.e - T.s5montage.s) / total;
        const segIdx  = clamp(Math.floor((t - T.s5montage.s) / segLen), 0, total - 1);
        const segT    = ((t - T.s5montage.s) % segLen) / segLen;
        const c       = sceneChars.s5[segIdx];
        montageIdx    = segIdx;

        // Red flash on cut
        if (segT < 0.08) {
          drawImpactFlash(ctx, W, H, (1 - segT / 0.08) * 0.5);
        }

        if (c?.img) {
          // Alternate left/right
          const flip  = segIdx % 2 === 1;
          const fx    = cx + (flip ? W * 0.15 : -W * 0.15);
          const scale = (H / c.img.naturalHeight) * (0.68 + segIdx * 0.04);
          const charA = ease3(Math.min(segT * 5, 1));
          drawCharacter(ctx, c.img, fx, H * 0.98, scale, charA, flip, C.red);
          // Name flash
          drawGlowText(ctx, c.name.toUpperCase(), cx,
            flip ? H * 0.14 : H * 0.86,
            `${Math.floor(H * 0.03)}px 'Bebas Neue'`, "#fff", C.red,
            ease3(Math.min(segT * 8, 1)) * 0.9);
        }

        // Slash arc between each segment
        if (segT > 0.6 && segT < 0.95) {
          const slashP = (segT - 0.6) / 0.35;
          const dir = segIdx % 2 === 0 ? 1 : -1;
          drawSlash(ctx, cx, H * 0.5, H * 0.28,
            dir * (-0.3), dir * 1.4,
            C.white, H * 0.006, ease3(slashP) * (1 - ease3(slashP)) * 3.5);
        }

        // Speed lines on entry
        if (segT < 0.25) {
          drawSpeedLines(ctx, cx, H * 0.5, 40, cx * 0.05, cx * 0.7,
            C.red, (1 - segT / 0.25) * 0.3);
        }
      }
    }

    // ── SCENE 6: Cosmic giant ─────────────────────────────────────────────────
    if (t >= T.s6cosmic.s && t < T.s6cosmic.e + 0.5) {
      const c     = sceneChars.s6;
      const enterP = ease3(sp(t, T.s6cosmic.s, T.s6cosmic.s + 1.2));
      const pulseP = (Math.sin((t - T.s6cosmic.s) * 2) * 0.5 + 0.5);

      if (c?.img) {
        // Giant bg silhouette
        const bgScale = (H * 1.4) / c.img.naturalHeight;
        drawSilhouette(ctx, c.img, cx, H * 1.05, bgScale * enterP,
          enterP * 0.55, `rgba(255,0,80,0.9)`);
        // Foreground character slightly smaller
        const fgScale = (H * 0.85) / c.img.naturalHeight;
        drawCharacter(ctx, c.img, cx, H * 0.98, fgScale,
          ease3(sp(t, T.s6cosmic.s + 0.4, T.s6cosmic.s + 1.2)),
          false, `rgba(255,100,0,${0.5 + pulseP * 0.5})`);
      }

      // Energy particles orbit
      if (Math.random() < 0.4) {
        const angle = Math.random() * Math.PI * 2;
        const orbitR = H * 0.3;
        spawnSparks(particles,
          cx + Math.cos(angle) * orbitR,
          H * 0.5 + Math.sin(angle) * orbitR * 0.5,
          2, 2, pick([C.red, C.orange, C.gold]));
      }
      // Cosmic glow pulses
      const cg = ctx.createRadialGradient(cx, H * 0.45, 0, cx, H * 0.45, H * 0.5);
      cg.addColorStop(0, `rgba(255,60,0,${enterP * 0.22 * (0.7 + pulseP * 0.3)})`);
      cg.addColorStop(1, "transparent");
      ctx.fillStyle = cg;
      ctx.fillRect(0, 0, W, H);
    }

    // ── SCENE 7: Title card ───────────────────────────────────────────────────
    if (t >= T.titleReveal.s) {
      const p  = sp(t, T.titleReveal.s, T.titleReveal.e);
      const titleFull  = "AVA BATTLE ARENA";
      const subtitle   = "WHOEVER.  WHEREVER.  FIGHT.";

      // Dark overlay behind title
      ctx.save();
      ctx.globalAlpha = ease3(sp(t, T.titleReveal.s, T.titleReveal.s + 0.8)) * 0.75;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();

      // Background glow
      const gl = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.4);
      gl.addColorStop(0, `rgba(200,0,40,${p * 0.25})`);
      gl.addColorStop(1, "transparent");
      ctx.fillStyle = gl;
      ctx.fillRect(0, 0, W, H);

      // Horizontal accent lines
      if (p > 0.25) {
        const lineA = ease3(sp(t, T.titleReveal.s + 0.5, T.titleReveal.s + 1.0)) * 0.7;
        ctx.save();
        ctx.globalAlpha = lineA;
        ctx.strokeStyle = C.red;
        ctx.lineWidth   = 1;
        ctx.beginPath(); ctx.moveTo(W * 0.1, H * 0.39); ctx.lineTo(W * 0.9, H * 0.39); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(W * 0.1, H * 0.62); ctx.lineTo(W * 0.9, H * 0.62); ctx.stroke();
        ctx.restore();
      }

      // Title — letter-by-letter build
      const lettersToShow = Math.min(
        Math.floor(ease3(sp(t, T.titleReveal.s + 0.1, T.titleReveal.s + 1.8)) * titleFull.length + 0.99),
        titleFull.length
      );
      const visTitle = titleFull.slice(0, lettersToShow);
      const fontSize = Math.floor(H * 0.08);
      drawGlowText(ctx, visTitle, cx, H * 0.44,
        `${fontSize}px 'Bebas Neue'`, "#ffffff", C.red,
        ease3(sp(t, T.titleReveal.s + 0.1, T.titleReveal.s + 0.5)));

      // Subtitle
      if (p > 0.7) {
        const subA = ease3(sp(t, T.titleReveal.s + 2.0, T.titleReveal.s + 2.8));
        drawGlowText(ctx, subtitle, cx, H * 0.57,
          `${Math.floor(H * 0.025)}px 'Bebas Neue'`, "rgba(255,255,255,0.75)", C.orange, subA);
      }

      // Particle burst on title complete
      if (p > 0.65 && p < 0.7) {
        spawnSparks(particles, cx, H * 0.44, 40, 8, C.red);
        spawnSparks(particles, cx, H * 0.44, 20, 5, C.gold);
      }
    }

    // ── Particles (always on top of everything except overlay) ───────────────
    particles = tickParticles(ctx, particles, dt);

    // ── Scanlines ─────────────────────────────────────────────────────────────
    drawScanlines(ctx, W, H);

    // ── Red edge flash (occasional) ───────────────────────────────────────────
    if (Math.random() < 0.004) {
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = C.red;
      ctx.fillRect(0, 0, 3, H);
      ctx.fillRect(W - 3, 0, 3, H);
      ctx.restore();
    }

    // ── End check ─────────────────────────────────────────────────────────────
    if (t >= T.end) {
      stopped = true;
      onComplete();
      return;
    }

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(draw);

  // Return cleanup
  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", onResize);
    wrap.style.transform = "none";
    wrap.style.opacity   = "1";
  };
}
