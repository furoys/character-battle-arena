import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Calendar, Trophy, Swords, Check, X, Flame, Loader2 } from "lucide-react";
import { useUser, SignInButton } from "@clerk/react";
import { useListCharacters, Character } from "@workspace/api-client-react";
import { apiFetch } from "@/lib/api-fetch";

type DailyResponse = {
  date: string;
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

type MeDailyResponse = {
  totalPicks: number;
  resolvedPicks: number;
  correct: number;
  currentStreak: number;
  longestStreak: number;
  recent: { date: string; pickedSide: number; winnerSide: number | null }[];
};

type LeaderboardResponse = {
  leaders: { userId: string; correct: number; total: number }[];
};

// ── Tile shown on the home page (compact) ────────────────────────────────────
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

  if (!daily) return null;
  const resolved = daily.winnerSide !== null;
  const userPicked = daily.userPick !== null;
  const userCorrect = resolved && userPicked && daily.userPick === daily.winnerSide;

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
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.18em", color: "#ffc800" }}>
              DAILY
            </span>
            <span className="truncate" style={{ fontSize: 10, color: "rgba(255,255,255,0.65)", fontWeight: 700 }}>
              {daily.title}
            </span>
          </div>
        </div>
        {userPicked ? (
          resolved ? (
            <span
              className="flex items-center gap-0.5"
              style={{ fontSize: 9, fontWeight: 800, color: userCorrect ? "#22c55e" : "#ff0055" }}
            >
              {userCorrect ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
              {userCorrect ? "WON" : "LOST"}
            </span>
          ) : (
            <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.5)" }}>
              LOCKED
            </span>
          )
        ) : (
          <span style={{ fontSize: 9, fontWeight: 900, color: "#ffc800", letterSpacing: "0.1em" }}>
            PICK NOW →
          </span>
        )}
      </div>
    </Link>
  );
}

