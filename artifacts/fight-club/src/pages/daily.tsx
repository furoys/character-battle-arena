import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Calendar, Trophy, Swords, Check, X, Flame, Loader2 } from "lucide-react";
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

type DailyResponse = { date: string; matchups: DailyMatchup[] };

type MeDailyResponse = {
  totalPicks: number;
  resolvedPicks: number;
  correct: number;
  currentStreak: number;
  longestStreak: number;
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

  async function pick(matchupId: string, side: 1 | 2) {
    if (!isSignedIn || pickingId) return;
    setPickingId(matchupId);
    try {
      await apiFetch("/api/daily/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchupId, side }),
      });
      reload();
    } finally {
      setPickingId(null);
    }
  }

  function watchFight(matchup: DailyMatchup) {
    const team1 = matchup.team1Ids.map((id) => characterMap.get(id)).filter(Boolean) as Character[];
    const team2 = matchup.team2Ids.map((id) => characterMap.get(id)).filter(Boolean) as Character[];
    if (team1.length === 0 || team2.length === 0) return;
    try {
      localStorage.setItem(
        "ava_pending_fight",
        JSON.stringify({ team1, team2, mode: "debate" }),
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
                    {me.currentStreak}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
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
              <div className="grid grid-cols-4 gap-2">
                <Stat label="TODAY" value={pickedCount} />
                <Stat label="WINS NOW" value={`${correctToday}/${resolvedOwn.length}`} />
                <Stat label="ALL-TIME" value={`${me.correct}/${me.resolvedPicks}`} />
                <Stat label="BEST" value={me.longestStreak} />
              </div>
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
                  onPick={pick}
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
