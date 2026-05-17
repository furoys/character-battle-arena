import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Calendar, Trophy, Swords, Check, X, Flame, Loader2, Zap, PlayCircle, Shield, Share2, Sparkles } from "lucide-react";
import { useUser, SignInButton } from "@clerk/react";
import { useListCharacters, Character } from "@workspace/api-client-react";
import { apiFetch } from "@/lib/api-fetch";

type DailyMatchup = {
  matchupId: string;
  title: string;
  hook: string;
  team1Ids: number[];
  team2Ids: number[];
  userPick: number | null;
  winnerSide: number | null;
  team1Count: number;
  team2Count: number;
};

type PickPoints = {
  base: number;
  adBonus: number;
  adBonusCap: number;
  used: number;
  remaining: number;
};

type DailyResponse = { date: string; pickPoints: PickPoints | null; matchups: DailyMatchup[] };

type MeDailyResponse = {
  totalPicks: number;
  resolvedPicks: number;
  correct: number;
  currentStreak: number;
  longestStreak: number;
  currentPickStreak: number;
  longestPickStreak: number;
  // Server-computed shield availability. `available` is true only when both
  // (a) the 7-day cooldown is up and (b) there is an unshielded wrong pick
  // worth rescuing. `recoverableStreakLength` is what currentPickStreak would
  // become after using the shield — used to size the CTA copy.
  streakShield: {
    available: boolean;
    cooldownReady: boolean;
    nextAvailableAt: string | null;
    lastUsedAt: string | null;
    recoverablePickId: number | null;
    recoverableStreakLength: number;
  };
  recent: { date: string; matchupId: string; pickedSide: number; winnerSide: number | null }[];
};

type LeaderboardResponse = {
  leaders: { userId: string; correct: number; total: number; displayName: string }[];
};

// ── Countdown to next 8pm ET drop ────────────────────────────────────────────
// Mirrors `getDailyDateString` on the server: the lineup rolls over at 20:00
// America/New_York. DST-correct — does NOT assume a 24h day. We pick the
// target ET wall-clock date (today if before 20:00 ET, else tomorrow), then
// resolve the UTC instant where ET shows exactly 20:00:00 on that date by
// trying both EST (-05:00) and EDT (-04:00) candidates. Whichever, when
// formatted back into ET, lands on `target 20:00`, IS the next rollover.
function msUntilNextDailyRollover(now: Date = new Date()): number {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
  });
  function etOf(d: Date) {
    const p = fmt.formatToParts(d);
    const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
    let h = Number(g("hour"));
    if (h === 24) h = 0;
    return { date: `${g("year")}-${g("month")}-${g("day")}`, h };
  }
  const cur = etOf(now);
  // Target ET date in YYYY-MM-DD (today if before 8pm ET, else tomorrow).
  const baseUtc = Date.UTC(
    Number(cur.date.slice(0, 4)),
    Number(cur.date.slice(5, 7)) - 1,
    Number(cur.date.slice(8, 10)),
  );
  const targetMs = cur.h < 20 ? baseUtc : baseUtc + 86400000;
  const targetDate = new Date(targetMs).toISOString().slice(0, 10);
  // Two candidates — one for EST, one for EDT. Whichever lands on the target
  // ET wall-clock is the correct rollover instant.
  const candEDT = new Date(`${targetDate}T20:00:00-04:00`);
  const candEST = new Date(`${targetDate}T20:00:00-05:00`);
  function lands(d: Date) {
    const ot = etOf(d);
    return ot.date === targetDate && ot.h === 20;
  }
  const target = lands(candEDT) ? candEDT : lands(candEST) ? candEST : candEST;
  return Math.max(0, target.getTime() - now.getTime());
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// Reactive countdown — re-renders every minute (or every second under 1 hour).
function useNextDropCountdown(): string {
  const [ms, setMs] = useState(() => msUntilNextDailyRollover());
  useEffect(() => {
    // Tight tick when under 1h so seconds tick visibly; coarse otherwise.
    const tick = () => setMs(msUntilNextDailyRollover());
    const interval = ms < 3600_000 ? 1000 : 30_000;
    const id = window.setInterval(tick, interval);
    return () => window.clearInterval(id);
  }, [ms < 3600_000]);
  return formatCountdown(ms);
}

// ── Tile shown on the home page (compact) ────────────────────────────────────
// Shows how many of today's 10 matchups still need a pick. Becomes a result
// summary ("3/10 correct") once enough verdicts are in.
export function DailyMatchupHomeTile() {
  const [daily, setDaily] = useState<DailyResponse | null>(null);
  const countdown = useNextDropCountdown();
  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/daily")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setDaily(d as DailyResponse | null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!daily || daily.matchups.length === 0) return null;

  const total = daily.matchups.length;
  const picked = daily.matchups.filter((m) => m.userPick !== null).length;
  const resolved = daily.matchups.filter(
    (m) => m.userPick !== null && m.winnerSide !== null,
  );
  const wins = resolved.filter((m) => m.userPick === m.winnerSide).length;
  const remaining = total - picked;
  const allComplete = resolved.length > 0 && remaining === 0;
  const isPerfect = allComplete && wins === resolved.length && resolved.length === total;

  let label: string;
  let color = "#ffc800";
  if (allComplete) {
    label = isPerfect ? `PERFECT ${wins}/${total}` : `${wins}/${resolved.length} CORRECT`;
    color = isPerfect ? "#ffc800" : wins >= resolved.length / 2 ? "#22c55e" : "#ff0055";
  } else if (picked === 0) {
    label = `${total} NEW FIGHTS`;
  } else {
    label = `${remaining} LEFT TO PICK`;
  }

  return (
    <Link href="/daily">
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer active:scale-[0.98] transition-all"
        style={{
          background: isPerfect
            ? "linear-gradient(90deg, rgba(255,200,0,0.18), rgba(255,107,53,0.10))"
            : "linear-gradient(90deg, rgba(255,200,0,0.08), rgba(255,107,53,0.04))",
          borderTop: "1px solid rgba(255,200,0,0.18)",
          borderBottom: "1px solid rgba(255,200,0,0.18)",
        }}
      >
        <Calendar className="w-3.5 h-3.5" style={{ color: "#ffc800" }} />
        <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.18em", color: "#ffc800" }}>
          DAILY
        </span>
        <span className="flex-1 truncate" style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", fontWeight: 700 }}>
          {/* Countdown replaces the matchup title once the user is fully done
              for the day — gives them the "next drop" hook to come back for. */}
          {allComplete ? `Next drop in ${countdown}` : (daily.matchups[0]?.title ?? "")}
        </span>
        <span style={{ fontSize: 9, fontWeight: 900, color, letterSpacing: "0.12em" }}>
          {label}
        </span>
      </div>
    </Link>
  );
}

