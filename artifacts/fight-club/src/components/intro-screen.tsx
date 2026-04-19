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
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number; color: string;
  type: "spark" | "smoke" | "ember" | "debris" | "dust";
}
interface Dust { x: number; y: number; vy: number; alpha: number; size: number; }

// ─── React wrapper ─────────────────────────────────────────────────────────────
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

  useEffect(() => {
    const t = setTimeout(finish, 27_000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={wrapRef}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "#000", overflow: "hidden", userSelect: "none",
      }}
    >
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
      <button
        onClick={finish}
        style={{
          position: "absolute", bottom: 28, right: 28,
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 12, letterSpacing: "0.3em",
          color: "rgba(255,255,255,0.3)",
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.12)",
          padding: "7px 18px", cursor: "pointer",
          textTransform: "uppercase", zIndex: 10,
          transition: "color 0.2s, border-color 0.2s",
        }}
        onMouseEnter={e => {
          (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.8)";
          (e.target as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.4)";
        }}
        onMouseLeave={e => {
          (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.3)";
          (e.target as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.12)";
        }}
      >SKIP ▶</button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CINEMATIC ENGINE  — pure JS, no framework
// ══════════════════════════════════════════════════════════════════════════════

const C = {
  red:    "#ff0044",
  orange: "#ff5500",
  amber:  "#ffaa00",
  gold:   "#ffd700",
  cyan:   "#00e5ff",
  white:  "#ffffff",
  cream:  "#fff8e0",
};

// ─── Easing ───────────────────────────────────────────────────────────────────
const clamp = (v: number, lo = 0, hi = 1) => v < lo ? lo : v > hi ? hi : v;
const lerp  = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOutCubic  = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
const easeInCubic   = (t: number) => Math.pow(clamp(t), 3);
const easeOutQuint  = (t: number) => 1 - Math.pow(1 - clamp(t), 5);
const easeInOutQuad = (t: number) => {
  t = clamp(t);
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};
// Progress of t within [s,e], clamped to [0,1]
const progress = (t: number, s: number, e: number) => clamp((t - s) / (e - s));
const rand = (lo = 0, hi = 1) => lo + Math.random() * (hi - lo);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

// ─── Archetype detection ──────────────────────────────────────────────────────
function archetype(name: string): Archetype {
  const n = name.toLowerCase();
  if (/galactus|darkseid|thanos|beerus|anti.monitor|living tribunal|beyonder|saitama|anos|rimuru|anti.spiral|meruem|whis|zeno|grand priest/.test(n)) return "cosmic";
  if (/hulk|broly|doomsday|godzilla|king kong|juggernaut|apocalypse|colossus|kaiju|titan|giant man|goliath/.test(n)) return "brute";
  if (/thor|superman|iron man|green lantern|captain marvel|falcon|storm|silver surfer|nova|supergirl|ms marvel|hawkgirl|angel|flying/.test(n)) return "flyer";
  if (/batman|cyborg|bumblebee|optimus|master chief|solid snake|robocop|terminator|judge dredd|ironman|war machine|ultron/.test(n)) return "tech";
  return "melee";
}

// ─── Draw primitives ──────────────────────────────────────────────────────────

function fillAll(ctx: CanvasRenderingContext2D, W: number, H: number, color: string, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H); ctx.restore();
}

function vignette(ctx: CanvasRenderingContext2D, W: number, H: number, strength = 0.82) {
  const g = ctx.createRadialGradient(W/2, H*0.5, H*0.18, W/2, H*0.5, H*0.9);
  g.addColorStop(0, "transparent");
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

/** Cinematic 2.35:1 letterbox bars */
function letterbox(ctx: CanvasRenderingContext2D, W: number, H: number, progress: number) {
  const barH = H * 0.095 * easeOutCubic(progress);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, barH);
  ctx.fillRect(0, H - barH, W, barH);
}

/** Volumetric light rays emanating from a point */
function lightRays(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, W: number, H: number,
  color: string, alpha: number, rayCount = 10, spread = Math.PI
) {
  if (alpha <= 0) return;
  ctx.save();
  for (let i = 0; i < rayCount; i++) {
    const baseAngle = -Math.PI / 2 + (i / (rayCount - 1) - 0.5) * spread;
    const jitter = (Math.random() - 0.5) * 0.08;
    const angle = baseAngle + jitter;
    const len = H * (1.6 + Math.random() * 0.8);
    const halfW = (20 + Math.random() * 60);
    const ex = cx + Math.cos(angle) * len;
    const ey = cy + Math.sin(angle) * len;
    const nx = -Math.sin(angle);
    const ny =  Math.cos(angle);
    const grad = ctx.createLinearGradient(cx, cy, ex, ey);
    grad.addColorStop(0, color.replace(")", `,${alpha * 0.55})`).replace("rgb", "rgba"));
    grad.addColorStop(0.4, color.replace(")", `,${alpha * 0.22})`).replace("rgb", "rgba"));
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx + nx * 2,           cy + ny * 2);
    ctx.lineTo(cx - nx * 2,           cy - ny * 2);
    ctx.lineTo(ex - nx * halfW,       ey - ny * halfW);
    ctx.lineTo(ex + nx * halfW,       ey + ny * halfW);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Radial speed lines */
function speedLines(
  ctx: CanvasRenderingContext2D, cx: number, cy: number,
  count: number, minR: number, maxR: number, color: string, alpha: number
) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rand(-0.15, 0.15);
    const len = rand(minR, maxR);
    ctx.lineWidth = rand(0.4, 1.8);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * minR, cy + Math.sin(a) * minR);
    ctx.lineTo(cx + Math.cos(a) * (minR + len), cy + Math.sin(a) * (minR + len));
    ctx.stroke();
  }
  ctx.restore();
}

