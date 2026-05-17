import { useState, useEffect, useRef, useCallback } from "react";
import { FightResult, FightRound } from "@workspace/api-client-react";
import { resolveApiUrl } from "@/lib/api-fetch";
import { ChevronLeft, Swords, Zap, Trophy, FastForward, Mic } from "lucide-react";
import { VictoryScreen } from "@/components/victory-screen";
import { ModifierBadge } from "@/components/modifier-badge";
import { useMusic } from "@/contexts/music-context";

const TTS_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;
type TtsVoice = (typeof TTS_VOICES)[number];

// Module-level circuit breaker: once TTS fails enough times consecutively the
// flag is set for the entire app session so we never spam a broken endpoint.
// It deliberately does NOT reset between fights — if the Android TTS proxy is
// down, every fight would still make 3 failing requests before going quiet.
let _ttsSessionBlocked = false;

function renderMarkdown(text: string): React.ReactNode[] {
  return text.split("\n").map((line, lineIdx) => {
    const isBullet = /^[\-\*]\s+/.test(line);
    const content = isBullet ? line.replace(/^[\-\*]\s+/, "") : line;

    const parts: React.ReactNode[] = [];
    const boldRegex = /\*\*(.+?)\*\*/g;
    let last = 0, match;
    while ((match = boldRegex.exec(content)) !== null) {
      if (match.index > last) parts.push(content.slice(last, match.index));
      parts.push(<strong key={`b${match.index}`} style={{ color: "rgba(255,255,255,0.95)", fontWeight: 700 }}>{match[1]}</strong>);
      last = match.index + match[0].length;
    }
    if (last < content.length) parts.push(content.slice(last));

    if (isBullet) {
      return (
        <div key={lineIdx} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <span style={{ color: "rgba(255,0,85,0.7)", flexShrink: 0, marginTop: "0.1rem" }}>—</span>
          <span>{parts}</span>
        </div>
      );
    }
    return parts.length > 0
      ? <span key={lineIdx}>{parts}{lineIdx < text.split("\n").length - 1 ? "\n" : ""}</span>
      : <span key={lineIdx}>{"\n"}</span>;
  });
}

// ─── Cinematic loading sequence ───────────────────────────────────────────────
const FIGHT_PHASES = [
  { label: "The arena comes alive…", sub: "Calculating terrain and hazards" },
  { label: "Fighters enter the arena…", sub: "Reading power levels and abilities" },
  { label: "The air crackles with tension…", sub: "Computing synergies and rivalries" },
  { label: "First blood is drawn…", sub: "Simulating round-by-round combat" },
  { label: "The tide shifts…", sub: "Determining momentum and chaos events" },
  { label: "A winner emerges…", sub: "Writing the cinematic narrative" },
  { label: "The dust settles…", sub: "Finalising the outcome" },
];

function FightLoadingSequence({ team1Names, team2Names }: { team1Names: string[]; team2Names: string[] }) {
  const [phase, setPhase] = useState(0);
  const [visible, setVisible] = useState(true);

  // Phase cadence: cycle continuously through all 7 phases so the loader
  // never visually freezes when the backend takes longer than the ~10s
  // initial budget. Slow networks or AI verdict timeouts can push the wait
  // to 30–60s — looping the phases keeps the UI feeling alive instead of
  // dead-stuck on "the dust settles."
  useEffect(() => {
    const iv = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setPhase(p => (p + 1) % FIGHT_PHASES.length);
        setVisible(true);
      }, 220);
    }, 1800);
    return () => clearInterval(iv);
  }, []);

  const current = FIGHT_PHASES[phase];

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12 px-6">
      {/* Clash icon */}
      <div className="relative">
        <Swords
          className="h-10 w-10"
          style={{
            color: "#ff0055",
            filter: "drop-shadow(0 0 16px rgba(255,0,85,0.7))",
            animation: "rotateSlow 4s linear infinite",
          }}
        />
        <div
          className="absolute -inset-3 rounded-full"
          style={{
            border: "1px solid rgba(255,0,85,0.2)",
            animation: "ping 1.6s cubic-bezier(0,0,0.2,1) infinite",
          }}
        />
      </div>

      {/* Fighter names */}
      <div className="flex items-center gap-3">
        <span className="font-display text-xs uppercase tracking-widest" style={{ color: "#00f0ff" }}>
          {team1Names.slice(0, 2).join(" & ")}
        </span>
        <span className="font-display text-xs" style={{ color: "rgba(255,0,85,0.6)" }}>⚔</span>
        <span className="font-display text-xs uppercase tracking-widest" style={{ color: "#ff3b30" }}>
          {team2Names.slice(0, 2).join(" & ")}
        </span>
      </div>

      {/* Phase text */}
      <div
        className="text-center transition-all duration-300"
        style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(6px)" }}
      >
        <p className="font-display uppercase tracking-[0.2em] mb-1" style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}>
          {current?.label}
        </p>
        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em" }}>
          {current?.sub}
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2">
        {FIGHT_PHASES.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === phase ? 20 : 6,
              height: 6,
              background: i === phase ? "#ff0055" : "rgba(255,255,255,0.12)",
            }}
          />
        ))}
      </div>

      {/* Scanline shimmer bar */}
      <div className="w-48 h-px overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-full"
          style={{
            width: "40%",
            background: "linear-gradient(90deg, transparent, #ff0055, transparent)",
            animation: "shimmer 1.8s linear infinite",
          }}
        />
      </div>
    </div>
  );
}

interface FightScreenProps {
  open: boolean;
  onClose: () => void;
  onRematch?: () => void;
  result: FightResult | null;
  isSimulating: boolean;
  team1Names: string[];
  team2Names: string[];
  team1Images?: (string | null | undefined)[];
  team2Images?: (string | null | undefined)[];
  // UPPERCASE section names that have received their canonical final content
  // from the streaming hook. Drives the manual progression buttons — we only
  // show "BEGIN MATCH" or "NEXT ROUND →" once the AI has finished writing
  // the section the user is currently reading.
  completedSections?: Set<string>;
  // Active chaos modifier id (or null). Surfaced as a small badge in the HUD
  // so the player always knows what rules are bending the fight. Server is
  // the source of truth — the result payload also carries it as a fallback.
  modifierId?: string | null;
  // Controlled by the parent (NarrationToggle on home screen). If not provided
  // falls back to the localStorage value so the component works standalone.
  ttsEnabled?: boolean;
  // Optional callback so the in-fight MUTE button can flip the parent's state
  // (the parent owns the canonical ttsEnabled when controlled). When omitted
  // the component falls back to its local toggle.
  onToggleTts?: () => void;
  // Tutorial hand-off: when true, the first round's "Play Narration" button
  // is auto-clicked the moment the round is revealed and audio is unlocked.
  // Used to remove a discovery hurdle on the very first fight a new user
  // runs from the Ghost Hand tutorial — they shouldn't have to hunt for the
  // narration CTA to hear the voice they're about to discover the app has.
  autoStartNarration?: boolean;
}