// ── Fighter portrait stack (compact, for list row) ──────────────────────────
function TeamPortraits({
  characters,
  side,
  picked,
  isWinner,
  isLoser,
}: {
  characters: (Character | undefined)[];
  side: "left" | "right";
  picked: boolean;
  isWinner: boolean;
  isLoser: boolean;
}) {
  const color = side === "left" ? "#00f0ff" : "#ff3b30";
  const accent = isWinner ? "#ffc800" : isLoser ? "rgba(255,255,255,0.2)" : color;
  return (
    <div className="flex gap-1 flex-wrap justify-center">
      {characters.map((c, i) => (
        <div
          key={i}
          className="relative overflow-hidden flex-shrink-0"
          style={{
            width: 48,
            height: 60,
            border: `1.5px solid ${accent}${picked || isWinner ? "" : "70"}`,
            boxShadow: picked ? `0 0 12px ${accent}55` : "none",
            opacity: isLoser ? 0.45 : 1,
          }}
        >
          {c?.imageUrl ? (
            <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover object-top" />
          ) : (
            <div className="w-full h-full" style={{ background: `${color}15` }} />
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 55%)" }} />
          <div className="absolute bottom-0.5 left-0 right-0 text-center">
            <span style={{ fontSize: 6.5, fontWeight: 900, color: "white", letterSpacing: "0.04em" }}>
              {c?.name?.split(" ").slice(0, 2).join(" ") ?? "?"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Pick review modal (preview before lock-in) ──────────────────────────────
// Full-screen-ish overlay that shows both teams' fighters with their tier,
// abilities, weapons, and combat style so the user can study before committing
// a pick point. The user can switch sides inside the modal and then confirms
// via "Lock In". Cancelling closes the modal without spending a pick point.
function PickReviewModal({
  matchup,
  initialSide,
  characterMap,
  picking,
  onCancel,
  onConfirm,
}: {
  matchup: DailyMatchup;
  initialSide: 1 | 2;
  characterMap: Map<number, Character>;
  picking: boolean;
  onCancel: () => void;
  onConfirm: (side: 1 | 2) => void;
}) {
  const [side, setSide] = useState<1 | 2>(initialSide);
  const t1 = matchup.team1Ids.map((id) => characterMap.get(id)).filter(Boolean) as Character[];
  const t2 = matchup.team2Ids.map((id) => characterMap.get(id)).filter(Boolean) as Character[];
  const sideChars = side === 1 ? t1 : t2;
  const otherChars = side === 1 ? t2 : t1;
  return (
    // z-[60] sits above the global bottom nav (z-50), otherwise the sticky
    // Lock In footer is hidden behind the ARENA/DAILY/DEBATE ROOM tab bar
    // and users can't actually confirm a pick.
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ background: "rgba(8,8,14,0.97)" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 8, color: "rgba(255,200,0,0.7)", letterSpacing: "0.25em", fontWeight: 900 }}>
            REVIEW BEFORE LOCK IN
          </div>
          <h2 className="font-display uppercase mt-1 truncate" style={{ fontSize: 16, color: "white", letterSpacing: "0.08em" }}>
            {matchup.title}
          </h2>
          <p className="truncate" style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontStyle: "italic", marginTop: 2 }}>
            {matchup.hook}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="ml-3 p-1 active:scale-90 transition-all flex-shrink-0"
          style={{ color: "rgba(255,255,255,0.5)" }}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Side toggle */}
      <div className="grid grid-cols-2 gap-1 px-3 py-3 flex-shrink-0">
        {([1, 2] as const).map((s) => {
          const active = side === s;
          const accent = s === 1 ? "#00f0ff" : "#ff3b30";
          return (
            <button
              key={s}
              onClick={() => setSide(s)}
              className="py-2 active:scale-95 transition-all"
              style={{
                background: active ? `${accent}26` : "rgba(255,255,255,0.03)",
                border: `1.5px solid ${active ? accent : "rgba(255,255,255,0.1)"}`,
                color: active ? accent : "rgba(255,255,255,0.5)",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: "0.18em",
              }}
            >
              TEAM {s}
            </button>
          );
        })}
      </div>

      {/* Scrollable fighter detail list */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <div className="flex flex-col gap-3">
          {sideChars.map((c) => (
            <FighterDetailCard key={c.id} character={c} accent={side === 1 ? "#00f0ff" : "#ff3b30"} />
          ))}
        </div>
        {/* Opposing side at a glance — small portrait strip so the user is
            reminded of who they're betting against without scrolling. */}
        <div className="mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: "0.2em", fontWeight: 800, marginBottom: 8 }}>
            FACING
          </div>
          <div className="flex gap-2 flex-wrap">
            {otherChars.map((c) => (
              <div key={c.id} className="flex flex-col items-center" style={{ width: 56 }}>
                <div style={{ width: 48, height: 56, border: "1px solid rgba(255,255,255,0.15)", overflow: "hidden" }}>
                  {c.imageUrl && <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover object-top" />}
                </div>
                <div className="truncate w-full text-center mt-1" style={{ fontSize: 8, color: "rgba(255,255,255,0.55)", fontWeight: 700 }}>
                  {c.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky footer: cancel + confirm */}
      <div className="grid grid-cols-2 gap-2 p-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <button
          onClick={onCancel}
          disabled={picking}
          className="py-3 active:scale-95 transition-all"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.6)",
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: "0.2em",
          }}
        >
          CANCEL
        </button>
        <button
          onClick={() => onConfirm(side)}
          disabled={picking}
          className="py-3 flex items-center justify-center gap-2 active:scale-95 transition-all"
          style={{
            background: side === 1
              ? "linear-gradient(135deg, rgba(0,240,255,0.25), rgba(0,240,255,0.08))"
              : "linear-gradient(135deg, rgba(255,59,48,0.25), rgba(255,59,48,0.08))",
            border: `1.5px solid ${side === 1 ? "rgba(0,240,255,0.7)" : "rgba(255,59,48,0.7)"}`,
            color: side === 1 ? "#00f0ff" : "#ff3b30",
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: "0.2em",
          }}
        >
          {picking ? <Loader2 className="w-4 h-4 animate-spin" /> : `LOCK IN TEAM ${side}`}
        </button>
      </div>
    </div>
  );
}

// ── Fighter detail card (used inside the pick-review modal) ─────────────────
// Shows name, image, tier, and any v3Profile fields we've populated (abilities,
// weapons, combatStyle, finishers). v3Profile is jsonb so we defensively check
// shape on every field — characters without rich profiles still render cleanly.
function FighterDetailCard({ character, accent }: { character: Character; accent: string }) {
  const profile = (character as unknown as { v3Profile?: Record<string, unknown> | null }).v3Profile ?? null;
  const tier = (character as unknown as { tier?: string | null }).tier ?? null;
  const asStringList = (v: unknown): string[] => {
    if (!Array.isArray(v)) return [];
    return v.filter((x): x is string => typeof x === "string");
  };
  const abilities = profile ? asStringList(profile.abilities) : [];
  const weapons = profile ? asStringList(profile.weapons) : [];
  const finishers = profile ? asStringList(profile.finishers) : [];
  const combatStyle = profile && typeof profile.combatStyle === "string" ? profile.combatStyle : null;
  const temperament = profile && typeof profile.temperament === "string" ? profile.temperament : null;
  // Canonical bio/lore lives in `description`; v3Profile may carry a longer
  // backstory/bio under a few possible keys depending on the roster import.
  // Prefer the longer of the two so users see the richest text available.
  const bioCandidates = [
    typeof (character as unknown as { description?: string }).description === "string"
      ? (character as unknown as { description: string }).description
      : null,
    profile && typeof profile.bio === "string" ? (profile.bio as string) : null,
    profile && typeof profile.backstory === "string" ? (profile.backstory as string) : null,
    profile && typeof profile.lore === "string" ? (profile.lore as string) : null,
  ].filter((s): s is string => !!s && s.trim().length > 0);
  const bio = bioCandidates.sort((a, b) => b.length - a.length)[0] ?? null;
  const weaknesses = typeof (character as unknown as { weaknesses?: string }).weaknesses === "string"
    ? (character as unknown as { weaknesses: string }).weaknesses
    : null;
  return (
    <div
      className="flex flex-wrap gap-3 p-3"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: `1px solid ${accent}33`,
      }}
    >
      <div style={{ width: 72, height: 96, border: `1px solid ${accent}66`, overflow: "hidden", flexShrink: 0 }}>
        {character.imageUrl && (
          <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover object-top" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-display uppercase truncate" style={{ fontSize: 13, color: "white", letterSpacing: "0.06em" }}>
            {character.name}
          </h3>
          {tier && (
            <span
              className="font-display uppercase flex-shrink-0"
              style={{
                fontSize: 8,
                color: accent,
                letterSpacing: "0.15em",
                fontWeight: 900,
                padding: "1px 5px",
                border: `1px solid ${accent}66`,
              }}
            >
              {tier}
            </span>
          )}
        </div>
        {combatStyle && (
          <p className="mt-1 truncate" style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontStyle: "italic" }}>
            {combatStyle}
          </p>
        )}
        {temperament && (
          <p className="truncate" style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>
            {temperament}
          </p>
        )}
        {abilities.length > 0 && (
          <div className="mt-2">
            <div style={{ fontSize: 7, color: "rgba(255,255,255,0.4)", letterSpacing: "0.2em", fontWeight: 800 }}>
              ABILITIES
            </div>
            <div className="mt-0.5" style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", lineHeight: 1.35 }}>
              {abilities.slice(0, 4).join(" · ")}
            </div>
          </div>
        )}
        {weapons.length > 0 && (
          <div className="mt-1.5">
            <div style={{ fontSize: 7, color: "rgba(255,255,255,0.4)", letterSpacing: "0.2em", fontWeight: 800 }}>
              WEAPONS
            </div>
            <div className="mt-0.5" style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", lineHeight: 1.35 }}>
              {weapons.slice(0, 3).join(" · ")}
            </div>
          </div>
        )}
        {finishers.length > 0 && (
          <div className="mt-1.5">
            <div style={{ fontSize: 7, color: accent, letterSpacing: "0.2em", fontWeight: 800 }}>
              FINISHER
            </div>
            <div className="mt-0.5" style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", lineHeight: 1.35 }}>
              {finishers[0]}
            </div>
          </div>
        )}
        {weaknesses && (
          <div className="mt-1.5">
            <div style={{ fontSize: 7, color: "#ff6b35", letterSpacing: "0.2em", fontWeight: 800 }}>
              WEAKNESSES
            </div>
            <div className="mt-0.5" style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", lineHeight: 1.35 }}>
              {weaknesses}
            </div>
          </div>
        )}
      </div>
      {/* Bio / lore — full-width below the portrait+stats row so longer text
          can breathe. Hidden when the character has no description at all. */}
      {bio && (
        <div className="basis-full">
          <div style={{ fontSize: 7, color: "rgba(255,255,255,0.4)", letterSpacing: "0.2em", fontWeight: 800, marginBottom: 4 }}>
            BIO · LORE
          </div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", lineHeight: 1.45 }}>
            {bio}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Single matchup card (one row in the daily list) ─────────────────────────
function MatchupCard({
  matchup,
  characterMap,
  isSignedIn,
  picking,
  onPick,
  onWatch,
}: {
  matchup: DailyMatchup;
  characterMap: Map<number, Character>;
  isSignedIn: boolean;
  picking: boolean;
  onPick: (matchupId: string, side: 1 | 2) => void;
  onWatch: (m: DailyMatchup) => void;
}) {
  const t1 = matchup.team1Ids.map((id) => characterMap.get(id));
  const t2 = matchup.team2Ids.map((id) => characterMap.get(id));
  const totalVotes = matchup.team1Count + matchup.team2Count;
  const t1Pct = totalVotes ? Math.round((matchup.team1Count / totalVotes) * 100) : 50;
  const t2Pct = 100 - t1Pct;
  const resolved = matchup.winnerSide !== null;
  const userCorrect = resolved && matchup.userPick === matchup.winnerSide;
  const picked = matchup.userPick !== null;

  // ── "Why did the AI rule that way?" panel ────────────────────────────────
  // Players were complaining that a bare "WON/LOST" bar feels arbitrary —
  // they want the same reasoning bullets the Arena's victory screen shows.
  // We fetch the cached Stage-1 verdict on demand (one tap, one request)
  // so the daily list stays scannable and only loads when the user opts in.
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [breakdown, setBreakdown] = useState<{
    winnerSide: number;
    difficulty: string;
    fightType: string;
    turningPoint: string;
    keyFactors: string[];
    winnerProof: string[];
    loserShowcase: string[];
    winRate: number;
  } | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownError, setBreakdownError] = useState<string | null>(null);

  async function toggleBreakdown() {
    // Block re-entry while a fetch is in flight — `setBreakdownLoading`
    // doesn't flush synchronously, so rapid taps could otherwise spawn
    // duplicate requests before the next render observes `breakdownLoading`.
    if (breakdownLoading) return;
    if (breakdownOpen) { setBreakdownOpen(false); return; }
    setBreakdownOpen(true);
    if (breakdown) return; // already cached
    setBreakdownLoading(true);
    setBreakdownError(null);
    try {
      const r = await apiFetch(
        `/api/daily/matchup/${encodeURIComponent(matchup.matchupId)}/breakdown`,
      );
      if (!r.ok) {
        setBreakdownError(r.status === 404 ? "Breakdown not available yet." : "Couldn't load breakdown.");
        return;
      }
      const data = await r.json();
      setBreakdown(data);
    } catch {
      setBreakdownError("Couldn't load breakdown.");
    } finally {
      setBreakdownLoading(false);
    }
  }

  return (
    <div
      className="flex flex-col gap-3 p-3"
      style={{
        background: resolved
          ? userCorrect
            ? "rgba(34,197,94,0.05)"
            : picked
              ? "rgba(255,0,85,0.05)"
              : "rgba(255,255,255,0.025)"
          : "rgba(255,255,255,0.025)",
        border: `1px solid ${
          resolved
            ? userCorrect
              ? "rgba(34,197,94,0.35)"
              : picked
                ? "rgba(255,0,85,0.3)"
                : "rgba(255,255,255,0.06)"
            : picked
              ? "rgba(255,200,0,0.3)"
              : "rgba(255,255,255,0.06)"
        }`,
      }}
    >
      {/* Title */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-display uppercase truncate" style={{ fontSize: 13, color: "white", letterSpacing: "0.08em", lineHeight: 1.2 }}>
            {matchup.title}
          </h3>
          <p className="truncate" style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", fontStyle: "italic", marginTop: 2 }}>
            {matchup.hook}
          </p>
        </div>
        {resolved && picked && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className="flex items-center gap-0.5"
              style={{
                fontSize: 9,
                fontWeight: 900,
                color: userCorrect ? "#22c55e" : "#ff0055",
                letterSpacing: "0.1em",
              }}
            >
              {userCorrect ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
              {userCorrect ? "WON" : "LOST"}
            </span>
            <button
              onClick={toggleBreakdown}
              className="flex items-center gap-0.5 px-1.5 py-0.5 active:scale-95 transition-all"
              style={{
                fontSize: 8,
                fontWeight: 900,
                letterSpacing: "0.12em",
                color: breakdownOpen ? "#ffc800" : "rgba(255,255,255,0.55)",
                border: `1px solid ${breakdownOpen ? "rgba(255,200,0,0.5)" : "rgba(255,255,255,0.18)"}`,
                background: breakdownOpen ? "rgba(255,200,0,0.06)" : "transparent",
              }}
              aria-expanded={breakdownOpen}
              aria-label="Why this result"
              data-testid={`button-breakdown-${matchup.matchupId}`}
            >
              {breakdownOpen ? "HIDE" : "WHY?"}
            </button>
          </div>
        )}
        {resolved && !picked && (
          <span style={{ fontSize: 8, fontWeight: 900, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em" }}>
            CLOSED
          </span>
        )}
        {!resolved && picked && (
          <button
            disabled={picking}
            onClick={() => onPick(matchup.matchupId, (matchup.userPick === 1 ? 2 : 1) as 1 | 2)}
            className="flex items-center gap-1 active:scale-95 transition-all flex-shrink-0 px-2 py-1"
            style={{
              fontSize: 8,
              fontWeight: 900,
              color: "#ffc800",
              letterSpacing: "0.12em",
              border: "1px solid rgba(255,200,0,0.4)",
              background: "rgba(255,200,0,0.06)",
            }}
            aria-label="Change your pick"
          >
            CHANGE PICK
          </button>
        )}
      </div>

      {/* Teams */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex justify-center">
          <TeamPortraits
            characters={t1}
            side="left"
            picked={matchup.userPick === 1}
            isWinner={resolved && matchup.winnerSide === 1}
            isLoser={resolved && matchup.winnerSide === 2}
          />
        </div>
        <div className="font-display font-black italic" style={{ fontSize: 16, color: "rgba(255,255,255,0.2)" }}>
          VS
        </div>
        <div className="flex-1 flex justify-center">
          <TeamPortraits
            characters={t2}
            side="right"
            picked={matchup.userPick === 2}
            isWinner={resolved && matchup.winnerSide === 2}
            isLoser={resolved && matchup.winnerSide === 1}
          />
        </div>
      </div>

      {/* Pick buttons / locked state */}
      {isSignedIn && !picked && !resolved && (
        <div className="grid grid-cols-2 gap-2">
          <button
            disabled={picking}
            onClick={() => onPick(matchup.matchupId, 1)}
            className="py-2 active:scale-95 transition-all flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(0,240,255,0.15), rgba(0,240,255,0.04))",
              border: "1px solid rgba(0,240,255,0.45)",
              color: "#00f0ff",
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: "0.18em",
            }}
          >
            {picking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "PICK T1"}
          </button>
          <button
            disabled={picking}
            onClick={() => onPick(matchup.matchupId, 2)}
            className="py-2 active:scale-95 transition-all flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(255,59,48,0.15), rgba(255,59,48,0.04))",
              border: "1px solid rgba(255,59,48,0.45)",
              color: "#ff3b30",
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: "0.18em",
            }}
          >
            {picking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "PICK T2"}
          </button>
        </div>
      )}

      {/* Community split — only shown when there are votes */}
      {totalVotes > 0 && (
        <div>
          <div className="flex justify-between mb-1" style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", fontWeight: 800 }}>
            <span>T1 · {t1Pct}%</span>
            <span>{totalVotes} VOTES</span>
            <span>{t2Pct}% · T2</span>
          </div>
          <div className="h-1.5 overflow-hidden flex" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div style={{ width: `${t1Pct}%`, background: "#00f0ff" }} />
            <div style={{ width: `${t2Pct}%`, background: "#ff3b30" }} />
          </div>
        </div>
      )}

      {/* WHY breakdown panel — expands inline when the user taps "WHY?" on a
          resolved matchup. Uses the cached Stage-1 verdict from fight_cache
          (no AI roundtrip; instant on second open). */}
      {resolved && picked && breakdownOpen && (
        <div
          className="flex flex-col gap-2 p-2.5"
          style={{
            background: "rgba(255,200,0,0.04)",
            border: "1px solid rgba(255,200,0,0.22)",
          }}
          role="region"
          aria-label="Fight breakdown"
        >
          {breakdownLoading && (
            <div className="flex items-center gap-2" style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span style={{ letterSpacing: "0.1em", fontWeight: 700 }}>READING THE TAPE…</span>
            </div>
          )}
          {breakdownError && (
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", fontStyle: "italic" }}>
              {breakdownError}
            </div>
          )}
          {breakdown && (
            <>
              <div className="flex items-center gap-2 flex-wrap" style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.14em" }}>
                <span style={{ color: "#ffc800", border: "1px solid rgba(255,200,0,0.35)", padding: "1px 5px", background: "rgba(255,200,0,0.08)" }}>
                  {breakdown.difficulty.toUpperCase()}
                </span>
                <span style={{ color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.15)", padding: "1px 5px" }}>
                  {breakdown.fightType.toUpperCase()}
                </span>
                <span style={{ color: "rgba(255,255,255,0.45)", marginLeft: "auto" }}>
                  WIN RATE · {breakdown.winRate}%
                </span>
              </div>

              <div>
                <div style={{ fontSize: 8, fontWeight: 900, color: "#ff6b35", letterSpacing: "0.14em", marginBottom: 3 }}>
                  TURNING POINT
                </div>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", lineHeight: 1.4 }}>
                  {breakdown.turningPoint}
                </p>
              </div>

              {breakdown.winnerProof.length > 0 && (
                <div>
                  <div style={{ fontSize: 8, fontWeight: 900, color: "#22c55e", letterSpacing: "0.14em", marginBottom: 3 }}>
                    WHY THEY WON
                  </div>
                  <ul className="flex flex-col gap-1">
                    {breakdown.winnerProof.map((reason, i) => (
                      <li key={i} className="flex gap-1.5" style={{ fontSize: 10.5, color: "rgba(255,255,255,0.8)", lineHeight: 1.4 }}>
                        <span style={{ color: "#22c55e", flexShrink: 0 }}>▸</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {breakdown.keyFactors.length > 0 && (
                <div>
                  <div style={{ fontSize: 8, fontWeight: 900, color: "rgba(255,255,255,0.45)", letterSpacing: "0.14em", marginBottom: 3 }}>
                    KEY FACTORS
                  </div>
                  <ul className="flex flex-col gap-1">
                    {breakdown.keyFactors.map((f, i) => (
                      <li key={i} className="flex gap-1.5" style={{ fontSize: 10, color: "rgba(255,255,255,0.65)", lineHeight: 1.4 }}>
                        <span style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>·</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {breakdown.loserShowcase.length > 0 && (
                <div>
                  <div style={{ fontSize: 8, fontWeight: 900, color: "rgba(255,255,255,0.35)", letterSpacing: "0.14em", marginBottom: 3 }}>
                    LOSER'S BEST MOMENTS
                  </div>
                  <ul className="flex flex-col gap-1">
                    {breakdown.loserShowcase.map((s, i) => (
                      <li key={i} className="flex gap-1.5" style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", lineHeight: 1.4, fontStyle: "italic" }}>
                        <span style={{ color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>·</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Watch fight CTA (only when user picked + not resolved) */}
      {picked && !resolved && (
        <button
          onClick={() => onWatch(matchup)}
          className="w-full py-2 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          style={{
            background: "linear-gradient(135deg, rgba(255,0,85,0.18), rgba(255,0,85,0.06))",
            border: "1px solid rgba(255,0,85,0.45)",
            color: "#ff0055",
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: "0.18em",
          }}
        >
          <Swords className="w-3.5 h-3.5" />
          RUN THE FIGHT
        </button>
      )}
    </div>
  );
}

// ── Perfect-day share image generator ────────────────────────────────────────
// Renders a 1080×1350 PNG (Instagram portrait) celebrating a 10/10 day. Pure
// canvas — no extra deps. Returned as a Blob so we can hand it to the Web
// Share API (mobile) or trigger a download (desktop fallback).
async function generatePerfectShareImage(date: string, streak: number): Promise<Blob | null> {
  const W = 1080;
  const H = 1350;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  // Background — deep wine-to-black gradient with subtle ember overlay so the
  // gold text pops without looking flat.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#1a0008");
  bg.addColorStop(0.5, "#0a0a14");
  bg.addColorStop(1, "#08010a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // Inner gold border
  ctx.strokeStyle = "#ffc800";
  ctx.lineWidth = 6;
  ctx.strokeRect(36, 36, W - 72, H - 72);
  ctx.strokeStyle = "rgba(255,107,53,0.6)";
  ctx.lineWidth = 2;
  ctx.strokeRect(60, 60, W - 120, H - 120);
  // Brand wordmark (top)
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,200,0,0.55)";
  ctx.font = "900 32px Impact, 'Bebas Neue', sans-serif";
  ctx.fillText("A . V . A   D A I L Y", W / 2, 150);
  // PERFECT DAY headline
  ctx.fillStyle = "#ffc800";
  ctx.font = "900 156px Impact, 'Bebas Neue', sans-serif";
  ctx.fillText("PERFECT DAY", W / 2, 360);
  // Big 10/10
  const grad = ctx.createLinearGradient(0, 460, 0, 720);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(1, "#ff6b35");
  ctx.fillStyle = grad;
  ctx.font = "900 280px Impact, 'Bebas Neue', sans-serif";
  ctx.fillText("10 / 10", W / 2, 720);
  // Date
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "700 36px 'Helvetica Neue', Arial, sans-serif";
  ctx.fillText(date.toUpperCase(), W / 2, 800);
  // Streak band
  ctx.fillStyle = "rgba(255,107,53,0.12)";
  ctx.fillRect(120, 880, W - 240, 130);
  ctx.strokeStyle = "rgba(255,107,53,0.6)";
  ctx.lineWidth = 2;
  ctx.strokeRect(120, 880, W - 240, 130);
  ctx.fillStyle = "#ff6b35";
  ctx.font = "900 48px Impact, 'Bebas Neue', sans-serif";
  ctx.fillText(`PERFECT-DAY STREAK · ${streak}`, W / 2, 962);
  // Tagline
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "italic 600 30px 'Helvetica Neue', Arial, sans-serif";
  ctx.fillText("Picked every fight. Beat the lineup.", W / 2, 1100);
  // Footer brand
  ctx.fillStyle = "#ffc800";
  ctx.font = "900 60px Impact, 'Bebas Neue', sans-serif";
  ctx.fillText("ANYONE   VS   ANYONE", W / 2, 1220);
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "700 24px 'Helvetica Neue', Arial, sans-serif";
  ctx.fillText("AnyoneVsAnyone.replit.app", W / 2, 1265);
  return await new Promise<Blob | null>((resolve) => c.toBlob((b) => resolve(b), "image/png"));
}

// ── Perfect-day celebration banner ───────────────────────────────────────────
// Sits at the top of the matchup list when the user has resolved all 10 picks
// AND got every one right. Includes a SHARE button that opens the OS share
// sheet with a generated PNG (mobile) or downloads it (desktop fallback).
function PerfectDayBanner({ date, streak }: { date: string; streak: number }) {
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  async function share() {
    setSharing(true);
    setShareError(null);
    try {
      const blob = await generatePerfectShareImage(date, streak);
      if (!blob) throw new Error("image-failed");
      const file = new File([blob], `ava-perfect-${date}.png`, { type: "image/png" });
      const shareData: ShareData = {
        title: "A.v.A — Perfect Day",
        text: `Went 10/10 on today's A.v.A Daily Matchups. ${streak}-day perfect streak. Think you can?`,
        url: "https://AnyoneVsAnyone.replit.app",
        files: [file],
      };
      // Modern mobile: share sheet with image. nav.canShare guards iOS Safari
      // versions that don't accept files.
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare && nav.canShare(shareData) && nav.share) {
        await nav.share(shareData);
        return;
      }
      if (nav.share) {
        // Fallback: text-only share (no image attachment).
        await nav.share({ title: shareData.title, text: shareData.text, url: shareData.url });
        return;
      }
      // Desktop fallback: trigger a download so the user can post manually.
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ava-perfect-${date}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      // AbortError fires when the user cancels the native share sheet — not
      // an error, just dismiss silently.
      const err = e as { name?: string; message?: string };
      if (err?.name !== "AbortError") {
        setShareError("Share failed. Try again.");
      }
    } finally {
      setSharing(false);
    }
  }
  return (
    <div
      className="relative overflow-hidden p-4"
      style={{
        background: "linear-gradient(135deg, rgba(255,200,0,0.18), rgba(255,107,53,0.10))",
        border: "2px solid rgba(255,200,0,0.7)",
        boxShadow: "0 0 40px rgba(255,200,0,0.15)",
      }}
    >
      <div className="flex items-start gap-3">
        <Sparkles className="w-6 h-6 flex-shrink-0" style={{ color: "#ffc800" }} />
        <div className="flex-1 min-w-0">
          <div
            className="font-display uppercase"
            style={{ fontSize: 10, color: "#ff6b35", letterSpacing: "0.3em", fontWeight: 900 }}
          >
            Perfect Day · 10 / 10
          </div>
          <div
            className="font-display uppercase mt-1"
            style={{ fontSize: 20, color: "white", letterSpacing: "0.05em", fontWeight: 900, lineHeight: 1.1 }}
          >
            You called every fight.
          </div>
          <div
            className="mt-1"
            style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", lineHeight: 1.4 }}
          >
            Perfect-day streak: <span style={{ color: "#ffc800", fontWeight: 900 }}>{streak}</span>.
            Share the brag — let your friends try to beat it.
          </div>
        </div>
      </div>
      <button
        onClick={share}
        disabled={sharing}
        className="w-full mt-3 py-2.5 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60"
        style={{
          background: "linear-gradient(135deg, rgba(255,200,0,0.35), rgba(255,107,53,0.20))",
          border: "1.5px solid rgba(255,200,0,0.85)",
          color: "#ffc800",
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
        }}
      >
        {sharing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Share2 className="w-3.5 h-3.5" />
            Share Perfect Day
          </>
        )}
      </button>
      {shareError && (
        <div
          className="mt-2 text-center"
          style={{ fontSize: 10, color: "#ff6b35", letterSpacing: "0.1em", fontWeight: 700 }}
        >
          {shareError}
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export function Daily() {
  const { user, isSignedIn } = useUser();
  const countdown = useNextDropCountdown();
  const [, navigate] = useLocation();
  const { data: characters } = useListCharacters();
  const characterMap = useMemo(() => {
    const m = new Map<number, Character>();
    (Array.isArray(characters) ? characters : []).forEach((c) => m.set(c.id, c));
    return m;
  }, [characters]);

  const [daily, setDaily] = useState<DailyResponse | null>(null);
  const [me, setMe] = useState<MeDailyResponse | null>(null);
  const [board, setBoard] = useState<LeaderboardResponse | null>(null);
  const [pickingId, setPickingId] = useState<string | null>(null);
  const [tab, setTab] = useState<"matchup" | "leaderboard">("matchup");

  const reload = () => {
    apiFetch("/api/daily")
      .then((r) => r.json())
      .then((d) => setDaily(d as DailyResponse))
      .catch(() => {});
    if (isSignedIn) {
      apiFetch("/api/me/daily")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setMe(d as MeDailyResponse | null))
        .catch(() => {});
    }
    apiFetch("/api/daily/leaderboard")
      .then((r) => r.json())
      .then((d) => setBoard(d as LeaderboardResponse))
      .catch(() => {});
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  // Single ad-overlay state machine — `purpose` discriminates between the
  // pick-point bonus ad (existing) and the streak-shield rescue ad (new).
  // Keeping them on one overlay means only one fullscreen modal can be active
  // and we reuse the same render/teardown plumbing.
  type AdPurpose =
    | { kind: "pick-point"; afterPick?: { matchupId: string; side: 1 | 2 } }
    | { kind: "shield"; pickId: number };
  const [adState, setAdState] = useState<
    | { kind: "idle" }
    | { kind: "watching"; secondsLeft: number; purpose: AdPurpose }
    | { kind: "granting"; purpose: AdPurpose }
  >({ kind: "idle" });
  const [outOfPointsToast, setOutOfPointsToast] = useState(false);
  // Pick review modal — tapping a fighter opens this with a preselected side;
  // the user can switch sides inside the modal before confirming via "Lock In".
  const [reviewMatchup, setReviewMatchup] = useState<
    { matchup: DailyMatchup; preselectedSide: 1 | 2 } | null
  >(null);

  async function pick(matchupId: string, side: 1 | 2) {
    if (!isSignedIn || pickingId) return;
    setPickingId(matchupId);
    try {
      const r = await apiFetch("/api/daily/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchupId, side }),
      });
      if (r.status === 403) {
        // Out of pick points — show the watch-ad prompt and remember which
        // matchup the user was trying to pick so we can auto-retry after the
        // ad grants a point.
        setOutOfPointsToast(true);
        setAdState({ kind: "idle" });
        const data = (await r.json().catch(() => null)) as { pickPoints?: PickPoints } | null;
        if (data?.pickPoints) {
          setDaily((d) => (d ? { ...d, pickPoints: data.pickPoints! } : d));
        }
      } else if (r.status === 409) {
        // Pick already locked — fight has been simulated by someone else and
        // the winner is now globally known, so we can't allow a swap. Just
        // refresh so the user sees the current state (resolved verdict).
        reload();
      } else if (r.ok) {
        const data = (await r.json().catch(() => null)) as { pickPoints?: PickPoints } | null;
        if (data?.pickPoints) {
          setDaily((d) => (d ? { ...d, pickPoints: data.pickPoints! } : d));
        }
        reload();
      }
    } finally {
      setPickingId(null);
    }
  }

  // Watch-ad flow: simulate a short ad countdown on the client, then ask the
  // server to credit a bonus pick point. Pure UI gating — no real ad SDK yet,
  // but the endpoint is rate-limited by DAILY_AD_BONUS_CAP on the server.
  function startWatchAd(opts?: { afterPickMatchupId?: string; afterPickSide?: 1 | 2 }) {
    if (!isSignedIn) return;
    setOutOfPointsToast(false);
    const AD_SECONDS = 5;
    setAdState({
      kind: "watching",
      secondsLeft: AD_SECONDS,
      purpose: {
        kind: "pick-point",
        afterPick:
          opts?.afterPickMatchupId && opts?.afterPickSide
            ? { matchupId: opts.afterPickMatchupId, side: opts.afterPickSide }
            : undefined,
      },
    });
  }

  // Streak-shield ad: 10s (longer than the pick-point ad, since the reward is
  // bigger — rescuing a streak). On completion, POST /api/me/streak-shield
  // with the recoverable pickId, then reload `me` so the streak number jumps.
  function startShieldAd(pickId: number) {
    if (!isSignedIn) return;
    const AD_SECONDS = 10;
    setAdState({
      kind: "watching",
      secondsLeft: AD_SECONDS,
      purpose: { kind: "shield", pickId },
    });
  }

  // Drive the ad countdown -> grant step. Lives in an effect so the user can
  // navigate away cleanly (state resets) without leaking timers.
  useEffect(() => {
    if (adState.kind !== "watching") return;
    if (adState.secondsLeft <= 0) {
      const purpose = adState.purpose;
      setAdState({ kind: "granting", purpose });
      (async () => {
        try {
          if (purpose.kind === "pick-point") {
            const r = await apiFetch("/api/daily/watch-ad", { method: "POST" });
            const data = (await r.json().catch(() => null)) as { pickPoints?: PickPoints } | null;
            if (data?.pickPoints) {
              setDaily((d) => (d ? { ...d, pickPoints: data.pickPoints! } : d));
            }
            if (r.ok && purpose.afterPick) {
              await pick(purpose.afterPick.matchupId, purpose.afterPick.side);
            }
          } else {
            // Shield: tell the server to consume the user's weekly shield
            // against the previously-identified recoverable pick. Then refresh
            // `me` so the streak number reflects the rescued chain. The
            // server is the source of truth: on 409 (cooldown / already
            // shielded) we silently let `reload()` re-pull the canonical
            // shield state — the CTA will hide itself if no shield is
            // available anymore, which is the correct UX.
            const sr = await apiFetch("/api/me/streak-shield", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pickId: purpose.pickId }),
            }).catch(() => null);
            if (sr && !sr.ok && sr.status === 409) {
              // Surface a brief notice via the existing out-of-points toast
              // slot — repurposed as a generic "couldn't apply" hint. Cleared
              // on the next interaction or after reload.
              setOutOfPointsToast(true);
              setTimeout(() => setOutOfPointsToast(false), 3000);
            }
            reload();
          }
        } finally {
          setAdState({ kind: "idle" });
        }
      })();
      return;
    }
    const t = setTimeout(() => {
      setAdState((s) => (s.kind === "watching" ? { ...s, secondsLeft: s.secondsLeft - 1 } : s));
    }, 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adState]);

  function watchFight(matchup: DailyMatchup) {
    const team1 = matchup.team1Ids.map((id) => characterMap.get(id)).filter(Boolean) as Character[];
    const team2 = matchup.team2Ids.map((id) => characterMap.get(id)).filter(Boolean) as Character[];
    if (team1.length === 0 || team2.length === 0) return;
    try {
      // dailyMatchupId tells home.tsx to (a) skip the optimistic energy
      // decrement and (b) include the id in the /fights/stream call so the
      // server's daily bypass kicks in and no energy is consumed.
      // autoFight tells home.tsx to fire the fight automatically once the
      // teams are loaded, so the user doesn't have to land on home and press
      // FIGHT — they go straight from "Watch Fight" to the cinematic.
      localStorage.setItem(
        "ava_pending_fight",
        JSON.stringify({
          team1,
          team2,
          mode: "debate",
          dailyMatchupId: matchup.matchupId,
          autoFight: true,
        }),
      );
    } catch {
      /* ignore */
    }
    navigate("/");
  }

  const matchups = daily?.matchups ?? [];
  const pickedCount = matchups.filter((m) => m.userPick !== null).length;
  const resolvedOwn = matchups.filter((m) => m.userPick !== null && m.winnerSide !== null);
  const correctToday = resolvedOwn.filter((m) => m.userPick === m.winnerSide).length;

  return (
    <div className="flex flex-col min-h-full" style={{ background: "#0a0a0f" }}>
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-display text-2xl uppercase tracking-[0.2em]" style={{ color: "#ffc800", lineHeight: 1 }}>
              Daily Matchups
            </h1>
            <p className="mt-1" style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>
              {daily?.date ?? "—"} · NEXT DROP IN <span style={{ color: "#ffc800", fontWeight: 800 }}>{countdown}</span>
            </p>
          </div>
          {me && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em", fontWeight: 800 }}>
                  TODAY
                </div>
                <div className="font-display" style={{ fontSize: 16, color: "white", lineHeight: 1, fontWeight: 900 }}>
                  {pickedCount}/{matchups.length || 10}
                </div>
              </div>
              <div className="text-right">
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em", fontWeight: 800 }}>
                  STREAK
                </div>
                <div className="flex items-center gap-1 justify-end">
                  <Flame className="w-3 h-3" style={{ color: "#ff6b35" }} />
                  <span className="font-display" style={{ fontSize: 16, color: "#ffc800", lineHeight: 1, fontWeight: 900 }}>
                    {me.currentPickStreak}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Streak shield CTA — surfaces only when the server says a shield is
            ready AND there's an unshielded loss worth rescuing. Tapping fires
            the 10-second ad flow, then the server-side endpoint nullifies the
            loss for streak purposes. */}
        {isSignedIn && me?.streakShield.available && me.streakShield.recoverablePickId !== null && (
          <button
            onClick={() => startShieldAd(me.streakShield.recoverablePickId!)}
            disabled={adState.kind !== "idle"}
            className="w-full mt-2 px-3 py-2 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            style={{
              background: "linear-gradient(135deg, rgba(0,180,255,0.18), rgba(0,120,255,0.06))",
              border: "1.5px solid rgba(0,180,255,0.55)",
              color: "#5ec8ff",
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: "0.18em",
            }}
          >
            <Shield className="w-3.5 h-3.5" />
            SAVE STREAK · {me.streakShield.recoverableStreakLength}
            <span style={{ fontSize: 8, opacity: 0.7, letterSpacing: "0.12em" }}>
              (10s AD)
            </span>
          </button>
        )}
        {/* Shield-on-cooldown caption — tells the user when their next free
            shield will be available so they know the feature exists. */}
        {isSignedIn && me && !me.streakShield.cooldownReady && me.streakShield.nextAvailableAt && (
          <div
            className="mt-2 text-center"
            style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", fontWeight: 700 }}
          >
            🛡 NEXT SHIELD: {new Date(me.streakShield.nextAvailableAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </div>
        )}
        {/* Pick-points strip — only shown when signed in. Visualizes 3 base
            pips + any bonus pips earned via ads, filled = remaining. */}
        {isSignedIn && daily?.pickPoints && (
          <PickPointsStrip
            pickPoints={daily.pickPoints}
            onWatchAd={() => startWatchAd()}
            adBusy={adState.kind !== "idle"}
          />
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-3 py-2 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        {(["matchup", "leaderboard"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="transition-all"
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.15em",
              padding: "5px 14px",
              background: tab === t ? "rgba(255,200,0,0.15)" : "transparent",
              border: `1px solid ${tab === t ? "rgba(255,200,0,0.5)" : "rgba(255,255,255,0.08)"}`,
              color: tab === t ? "#ffc800" : "rgba(255,255,255,0.4)",
              textTransform: "uppercase",
            }}
          >
            {t === "matchup" ? "TODAY" : "LEADERBOARD"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {tab === "matchup" && (
          <div className="max-w-2xl mx-auto flex flex-col gap-3">
            {/* Sign-in CTA for guests */}
            {!isSignedIn && (
              <div
                className="text-center py-4 px-3"
                style={{
                  background: "rgba(255,200,0,0.06)",
                  border: "1px solid rgba(255,200,0,0.3)",
                }}
              >
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 10 }}>
                  Sign in to lock in your daily picks and climb the leaderboard.
                </p>
                <SignInButton mode="modal">
                  <button
                    className="px-6 py-2 font-display uppercase tracking-widest active:scale-95 transition-all"
                    style={{
                      background: "linear-gradient(135deg, rgba(255,200,0,0.2), rgba(255,200,0,0.08))",
                      border: "1.5px solid rgba(255,200,0,0.6)",
                      color: "#ffc800",
                      fontSize: 11,
                      fontWeight: 900,
                      letterSpacing: "0.2em",
                    }}
                  >
                    Sign In to Play
                  </button>
                </SignInButton>
              </div>
            )}

            {/* Perfect-day celebration — only when the user has resolved
                every one of today's 10 picks AND nailed them all. The streak
                shown is currentStreak (perfect-day streak) +1 if today isn't
                yet counted on the server response (server stat is cached). */}
            {isSignedIn && me && matchups.length > 0 &&
              resolvedOwn.length === matchups.length &&
              correctToday === matchups.length && (
                <PerfectDayBanner
                  date={daily?.date ?? new Date().toISOString().slice(0, 10)}
                  streak={Math.max(1, me.currentStreak)}
                />
              )}

            {/* Personal stats strip */}
            {me && me.totalPicks > 0 && (
              <>
                <div className="grid grid-cols-4 gap-2">
                  <Stat label="TODAY" value={pickedCount} />
                  <Stat label="WINS NOW" value={`${correctToday}/${resolvedOwn.length}`} />
                  <Stat label="ALL-TIME" value={`${me.correct}/${me.resolvedPicks}`} />
                  <Stat label="BEST" value={me.longestPickStreak} />
                </div>
                {/* Secondary stat: perfect-day streak (every resolved pick on
                    a day correct). Header STREAK shows the pick-streak; this
                    line surfaces the day-level streak for the completionists. */}
                <div
                  className="text-center"
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.4)",
                    letterSpacing: "0.1em",
                    marginTop: -4,
                  }}
                >
                  Perfect days: <span style={{ color: "#ffc800", fontWeight: 800 }}>{me.currentStreak}</span>
                  {" · "}Best: <span style={{ color: "#ffc800", fontWeight: 800 }}>{me.longestStreak}</span>
                </div>
              </>
            )}

            {/* Matchup list */}
            {matchups.length === 0 ? (
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "32px 0" }}>
                Loading today's fights…
              </p>
            ) : (
              matchups.map((m) => (
                <MatchupCard
                  key={m.matchupId}
                  matchup={m}
                  characterMap={characterMap}
                  isSignedIn={!!isSignedIn}
                  picking={pickingId === m.matchupId}
                  // Tapping a pick button no longer locks immediately — it
                  // opens the review modal with the tapped side preselected.
                  onPick={(matchupId, side) => {
                    const found = matchups.find((x) => x.matchupId === matchupId);
                    if (found) setReviewMatchup({ matchup: found, preselectedSide: side });
                  }}
                  onWatch={watchFight}
                />
              ))
            )}
          </div>
        )}

        {tab === "leaderboard" && (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4" style={{ color: "#ffc800" }} />
              <h2 className="font-display uppercase" style={{ fontSize: 14, color: "#ffc800", letterSpacing: "0.18em" }}>
                Top Predictors
              </h2>
            </div>
            {!board || board.leaders.length === 0 ? (
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "32px 0" }}>
                No verdicts yet. Be the first to lock in.
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {board.leaders.map((row, i) => {
                  const isMe = isSignedIn && user?.id === row.userId;
                  const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;
                  const pct = row.total ? Math.round((row.correct / row.total) * 100) : 0;
                  const shortId = isMe ? "YOU" : (row.displayName || `Player ${row.userId.slice(-6)}`);
                  return (
                    <div
                      key={row.userId}
                      className="flex items-center gap-3 px-3 py-2"
                      style={{
                        background: isMe ? "rgba(255,200,0,0.08)" : "rgba(255,255,255,0.025)",
                        border: `1px solid ${isMe ? "rgba(255,200,0,0.4)" : "rgba(255,255,255,0.05)"}`,
                      }}
                    >
                      <span style={{ width: 32, fontSize: 14, textAlign: "center" }}>{medal}</span>
                      <span className="flex-1 font-mono uppercase" style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", letterSpacing: "0.1em" }}>
                        {shortId}
                      </span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                        {row.correct}/{row.total} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      {/* Out-of-points modal — centered overlay so the WATCH AD button is
          never hidden behind the bottom nav / system gesture bar on phones
          with tall safe-areas. Tap-outside dismisses. */}
      {outOfPointsToast && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={() => setOutOfPointsToast(false)}
        >
          <div
            className="relative flex flex-col items-center gap-5 px-6 py-7 w-full max-w-sm"
            style={{
              background: "linear-gradient(135deg, rgba(40,8,8,0.98), rgba(20,4,4,0.98))",
              border: "1.5px solid rgba(255,80,80,0.6)",
              boxShadow: "0 0 32px rgba(255,80,80,0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOutOfPointsToast(false)}
              className="absolute top-2 right-2 opacity-50 hover:opacity-100 p-2"
              style={{ color: "white" }}
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
            <div
              className="font-display uppercase text-center"
              style={{
                fontSize: 18,
                color: "#ff5050",
                letterSpacing: "0.15em",
                fontWeight: 900,
              }}
            >
              Out of Pick Points
            </div>
            <p
              className="text-center"
              style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}
            >
              Watch a short ad to earn another pick and keep your streak going.
            </p>
            <button
              onClick={() => startWatchAd()}
              className="w-full py-4 active:scale-95 transition-all flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg, rgba(255,200,0,0.35), rgba(255,200,0,0.15))",
                border: "2px solid rgba(255,200,0,0.85)",
                color: "#ffc800",
                fontSize: 14,
                fontWeight: 900,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                boxShadow: "0 0 20px rgba(255,200,0,0.3)",
              }}
            >
              <PlayCircle className="w-5 h-5" />
              Watch Ad for +1 Pick
            </button>
          </div>
        </div>
      )}
      {/* Pick review modal — opens when the user taps a pick button. Shows both
          fighters' stats/abilities side-by-side and gates the actual lock-in
          behind an explicit confirm so users can rethink without burning a
          pick point on a misclick. */}
      {reviewMatchup && (
        <PickReviewModal
          matchup={reviewMatchup.matchup}
          initialSide={reviewMatchup.preselectedSide}
          characterMap={characterMap}
          picking={pickingId === reviewMatchup.matchup.matchupId}
          onCancel={() => setReviewMatchup(null)}
          onConfirm={async (side) => {
            const mid = reviewMatchup.matchup.matchupId;
            setReviewMatchup(null);
            await pick(mid, side);
          }}
        />
      )}
      {/* Ad-watching overlay */}
      {adState.kind !== "idle" && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{ background: "rgba(0,0,0,0.92)" }}
        >
          <div
            className="font-display uppercase mb-4"
            style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "0.3em", fontWeight: 800 }}
          >
            {adState.kind === "watching"
              ? adState.purpose.kind === "shield"
                ? "Saving Your Streak"
                : "Ad Playing"
              : adState.purpose.kind === "shield"
                ? "Applying Shield…"
                : "Granting Bonus…"}
          </div>
          <div
            className="flex items-center justify-center mb-6"
            style={{
              width: 140,
              height: 140,
              borderRadius: "50%",
              border: "3px solid rgba(255,200,0,0.4)",
              background: "rgba(255,200,0,0.05)",
            }}
          >
            {adState.kind === "watching" ? (
              <span
                className="font-display"
                style={{ fontSize: 64, color: "#ffc800", fontWeight: 900, lineHeight: 1 }}
              >
                {adState.secondsLeft}
              </span>
            ) : (
              <Loader2 className="w-12 h-12 animate-spin" style={{ color: "#ffc800" }} />
            )}
          </div>
          <div
            style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", letterSpacing: "0.1em", textAlign: "center", maxWidth: 280 }}
          >
            {adState.kind === "watching"
              ? adState.purpose.kind === "shield"
                ? "Watch the full ad to rescue your streak."
                : "Thanks for supporting A.v.A — earning +1 pick point."
              : adState.purpose.kind === "shield"
                ? "Re-linking your streak…"
                : "Crediting your account…"}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Pick points strip ─────────────────────────────────────────────────────────
// Renders base-pip + bonus-pip indicators side by side. Filled pip = available,
// empty pip = spent. When `remaining === 0` and bonus capacity is left, the
// inline WATCH AD button appears. Designed to be compact (no vertical layout
// shift) so it fits in the existing daily header.
function PickPointsStrip({
  pickPoints,
  onWatchAd,
  adBusy,
}: {
  pickPoints: PickPoints;
  onWatchAd: () => void;
  adBusy: boolean;
}) {
  const { base, adBonus, adBonusCap, used, remaining } = pickPoints;
  const total = base + adBonus;
  const canWatchAd = remaining === 0 && adBonus < adBonusCap;
  const pips: { kind: "base" | "bonus"; filled: boolean }[] = [];
  for (let i = 0; i < base; i++) pips.push({ kind: "base", filled: i < base - Math.min(used, base) });
  for (let i = 0; i < adBonus; i++) {
    const bonusUsed = Math.max(0, used - base);
    pips.push({ kind: "bonus", filled: i < adBonus - Math.min(bonusUsed, adBonus) });
  }
  return (
    <div className="mt-3 flex items-center gap-2 flex-wrap">
      <Zap className="w-3 h-3" style={{ color: remaining > 0 ? "#ffc800" : "rgba(255,255,255,0.3)" }} />
      <div
        className="font-display uppercase"
        style={{
          fontSize: 9,
          color: "rgba(255,255,255,0.5)",
          letterSpacing: "0.18em",
          fontWeight: 800,
        }}
      >
        Picks
      </div>
      <div className="flex items-center gap-1">
        {pips.map((p, i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              borderRadius: 2,
              background: p.filled
                ? p.kind === "bonus"
                  ? "#ff6b35"
                  : "#ffc800"
                : "rgba(255,255,255,0.08)",
              border: `1px solid ${
                p.filled
                  ? p.kind === "bonus"
                    ? "rgba(255,107,53,0.9)"
                    : "rgba(255,200,0,0.9)"
                  : "rgba(255,255,255,0.15)"
              }`,
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", fontWeight: 700 }}>
        {remaining}/{total}
      </span>
      {canWatchAd && (
        <button
          onClick={onWatchAd}
          disabled={adBusy}
          className="ml-1 px-2.5 py-1 active:scale-95 transition-all flex items-center gap-1 disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, rgba(255,200,0,0.18), rgba(255,200,0,0.05))",
            border: "1px solid rgba(255,200,0,0.55)",
            color: "#ffc800",
            fontSize: 9,
            fontWeight: 900,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          <PlayCircle className="w-3 h-3" />
          Watch Ad +1
        </button>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div
      className="text-center py-2 px-2"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="font-display" style={{ fontSize: 16, color: "#ffc800", fontWeight: 900, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", marginTop: 4, letterSpacing: "0.12em", fontWeight: 800 }}>
        {label}
      </div>
    </div>
  );
}
