import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Calendar, Trophy, Swords, Check, X, Flame, Loader2, Zap, PlayCircle, Shield } from "lucide-react";
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
  leaders: { userId: string; correct: number; total: number }[];
};

// ── Tile shown on the home page (compact) ────────────────────────────────────
// Shows how many of today's 10 matchups still need a pick. Becomes a result
// summary ("3/10 correct") once enough verdicts are in.
export function DailyMatchupHomeTile() {
  const [daily, setDaily] = useState<DailyResponse | null>(null);
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

  let label: string;
  let color = "#ffc800";
  if (resolved.length > 0 && remaining === 0) {
    label = `${wins}/${resolved.length} CORRECT`;
    color = wins >= resolved.length / 2 ? "#22c55e" : "#ff0055";
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
          background: "linear-gradient(90deg, rgba(255,200,0,0.08), rgba(255,107,53,0.04))",
          borderTop: "1px solid rgba(255,200,0,0.18)",
          borderBottom: "1px solid rgba(255,200,0,0.18)",
        }}
      >
        <Calendar className="w-3.5 h-3.5" style={{ color: "#ffc800" }} />
        <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.18em", color: "#ffc800" }}>
          DAILY
        </span>
        <span className="flex-1 truncate" style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", fontWeight: 700 }}>
          {daily.matchups[0]?.title}
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
    <div
      className="fixed inset-0 z-50 flex flex-col"
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
  return (
    <div
      className="flex gap-3 p-3"
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
      </div>
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
          <span
            className="flex items-center gap-0.5 flex-shrink-0"
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
        )}
        {resolved && !picked && (
          <span style={{ fontSize: 8, fontWeight: 900, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em" }}>
            CLOSED
          </span>
        )}
        {!resolved && picked && (
          <span style={{ fontSize: 8, fontWeight: 900, color: "#ffc800", letterSpacing: "0.12em" }}>
            LOCKED
          </span>
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

// ── Page ─────────────────────────────────────────────────────────────────────
export function Daily() {
  const { user, isSignedIn } = useUser();
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
              {daily?.date ?? "—"} · 10 NEW FIGHTS EVERY DAY
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
                  const shortId = isMe ? "YOU" : `${row.userId.slice(-6)}`;
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
      {/* Out-of-points toast — appears when a pick was rejected for budget */}
      {outOfPointsToast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 bottom-6 z-40 px-4 py-3 flex items-center gap-3"
          style={{
            background: "linear-gradient(135deg, rgba(40,8,8,0.96), rgba(20,4,4,0.96))",
            border: "1.5px solid rgba(255,80,80,0.6)",
            maxWidth: "calc(100vw - 24px)",
          }}
        >
          <span style={{ fontSize: 11, color: "white", fontWeight: 700, letterSpacing: "0.05em" }}>
            Out of pick points. Watch an ad to get +1.
          </span>
          <button
            onClick={() => startWatchAd()}
            className="px-3 py-1.5 active:scale-95 transition-all flex items-center gap-1.5"
            style={{
              background: "linear-gradient(135deg, rgba(255,200,0,0.25), rgba(255,200,0,0.1))",
              border: "1px solid rgba(255,200,0,0.7)",
              color: "#ffc800",
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            <PlayCircle className="w-3 h-3" />
            Watch
          </button>
          <button
            onClick={() => setOutOfPointsToast(false)}
            className="opacity-50 hover:opacity-100"
            style={{ color: "white" }}
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
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
