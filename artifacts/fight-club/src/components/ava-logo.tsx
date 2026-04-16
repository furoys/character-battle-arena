import { cn } from "@/lib/utils";

// Pre-computed spray paint texture dots (static so no re-render flicker)
const SPRAY = [
  { cx: 18, cy: 22, r: 1.3, op: 0.35, c: "#00f0ff" },
  { cx: 24, cy: 38, r: 0.9, op: 0.25, c: "#00f0ff" },
  { cx: 31, cy: 12, r: 1.6, op: 0.4,  c: "#00f0ff" },
  { cx: 12, cy: 55, r: 1.0, op: 0.3,  c: "#00f0ff" },
  { cx: 16, cy: 68, r: 1.2, op: 0.35, c: "#00f0ff" },
  { cx: 27, cy: 78, r: 0.8, op: 0.25, c: "#00f0ff" },
  { cx:  8, cy: 42, r: 0.7, op: 0.2,  c: "#00f0ff" },
  { cx: 36, cy: 85, r: 1.1, op: 0.3,  c: "#00f0ff" },
  { cx: 353, cy: 20, r: 1.3, op: 0.35, c: "#ff3b30" },
  { cx: 365, cy: 35, r: 0.9, op: 0.25, c: "#ff3b30" },
  { cx: 370, cy: 10, r: 1.5, op: 0.4,  c: "#ff3b30" },
  { cx: 360, cy: 48, r: 1.0, op: 0.3,  c: "#ff3b30" },
  { cx: 368, cy: 70, r: 1.2, op: 0.35, c: "#ff3b30" },
  { cx: 353, cy: 80, r: 0.8, op: 0.25, c: "#ff3b30" },
  { cx: 374, cy: 56, r: 0.7, op: 0.2,  c: "#ff3b30" },
  { cx: 348, cy: 88, r: 1.1, op: 0.3,  c: "#ff3b30" },
  { cx:  88, cy:  5, r: 1.1, op: 0.3,  c: "#00f0ff" },
  { cx:  92, cy: 96, r: 1.3, op: 0.35, c: "#00f0ff" },
  { cx: 283, cy:  7, r: 1.1, op: 0.3,  c: "#ff3b30" },
  { cx: 290, cy: 98, r: 1.3, op: 0.35, c: "#ff3b30" },
  { cx: 168, cy:  3, r: 1.2, op: 0.3,  c: "#ffaa44" },
  { cx: 214, cy:103, r: 0.9, op: 0.25, c: "#ffaa44" },
  { cx: 145, cy:102, r: 0.8, op: 0.25, c: "#00f0ff" },
  { cx: 236, cy:  4, r: 0.8, op: 0.25, c: "#ff3b30" },
];