function HpBar({ pct, team }: { pct: number; team: 1 | 2 }) {
  return (
    <div className="h-1.5 bg-muted/30 overflow-hidden">
      <div
        className={`h-full transition-all duration-700 ${team === 1 ? "bg-team1" : "bg-team2"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function PortraitStack({
  images, names, team, hitFlash, attackGlow, hpPct,
}: {
  images: (string | null | undefined)[];
  names: string[];
  team: 1 | 2;
  hitFlash: boolean;
  attackGlow: boolean;
  hpPct: number;
}) {
  const isLeft = team === 1;
  const color = team === 1 ? "#00f0ff" : "#ff3b30";
  const shown = images.slice(0, 3);

  return (
    <div
      className={`absolute top-0 bottom-0 flex items-end pb-2 ${isLeft ? "left-0 pl-2 justify-start" : "right-0 pr-2 justify-end"}`}
      style={{ width: "42%" }}
    >
      <div className={`relative flex ${isLeft ? "" : "flex-row-reverse"}`}>
        {shown.map((img, i) => {
          const offset = i * 26;
          const rotate = isLeft ? -4 + i * 2 : 4 - i * 2;
          const scale = 1 - i * 0.08;
          const z = 10 - i;
          const initials = (names[i] || "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

          return (
            <div
              key={i}
              className="absolute bottom-0"
              style={{
                left: isLeft ? offset : undefined,
                right: !isLeft ? offset : undefined,
                zIndex: z,
                transform: `rotate(${rotate}deg) scale(${scale})`,
                transition: "transform 0.3s ease",
              }}
            >
              <div
                className="relative overflow-hidden border-2"
                style={{
                  width: 72 - i * 8,
                  height: 96 - i * 10,
                  borderColor: i === 0 ? color : "rgba(255,255,255,0.15)",
                  boxShadow: attackGlow && i === 0
                    ? `0 0 24px ${color}, 0 0 48px ${color}40`
                    : hitFlash && i === 0
                    ? "0 0 20px rgba(255,59,48,0.8)"
                    : `0 4px 12px rgba(0,0,0,0.6)`,
                  animation: hitFlash && i === 0 ? "hitShake 0.3s ease" : undefined,
                  transition: "box-shadow 0.3s ease",
                }}
              >
                {img ? (
                  <img
                    src={img}
                    alt={names[i] || ""}
                    className="w-full h-full object-cover object-top"
                    style={{
                      filter: hitFlash && i === 0
                        ? "brightness(1.8) saturate(0) sepia(1) hue-rotate(-20deg)"
                        : hpPct < 30
                        ? "brightness(0.7) saturate(0.6)"
                        : undefined,
                      transition: "filter 0.3s ease",
                    }}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center font-display font-bold text-sm"
                    style={{ background: `${color}20`, color }}
                  >
                    {initials}
                  </div>
                )}
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)" }} />
                {hpPct < 30 && i === 0 && (
                  <div className="absolute inset-0" style={{ background: "rgba(255,0,0,0.15)", animation: "pulse 1s infinite" }} />
                )}
              </div>
            </div>
          );
        })}
        <div style={{ width: 72 + (shown.length - 1) * 28, height: 96 }} />
      </div>
    </div>
  );
}

function ClashEffect({ active, winner }: { active: boolean; winner?: number }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
      <div className="flex flex-col items-center gap-1">
        <div className="relative" style={{ animation: active ? "clashPulse 0.4s ease" : undefined }}>
          <Swords
            className="h-8 w-8"
            style={{
              color: winner ? (winner === 1 ? "#00f0ff" : "#ff3b30") : "#ff0055",
              filter: `drop-shadow(0 0 8px ${winner ? (winner === 1 ? "#00f0ff" : "#ff3b30") : "#ff0055"})`,
              animation: "rotateSlow 8s linear infinite",
            }}
          />
          {active && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ animation: "clashBurst 0.5s ease forwards" }}>
              <Zap className="h-10 w-10 absolute" style={{ color: "#fff", opacity: 0.9 }} />
            </div>
          )}
        </div>
        <span className="font-display text-[11px] uppercase tracking-[0.3em]" style={{ color: "#ff0055", textShadow: "0 0 12px rgba(255,0,85,0.8)" }}>
          vs
        </span>
        {active && (
          <div className="absolute inset-0 flex items-center justify-center">
            {[0, 60, 120, 180, 240, 300].map((deg) => (
              <div
                key={deg}
                className="absolute w-px bg-white"
                style={{
                  height: 20 + Math.random() * 20,
                  transform: `rotate(${deg}deg) translateY(-30px)`,
                  animation: "sparkFade 0.4s ease forwards",
                  opacity: 0.8,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FightBanner({
  team1Images, team2Images, team1Names, team2Names,
  attackingTeam, team1HpPct, team2HpPct, isSimulating, winner,
}: {
  team1Images: (string | null | undefined)[];
  team2Images: (string | null | undefined)[];
  team1Names: string[];
  team2Names: string[];
  attackingTeam: 0 | 1 | 2;
  team1HpPct: number;
  team2HpPct: number;
  isSimulating: boolean;
  winner?: number;
}) {
  const [clashFlash, setClashFlash] = useState(false);

  useEffect(() => {
    if (attackingTeam !== 0) {
      setClashFlash(true);
      const t = setTimeout(() => setClashFlash(false), 500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [attackingTeam]);

  return (
    <div
      className="relative overflow-hidden flex-shrink-0"
      style={{ height: 130, background: "linear-gradient(180deg, #000 0%, #0a0a0f 60%, transparent 100%)" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)",
          zIndex: 30,
        }}
      />
      <div className="absolute bottom-0 left-0 right-0" style={{ height: 40, background: "linear-gradient(0deg, rgba(255,0,85,0.08) 0%, transparent 100%)" }} />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ background: "radial-gradient(ellipse 30% 60% at 50% 50%, rgba(255,0,85,0.12) 0%, transparent 70%)" }} />

      <PortraitStack images={team1Images} names={team1Names} team={1} hitFlash={attackingTeam === 2 && clashFlash} attackGlow={attackingTeam === 1 && clashFlash} hpPct={team1HpPct} />
      <PortraitStack images={team2Images} names={team2Names} team={2} hitFlash={attackingTeam === 1 && clashFlash} attackGlow={attackingTeam === 2 && clashFlash} hpPct={team2HpPct} />
      <ClashEffect active={clashFlash} winner={winner} />

      {isSimulating && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-40">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Labels for each round position in a 5-round fight
const ROUND_LABELS: Record<number, { label: string; accent: string }> = {
  0: { label: "Opening",       accent: "#00f0ff" },
  1: { label: "Escalation",    accent: "#ff9f0a" },
  2: { label: "⚡ Turning Point", accent: "#ff0055" },
  3: { label: "Last Stand",    accent: "#bf5af2" },
  4: { label: "Finale",        accent: "#ffd700" },
};

// RoundBlock: slides in and fades text visible shortly after mount
function RoundBlock({ round, index }: { round: FightRound; index: number }) {
  const [visible, setVisible] = useState(false);
  const [textVisible, setTextVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 80);
    const t2 = setTimeout(() => setTextVisible(true), 300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const isTurningPoint = index === 2;
  const meta = ROUND_LABELS[index];
  const teamColor = index % 2 === 0 ? "var(--color-team1, #00f0ff)" : "var(--color-team2, #ff3b30)";
  const accentColor = meta?.accent ?? teamColor;

  return (
    <div
      data-round-index={index}
      className={`transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
    >
      {/* Turning-point divider */}
      {isTurningPoint && (
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, #ff005560)" }} />
          <span className="text-[9px] font-bold uppercase tracking-[0.3em]" style={{ color: "#ff0055" }}>
            The tide shifts
          </span>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(to left, transparent, #ff005560)" }} />
        </div>
      )}
      {/* Round header */}
      <div className="flex items-center gap-3 mb-3">
        <span
          className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 shrink-0"
          style={{ background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}40` }}
        >
          Round {round.round}
        </span>
        {meta && (
          <span className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: `${accentColor}80` }}>
            {meta.label}
          </span>
        )}
        <span className="text-[9px] text-muted-foreground/40 bg-muted/20 px-1.5 py-0.5 ml-auto">
          {round.attacker} · {round.attackType}
        </span>
      </div>
      {/* Narrative — full paragraph(s) */}
      <div
        className={`border-l-2 pl-4 transition-all duration-400 ${textVisible ? "opacity-100" : "opacity-0"}`}
        style={{ borderColor: `${accentColor}40` }}
      >
        <div className="text-sm leading-loose text-foreground/90 whitespace-pre-line">
          {renderMarkdown(round.narrative)}
        </div>
      </div>
    </div>
  );
}

export function FightScreen({
  open, onClose, onRematch, result, isSimulating,
  team1Names, team2Names,
  team1Images = [], team2Images = [],
  completedSections,
  modifierId,
  ttsEnabled: ttsEnabledProp,
  onToggleTts,
  autoStartNarration = false,
}: FightScreenProps) {
  // Server-authoritative modifier (carried on the result payload) wins over
  // the prop, which is just an optimistic value passed in before the stream
  // resolves. Falls back to the prop while result is still loading.
  const activeModifierId = (result?.modifierId as string | null | undefined) ?? modifierId ?? null;
  // Manual progression: the user controls the pace via "BEGIN MATCH" then
  // "NEXT ROUND →" buttons. visibleCount counts how many round narratives
  // are revealed (rounds beyond visibleCount stay hidden until clicked).
  const [visibleCount, setVisibleCount] = useState(0);
  const [matchBegun, setMatchBegun] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [attackingTeam, setAttackingTeam] = useState<0 | 1 | 2>(0);
  // True once the user hits Skip — bypasses per-round gating and waits only
  // for the closing sections (whyWon + summary) before showing the verdict.
  const [skipped, setSkipped] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Music wiring ──────────────────────────────────────────────────────────
  const { setTrack, duck } = useMusic();

  useEffect(() => {
    if (open) {
      setTrack("battle");
    } else {
      setTrack("lobby");
    }
  }, [open]);

  useEffect(() => {
    if (showVictory) setTrack("victory");
  }, [showVictory]);

  // ── TTS narration (OpenAI AI voice) ───────────────────────────────────────
  // If parent passes ttsEnabled (controlled), use that. Otherwise fall back to
  // localStorage so the component still works when rendered standalone.
  const [localTtsEnabled, setLocalTtsEnabled] = useState(() => {
    try { return localStorage.getItem("ava:tts") === "1"; } catch { return false; }
  });
  const ttsEnabled = ttsEnabledProp !== undefined ? ttsEnabledProp : localTtsEnabled;
  const [ttsVoice, setTtsVoiceState] = useState<TtsVoice>(() => {
    try {
      const v = localStorage.getItem("ava:tts-voice");
      return TTS_VOICES.includes(v as TtsVoice) ? (v as TtsVoice) : "onyx";
    } catch { return "onyx"; }
  });
  const [ttsSpeaking, setTtsSpeaking] = useState(false);
  const [narrationStartedRound, setNarrationStartedRound] = useState(-1);
  // The upstream gpt-audio proxy occasionally returns 503 (timeouts), and on
  // Android it may be consistently unavailable. After TTS_MAX_CONSEC_FAILS
  // consecutive failures we set a session-level flag so the endpoint is never
  // called again for the rest of the app session — no more spam loops.
  // The drain loop skips null blobs so fight progression is unaffected.
  const ttsFetch = useCallback((text: string, voice: TtsVoice): Promise<Blob | null> => {
    if (_ttsSessionBlocked || ttsConsecFailsRef.current >= TTS_MAX_CONSEC_FAILS) return Promise.resolve(null);
    return fetch(resolveApiUrl("/api/tts"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice }),
    })
      .then(r => {
        if (r.ok) { ttsConsecFailsRef.current = 0; return r.blob(); }
        ttsConsecFailsRef.current++;
        if (ttsConsecFailsRef.current >= TTS_MAX_CONSEC_FAILS) _ttsSessionBlocked = true;
        return null;
      })
      .catch(() => {
        ttsConsecFailsRef.current++;
        if (ttsConsecFailsRef.current >= TTS_MAX_CONSEC_FAILS) _ttsSessionBlocked = true;
        return null;
      });
  }, []);

  // Tiny silent WAV — played synchronously inside click handlers to satisfy
  // the browser's "audio must be started from a user gesture" requirement.
  // Once this plays, all subsequent audio.play() calls (even after awaits)
  // are permitted for the rest of the page session.
  const audioUnlockedRef = useRef(false);
  const unlockAudio = useCallback(() => {
    if (audioUnlockedRef.current) return;
    audioUnlockedRef.current = true;
    // 0-sample silent WAV — plays instantly, unlocks the audio context.
    const sil = new Audio(
      "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="
    );
    sil.play().catch(() => {});
  }, []);

  // All audio state lives in refs — never causes re-renders, safe to read
  // inside async callbacks without stale-closure problems.
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  // Each queue item: a pre-fired fetch promise and the round it belongs to.
  const sentenceQueueRef = useRef<Array<{ blobP: Promise<Blob | null>; round: number }>>([]);
  const isDrainingRef      = useRef(false);
  const narrationActiveRef = useRef(false);      // true once user clicks Play
  const activeRoundRef     = useRef(-1);         // -1 = stopped
  // Consecutive TTS fetch failures. After TTS_MAX_CONSEC_FAILS failures in a
  // row we stop making requests so a consistently-down TTS proxy (e.g. a 503
  // on Android) doesn't flood the network and spam the DevTools console.
  // Reset to 0 at the start of every fight.
  const ttsConsecFailsRef  = useRef(0);
  const TTS_MAX_CONSEC_FAILS = 3;
  // Per-round: char position in narrative up to which we have already enqueued.
  const enqueuedUpToRef  = useRef<Record<number, number>>({});
  // Pre-fetched TTS blobs for rounds that are complete but not yet visible.
  // Keyed by roundIdx (0-based). Cleared when the round becomes active.
  const preFetchRef = useRef<Map<number, Array<Promise<Blob | null>>>>(new Map());
  // Tracks how far (char position in narrative) we have already fired TTS
  // pre-fetch requests for each upcoming round. Used by both the streaming
  // pre-fetch effect and the completed-round flush so they don't duplicate work.
  const preFetchSentenceUpToRef = useRef<Record<number, number>>({});
  // Stable ref to the latest result so the round-switch effect can read it
  // without adding result to its dependency array.
  const resultRef = useRef<FightResult | null>(null);
  useEffect(() => { resultRef.current = result; }, [result]);

  // ── drain ─────────────────────────────────────────────────────────────────
  // Plays items from sentenceQueueRef in order. Re-entrant-safe via isDrainingRef.
  // Exits when the queue is empty or activeRoundRef changes (round switch / stop).
  const drain = useCallback(async () => {
    if (isDrainingRef.current) return;
    isDrainingRef.current = true;
    try {
      while (true) {
        const item = sentenceQueueRef.current[0];
        if (!item || item.round !== activeRoundRef.current) break;
        sentenceQueueRef.current.shift();

        const blob = await item.blobP;
        // Check again after the async wait — round may have changed.
        if (!blob || item.round !== activeRoundRef.current) continue;

        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        currentAudioRef.current = audio;
        setTtsSpeaking(true);

        await new Promise<void>(res => {
          audio.onended = () => { URL.revokeObjectURL(url); currentAudioRef.current = null; res(); };
          audio.onerror = () => { URL.revokeObjectURL(url); currentAudioRef.current = null; res(); };
          audio.play().catch(() => res());
        });
      }
    } finally {
      isDrainingRef.current = false;
      // Guard: a sentence may have arrived while we were shutting down.
      if (sentenceQueueRef.current[0]?.round === activeRoundRef.current) {
        void drain();
      } else {
        setTtsSpeaking(false);
      }
    }
  }, []);

  // ── hard stop ─────────────────────────────────────────────────────────────
  const stopTts = useCallback(() => {
    activeRoundRef.current = -1;
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.src = "";
      currentAudioRef.current = null;
    }
    sentenceQueueRef.current = [];
    setTtsSpeaking(false);
  }, []);

  // ── toggle / voice ────────────────────────────────────────────────────────
  const toggleTts = useCallback(() => {
    setLocalTtsEnabled(prev => {
      const next = !prev;
      try { localStorage.setItem("ava:tts", next ? "1" : "0"); } catch {}
      if (!next) stopTts();
      return next;
    });
  }, [stopTts]);

  // ── play narration (user-initiated) ─────────────────────────────────────
  // Called when the user taps the "Play narration" button for a round.
  // Unlocks audio (no-op if already unlocked), marks the round as active,
  // and starts draining the pre-fetched sentence queue.
  const playNarration = useCallback(() => {
    if (visibleCount <= 0) return;
    unlockAudio();
    narrationActiveRef.current = true;
    setNarrationStartedRound(visibleCount - 1);
    void drain();
  }, [visibleCount, unlockAudio, drain]);

  // Reset narration-started state when a new round is revealed.
  useEffect(() => { setNarrationStartedRound(-1); }, [visibleCount]);

  // Tutorial auto-start: fires once per fight, ONLY for round 0. See the
  // effect declared below the round-switch effect — placement matters,
  // because round-switch wipes narrationActiveRef when a new round
  // becomes visible. Declaring this ref up here so both effects share it.
  const autoNarrationFiredRef = useRef(false);
  useEffect(() => { if (!open) autoNarrationFiredRef.current = false; }, [open]);

  // Stop TTS immediately if the parent disables narration mid-fight.
  useEffect(() => {
    if (!ttsEnabled) stopTts();
  }, [ttsEnabled, stopTts]);

  const setTtsVoice = useCallback((v: TtsVoice) => {
    setTtsVoiceState(v);
    try { localStorage.setItem("ava:tts-voice", v); } catch {}
    // Stop current audio + pending queue so the new voice takes effect on the
    // next sentence. Clear pre-fetched blobs — they used the old voice.
    // Keep activeRoundRef + enqueuedUpToRef so we don't re-read already-heard text.
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.src = "";
      currentAudioRef.current = null;
    }
    sentenceQueueRef.current = [];
    preFetchRef.current.clear();
    setTtsSpeaking(false);
  }, []);

  // ── round switch ──────────────────────────────────────────────────────────
  // When the user reveals a new round, cut old audio immediately and aim at
  // the new round. If the round was pre-fetched, start draining immediately
  // (no API wait). Otherwise the sentence-detection effect fills the queue.
  useEffect(() => {
    if (!ttsEnabled || visibleCount <= 0) return;
    const roundIdx = visibleCount - 1;
    if (activeRoundRef.current === roundIdx) return;
    activeRoundRef.current = roundIdx;
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.src = "";
      currentAudioRef.current = null;
    }
    sentenceQueueRef.current = [];
    setTtsSpeaking(false);

    narrationActiveRef.current = false;

    // Stage pre-fetched blobs into the sentence queue so they are ready the
    // moment the user clicks "Play narration" — no extra API wait needed.
    const preFetched = preFetchRef.current.get(roundIdx);
    if (preFetched && preFetched.length > 0) {
      preFetched.forEach(blobP => {
        sentenceQueueRef.current.push({ blobP, round: roundIdx });
      });
      preFetchRef.current.delete(roundIdx);
      const narrative = resultRef.current?.rounds[roundIdx]?.narrative ?? "";
      if (narrative.length > 0) enqueuedUpToRef.current[roundIdx] = narrative.length;
      // Do NOT drain here — wait for user to click Play.
    }
  }, [ttsEnabled, visibleCount, drain]);

  // Tutorial auto-start. Declared AFTER round-switch so we run last on a
  // visibleCount change — otherwise round-switch would wipe the active
  // flag we just set. Gated to round 0 only (we want the discovery moment
  // on round 1, then manual control for everything after), and only fires
  // when activeRoundRef has actually been updated to this round, so we
  // can't accidentally arm narration for the wrong round if effects
  // somehow run in an order we didn't expect. The FIGHT-button tap that
  // opened this screen IS the user gesture that unlocks audio on iOS.
  useEffect(() => {
    if (!autoStartNarration) return;
    if (!ttsEnabled) return;
    if (visibleCount !== 1) return;
    if (autoNarrationFiredRef.current) return;
    if (activeRoundRef.current !== 0) return;
    autoNarrationFiredRef.current = true;
    playNarration();
  }, [autoStartNarration, ttsEnabled, visibleCount, playNarration]);

  // ── music ducking ─────────────────────────────────────────────────────────
  // Drop music volume to ~12% while the narrator is speaking, restore after.
  useEffect(() => { duck(ttsSpeaking); }, [ttsSpeaking, duck]);

  // ── lifecycle stops ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) { stopTts(); preFetchRef.current.clear(); preFetchSentenceUpToRef.current = {}; }
  }, [open, stopTts]);
  useEffect(() => { if (showVictory) stopTts(); }, [showVictory, stopTts]);
  useEffect(() => {
    if (isSimulating) {
      enqueuedUpToRef.current = {};
      preFetchRef.current.clear();
      preFetchSentenceUpToRef.current = {};
      ttsConsecFailsRef.current = 0;
      stopTts();
    }
  }, [isSimulating, stopTts]);

  // ── streaming pre-fetch for upcoming rounds ───────────────────────────────
  // Fires on every narrative update (including while the AI is still streaming).
  // For any round that is AHEAD of the currently active one, detect newly
  // complete sentences and immediately fire TTS fetches — so blobs are warming
  // up long before the user clicks "Begin Match" / "Next Round".
  //
  // This is the key fix for the "big delay before narration starts" problem:
  // the AI writes SETTING → ENTRANCE → ROUND 1 in order. When the user can
  // click "Begin Match" (after ENTRANCE is done) Round 1 may still be
  // streaming. Without this effect, drain() would have to wait for the first
  // TTS API response (~1.5s). With it, blobs are already in-flight.
  useEffect(() => {
    if (!ttsEnabled || !result) return;

    const safeRounds = Array.isArray(result.rounds) ? result.rounds : [];
    safeRounds.forEach((round, roundIdx) => {
      // Only pre-fetch rounds that are ahead of the active one
      if (roundIdx <= activeRoundRef.current) return;

      const narrative = round.narrative;
      if (!narrative || narrative.length === 0) return;

      const fromPos = preFetchSentenceUpToRef.current[roundIdx] ?? 0;
      if (narrative.length <= fromPos) return;

      const re = /[.!?]+(?=[ \t\r\n]|$)/g;
      re.lastIndex = fromPos;
      let lastPos = fromPos;
      let match: RegExpExecArray | null;
      const newBlobs: Array<Promise<Blob | null>> = [];

      while ((match = re.exec(narrative)) !== null) {
        const endPos = match.index + match[0].length;
        const clean = narrative.slice(lastPos, endPos)
          .replace(/\*\*/g, "").replace(/^[-*]\s+/gm, "").trim();
        if (clean.length >= 12) {
          newBlobs.push(ttsFetch(clean, ttsVoice));
          lastPos = endPos;
        }
      }

      if (newBlobs.length > 0) {
        const existing = preFetchRef.current.get(roundIdx) ?? [];
        preFetchRef.current.set(roundIdx, [...existing, ...newBlobs]);
        preFetchSentenceUpToRef.current[roundIdx] = lastPos;
      }
    });
  }, [result, ttsEnabled, ttsVoice]);

  // ── mid-stream sentence detection ─────────────────────────────────────────
  // Runs on every narrative text update. Finds newly complete sentences
  // (. ! ? followed by whitespace or end-of-string) and pre-fetches their audio.
  useEffect(() => {
    if (!ttsEnabled || visibleCount <= 0 || !result) return;
    const roundIdx = visibleCount - 1;
    if (activeRoundRef.current !== roundIdx) return;

    const narrative = (Array.isArray(result.rounds) ? result.rounds : [])[roundIdx]?.narrative ?? "";
    const fromPos = enqueuedUpToRef.current[roundIdx] ?? 0;
    if (narrative.length <= fromPos) return;

    const re = /[.!?]+(?=[ \t\r\n]|$)/g;
    re.lastIndex = fromPos;
    let lastPos = fromPos;
    let match: RegExpExecArray | null;

    while ((match = re.exec(narrative)) !== null) {
      const endPos = match.index + match[0].length;
      const clean = narrative.slice(lastPos, endPos)
        .replace(/\*\*/g, "").replace(/^[-*]\s+/gm, "").trim();
      if (clean.length >= 12) {
        const r = roundIdx;
        const blobP = ttsFetch(clean, ttsVoice);
        sentenceQueueRef.current.push({ blobP, round: r });
        lastPos = endPos;
      }
    }

    if (lastPos > fromPos) {
      enqueuedUpToRef.current[roundIdx] = lastPos;
      if (narrationActiveRef.current) void drain();
    }
  }, [result, visibleCount, ttsEnabled, ttsVoice, drain]);

  // ── end-of-round flush ────────────────────────────────────────────────────
  // When a round's section is marked complete, speak any trailing text that
  // didn't end with a sentence-terminating punctuation mark.
  useEffect(() => {
    if (!ttsEnabled || visibleCount <= 0 || !result || !completedSections) return;
    const roundIdx = visibleCount - 1;
    if (activeRoundRef.current !== roundIdx) return;
    const round = (Array.isArray(result.rounds) ? result.rounds : [])[roundIdx];
    if (!round || !completedSections.has(`ROUND ${round.round}`)) return;

    const narrative = round.narrative;
    const fromPos = enqueuedUpToRef.current[roundIdx] ?? 0;
    if (fromPos >= narrative.length) return;

    const remaining = narrative.slice(fromPos)
      .replace(/\*\*/g, "").replace(/^[-*]\s+/gm, "").trim();
    if (remaining.length < 8) return;

    const r = roundIdx;
    const blobP = ttsFetch(remaining, ttsVoice);

    sentenceQueueRef.current.push({ blobP, round: r });
    enqueuedUpToRef.current[roundIdx] = narrative.length;
    if (narrationActiveRef.current) void drain();
  }, [completedSections, visibleCount, ttsEnabled, ttsVoice, result, drain]);

  // ── TTS pre-fetch flush when a round completes ────────────────────────────
  // When the AI marks a round complete, the streaming pre-fetch above will
  // have already fetched most sentences. This effect only needs to pick up
  // the trailing text that never ended with sentence-terminating punctuation.
  // It starts from where preFetchSentenceUpToRef left off — no duplicates.
  useEffect(() => {
    if (!ttsEnabled || !result || !completedSections) return;

    const safeRounds = Array.isArray(result.rounds) ? result.rounds : [];
    safeRounds.forEach((round, roundIdx) => {
      const sectionKey = `ROUND ${round.round}`;
      if (!completedSections.has(sectionKey)) return;
      if (roundIdx <= activeRoundRef.current) return;

      const narrative = round.narrative;
      if (!narrative) return;

      // Start from where the streaming pre-fetch left off
      const fromPos = preFetchSentenceUpToRef.current[roundIdx] ?? 0;
      if (fromPos >= narrative.length) return;  // fully covered already

      const remaining = narrative.slice(fromPos)
        .replace(/\*\*/g, "").replace(/^[-*]\s+/gm, "").trim();
      if (remaining.length < 8) {
        // Mark as fully covered even if nothing to fetch
        preFetchSentenceUpToRef.current[roundIdx] = narrative.length;
        return;
      }

      const blobP = ttsFetch(remaining, ttsVoice);

      const existing = preFetchRef.current.get(roundIdx) ?? [];
      preFetchRef.current.set(roundIdx, [...existing, blobP]);
      preFetchSentenceUpToRef.current[roundIdx] = narrative.length;
    });
  }, [completedSections, ttsEnabled, result, ttsVoice]);

  // ── Round flash VFX ───────────────────────────────────────────────────────
  const [roundFlash, setRoundFlash] = useState(false);
  const triggerRoundFlash = useCallback(() => {
    setRoundFlash(true);
    setTimeout(() => setRoundFlash(false), 450);
  }, []);

  // Reset on open/close
  useEffect(() => {
    if (!open) {
      setVisibleCount(0);
      setMatchBegun(false);
      setShowVictory(false);
      setAttackingTeam(0);
      setSkipped(false);
    }
  }, [open]);

  // Reset whenever a fresh fight starts (isSimulating going true marks a new
  // run — rematch button triggers a new mutate + isSimulating goes back true).
  useEffect(() => {
    if (isSimulating) {
      setVisibleCount(0);
      setMatchBegun(false);
      setShowVictory(false);
      setAttackingTeam(0);
      setSkipped(false);
    }
  }, [isSimulating]);

  // Section name helpers — match the SSE event names the hook tracks.
  const settingDone = !!completedSections?.has("SETTING");
  const entranceDone = !!(completedSections?.has("ENTRANCE") || completedSections?.has("COMBATANT ENTRANCE"));
  // Clamp visibleCount to the actual number of rounds so that the large
  // sentinel (9999) set by handleSkip doesn't make the round-index lookup
  // return undefined and break lastVisibleRoundDone.
  const safeRoundsList = result && Array.isArray(result.rounds) ? result.rounds : [];
  const clampedVisibleCount = result ? Math.min(visibleCount, safeRoundsList.length) : visibleCount;
  const lastVisibleRoundNumber = clampedVisibleCount > 0 && safeRoundsList[clampedVisibleCount - 1]
    ? safeRoundsList[clampedVisibleCount - 1]!.round
    : null;
  const lastVisibleRoundDone = lastVisibleRoundNumber !== null
    && !!completedSections?.has(`ROUND ${lastVisibleRoundNumber}`);

  // Gating flags
  const canBeginMatch = !!result && !matchBegun && settingDone && entranceDone;
  const allRoundsRevealed = !!result && clampedVisibleCount >= (safeRoundsList.length || 0);
  const closingSectionsDone = !!result
    && (result.whyWon?.length ?? 0) > 0
    && !!result.summary?.trim();
  // When skipped, show results immediately — the winner is known from the
  // very first SSE init event so we never need to wait for closing sections.
  // whyWon / summary will stream in and fill the VictoryScreen progressively.
  const canShowResults = skipped
    ? matchBegun
    : (matchBegun && allRoundsRevealed && lastVisibleRoundDone && closingSectionsDone);
  const canShowNextRound = !skipped && matchBegun && !allRoundsRevealed && lastVisibleRoundDone;

  // Reveal handlers
  const beginMatch = () => {
    if (!canBeginMatch) return;
    // Unlock the browser's audio autoplay gate synchronously from this click
    // event. All subsequent audio.play() calls (including those after awaits
    // inside drain()) will be permitted for the rest of the page session.
    unlockAudio();
    setMatchBegun(true);
    setVisibleCount(1);
    setAttackingTeam(1);
    triggerRoundFlash();
  };

  const nextRound = () => {
    if (!canShowNextRound || !result) return;
    // Re-unlock on every round button press (no-op after the first call,
    // but kept here so pre-fetched blobs that start draining immediately
    // after this click are always within an unlocked audio context).
    unlockAudio();
    const newCount = Math.min(visibleCount + 1, (Array.isArray(result.rounds) ? result.rounds : []).length);
    setVisibleCount(newCount);
    setAttackingTeam(((newCount - 1) % 2 === 0 ? 1 : 2) as 1 | 2);
    triggerRoundFlash();
  };

  // Rematch: reset fight state then trigger a new fight
  const handleRematch = () => {
    setShowVictory(false);
    setMatchBegun(false);
    setVisibleCount(0);
    setAttackingTeam(0);
    onRematch?.();
  };

  // Skip: jump straight to the verdict immediately.
  // - Sets a large sentinel so allRoundsRevealed is always true.
  // - matchBegun = true so canShowResults flips instantly.
  // - setShowVictory(true) opens the result overlay right now — the winner
  //   is already known from the SSE init event; whyWon / summary stream in
  //   progressively once the AI finishes generating them.
  // - Guard: do NOT skip while the stream is still loading (isSimulating=true).
  //   At that point team1/team2 characters are stubs from the init event and
  //   lack the `universe` field, which crashes computeSynergy in VictoryScreen.
  const handleSkip = () => {
    if (!result || isSimulating) return;
    stopTts();
    setMatchBegun(true);
    setSkipped(true);
    setVisibleCount(9999);
    setShowVictory(true);
  };

  // Scroll behavior:
  // - When the user reveals a new round (visibleCount goes up), bring the
  //   start of that round to the top of the scroller so they don't have to
  //   scroll up to find the beginning.
  // - When the winner banner becomes available, bring the bottom into view.
  const scrollerRef = useRef<HTMLDivElement>(null);
  const prevVisibleCount = useRef(0);
  useEffect(() => {
    if (visibleCount > prevVisibleCount.current) {
      // Defer one frame so the just-revealed RoundBlock is mounted in the DOM.
      const raf = requestAnimationFrame(() => {
        const target = scrollerRef.current?.querySelector<HTMLElement>(
          `[data-round-index="${visibleCount - 1}"]`
        );
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      prevVisibleCount.current = visibleCount;
      return () => cancelAnimationFrame(raf);
    }
    prevVisibleCount.current = visibleCount;
    return undefined;
  }, [visibleCount]);

  useEffect(() => {
    if (canShowResults) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [canShowResults]);

  let team1HpPct = 100;
  let team2HpPct = 100;
  if (result && Array.isArray(result.rounds) && result.rounds.length > 0) {
    const shownRounds = result.rounds.slice(0, visibleCount);
    if (shownRounds.length > 0) {
      const last = shownRounds[shownRounds.length - 1]!;
      // HP is on a 0-100 scale from the server — use it directly as a percentage
      team1HpPct = Math.max(0, Math.min(100, last.team1Hp));
      team2HpPct = Math.max(0, Math.min(100, last.team2Hp));
    }
  }

  if (!open) return null;

  return (
    <>
      <style>{`
        @keyframes rotateSlow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes clashPulse { 0% { transform: scale(1); } 40% { transform: scale(1.6); } 70% { transform: scale(0.9); } 100% { transform: scale(1); } }
        @keyframes clashBurst { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
        @keyframes sparkFade { 0% { opacity: 1; transform: rotate(var(--r)) translateY(-20px) scaleY(1); } 100% { opacity: 0; transform: rotate(var(--r)) translateY(-50px) scaleY(0.3); } }
        @keyframes hitShake { 0% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } 100% { transform: translateX(0); } }
        @keyframes continuePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes shimmer { 0% { transform: translateX(-200%); } 100% { transform: translateX(500%); } }
        @keyframes roundFlash { 0% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes narrationGlow {
          0%, 100% { box-shadow: 0 0 24px rgba(255,0,85,0.45), 0 0 0 1px rgba(255,255,255,0.08) inset; }
          50% { box-shadow: 0 0 48px rgba(255,0,85,0.85), 0 0 0 1px rgba(255,255,255,0.18) inset; }
        }
        @keyframes narrationSheen {
          0% { transform: translateX(-150%) skewX(-20deg); }
          60%, 100% { transform: translateX(250%) skewX(-20deg); }
        }
        @keyframes soundBar1 { 0%, 100% { transform: scaleY(0.35); } 50% { transform: scaleY(1); } }
        @keyframes soundBar2 { 0%, 100% { transform: scaleY(0.6); } 50% { transform: scaleY(0.25); } }
        @keyframes soundBar3 { 0%, 100% { transform: scaleY(0.45); } 50% { transform: scaleY(0.95); } }
        @keyframes soundBar4 { 0%, 100% { transform: scaleY(0.8); } 50% { transform: scaleY(0.4); } }
        @keyframes micRing {
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>

      <div className="fixed inset-0 z-[60] bg-background flex flex-col animate-in fade-in duration-300">
        {roundFlash && (
          <div
            className="absolute inset-0 pointer-events-none z-50"
            style={{
              background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(255,0,85,0.35) 0%, transparent 70%)",
              animation: "roundFlash 0.45s ease forwards",
            }}
          />
        )}
        {/* Fight Banner */}
        <div className="flex-shrink-0 border-b border-border/30">
          <FightBanner
            team1Images={team1Images}
            team2Images={team2Images}
            team1Names={team1Names}
            team2Names={team2Names}
            attackingTeam={attackingTeam}
            team1HpPct={team1HpPct}
            team2HpPct={team2HpPct}
            isSimulating={isSimulating}
            winner={canShowResults ? result?.winner : undefined}
          />

          {/* Chaos modifier strip — small, unobtrusive, sits between portraits
              and HP bars so the player always knows what rules are bending
              the fight. Hidden when no modifier is active. */}
          {activeModifierId && (
            <div className="flex justify-center bg-card/90 py-1.5 border-t border-white/5">
              <ModifierBadge modifierId={activeModifierId} />
            </div>
          )}

          {/* HP Bars */}
          <div className="grid grid-cols-2 bg-card/90">
            <div>
              <div className="flex items-center justify-between px-3 pt-1.5 pb-1">
                <span className="font-display text-xs uppercase tracking-widest text-team1">Team 1</span>
                <span className="text-[9px] text-muted-foreground truncate ml-2 max-w-[100px] text-right">{team1Names.join(", ")}</span>
              </div>
              <HpBar pct={team1HpPct} team={1} />
            </div>
            <div>
              <div className="flex items-center justify-between px-3 pt-1.5 pb-1">
                <span className="text-[9px] text-muted-foreground truncate mr-2 max-w-[100px]">{team2Names.join(", ")}</span>
                <span className="font-display text-xs uppercase tracking-widest text-team2">Team 2</span>
              </div>
              <HpBar pct={team2HpPct} team={2} />
            </div>
          </div>
        </div>

        {/* Narrative area */}
        <div ref={scrollerRef} className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
            {result && !isSimulating ? (
              <>
                <div className="text-center py-2">
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">
                    {team1Names.join(" & ")} vs {team2Names.join(" & ")}
                  </p>
                  <div className="mt-2 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                </div>

                {/* 1. SETTING — arena description */}
                {result.arenaIntro && (
                  <div className="mb-1 px-1 animate-in fade-in duration-700">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/50 mb-2">
                      ── Setting ──
                    </p>
                    <div className="text-sm leading-relaxed text-foreground/75 italic whitespace-pre-line">
                      {renderMarkdown(result.arenaIntro)}
                    </div>
                    <div className="mt-4 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                  </div>
                )}

                {/* 2. COMBATANT ENTRANCE */}
                {result.intro && (
                  <div className="mb-1 px-1 animate-in fade-in duration-700 delay-200">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/50 mb-2">
                      ── Combatants Enter ──
                    </p>
                    <div className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">
                      {renderMarkdown(result.intro)}
                    </div>
                    <div className="mt-4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                  </div>
                )}

                {/* BEGIN MATCH — appears once Setting + Combatants Enter
                    have both finished streaming, before the user starts
                    revealing rounds. Hands the pacing to the reader. */}
                {canBeginMatch && (
                  <div className="px-1 mt-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <button
                      onClick={beginMatch}
                      className="w-full font-display text-base uppercase tracking-[0.3em] text-primary border-2 border-primary px-5 py-4 hover:bg-primary/10 transition-all active:scale-[0.98]"
                      style={{
                        boxShadow: "0 0 24px rgba(255,0,85,0.25)",
                        animation: "continuePulse 1.6s ease-in-out infinite",
                      }}
                    >
                      Begin Match →
                    </button>
                  </div>
                )}

                {/* 3+. ROUNDS — manually revealed via NEXT ROUND button */}
                {(Array.isArray(result.rounds) ? result.rounds : []).slice(0, visibleCount).map((round, idx) => (
                  <div key={idx}>
                    <RoundBlock round={round} index={idx} />
                    {/* Play narration — only on the most recently revealed round,
                        only when ttsEnabled, and only until the user starts it.
                        Bold, glowing CTA: filled primary, animated sound bars,
                        ripple ring around the mic. Designed to read at a glance
                        as "tap here to hear it spoken." */}
                    {ttsEnabled && idx === visibleCount - 1 && narrationStartedRound !== idx && (
                      <div className="px-1 mt-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <button
                          onClick={playNarration}
                          className="group relative w-full overflow-hidden font-display uppercase text-white px-5 py-4 transition-transform active:scale-[0.98]"
                          style={{
                            background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.78) 100%)",
                            border: "1px solid rgba(255,255,255,0.18)",
                            animation: "narrationGlow 1.8s ease-in-out infinite",
                            letterSpacing: "0.28em",
                            fontSize: 15,
                          }}
                        >
                          {/* Diagonal sheen sweep */}
                          <span
                            className="pointer-events-none absolute top-0 left-0 h-full w-1/3"
                            style={{
                              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
                              animation: "narrationSheen 2.6s ease-in-out infinite",
                            }}
                          />
                          <span className="relative flex items-center justify-center gap-3">
                            {/* Mic with expanding ripple ring */}
                            <span className="relative inline-flex items-center justify-center h-6 w-6">
                              <span
                                className="absolute inset-0 rounded-full"
                                style={{
                                  border: "1.5px solid rgba(255,255,255,0.85)",
                                  animation: "micRing 1.8s ease-out infinite",
                                }}
                              />
                              <Mic className="h-5 w-5 relative" />
                            </span>
                            <span className="font-bold">Play Narration</span>
                            {/* Animated sound-wave bars */}
                            <span className="flex items-end gap-[3px] h-5 ml-1">
                              <span
                                className="w-[3px] bg-white rounded-full origin-bottom"
                                style={{ height: "100%", animation: "soundBar1 0.9s ease-in-out infinite" }}
                              />
                              <span
                                className="w-[3px] bg-white rounded-full origin-bottom"
                                style={{ height: "100%", animation: "soundBar2 0.9s ease-in-out 0.12s infinite" }}
                              />
                              <span
                                className="w-[3px] bg-white rounded-full origin-bottom"
                                style={{ height: "100%", animation: "soundBar3 0.9s ease-in-out 0.24s infinite" }}
                              />
                              <span
                                className="w-[3px] bg-white rounded-full origin-bottom"
                                style={{ height: "100%", animation: "soundBar4 0.9s ease-in-out 0.36s infinite" }}
                              />
                            </span>
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* NEXT ROUND — appears once the most recently revealed
                    round's narrative has fully streamed in. */}
                {canShowNextRound && (
                  <div className="px-1 mt-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <button
                      onClick={nextRound}
                      className="w-full font-display text-base uppercase tracking-[0.3em] text-primary border-2 border-primary px-5 py-4 hover:bg-primary/10 transition-all active:scale-[0.98]"
                      style={{
                        boxShadow: "0 0 24px rgba(255,0,85,0.25)",
                        animation: "continuePulse 1.6s ease-in-out infinite",
                      }}
                    >
                      Next Round →
                    </button>
                  </div>
                )}

                {/* All rounds done — dramatic winner reveal prompt */}
                {canShowResults && result && (
                  <button
                    onClick={() => setShowVictory(true)}
                    className="w-full animate-in fade-in zoom-in-95 duration-700 mt-4"
                  >
                    {/* Winner flash banner */}
                    <div
                      className="w-full py-5 flex flex-col items-center gap-2"
                      style={{
                        background: result.winner === 1
                          ? "linear-gradient(135deg, rgba(0,240,255,0.08) 0%, rgba(0,0,0,0) 100%)"
                          : "linear-gradient(135deg, rgba(255,59,48,0.08) 0%, rgba(0,0,0,0) 100%)",
                        border: `1px solid ${result.winner === 1 ? "rgba(0,240,255,0.2)" : "rgba(255,59,48,0.2)"}`,
                      }}
                    >
                      <span
                        className="font-display text-[9px] uppercase tracking-[0.4em]"
                        style={{ color: "rgba(255,255,255,0.3)" }}
                      >
                        Winner declared
                      </span>
                      <span
                        className="font-display text-2xl uppercase tracking-widest"
                        style={{
                          color: result.winner === 1 ? "#00f0ff" : "#ff3b30",
                          textShadow: `0 0 20px ${result.winner === 1 ? "rgba(0,240,255,0.6)" : "rgba(255,59,48,0.6)"}`,
                          animation: "continuePulse 1.8s ease-in-out infinite",
                        }}
                      >
                        Team {result.winner}
                      </span>
                      <span
                        className="text-[9px] font-bold uppercase tracking-[0.3em]"
                        style={{ color: "rgba(255,255,255,0.3)", animation: "continuePulse 1.5s ease-in-out 0.3s infinite" }}
                      >
                        ▼ tap for full results ▼
                      </span>
                    </div>
                  </button>
                )}

                <div ref={bottomRef} className="h-4" />
              </>
            ) : !isSimulating ? null : (
              <FightLoadingSequence team1Names={team1Names} team2Names={team2Names} />
            )}
          </div>
        </div>

        {/* Bottom actions */}
        <div className="flex-shrink-0 border-t border-border/30 bg-card/80 p-4 flex items-center justify-between gap-3">
          {/* Back */}
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
            Arena
          </button>

          {/* In-fight MUTE button — appears whenever narration is enabled and
              the upstream TTS service is alive. Tapping it flips the parent's
              ttsEnabled (or the local state when uncontrolled) to false, which
              stops the current sentence + clears the queue via the existing
              ttsEnabled-effect → stopTts() chain. To turn narration back on
              the user goes back to Arena and toggles it pre-fight. */}
          {ttsEnabled && (
            <button
              onClick={() => { (onToggleTts ?? toggleTts)(); }}
              aria-pressed={false}
              aria-label="Mute AI narration"
              title="Mute AI narration (re-enable in Arena)"
              className="flex items-center gap-1.5 px-2.5 py-1 transition-all active:scale-[0.95]"
              style={{
                background: ttsSpeaking ? "rgba(0,255,204,0.10)" : "rgba(0,240,255,0.06)",
                border: `1px solid ${ttsSpeaking ? "rgba(0,255,204,0.45)" : "rgba(0,240,255,0.30)"}`,
                color: ttsSpeaking ? "#00ffcc" : "#00f0ff",
                fontSize: 9,
                letterSpacing: "0.18em",
                fontWeight: 700,
                textTransform: "uppercase",
                fontFamily: "var(--font-display, monospace)",
              }}
            >
              <Mic className="h-3 w-3" />
              <span>{ttsSpeaking ? "Mute" : "Mute Narration"}</span>
              {ttsSpeaking && (
                <span className="flex items-end gap-[2px] h-3 ml-0.5">
                  <span
                    className="w-[2px] bg-current rounded-full origin-bottom"
                    style={{ height: "100%", animation: "soundBar1 0.9s ease-in-out infinite" }}
                  />
                  <span
                    className="w-[2px] bg-current rounded-full origin-bottom"
                    style={{ height: "100%", animation: "soundBar2 0.9s ease-in-out 0.12s infinite" }}
                  />
                  <span
                    className="w-[2px] bg-current rounded-full origin-bottom"
                    style={{ height: "100%", animation: "soundBar3 0.9s ease-in-out 0.24s infinite" }}
                  />
                </span>
              )}
            </button>
          )}

          {/* Right side — context-sensitive */}
          {result && (
            <div className="flex items-center gap-3">
              {/* Skip — jumps to the end of the fight, available once the
                  stream has finished loading (isSimulating=false) and at
                  least one round has been generated. Blocked during loading
                  because team stubs from the init event lack `universe`,
                  which would crash computeSynergy in VictoryScreen. */}
              {!canShowResults && !isSimulating && Array.isArray(result.rounds) && result.rounds.length > 0 && (
                <button
                  onClick={handleSkip}
                  className="flex items-center gap-1.5 font-display uppercase transition-all active:scale-[0.97]"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    padding: "6px 10px",
                    border: "1.5px solid rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.04)",
                    color: "rgba(255,255,255,0.65)",
                  }}
                  title="Skip the cinematic narration and jump to the verdict"
                >
                  <FastForward className="h-3 w-3" />
                  <span>Skip</span>
                </button>
              )}

              {/* See Results — appears once every round has been revealed */}
              {canShowResults && (
                <button
                  onClick={() => setShowVictory(true)}
                  className="flex items-center gap-2 font-display text-base uppercase tracking-widest text-primary border-2 border-primary px-5 py-2.5 hover:bg-primary/10 transition-all active:scale-95"
                  style={{
                    boxShadow: "0 0 20px rgba(255,0,85,0.3)",
                    animation: "continuePulse 1.5s ease-in-out infinite",
                  }}
                >
                  <Trophy className="h-4 w-4" />
                  See Results
                </button>
              )}
            </div>
          )}
        </div>

        {/* Victory overlay */}
        {showVictory && result && (
          <VictoryScreen
            result={result}
            onClose={onClose}
            onRematch={onRematch ? handleRematch : undefined}
          />
        )}
      </div>
    </>
  );
}