// ── Fighter portrait stack ───────────────────────────────────────────────────
function TeamSide({
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
    <div className="flex flex-col items-center gap-2 flex-1">
      <div className="flex gap-1 flex-wrap justify-center">
        {characters.map((c, i) => (
          <div
            key={i}
            className="relative overflow-hidden"
            style={{
              width: 60,
              height: 76,
              border: `2px solid ${accent}${isWinner ? "" : picked ? "" : "60"}`,
              boxShadow: picked ? `0 0 18px ${accent}50` : `0 0 8px ${color}20`,
              opacity: isLoser ? 0.5 : 1,
            }}
          >
            {c?.imageUrl ? (
              <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover object-top" />
            ) : (
              <div className="w-full h-full" style={{ background: `${color}15` }} />
            )}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 55%)" }} />
            <div className="absolute bottom-1 left-0 right-0 text-center">
              <span style={{ fontSize: 7, fontWeight: 900, color: "white", letterSpacing: "0.05em" }}>
                {c?.name?.split(" ").slice(0, 2).join(" ") ?? "?"}
              </span>
            </div>
          </div>
        ))}
      </div>
      {picked && (
        <span style={{ fontSize: 8, fontWeight: 900, color: accent, letterSpacing: "0.15em" }}>
          YOUR PICK
        </span>
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
  const [picking, setPicking] = useState(false);
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

  async function pick(side: 1 | 2) {
    if (!isSignedIn || picking || daily?.userPick) return;
    setPicking(true);
    try {
      await apiFetch("/api/daily/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ side }),
      });
      reload();
    } finally {
      setPicking(false);
    }
  }

  function watchFight() {
    if (!daily) return;
    const team1 = daily.team1Ids.map((id) => characterMap.get(id)).filter(Boolean) as Character[];
    const team2 = daily.team2Ids.map((id) => characterMap.get(id)).filter(Boolean) as Character[];
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

  const t1 = daily?.team1Ids.map((id) => characterMap.get(id)) ?? [];
  const t2 = daily?.team2Ids.map((id) => characterMap.get(id)) ?? [];
  const totalVotes = (daily?.team1Count ?? 0) + (daily?.team2Count ?? 0);
  const t1Pct = totalVotes ? Math.round(((daily?.team1Count ?? 0) / totalVotes) * 100) : 50;
  const t2Pct = 100 - t1Pct;
  const resolved = daily?.winnerSide !== null && daily?.winnerSide !== undefined;
  const userCorrect = resolved && daily?.userPick === daily?.winnerSide;

  return (
    <div className="flex flex-col min-h-full" style={{ background: "#0a0a0f" }}>
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-display text-2xl uppercase tracking-[0.2em]" style={{ color: "#ffc800", lineHeight: 1 }}>
              Daily Matchup
            </h1>
            <p className="mt-1" style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>
              {daily?.date ?? "—"} · NEW FIGHT EVERY DAY
            </p>
          </div>
          {me && (
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em", fontWeight: 800 }}>
                  STREAK
                </div>
                <div className="flex items-center gap-1 justify-end">
                  <Flame className="w-3 h-3" style={{ color: "#ff6b35" }} />
                  <span className="font-display" style={{ fontSize: 18, color: "#ffc800", lineHeight: 1, fontWeight: 900 }}>
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

      <div className="flex-1 overflow-y-auto p-4">
        {tab === "matchup" && daily && (
          <div className="flex flex-col gap-4 max-w-2xl mx-auto">
            {/* Title card */}
            <div className="text-center">
              <h2 className="font-display uppercase" style={{ fontSize: 18, color: "white", letterSpacing: "0.1em", lineHeight: 1.2 }}>
                {daily.title}
              </h2>
              <p className="mt-2" style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.4, fontStyle: "italic" }}>
                {daily.hook}
              </p>
            </div>

            {/* Matchup */}
            <div
              className="flex items-center gap-3 py-4 px-3"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,200,0,0.15)",
              }}
            >
              <TeamSide
                characters={t1}
                side="left"
                picked={daily.userPick === 1}
                isWinner={resolved && daily.winnerSide === 1}
                isLoser={resolved && daily.winnerSide === 2}
              />
              <div className="font-display font-black italic" style={{ fontSize: 24, color: "rgba(255,255,255,0.2)" }}>
                VS
              </div>
              <TeamSide
                characters={t2}
                side="right"
                picked={daily.userPick === 2}
                isWinner={resolved && daily.winnerSide === 2}
                isLoser={resolved && daily.winnerSide === 1}
              />
            </div>

            {/* Pick / result */}
            {!isSignedIn ? (
              <div className="text-center py-4">
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>
                  Sign in to lock in your daily pick.
                </p>
                <SignInButton mode="modal">
                  <button
                    className="px-6 py-2.5 font-display uppercase tracking-widest active:scale-95 transition-all"
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
            ) : daily.userPick === null && resolved ? (
              <div
                className="text-center py-4 px-3"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <div className="font-display uppercase" style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", fontWeight: 900, letterSpacing: "0.18em" }}>
                  Picks Closed
                </div>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                  The verdict is already in for today. Come back tomorrow.
                </p>
              </div>
            ) : daily.userPick === null ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  disabled={picking}
                  onClick={() => pick(1)}
                  className="py-4 active:scale-95 transition-all flex flex-col items-center gap-1"
                  style={{
                    background: "linear-gradient(135deg, rgba(0,240,255,0.18), rgba(0,240,255,0.05))",
                    border: "1.5px solid rgba(0,240,255,0.5)",
                    color: "#00f0ff",
                    fontFamily: "var(--font-display, inherit)",
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: "0.2em",
                  }}
                >
                  {picking ? <Loader2 className="w-4 h-4 animate-spin" /> : "PICK TEAM 1"}
                </button>
                <button
                  disabled={picking}
                  onClick={() => pick(2)}
                  className="py-4 active:scale-95 transition-all flex flex-col items-center gap-1"
                  style={{
                    background: "linear-gradient(135deg, rgba(255,59,48,0.18), rgba(255,59,48,0.05))",
                    border: "1.5px solid rgba(255,59,48,0.5)",
                    color: "#ff3b30",
                    fontFamily: "var(--font-display, inherit)",
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: "0.2em",
                  }}
                >
                  {picking ? <Loader2 className="w-4 h-4 animate-spin" /> : "PICK TEAM 2"}
                </button>
              </div>
            ) : (
              <div
                className="text-center py-4 px-3"
                style={{
                  background: resolved
                    ? userCorrect
                      ? "rgba(34,197,94,0.1)"
                      : "rgba(255,0,85,0.1)"
                    : "rgba(255,200,0,0.06)",
                  border: `1.5px solid ${
                    resolved ? (userCorrect ? "rgba(34,197,94,0.5)" : "rgba(255,0,85,0.5)") : "rgba(255,200,0,0.3)"
                  }`,
                }}
              >
                {resolved ? (
                  <>
                    <div
                      className="font-display uppercase"
                      style={{
                        fontSize: 18,
                        fontWeight: 900,
                        letterSpacing: "0.2em",
                        color: userCorrect ? "#22c55e" : "#ff0055",
                      }}
                    >
                      {userCorrect ? "✓ You called it" : "✗ Wrong pick"}
                    </div>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 4, letterSpacing: "0.08em" }}>
                      Come back tomorrow for a new matchup.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="font-display uppercase" style={{ fontSize: 14, color: "#ffc800", fontWeight: 900, letterSpacing: "0.18em" }}>
                      Pick Locked
                    </div>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
                      Run the fight to reveal the verdict.
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Community split */}
            {totalVotes > 0 && (
              <div>
                <div className="flex justify-between mb-1.5" style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: "0.15em", fontWeight: 800 }}>
                  <span>TEAM 1 · {t1Pct}%</span>
                  <span>{totalVotes} VOTES</span>
                  <span>{t2Pct}% · TEAM 2</span>
                </div>
                <div className="h-2 overflow-hidden flex" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div style={{ width: `${t1Pct}%`, background: "#00f0ff" }} />
                  <div style={{ width: `${t2Pct}%`, background: "#ff3b30" }} />
                </div>
              </div>
            )}

            {/* Watch fight */}
            {daily.userPick !== null && !resolved && (
              <button
                onClick={watchFight}
                className="w-full py-3 flex items-center justify-center gap-2 active:scale-95 transition-all"
                style={{
                  background: "linear-gradient(135deg, rgba(255,0,85,0.2), rgba(255,0,85,0.08))",
                  border: "1.5px solid rgba(255,0,85,0.5)",
                  color: "#ff0055",
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: "0.2em",
                }}
              >
                <Swords className="w-4 h-4" />
                RUN THE FIGHT
              </button>
            )}

            {/* User stats */}
            {me && me.totalPicks > 0 && (
              <div className="grid grid-cols-3 gap-2 pt-2">
                <Stat label="PICKED" value={me.totalPicks} />
                <Stat label="CORRECT" value={`${me.correct}/${me.resolvedPicks}`} />
                <Stat label="BEST STREAK" value={me.longestStreak} />
              </div>
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
      <div className="font-display" style={{ fontSize: 18, color: "#ffc800", fontWeight: 900, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", marginTop: 4, letterSpacing: "0.15em", fontWeight: 800 }}>
        {label}
      </div>
    </div>
  );
}