/** Energy beam with layered glow */
function beam(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  color: string, width: number, alpha: number
) {
  if (alpha <= 0) return;
  ctx.save();
  // Wide outer bloom
  ctx.globalAlpha = alpha * 0.4;
  ctx.shadowBlur = 60; ctx.shadowColor = color;
  ctx.strokeStyle = color; ctx.lineWidth = width * 2.5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  // Mid glow
  ctx.globalAlpha = alpha * 0.7;
  ctx.shadowBlur = 25; ctx.lineWidth = width; ctx.strokeStyle = color;
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  // Warm core
  ctx.globalAlpha = alpha;
  ctx.shadowBlur = 8; ctx.lineWidth = width * 0.45;
  ctx.strokeStyle = "#fff8e0";
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  // Lens flare dot at origin
  const flareFade = alpha;
  ctx.globalAlpha = flareFade * 0.9;
  ctx.shadowBlur = 40; ctx.shadowColor = "#ffffff";
  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.arc(x1, y1, width * 0.8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** Slash arc */
function slash(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  a0: number, a1: number, color: string, width: number, alpha: number
) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha; ctx.shadowBlur = 28; ctx.shadowColor = color;
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round";
  ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.stroke();
  ctx.shadowBlur = 6; ctx.strokeStyle = "#fff"; ctx.lineWidth = width * 0.22;
  ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.stroke();
  ctx.restore();
}

/** Expanding shockwave (multiple rings) */
function shockwave(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, alpha: number, color = C.orange, rings = 1
) {
  if (alpha <= 0) return;
  ctx.save();
  for (let i = 0; i < rings; i++) {
    const ri = r * (1 - i * 0.18);
    const ai = alpha * (1 - i * 0.3);
    ctx.globalAlpha = Math.max(0, ai);
    ctx.strokeStyle = color; ctx.shadowBlur = 22; ctx.shadowColor = color;
    ctx.lineWidth = lerp(4, 1, i / Math.max(rings - 1, 1));
    ctx.beginPath(); ctx.arc(cx, cy, ri, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

/** Chromatic aberration flash on a horizontal band */
function chromaticFlash(
  ctx: CanvasRenderingContext2D, W: number, H: number, intensity: number
) {
  if (intensity <= 0) return;
  const shift = intensity * 12;
  ctx.save();
  ctx.globalAlpha = intensity * 0.35;
  ctx.fillStyle = "rgba(255,0,50,1)";
  ctx.fillRect(-shift, 0, W, H);
  ctx.globalAlpha = intensity * 0.25;
  ctx.fillStyle = "rgba(0,220,255,1)";
  ctx.fillRect(shift, 0, W, H);
  ctx.restore();
}

/** Full-screen impact flash */
function impactFlash(ctx: CanvasRenderingContext2D, W: number, H: number, alpha: number, color = "#ffffff") {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H); ctx.restore();
}

/** Glowing canvas text */
function glowText(
  ctx: CanvasRenderingContext2D,
  text: string, x: number, y: number,
  font: string, color: string, glowCol: string, alpha: number,
  align: CanvasTextAlign = "center"
) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = clamp(alpha);
  ctx.font = font; ctx.textAlign = align; ctx.textBaseline = "middle";
  ctx.shadowBlur = 60; ctx.shadowColor = glowCol; ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 20;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 6;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** Draw character, bottom-center anchored, with optional Ken Burns */
function drawChar(
  ctx: CanvasRenderingContext2D, img: HTMLImageElement,
  cx: number, baseY: number, scale: number, alpha: number,
  flip = false, glowCol: string | null = null,
  panX = 0, panY = 0   // extra pixel offset for Ken Burns
) {
  if (alpha <= 0 || scale <= 0) return;
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.save();
  ctx.globalAlpha = clamp(alpha);
  ctx.translate(cx + panX, baseY + panY);
  if (flip) ctx.scale(-1, 1);
  if (glowCol) { ctx.shadowBlur = 60; ctx.shadowColor = glowCol; }
  ctx.drawImage(img, -w / 2, -h, w, h);
  ctx.restore();
}

/** Black silhouette of a character */
function silhouette(
  ctx: CanvasRenderingContext2D, img: HTMLImageElement,
  cx: number, baseY: number, scale: number, alpha: number,
  glowCol = "rgba(255,0,60,0.8)"
) {
  if (alpha <= 0 || scale <= 0) return;
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  const off = document.createElement("canvas");
  off.width = w; off.height = h;
  const oc = off.getContext("2d")!;
  oc.drawImage(img, 0, 0, w, h);
  oc.globalCompositeOperation = "source-in";
  oc.fillStyle = "black"; oc.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalAlpha = clamp(alpha);
  ctx.shadowBlur = 40; ctx.shadowColor = glowCol;
  ctx.translate(cx, baseY);
  ctx.drawImage(off, -w / 2, -h, w, h);
  ctx.restore();
}

/** Ambient floating dust motes */
function tickDust(
  ctx: CanvasRenderingContext2D, dust: Dust[], W: number, H: number, dt: number
) {
  for (const d of dust) {
    d.y += d.vy * dt * 60;
    if (d.y < -10) d.y = H + 10;
    ctx.save(); ctx.globalAlpha = d.alpha;
    ctx.fillStyle = "#fff"; ctx.shadowBlur = 4; ctx.shadowColor = "#fff";
    ctx.beginPath(); ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

/** Particles tick */
function tickParticles(ctx: CanvasRenderingContext2D, particles: Particle[], dt: number): Particle[] {
  const alive: Particle[] = [];
  for (const p of particles) {
    p.x += p.vx; p.y += p.vy;
    if (p.type === "spark" || p.type === "debris") p.vy += 0.3;
    p.life -= dt * (p.type === "smoke" ? 0.5 : p.type === "dust" ? 0.3 : 1.2);
    if (p.life <= 0) continue;
    const a = p.life / p.maxLife;
    if (p.type === "spark" || p.type === "ember") {
      ctx.save(); ctx.globalAlpha = a;
      ctx.shadowBlur = 10; ctx.shadowColor = p.color; ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
      ctx.restore();
    } else if (p.type === "debris") {
      ctx.save(); ctx.globalAlpha = a * 0.9;
      ctx.fillStyle = "#888"; ctx.strokeStyle = "#ccc"; ctx.lineWidth = 0.5;
      ctx.translate(p.x, p.y); ctx.rotate(p.vx * 0.3);
      ctx.fillRect(-p.size/2, -p.size/4, p.size, p.size/4);
      ctx.restore();
    } else { // smoke
      ctx.save(); ctx.globalAlpha = a * 0.18;
      ctx.fillStyle = "rgba(80,40,10,1)";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (2 - a), 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    alive.push(p);
  }
  return alive;
}

function spawnSparks(ps: Particle[], cx: number, cy: number, count: number, spd: number, color = C.orange) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2);
    const s = spd * rand(0.35, 1);
    ps.push({ x: cx, y: cy, vx: Math.cos(a)*s, vy: Math.sin(a)*s - spd*0.25,
      life:1, maxLife:1, size: rand(2,5), color, type:"spark" });
  }
}
function spawnDebris(ps: Particle[], cx: number, cy: number, count: number) {
  for (let i = 0; i < count; i++) {
    ps.push({ x: cx + rand(-80,80), y: cy, vx: rand(-5,5), vy: rand(-8,-2),
      life:1, maxLife:1, size: rand(3,9), color:"#888", type:"debris" });
  }
}
function spawnSmoke(ps: Particle[], cx: number, cy: number, count: number) {
  for (let i = 0; i < count; i++) {
    ps.push({ x: cx+rand(-50,50), y: cy+rand(-20,20), vx:rand(-0.4,0.4), vy:rand(-1.5,-0.4),
      life:1, maxLife:1, size:rand(25,55), color:"rgba(80,40,0,0.2)", type:"smoke" });
  }
}

function shakeEl(el: HTMLElement, intensity: number) {
  el.style.transform = `translate(${rand(-1,1)*intensity}px,${rand(-1,1)*intensity}px)`;
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN INTRO RUNNER
// ════════════════════════════════════════════════════════════════════════════════
function runIntro(
  canvas: HTMLCanvasElement, wrap: HTMLElement,
  rawChars: Array<{ name: string; imageUrl: string | null; universe: string }>,
  onComplete: () => void
): () => void {
  let stopped  = false;
  let raf      = 0;
  let lastTs   = 0;
  let elapsed  = 0;
  let shakePow = 0;

  // ─── Resize ─────────────────────────────────────────────────────────────────
  const resize = () => {
    canvas.width  = canvas.offsetWidth  * devicePixelRatio;
    canvas.height = canvas.offsetHeight * devicePixelRatio;
  };
  resize();
  window.addEventListener("resize", resize);
  const ctx = canvas.getContext("2d")!;

  // ─── Dust motes ─────────────────────────────────────────────────────────────
  const DUST: Dust[] = Array.from({ length: 55 }, () => ({
    x: rand(0, canvas.width || 1280),
    y: rand(0, canvas.height || 720),
    vy: rand(-0.12, -0.06),
    alpha: rand(0.06, 0.25),
    size: rand(0.5, 2.2),
  }));

  // ─── Character pool ──────────────────────────────────────────────────────────
  const pool: IntroChar[] = rawChars
    .filter(c => c.imageUrl)
    .map(c => ({ name: c.name, imageUrl: c.imageUrl, universe: c.universe || "",
      archetype: archetype(c.name), img: null }));

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Preload images
  let ready = pool.length === 0;
  let loaded = 0;
  for (const c of pool) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload  = () => { c.img = img; if (++loaded >= Math.min(pool.length, 5)) ready = true; };
    img.onerror = () => { if (++loaded >= Math.min(pool.length, 5)) ready = true; };
    img.src = c.imageUrl!;
  }

  // ─── Scene character assignment ──────────────────────────────────────────────
  let assigned = false;
  let SC: {
    reveal: IntroChar | null;   // melee – spotlight reveal
    attack: IntroChar | null;   // flyer/tech – beam
    brute:  IntroChar | null;   // brute – slam
    montage: IntroChar[];       // 4-char montage
    cosmic: IntroChar | null;   // cosmic – finale bg
  } = { reveal: null, attack: null, brute: null, montage: [], cosmic: null };

  function assignChars() {
    if (assigned) return; assigned = true;
    const used = new Set<number>();
    const find = (type: Archetype) => {
      let idx = pool.findIndex((c, i) => c.archetype === type && !used.has(i) && c.img);
      if (idx < 0) idx = pool.findIndex((_, i) => !used.has(i) && pool[i].img);
      if (idx >= 0) { used.add(idx); return pool[idx]; }
      return null;
    };
    SC.reveal = find("melee");
    SC.attack = find("flyer") ?? find("tech");
    SC.brute  = find("brute");
    SC.cosmic = find("cosmic");
    const montageTypes: Archetype[] = ["melee","tech","flyer","brute"];
    for (let i = 0; i < 4; i++) {
      const c = find(montageTypes[i]); if (c) SC.montage.push(c);
    }
  }

  // ─── Timeline (seconds) ──────────────────────────────────────────────────────
  const T = {
    openPulse:   { s: 0.0,  e: 2.0  },  // black heartbeat
    logoReveal:  { s: 1.2,  e: 4.0  },  // A·v·A + light rays
    revealScene: { s: 3.8,  e: 7.8  },  // fighter 1: silhouette → full
    attackScene: { s: 7.6,  e: 11.2 },  // fighter 2: beam attack
    bruteScene:  { s: 11.0, e: 14.5 },  // brute: multi-shockwave slam
    montage:     { s: 14.2, e: 18.5 },  // 4-character rapid montage
    cosmicScene: { s: 18.2, e: 21.5 },  // cosmic giant backdrop
    titleScene:  { s: 21.0, e: 25.0 },  // stacked title card
    fadeOut:     { s: 24.2, e: 26.0 },  // fade to black
    end:         26.0,
  };

  // ─── Persistent per-scene state ──────────────────────────────────────────────
  let particles:   Particle[] = [];
  let shockRings:  Array<{ r: number; a: number; color: string; rings: number }> = [];
  let beamFired    = false;
  let bruteFired   = false;
  let montageSlash = -1;

  // ─── Main loop ───────────────────────────────────────────────────────────────
  function draw(ts: number) {
    if (stopped) return;
    const dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;

    // Loading screen
    if (!ready) {
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      const p = Math.sin(ts / 350) * 0.5 + 0.5;
      glowText(ctx, "A·v·A", canvas.width/2, canvas.height/2,
        `${Math.floor(canvas.width * 0.065)}px 'Bebas Neue'`, "#fff", C.red, p * 0.45);
      raf = requestAnimationFrame(draw); return;
    }

    assignChars();
    elapsed += dt;
    const t = elapsed;
    const W = canvas.width, H = canvas.height;
    const cx = W/2, cy = H/2;
    const BASEY = H * 1.01;  // character bottom anchor

    // ── Global overlays ─────────────────────────────────────────────────────
    const globalIn  = easeOutCubic(progress(t, T.openPulse.s, T.openPulse.s + 1.0));
    const globalOut = 1 - easeInCubic(progress(t, T.fadeOut.s, T.fadeOut.e));
    wrap.style.opacity = String(clamp(globalIn * globalOut));

    if (shakePow > 0.3) { shakeEl(wrap, shakePow); shakePow *= 0.82; }
    else { wrap.style.transform = ""; shakePow = 0; }

    // ── BACKGROUND ──────────────────────────────────────────────────────────
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);

    // Color mood per scene
    let moodCol = "0,0,0";
    let moodA   = 0;
    if (t >= T.revealScene.s && t < T.attackScene.s)
      { moodCol = "40,0,80"; moodA = 0.12; }
    if (t >= T.attackScene.s && t < T.bruteScene.s)
      { moodCol = "0,40,80"; moodA = 0.12; }
    if (t >= T.bruteScene.s && t < T.montage.s)
      { moodCol = "80,20,0"; moodA = 0.14; }
    if (t >= T.cosmicScene.s)
      { moodCol = "80,10,10"; moodA = 0.18; }
    if (moodA > 0) fillAll(ctx, W, H, `rgb(${moodCol})`, moodA);

    // ── SCENE 0: Heartbeat opening pulses ───────────────────────────────────
    if (t < T.openPulse.e + 0.5) {
      const beat1 = easeOutCubic(progress(t, 0.0, 0.3)) * (1 - easeInCubic(progress(t, 0.3, 0.9)));
      const beat2 = easeOutCubic(progress(t, 0.9, 1.2)) * (1 - easeInCubic(progress(t, 1.2, 1.8)));
      const bA = Math.max(beat1, beat2);
      if (bA > 0) {
        const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, W*0.6);
        gr.addColorStop(0, `rgba(200,0,30,${bA * 0.4})`);
        gr.addColorStop(1, "transparent");
        ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      }
    }

    // ── SCENE 1: Logo reveal ─────────────────────────────────────────────────
    if (t >= T.logoReveal.s && t < T.logoReveal.e + 0.5) {
      const lp  = progress(t, T.logoReveal.s, T.logoReveal.e);
      const lIn = easeOutQuint(progress(t, T.logoReveal.s, T.logoReveal.s + 1.2));
      const lOut = lp > 0.75 ? easeInCubic(progress(t, T.logoReveal.s + (T.logoReveal.e - T.logoReveal.s)*0.75, T.logoReveal.e)) : 0;
      const lA = lIn * (1 - lOut);

      // Light rays behind logo
      lightRays(ctx, cx, cy - H*0.08, W, H,
        `rgb(200,0,40)`, lA * 0.28, 12, Math.PI * 0.9);

      // Glitch jitter on entry
      const gx = lp < 0.3 ? rand(-8, 8) * (1 - lp/0.3) : 0;
      const gy = lp < 0.3 ? rand(-4, 4) * (1 - lp/0.3) : 0;

      const fSize = Math.floor(W * 0.085);
      // Red shadow/ghost
      glowText(ctx, "A·v·A", cx + gx + 3, cy + gy, `${fSize}px 'Bebas Neue'`, C.red, C.red, lA * 0.5);
      // Main white logo
      glowText(ctx, "A·v·A", cx + gx, cy + gy, `${fSize}px 'Bebas Neue'`, C.cream, C.red, lA);

      // Subtitle tagline fade in
      if (lp > 0.45) {
        const subA = easeOutCubic(progress(t, T.logoReveal.s + (T.logoReveal.e - T.logoReveal.s)*0.45, T.logoReveal.e - 0.5)) * (1 - lOut);
        glowText(ctx, "ANYONE  VS  ANYONE", cx, cy + H*0.065,
          `${Math.floor(W*0.016)}px 'Bebas Neue'`, "rgba(255,255,255,0.6)", C.red, subA);
      }
    }

    // ── SCENE 2: Fighter reveal ───────────────────────────────────────────────
    if (t >= T.revealScene.s && t < T.revealScene.e + 0.5) {
      const c = SC.reveal;
      const rIn   = easeOutCubic(progress(t, T.revealScene.s, T.revealScene.s + 1.2));
      const rOut  = easeInCubic(progress(t, T.revealScene.e - 0.6, T.revealScene.e));
      const charA = clamp(rIn - rOut);

      if (c?.img) {
        const baseScale = (H * 0.82) / c.img.naturalHeight;
        const zoomScale = lerp(baseScale * 1.08, baseScale, easeOutCubic(rIn)); // subtle zoom
        const panX = lerp(-W*0.04, 0, easeOutCubic(rIn)); // subtle drift right

        // Show silhouette first, then reveal
        const silouP = progress(t, T.revealScene.s, T.revealScene.s + 0.7);
        const revealP = progress(t, T.revealScene.s + 0.65, T.revealScene.s + 1.4);

        if (silouP > 0 && revealP < 0.99) {
          silhouette(ctx, c.img, cx - W*0.05, BASEY, zoomScale,
            easeOutCubic(silouP) * (1 - easeInCubic(revealP)) * charA, "rgba(255,20,60,0.9)");
        }

        // Light rays from behind fighter
        lightRays(ctx, cx - W*0.05, H*0.3, W, H, "rgb(200,100,255)", revealP * charA * 0.2, 8, Math.PI * 0.6);

        // Full color character
        if (revealP > 0) {
          drawChar(ctx, c.img, cx - W*0.05, BASEY, zoomScale,
            easeOutCubic(revealP) * charA, false, `rgba(220,100,255,0.7)`, panX, 0);
        }

        // Speed lines on entry
        if (rIn < 0.7) {
          speedLines(ctx, cx, H*0.5, 50, cx*0.08, cx*0.75, C.white, (1-rIn/0.7)*0.3);
        }

        // "WHOEVER." text
        if (rIn > 0.55 && rOut < 0.8) {
          const wa = easeOutCubic(progress(t, T.revealScene.s + 0.9, T.revealScene.s + 1.5)) * (1 - rOut);
          glowText(ctx, "WHOEVER.", cx, H*0.12,
            `${Math.floor(H*0.06)}px 'Bebas Neue'`, C.cream, C.red, wa);
          // Universe tag
          if (c.universe) {
            glowText(ctx, c.universe.toUpperCase(), cx, H*0.19,
              `${Math.floor(H*0.018)}px 'Bebas Neue'`, "rgba(255,180,100,0.7)", C.orange,
              wa * 0.8);
          }
        }
      }
    }

    // ── SCENE 3: Beam attack ──────────────────────────────────────────────────
    if (t >= T.attackScene.s && t < T.attackScene.e + 0.5) {
      const c = SC.attack;
      const aIn  = easeOutCubic(progress(t, T.attackScene.s, T.attackScene.s + 1.0));
      const aOut = easeInCubic(progress(t, T.attackScene.e - 0.5, T.attackScene.e));
      const charA = clamp(aIn - aOut);

      if (c?.img) {
        const baseScale = (H * 0.78) / c.img.naturalHeight;
        const scale = lerp(baseScale * 1.06, baseScale, easeOutCubic(aIn));
        const panX  = lerp(W*0.04, 0, easeOutCubic(aIn));

        // Light behind
        lightRays(ctx, cx + W*0.1, H*0.25, W, H, "rgb(0,150,220)", aIn*charA*0.18, 8, Math.PI*0.55);

        drawChar(ctx, c.img, cx + W*0.08, BASEY, scale, charA,
          true, `rgba(0,200,255,0.8)`, panX, 0);
      }

      // Beam fires
      const beamStart = T.attackScene.s + 1.2;
      if (t >= beamStart) {
        const bp   = easeOutCubic(progress(t, beamStart, beamStart + 0.5));
        const bFade = 1 - easeInCubic(progress(t, beamStart + 0.9, beamStart + 1.6));
        const beamY = H * 0.52;
        const bx1   = cx + W*0.08 - W*0.05;
        const bx2   = lerp(bx1, -W*0.15, bp);

        beam(ctx, bx1, beamY, bx2, beamY, C.cyan, H*0.016, bFade);

        // Impact at far left
        if (bp > 0.88 && !beamFired) {
          beamFired = true;
          impactFlash(ctx, W, H, 0.7, `rgba(0,230,255,1)`);
          spawnSparks(particles, 0, beamY, 40, 14, C.cyan);
          spawnSparks(particles, 0, beamY, 20, 8, C.white);
        }
        // Chromatic flash on beam travel
        chromaticFlash(ctx, W, H, bFade * bp * 0.5);
      }

      // "WHEREVER." text
      const wp = progress(t, T.attackScene.s + 1.5, T.attackScene.s + 2.3);
      if (wp > 0 && aOut < 0.8) {
        glowText(ctx, "WHEREVER.", cx, H*0.12,
          `${Math.floor(H*0.06)}px 'Bebas Neue'`, C.cream, C.cyan, easeOutCubic(wp) * (1 - aOut));
        if (SC.attack?.universe) {
          glowText(ctx, SC.attack.universe.toUpperCase(), cx, H*0.19,
            `${Math.floor(H*0.018)}px 'Bebas Neue'`, "rgba(100,220,255,0.7)", C.cyan,
            easeOutCubic(wp) * (1 - aOut) * 0.8);
        }
      }

      // Cut slash at transition
      if (t > T.attackScene.s + 0.3 && t < T.attackScene.s + 0.75) {
        const sp2 = progress(t, T.attackScene.s + 0.3, T.attackScene.s + 0.75);
        slash(ctx, cx*1.1, H*0.45, H*0.2, -0.4, 0.9,
          C.white, H*0.005, easeOutCubic(sp2) * (1 - easeInCubic(sp2)) * 3.5);
      }
    }

    // ── SCENE 4: Brute slam ───────────────────────────────────────────────────
    if (t >= T.bruteScene.s && t < T.bruteScene.e + 1.0) {
      const c = SC.brute;
      const bIn   = easeOutQuint(progress(t, T.bruteScene.s, T.bruteScene.s + 1.1));
      const bOut  = easeInCubic(progress(t, T.bruteScene.e - 0.4, T.bruteScene.e));
      const charA = clamp(bIn - bOut);
      const slamT = T.bruteScene.s + 0.95;

      if (c?.img) {
        const baseScale = (H * 0.92) / c.img.naturalHeight;
        // Drop from above
        const dropY = lerp(H * 0.3, BASEY, easeOutQuint(bIn));
        const scale = lerp(baseScale * 0.7, baseScale, easeOutQuint(bIn));

        // Shadow precede
        if (bIn < 0.9) {
          silhouette(ctx, c.img, cx, dropY, scale, bIn * 0.7, "rgba(255,0,0,0.6)");
        }
        lightRays(ctx, cx, H*0.2, W, H, "rgb(255,60,0)", bIn*charA*0.2, 10, Math.PI*0.75);
        drawChar(ctx, c.img, cx, dropY, scale, charA, false, `rgba(255,80,0,0.9)`);
      }

      // SLAM
      if (t >= slamT && !bruteFired) {
        bruteFired = true;
        shakePow = 24;
        spawnSparks(particles, cx, BASEY * 0.98, 70, 18, C.orange);
        spawnSparks(particles, cx, BASEY * 0.98, 30, 10, C.red);
        spawnDebris(particles, cx, BASEY * 0.95, 20);
        spawnSmoke(particles, cx, BASEY * 0.92, 18);
        shockRings.push({ r: 1, a: 1, color: C.orange, rings: 3 });
        shockRings.push({ r: 1, a: 0.6, color: C.red,    rings: 2 });
        impactFlash(ctx, W, H, 0.9, "rgba(255,80,0,0.9)");
        chromaticFlash(ctx, W, H, 1.0);
      }

      // Ground crack lines
      if (t > slamT && t < slamT + 2.5) {
        const crackP = progress(t, slamT, slamT + 0.4);
        const crackFade = 1 - progress(t, slamT + 1.5, slamT + 2.5);
        ctx.save(); ctx.globalAlpha = easeOutCubic(crackP) * crackFade * 0.7;
        ctx.strokeStyle = C.orange; ctx.shadowBlur = 12; ctx.shadowColor = C.orange;
        for (let i = 0; i < 8; i++) {
          const angle = (i/8)*Math.PI - Math.PI*0.5 + rand(-0.3, 0.3);
          const len = H * rand(0.08, 0.2);
          const sx = cx + rand(-20, 20), sy = BASEY * 0.985;
          ctx.lineWidth = rand(1, 3);
          ctx.beginPath(); ctx.moveTo(sx, sy);
          // Jagged crack
          let px = sx, py = sy;
          const steps = 5;
          for (let s = 1; s <= steps; s++) {
            px += Math.cos(angle + rand(-0.4,0.4)) * (len/steps);
            py += Math.sin(angle + rand(-0.1,0.1)) * (len/steps);
            ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
        ctx.restore();
      }

      // "FIGHT." central text
      if (t > T.bruteScene.s + 1.5 && t < T.bruteScene.s + 3.2) {
        const fIn  = easeOutQuint(progress(t, T.bruteScene.s + 1.5, T.bruteScene.s + 1.85));
        const fOut = easeInCubic(progress(t, T.bruteScene.s + 2.7, T.bruteScene.s + 3.2));
        const fA   = fIn * (1 - fOut);
        const fSize = Math.floor(H * 0.13);
        // Scale punch
        ctx.save();
        ctx.translate(cx, cy);
        const fScale = lerp(1.25, 1.0, easeOutCubic(fIn));
        ctx.scale(fScale, fScale);
        glowText(ctx, "FIGHT.", 0, 0, `${fSize}px 'Bebas Neue'`, C.cream, C.red, fA);
        ctx.restore();
      }
    }

    // Shockwave rings
    shockRings = shockRings.filter(sw => {
      sw.r += 550 * dt;
      sw.a -= dt * 2.2;
      if (sw.a <= 0) return false;
      shockwave(ctx, cx, BASEY * 0.985, sw.r, sw.a, sw.color, sw.rings);
      return true;
    });

    // ── SCENE 5: Montage ─────────────────────────────────────────────────────
    if (t >= T.montage.s && t < T.montage.e + 0.3) {
      const total  = SC.montage.length;
      if (total > 0) {
        const segLen = (T.montage.e - T.montage.s) / total;
        const segIdx = clamp(Math.floor((t - T.montage.s) / segLen), 0, total - 1);
        const segT   = ((t - T.montage.s) % segLen) / segLen;
        const c      = SC.montage[segIdx];
        const flip   = segIdx % 2 === 1;

        // Hard cut flash
        if (segT < 0.06) impactFlash(ctx, W, H, (1 - segT/0.06) * 0.65, `rgba(255,10,50,0.9)`);

        if (c?.img) {
          const baseScale = (H * 0.80) / c.img.naturalHeight;
          // Ken Burns: slight zoom out as segment progresses
          const kbScale = lerp(baseScale * 1.04, baseScale, easeInOutQuad(segT));
          const kbPanX  = lerp(flip ? W*0.06 : -W*0.06, 0, easeOutCubic(segT));
          const charA   = easeOutCubic(Math.min(segT * 6, 1));
          const fx      = cx + (flip ? W*0.12 : -W*0.12);

          // Colored mood per slot
          const mColors = ["rgba(200,100,255,0.7)", "rgba(0,200,255,0.7)", "rgba(255,200,0,0.7)", "rgba(255,80,0,0.7)"];
          lightRays(ctx, fx, H*0.25, W, H, mColors[segIdx % 4].replace(",0.7)",""), charA*0.18, 7, Math.PI*0.5);

          drawChar(ctx, c.img, fx, BASEY, kbScale, charA, flip, mColors[segIdx % 4], kbPanX, 0);

          // Name + universe
          glowText(ctx, c.name.toUpperCase(), cx, flip ? H*0.12 : H*0.88,
            `${Math.floor(H*0.038)}px 'Bebas Neue'`, C.cream, C.red,
            easeOutCubic(Math.min(segT * 10, 1)) * 0.95);
          if (c.universe) {
            glowText(ctx, c.universe.toUpperCase(), cx, flip ? H*0.19 : H*0.82,
              `${Math.floor(H*0.017)}px 'Bebas Neue'`, "rgba(255,180,100,0.65)", C.orange,
              easeOutCubic(Math.min(segT * 12, 1)) * 0.8);
          }
        }

        // Slash between segments
        if (segT > 0.72 && segT < 0.97) {
          const sl = (segT - 0.72) / 0.25;
          const dir = segIdx % 2 === 0 ? 1 : -1;
          slash(ctx, cx, H*0.48, H*0.3, dir*(-0.35), dir*1.5,
            C.white, H*0.007, easeOutCubic(sl) * (1 - easeInCubic(sl)) * 3.2);
          // Spawn sparks at slash mid
          if (sl > 0.45 && sl < 0.5) {
            spawnSparks(particles, cx + dir*H*0.25, H*0.55, 15, 7, C.white);
          }
        }

        if (segIdx !== montageSlash) {
          montageSlash = segIdx;
          speedLines(ctx, cx, H*0.5, 35, cx*0.05, cx*0.6, C.red, 0.3);
        }
      }
    }

    // ── SCENE 6: Cosmic giant ─────────────────────────────────────────────────
    if (t >= T.cosmicScene.s && t < T.cosmicScene.e + 0.5) {
      const c    = SC.cosmic;
      const cIn  = easeOutCubic(progress(t, T.cosmicScene.s, T.cosmicScene.s + 1.5));
      const cOut = easeInCubic(progress(t, T.cosmicScene.e - 0.4, T.cosmicScene.e));
      const charA = clamp(cIn - cOut);
      const pulse = Math.sin((t - T.cosmicScene.s) * 1.8) * 0.5 + 0.5;

      // Atmospheric glow bloom
      const cosmicGrd = ctx.createRadialGradient(cx, H*0.35, 0, cx, H*0.35, H*0.85);
      cosmicGrd.addColorStop(0, `rgba(180,0,40,${charA * 0.32 * (0.6 + pulse * 0.4)})`);
      cosmicGrd.addColorStop(0.5, `rgba(80,0,20,${charA * 0.15})`);
      cosmicGrd.addColorStop(1, "transparent");
      ctx.fillStyle = cosmicGrd; ctx.fillRect(0, 0, W, H);

      if (c?.img) {
        // Giant background silhouette (1.4× height)
        const bgScale  = (H * 1.5) / c.img.naturalHeight;
        const fgScale  = (H * 0.88) / c.img.naturalHeight;
        const kbPanX   = lerp(-W*0.02, 0, easeOutCubic(cIn));
        const kbPanY   = lerp(H*0.04, 0, easeOutCubic(cIn));

        silhouette(ctx, c.img, cx, H*1.08, bgScale * clamp(cIn * 1.1),
          charA * 0.45, `rgba(220,0,40,0.9)`);
        lightRays(ctx, cx, H*0.1, W, H, "rgb(220,0,40)", cIn*charA*0.28, 14, Math.PI*1.05);
        drawChar(ctx, c.img, cx, BASEY, fgScale,
          easeOutCubic(progress(t, T.cosmicScene.s + 0.6, T.cosmicScene.s + 1.5)) * charA,
          false, `rgba(255,${Math.floor(60+pulse*80)},0,${0.7 + pulse*0.3})`,
          kbPanX, kbPanY);
      }

      // Orbiting energy embers
      if (Math.random() < 0.45) {
        const ang = rand(0, Math.PI * 2);
        const or  = H * rand(0.22, 0.42);
        spawnSparks(particles,
          cx + Math.cos(ang) * or, H * 0.45 + Math.sin(ang) * or * 0.55,
          2, 1.5, pick([C.red, C.orange, C.amber]));
      }
    }

    // ── SCENE 7: Title card ────────────────────────────────────────────────────
    if (t >= T.titleScene.s) {
      const tIn  = progress(t, T.titleScene.s, T.titleScene.s + 0.9);
      const tOut = progress(t, T.titleScene.e - 0.8, T.titleScene.e);

      // Cinematic dark overlay
      fillAll(ctx, W, H, "#000", easeOutCubic(tIn) * (1 - easeInCubic(tOut)) * 0.88);

      // Deep red bloom
      const tb  = ctx.createRadialGradient(cx, cy, 0, cx, cy, W*0.5);
      tb.addColorStop(0, `rgba(180,0,30,${easeOutCubic(tIn) * 0.4 * (1-easeInCubic(tOut))})`);
      tb.addColorStop(1, "transparent");
      ctx.fillStyle = tb; ctx.fillRect(0, 0, W, H);

      // Horizontal ruled lines
      if (tIn > 0.35) {
        const lineA = easeOutCubic(progress(t, T.titleScene.s + 0.5, T.titleScene.s + 1.1)) * (1 - easeInCubic(tOut));
        ctx.save(); ctx.globalAlpha = lineA * 0.6;
        ctx.strokeStyle = C.red; ctx.lineWidth = 1; ctx.shadowBlur = 6; ctx.shadowColor = C.red;
        for (const fy of [0.37, 0.67]) {
          const lineW = W * easeOutQuint(progress(t, T.titleScene.s + 0.5, T.titleScene.s + 1.5));
          ctx.beginPath();
          ctx.moveTo(cx - lineW/2, H*fy); ctx.lineTo(cx + lineW/2, H*fy);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Stacked title: AVA / BATTLE / ARENA
      // Each line builds in with a slight delay
      const words = ["AVA", "BATTLE", "ARENA"];
      const yPos  = [H*0.40, H*0.52, H*0.62];
      const fSizes = [H*0.125, H*0.065, H*0.065];
      const delays = [0.15, 0.55, 0.95];
      const titleTotal = 2.2;

      words.forEach((word, i) => {
        const wStart = T.titleScene.s + delays[i];
        const wEnd   = wStart + 0.7;
        const wIn    = easeOutQuint(progress(t, wStart, wEnd));
        const wOut   = easeInCubic(tOut);
        const wA     = clamp(wIn - wOut);
        if (wA <= 0) return;

        // Scale-in punch
        ctx.save();
        ctx.translate(cx, yPos[i]);
        const punchScale = lerp(1.2, 1.0, easeOutCubic(progress(t, wStart, wStart + 0.4)));
        ctx.scale(punchScale, punchScale);
        // Shadow / glow layer
        glowText(ctx, word, 3, 3, `${Math.floor(fSizes[i])}px 'Bebas Neue'`, C.red, C.red, wA * 0.6);
        glowText(ctx, word, 0, 0, `${Math.floor(fSizes[i])}px 'Bebas Neue'`, C.cream, C.red, wA);
        ctx.restore();

        // Spark burst on word pop-in
        if (wIn > 0.05 && wIn < 0.12) {
          spawnSparks(particles, cx, yPos[i], 20, 6, i === 0 ? C.red : C.amber);
        }
      });

      // Divider dot
      if (tIn > 0.55 && tOut < 0.6) {
        const dotA = easeOutCubic(progress(t, T.titleScene.s+0.55, T.titleScene.s+1.0)) * (1-easeInCubic(tOut));
        glowText(ctx, "·", cx, H*0.46, `${Math.floor(H*0.04)}px 'Bebas Neue'`, C.red, C.red, dotA);
      }

      // Subtitle
      const subStart = T.titleScene.s + 1.6;
      if (t > subStart && tOut < 0.7) {
        const subA = easeOutCubic(progress(t, subStart, subStart + 0.9)) * (1 - easeInCubic(tOut));
        glowText(ctx, "WHOEVER   ·   WHEREVER   ·   FIGHT", cx, H*0.745,
          `${Math.floor(W*0.021)}px 'Bebas Neue'`, "rgba(255,255,255,0.65)", C.amber, subA);
      }

      // Final particle burst
      if (tIn > 0.78 && tIn < 0.85) {
        spawnSparks(particles, cx, H*0.5, 60, 10, C.red);
        spawnSparks(particles, cx, H*0.5, 30, 6,  C.amber);
        spawnSparks(particles, cx, H*0.5, 20, 4,  C.white);
      }
    }

    // ── PARTICLES ────────────────────────────────────────────────────────────
    particles = tickParticles(ctx, particles, dt);

    // ── DUST MOTES ───────────────────────────────────────────────────────────
    // Reset dust coords on first frame after resize
    if (DUST[0].x > W) DUST.forEach(d => { d.x = rand(0, W); d.y = rand(0, H); });
    tickDust(ctx, DUST, W, H, dt);

    // ── VIGNETTE ─────────────────────────────────────────────────────────────
    vignette(ctx, W, H, 0.78);

    // ── SCANLINES ────────────────────────────────────────────────────────────
    ctx.save(); ctx.globalAlpha = 0.055; ctx.fillStyle = "#000";
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
    ctx.restore();

    // ── LETTERBOX ────────────────────────────────────────────────────────────
    letterbox(ctx, W, H, clamp((t - 0.6) / 0.8));

    // ── RED EDGE FLICKER ─────────────────────────────────────────────────────
    if (Math.random() < 0.006) {
      ctx.save(); ctx.globalAlpha = 0.1; ctx.fillStyle = C.red;
      ctx.fillRect(0, 0, 3, H); ctx.fillRect(W-3, 0, 3, H);
      ctx.restore();
    }

    // ── END ──────────────────────────────────────────────────────────────────
    if (t >= T.end) { stopped = true; onComplete(); return; }

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(draw);
  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    wrap.style.transform = "";
    wrap.style.opacity   = "1";
  };
}
