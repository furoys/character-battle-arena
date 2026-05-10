import { useState, useMemo } from "react";
import {
  useListFights,
  useClearFightHistory,
  useDeleteFight,
  useGetFight,
  getListFightsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Trophy, Trash2, X, TrendingUp, Swords, Star, BookOpen, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAgeMode } from "@/hooks/use-age-mode";
import { censorFightResult } from "@/lib/profanity-filter";
import { ModifierBadge } from "@/components/modifier-badge";

// ─── Compute character leaderboard from fight history ───────────────────────
function buildLeaderboard(fights: Array<{
  winner: number;
  team1Names: string[];
  team2Names: string[];
}>): Array<{ name: string; wins: number; losses: number }> {
  const wins: Record<string, number> = {};
  const losses: Record<string, number> = {};

  for (const f of fights) {
    const winNames = Array.isArray(f.winner === 1 ? f.team1Names : f.team2Names) ? (f.winner === 1 ? f.team1Names : f.team2Names) : [];
    const loseNames = Array.isArray(f.winner === 1 ? f.team2Names : f.team1Names) ? (f.winner === 1 ? f.team2Names : f.team1Names) : [];
    for (const n of winNames) { wins[n] = (wins[n] ?? 0) + 1; }
    for (const n of loseNames) { losses[n] = (losses[n] ?? 0) + 1; }
  }

  const allNames = new Set([...Object.keys(wins), ...Object.keys(losses)]);
  return [...allNames]
    .map(name => ({ name, wins: wins[name] ?? 0, losses: losses[name] ?? 0 }))
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses)
    .slice(0, 6);
}

// ─── Detect current win streak for a team (most recent consecutive wins) ────
function detectStreaks(fights: Array<{ winner: number }>): { t1: number; t2: number } {
  let t1 = 0, t2 = 0;
  for (const f of fights) {
    if (f.winner === 1) { t1++; t2 = 0; }
    else { t2++; t1 = 0; }
  }
  return { t1, t2 };
}

// ─── Re-read panel — fetches full fight and shows round narratives ────────────
function RereadPanel({ fightId, winner }: { fightId: number; winner: number }) {
  const { data: raw, isLoading } = useGetFight(fightId);
  const { isMinor } = useAgeMode();
  const data = isMinor && raw ? censorFightResult(raw) : raw;
  const winColor = winner === 1 ? "#00f0ff" : "#ff3b30";

  if (isLoading) {
    return (
      <div className="px-3 py-4 text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest animate-pulse" style={{ color: "rgba(255,255,255,0.3)" }}>
          Loading narrative...
        </p>
      </div>
    );
  }
  if (!data) return null;

  const arenaIntro = data.arenaIntro?.trim();
  const intro = data.intro?.trim();
  const rounds = Array.isArray(data.rounds) ? data.rounds : [];

  return (
    <div
      className="mt-2 rounded overflow-hidden"
      style={{ border: `1px solid ${winColor}20`, background: "rgba(0,0,0,0.4)" }}
    >
      {(arenaIntro || intro) && (
        <div className="px-3 py-2.5" style={{ borderBottom: `1px solid ${winColor}15` }}>
          {arenaIntro && (
            <p className="text-[10px] leading-relaxed italic mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
              {arenaIntro}
            </p>
          )}
          {intro && (
            <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
              {intro}
            </p>
          )}
        </div>
      )}

      <div className="divide-y" style={{ borderColor: `${winColor}10` }}>
        {rounds.map((r, i) => (
          <div key={i} className="px-3 py-2.5">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[8px] font-bold uppercase tracking-widest flex-shrink-0"
                style={{ color: winColor, opacity: 0.7 }}
              >
                Round {r.round}
              </span>
              <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.2)" }}>
                {r.attacker} → {r.defender}
              </span>
            </div>
            <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
              {r.narrative}
            </p>
          </div>
        ))}
      </div>

      {data.summary && (
        <div className="px-3 py-2.5" style={{ borderTop: `1px solid ${winColor}15` }}>
          <p className="text-[10px] leading-relaxed italic" style={{ color: "rgba(255,255,255,0.5)" }}>
            {data.summary}
          </p>
        </div>
      )}
    </div>
  );
}