// 4-point + 4-secondary-point star burst (8-pointed)
function StarBurst({
  cx, cy, r, color, op = 1,
}: { cx: number; cy: number; r: number; color: string; op?: number }) {
  const r2 = r * 0.35;
  const pts = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const rv = i % 2 === 0 ? r : r2;
    return `${(cx + rv * Math.cos(a)).toFixed(2)},${(cy + rv * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
  return <polygon points={pts} fill={color} opacity={op} />;
}

// Drip drop shape below a letter
function Drip({ x, y, w, h, color }: { x: number; y: number; w: number; h: number; color: string }) {
  const hw = w / 2;
  const d = `M${x - hw},${y} Q${x - hw},${y + h * 0.6} ${x},${y + h} Q${x + hw},${y + h * 0.6} ${x + hw},${y} Z`;
  return <path d={d} fill={color} />;
}

interface AvaLogoProps {
  className?: string;
}

export function AvaLogo({ className }: AvaLogoProps) {
  const FONT = "Impact, 'Arial Black', Haettenschweiler, sans-serif";

  // Letter positions (all textAnchor="middle")
  const A1 = { x: 91,  y: 73, fs: 78 };
  const V  = { x: 191, y: 68, fs: 54 };
  const A2 = { x: 291, y: 73, fs: 78 };

  // 3D extrude layers (back → front, dark to slightly less dark)
  const extrudeSteps = [
    { dx: 6, dy: 8,   fillA: "#00111e", fillV: "#290500", op: 1   },
    { dx: 4.5, dy: 6, fillA: "#00192d", fillV: "#380800", op: 0.9 },
    { dx: 3, dy: 4,   fillA: "#002240", fillV: "#4a0b00", op: 0.8 },
    { dx: 1.5, dy: 2, fillA: "#003055", fillV: "#5c1000", op: 0.7 },
  ];

  return (
    <svg
      viewBox="0 0 382 110"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="A.v.A — Anyone vs Anyone"
      className={cn("select-none", className)}
    >
      <defs>
        {/* Cyan gradient: left A and right A */}
        <linearGradient id="avag-a" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#e0ffff" />
          <stop offset="10%"  stopColor="#00f0ff" />
          <stop offset="52%"  stopColor="#0088cc" />
          <stop offset="100%" stopColor="#001e33" />
        </linearGradient>

        {/* Orange/red gradient: .v. */}
        <linearGradient id="avag-v" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#fff0aa" />
          <stop offset="18%"  stopColor="#ff7722" />
          <stop offset="65%"  stopColor="#cc1100" />
          <stop offset="100%" stopColor="#550008" />
        </linearGradient>

        {/* Horizontal gradient for the divider line */}
        <linearGradient id="avag-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#00f0ff" stopOpacity="0" />
          <stop offset="22%"  stopColor="#00f0ff" />
          <stop offset="78%"  stopColor="#ff3b30" />
          <stop offset="100%" stopColor="#ff3b30" stopOpacity="0" />
        </linearGradient>

        {/* Glow for main letters */}
        <filter id="avaf-glow" x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="avaf-glow-v" x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="3.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Clip paths for diagonal highlight stripes */}
        <clipPath id="ava-cp-a1">
          <text x={A1.x} y={A1.y} textAnchor="middle" fontFamily={FONT} fontSize={A1.fs} fontWeight="900">A</text>
        </clipPath>
        <clipPath id="ava-cp-v">
          <text x={V.x} y={V.y} textAnchor="middle" fontFamily={FONT} fontSize={V.fs} fontWeight="900">·v·</text>
        </clipPath>
        <clipPath id="ava-cp-a2">
          <text x={A2.x} y={A2.y} textAnchor="middle" fontFamily={FONT} fontSize={A2.fs} fontWeight="900">A</text>
        </clipPath>
      </defs>

      {/* ── Spray paint texture dots ── */}
      {SPRAY.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={d.c} opacity={d.op} />
      ))}

      {/* ── Ambient background glow under letters ── */}
      <ellipse cx="91"  cy="58" rx="42" ry="12" fill="#00f0ff" opacity="0.06" />
      <ellipse cx="291" cy="58" rx="42" ry="12" fill="#00f0ff" opacity="0.06" />
      <ellipse cx="191" cy="54" rx="38" ry="10" fill="#ff5500" opacity="0.06" />

      {/* ── 3D extrude shadow stack ── */}
      {extrudeSteps.map((s, i) => (
        <g key={i}>
          <text x={A1.x + s.dx} y={A1.y + s.dy} textAnchor="middle" fontFamily={FONT} fontSize={A1.fs} fontWeight="900" fill={s.fillA} opacity={s.op}>A</text>
          <text x={V.x  + s.dx} y={V.y  + s.dy} textAnchor="middle" fontFamily={FONT} fontSize={V.fs}  fontWeight="900" fill={s.fillV} opacity={s.op}>·v·</text>
          <text x={A2.x + s.dx} y={A2.y + s.dy} textAnchor="middle" fontFamily={FONT} fontSize={A2.fs} fontWeight="900" fill={s.fillA} opacity={s.op}>A</text>
        </g>
      ))}

      {/* ── Thick outer black stroke (graffiti paint marker outline) ── */}
      <text x={A1.x} y={A1.y} textAnchor="middle" fontFamily={FONT} fontSize={A1.fs} fontWeight="900"
        fill="none" stroke="#000" strokeWidth="15" strokeLinejoin="round" strokeLinecap="round">A</text>
      <text x={V.x}  y={V.y}  textAnchor="middle" fontFamily={FONT} fontSize={V.fs}  fontWeight="900"
        fill="none" stroke="#000" strokeWidth="12" strokeLinejoin="round" strokeLinecap="round">·v·</text>
      <text x={A2.x} y={A2.y} textAnchor="middle" fontFamily={FONT} fontSize={A2.fs} fontWeight="900"
        fill="none" stroke="#000" strokeWidth="15" strokeLinejoin="round" strokeLinecap="round">A</text>

      {/* ── Gradient-filled letters with glow ── */}
      <text x={A1.x} y={A1.y} textAnchor="middle" fontFamily={FONT} fontSize={A1.fs} fontWeight="900"
        fill="url(#avag-a)" filter="url(#avaf-glow)">A</text>
      <text x={V.x}  y={V.y}  textAnchor="middle" fontFamily={FONT} fontSize={V.fs}  fontWeight="900"
        fill="url(#avag-v)" filter="url(#avaf-glow-v)">·v·</text>
      <text x={A2.x} y={A2.y} textAnchor="middle" fontFamily={FONT} fontSize={A2.fs} fontWeight="900"
        fill="url(#avag-a)" filter="url(#avaf-glow)">A</text>

      {/* ── Thin inner white edge (paint marker inner edge) ── */}
      <text x={A1.x} y={A1.y} textAnchor="middle" fontFamily={FONT} fontSize={A1.fs} fontWeight="900"
        fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2">A</text>
      <text x={V.x}  y={V.y}  textAnchor="middle" fontFamily={FONT} fontSize={V.fs}  fontWeight="900"
        fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2">·v·</text>
      <text x={A2.x} y={A2.y} textAnchor="middle" fontFamily={FONT} fontSize={A2.fs} fontWeight="900"
        fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2">A</text>

      {/* ── Diagonal highlight shine stripe on each letter ── */}
      <rect x={A1.x - 48} y={A1.y - 68} width={96} height={22}
        fill="rgba(255,255,255,0.21)"
        transform={`rotate(-18 ${A1.x} ${A1.y - 42})`}
        clipPath="url(#ava-cp-a1)" />
      <rect x={V.x - 50} y={V.y - 48} width={100} height={16}
        fill="rgba(255,255,255,0.18)"
        transform={`rotate(-18 ${V.x} ${V.y - 28})`}
        clipPath="url(#ava-cp-v)" />
      <rect x={A2.x - 48} y={A2.y - 68} width={96} height={22}
        fill="rgba(255,255,255,0.21)"
        transform={`rotate(-18 ${A2.x} ${A2.y - 42})`}
        clipPath="url(#ava-cp-a2)" />

      {/* ── Paint drips ── */}
      <Drip x={A1.x - 12} y={A1.y + 3} w={6} h={9} color="#00bbee" />
      <Drip x={A1.x + 8}  y={A1.y + 2} w={5} h={7} color="#0099cc" />
      <Drip x={V.x}       y={V.y + 2}  w={7} h={11} color="#dd2200" />
      <Drip x={A2.x + 14} y={A2.y + 3} w={6} h={9}  color="#00bbee" />
      <Drip x={A2.x - 6}  y={A2.y + 1} w={4} h={6}  color="#0099cc" />

      {/* ── 4-point star bursts ── */}
      {/* Above left A peak */}
      <StarBurst cx={91}  cy={10} r={9}   color="#00f0ff" op={1}    />
      <StarBurst cx={91}  cy={10} r={4.5} color="#ffffff" op={0.85} />
      {/* Above right A peak */}
      <StarBurst cx={291} cy={10} r={9}   color="#00f0ff" op={1}    />
      <StarBurst cx={291} cy={10} r={4.5} color="#ffffff" op={0.85} />
      {/* Center accent above .v. */}
      <StarBurst cx={191} cy={7}  r={11}  color="#ff6600" op={0.95} />
      <StarBurst cx={191} cy={7}  r={5.5} color="#ffee44" op={0.85} />
      {/* Flanking smaller accents */}
      <StarBurst cx={49}  cy={40} r={5}   color="#00c8ff" op={0.65} />
      <StarBurst cx={333} cy={40} r={5}   color="#00c8ff" op={0.65} />
      <StarBurst cx={140} cy={28} r={4}   color="#ff8833" op={0.55} />
      <StarBurst cx={242} cy={28} r={4}   color="#ff8833" op={0.55} />

      {/* ── Graffiti cross-hatch accent lines ── */}
      <line x1="42"  y1="58" x2="55"  y2="48" stroke="#00f0ff" strokeWidth="1.2" opacity="0.3" />
      <line x1="44"  y1="65" x2="57"  y2="55" stroke="#00f0ff" strokeWidth="0.8" opacity="0.2" />
      <line x1="327" y1="58" x2="340" y2="48" stroke="#00f0ff" strokeWidth="1.2" opacity="0.3" />
      <line x1="325" y1="65" x2="338" y2="55" stroke="#00f0ff" strokeWidth="0.8" opacity="0.2" />

      {/* ── Horizontal separator line ── */}
      <rect x="55" y="83" width="272" height="1.5" fill="url(#avag-line)" rx="1" />

      {/* ── Subtitle: ANYONE VS ANYONE ── */}
      {/* Black outline */}
      <text x="191" y="99" textAnchor="middle"
        fontFamily={FONT} fontSize="9.5" fontWeight="900"
        fill="none" stroke="#000" strokeWidth="3.5"
        letterSpacing="5">ANYONE VS ANYONE</text>
      {/* Filled text */}
      <text x="191" y="99" textAnchor="middle"
        fontFamily={FONT} fontSize="9.5" fontWeight="900"
        fill="#999999"
        letterSpacing="5">ANYONE VS ANYONE</text>
    </svg>
  );
}