export function Fights() {
  const { data: fights, isLoading } = useListFights();
  const clearHistory = useClearFightHistory();
  const deleteFight  = useDeleteFight();
  const queryClient  = useQueryClient();
  const { toast }    = useToast();
  const [confirmClear, setConfirmClear] = useState(false);
  const [tab, setTab] = useState<"history" | "stats">("history");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const stats = useMemo(() => {
    if (!fights || fights.length === 0) return null;
    const t1Wins = fights.filter(f => f.winner === 1).length;
    const t2Wins = fights.filter(f => f.winner === 2).length;
    const leaderboard = buildLeaderboard(fights);
    const streaks = detectStreaks([...fights].reverse());
    const usageCounts: Record<string, number> = {};
    for (const f of fights) {
      for (const n of [...f.team1Names, ...f.team2Names]) {
        usageCounts[n] = (usageCounts[n] ?? 0) + 1;
      }
    }
    const mostUsed = Object.entries(usageCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    return { t1Wins, t2Wins, total: fights.length, leaderboard, streaks, mostUsed };
  }, [fights]);

  const handleClearAll = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    try {
      await clearHistory.mutateAsync();
      queryClient.invalidateQueries({ queryKey: getListFightsQueryKey() });
      toast({ title: "History Cleared", description: "All fight records have been removed." });
    } catch {
      toast({ title: "Error", description: "Failed to clear history.", variant: "destructive" });
    }
    setConfirmClear(false);
  };

  const handleDeleteOne = async (id: number) => {
    try {
      await deleteFight.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListFightsQueryKey() });
      if (expandedId === id) setExpandedId(null);
    } catch {
      toast({ title: "Error", description: "Failed to remove fight.", variant: "destructive" });
    }
  };

  const toggleReread = (id: number) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div
        className="px-4 pt-3 pb-0 flex-shrink-0"
        style={{ background: "linear-gradient(180deg, #000 0%, #080810 100%)", borderBottom: "1px solid rgba(255,0,85,0.15)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-display text-xl uppercase tracking-widest text-primary">History</h1>
          <div className="flex items-center gap-2">
            {fights && fights.length > 0 && (
              <button
                onClick={handleClearAll}
                disabled={clearHistory.isPending}
                className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-1 border transition-all"
                style={{
                  borderColor: confirmClear ? "#ff3b3060" : "rgba(255,255,255,0.1)",
                  color: confirmClear ? "#ff3b30" : "rgba(255,255,255,0.3)",
                  background: confirmClear ? "rgba(255,59,48,0.07)" : "transparent",
                }}
              >
                <Trash2 className="h-2.5 w-2.5" />
                {confirmClear ? "Confirm?" : "Clear"}
              </button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        {stats && (
          <div className="flex gap-0">
            {(["history", "stats"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 py-2 text-[10px] font-bold uppercase tracking-widest transition-all"
                style={{
                  color: tab === t ? "#ff0055" : "rgba(255,255,255,0.3)",
                  borderBottom: tab === t ? "2px solid #ff0055" : "2px solid transparent",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-16">
            <p className="font-display text-2xl uppercase animate-pulse text-muted-foreground">Loading...</p>
          </div>
        ) : !fights?.length ? (
          <div className="flex flex-col items-center justify-center p-16 gap-4 text-center">
            <Trophy className="h-16 w-16 text-muted-foreground/30" />
            <p className="font-display text-xl text-muted-foreground uppercase">No fights yet.</p>
            <p className="text-sm text-muted-foreground">Go to the Arena and start a match.</p>
          </div>
        ) : tab === "stats" && stats ? (
          <div className="p-4 space-y-4">

            {/* Win split */}
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40 mb-2">
                {stats.total} fights total
              </p>
              <div className="flex gap-2">
                {([1, 2] as const).map(team => {
                  const wins = team === 1 ? stats.t1Wins : stats.t2Wins;
                  const pct = Math.round((wins / stats.total) * 100);
                  const color = team === 1 ? "#00f0ff" : "#ff3b30";
                  const streak = team === 1 ? stats.streaks.t1 : stats.streaks.t2;
                  return (
                    <div
                      key={team}
                      className="flex-1 p-3"
                      style={{ background: `${color}08`, border: `1px solid ${color}25` }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-display text-xs uppercase tracking-widest" style={{ color }}>
                          Team {team}
                        </span>
                        {streak >= 2 && (
                          <span
                            className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5"
                            style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
                          >
                            🔥 {streak}-WIN STREAK
                          </span>
                        )}
                      </div>
                      <div className="font-display text-3xl" style={{ color }}>{wins}</div>
                      <div className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                        {pct}% win rate
                      </div>
                      <div className="mt-2 h-0.5 w-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Character leaderboard */}
            {stats.leaderboard.length > 0 && (
              <div>
                <p
                  className="text-[9px] font-bold uppercase tracking-[0.3em] mb-3 flex items-center gap-2"
                  style={{ color: "rgba(255,255,255,0.28)" }}
                >
                  <Star className="h-3 w-3" style={{ color: "#ffd700" }} />
                  Character Leaderboard
                </p>
                <div className="space-y-1.5">
                  {(Array.isArray(stats.leaderboard) ? stats.leaderboard : []).map((c, i) => {
                    const total = c.wins + c.losses;
                    const winPct = total > 0 ? Math.round((c.wins / total) * 100) : 0;
                    const medalColor = i === 0 ? "#ffd700" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "rgba(255,255,255,0.2)";
                    return (
                      <div
                        key={c.name}
                        className="flex items-center gap-3 px-3 py-2"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                      >
                        <span
                          className="font-display text-sm flex-shrink-0 w-5 text-center"
                          style={{ color: medalColor }}
                        >
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate" style={{ color: "rgba(255,255,255,0.85)" }}>
                            {c.name}
                          </p>
                          <div className="mt-1 h-0.5" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <div
                              className="h-full transition-all duration-700"
                              style={{ width: `${winPct}%`, background: `linear-gradient(to right, ${medalColor}80, ${medalColor})` }}
                            />
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <span className="text-[10px] font-bold" style={{ color: "#34d399" }}>{c.wins}W</span>
                          <span className="text-[9px] mx-1" style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
                          <span className="text-[10px] font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>{c.losses}L</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Most active fighters */}
            <div>
              <p
                className="text-[9px] font-bold uppercase tracking-[0.3em] mb-2 flex items-center gap-2"
                style={{ color: "rgba(255,255,255,0.28)" }}
              >
                <TrendingUp className="h-3 w-3" />
                Most used fighters
              </p>
              <div className="flex flex-wrap gap-1">
                {(Array.isArray(stats.mostUsed) ? stats.mostUsed : []).map(([name, count]) => (
                  <div
                    key={name}
                    className="flex items-center gap-1 px-2 py-1"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.6)" }}>{name}</span>
                    <span className="text-[8px] font-bold" style={{ color: "#ff0055" }}>{count}×</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* History list */
          <div className="flex flex-col divide-y divide-border/20">
            {(Array.isArray(fights) ? fights : []).map((fight) => {
              const winColor = fight.winner === 1 ? "#00f0ff" : "#ff3b30";
              const rawWin = fight.winner === 1 ? fight.team1Names : fight.team2Names;
              const winNames = Array.isArray(rawWin) ? rawWin : [];
              const t1Names = Array.isArray(fight.team1Names) ? fight.team1Names : [];
              const t2Names = Array.isArray(fight.team2Names) ? fight.team2Names : [];
              const isExpanded = expandedId === fight.id;
              return (
                <div key={fight.id} className="relative px-4 py-3 flex flex-col gap-2 group">
                  <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: winColor }} />

                  {/* Header */}
                  <div className="flex items-center justify-between pl-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">#{fight.id}</span>
                      <div
                        className="flex items-center gap-1 px-1.5 py-0.5"
                        style={{ background: `${winColor}15`, border: `1px solid ${winColor}30` }}
                      >
                        <Trophy className="h-2.5 w-2.5" style={{ color: winColor }} />
                        <span className="text-[8px] font-bold uppercase tracking-wide" style={{ color: winColor }}>
                          Team {fight.winner}
                        </span>
                      </div>
                      {/* Chaos modifier marker — shows the rules that were in
                          effect for this match in the history list. */}
                      <ModifierBadge modifierId={fight.modifierId} size="sm" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-muted-foreground/50">
                        {format(new Date(fight.simulatedAt), "MMM d · HH:mm")}
                      </span>
                      <button
                        onClick={() => handleDeleteOne(fight.id)}
                        disabled={deleteFight.isPending}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-destructive"
                        style={{ color: "rgba(255,255,255,0.2)" }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Teams */}
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center pl-2">
                    <div className={fight.winner === 1 ? "opacity-100" : "opacity-35"}>
                      <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "#00f0ff80" }}>T1</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">{t1Names.join(", ")}</p>
                    </div>
                    <div>
                      <Swords className="h-3 w-3" style={{ color: "rgba(255,0,85,0.4)" }} />
                    </div>
                    <div className={`text-right ${fight.winner === 2 ? "opacity-100" : "opacity-35"}`}>
                      <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "#ff3b3080" }}>T2</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">{t2Names.join(", ")}</p>
                    </div>
                  </div>

                  {/* Winner highlight + summary */}
                  <div className="pl-2">
                    <p className="text-[9px] font-bold mb-1" style={{ color: winColor }}>
                      {winNames.slice(0, 2).join(" & ")} won
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 leading-relaxed line-clamp-2">{fight.summary}</p>
                  </div>

                  {/* Re-read button */}
                  <div className="pl-2">
                    <button
                      onClick={() => toggleReread(fight.id)}
                      className="flex items-center gap-1.5 transition-all"
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        color: isExpanded ? winColor : "rgba(255,255,255,0.25)",
                      }}
                    >
                      <BookOpen className="h-2.5 w-2.5" />
                      {isExpanded ? "Close" : "Re-read"}
                      <ChevronDown
                        className="h-2.5 w-2.5 transition-transform"
                        style={{ transform: isExpanded ? "rotate(180deg)" : "none" }}
                      />
                    </button>
                    {isExpanded && <RereadPanel fightId={fight.id} winner={fight.winner} />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
