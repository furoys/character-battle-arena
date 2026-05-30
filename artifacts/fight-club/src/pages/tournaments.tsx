import { useMemo, useState } from "react";
import { Trophy, Swords, Loader2, Crown, Shuffle, X, Search, Play, Share2 } from "lucide-react";
import {
  useListCharacters,
  useCreateTournament,
  type Character,
  type Tournament,
  type TournamentMatch,
} from "@workspace/api-client-react";
import { useSimulateFightStream } from "@/hooks/use-simulate-fight-stream";
import { FightScreen } from "@/components/fight-screen";
import { useAgeMode } from "@/hooks/use-age-mode";
import { censorFightResult } from "@/lib/profanity-filter";

type Size = 8 | 16;

// A "watch" target derived from a bracket match — single character per side.
type WatchTarget = {
  a: { id: number; name: string; imageUrl: string | null };
  b: { id: number; name: string; imageUrl: string | null };
};

const SIZE_OPTIONS: Size[] = [8, 16];

function difficultyColor(d: string | null): string {
  if (d === "easy") return "text-emerald-400";
  if (d === "moderate") return "text-amber-400";
  if (d === "hard") return "text-rose-400";
  return "text-muted-foreground";
}

export function Tournaments() {
  const { data: characters, isLoading } = useListCharacters();
  const createTournament = useCreateTournament();
  const { isMinor } = useAgeMode();

  const [size, setSize] = useState<Size>(8);
  const [name, setName] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [universeFilter, setUniverseFilter] = useState<string>("all");
  const [tournament, setTournament] = useState<Tournament | null>(null);

  // Watch flow (reuses the exact streaming fight engine as the Arena).
  const simulateFight = useSimulateFightStream();
  const [watchOpen, setWatchOpen] = useState(false);
  const [watchTarget, setWatchTarget] = useState<WatchTarget | null>(null);

  const censoredResult = useMemo(
    () =>
      simulateFight.data
        ? isMinor
          ? censorFightResult(simulateFight.data)
          : simulateFight.data
        : null,
    [simulateFight.data, isMinor],
  );

  const charById = useMemo(() => {
    const m = new Map<number, Character>();
    (characters ?? []).forEach((c) => m.set(c.id, c));
    return m;
  }, [characters]);

  const universes = useMemo(() => {
    const set = new Set<string>();
    (characters ?? []).forEach((c) => c.universe && set.add(c.universe));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [characters]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (characters ?? []).filter((c) => {
      if (universeFilter !== "all" && c.universe !== universeFilter) return false;
      if (q && !c.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [characters, search, universeFilter]);

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= size) return prev; // bracket full
      return [...prev, id];
    });
  }

  function setSizeAndTrim(next: Size) {
    setSize(next);
    setSelectedIds((prev) => prev.slice(0, next));
  }

  function surpriseFill() {
    const pool = (characters ?? []).filter((c) => !selectedIds.includes(c.id));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    const need = size - selectedIds.length;
    setSelectedIds((prev) => [...prev, ...pool.slice(0, need).map((c) => c.id)]);
  }

  async function runTournament() {
    if (createTournament.isPending) return;
    try {
      const result = await createTournament.mutateAsync({
        data: {
          size,
          name: name.trim() || undefined,
          competitorIds: selectedIds,
        },
      });
      setTournament(result);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      // surfaced via createTournament.isError below
    }
  }

  function resetToSetup() {
    setTournament(null);
    setSelectedIds([]);
    setName("");
    simulateFight.reset();
  }

  function watchMatch(match: TournamentMatch) {
    if (!match.a || !match.b) return;
    const target: WatchTarget = {
      a: { id: match.a.id, name: match.a.name, imageUrl: match.a.imageUrl },
      b: { id: match.b.id, name: match.b.name, imageUrl: match.b.imageUrl },
    };
    setWatchTarget(target);
    setWatchOpen(true);
    simulateFight.mutate({
      data: {
        team1: [target.a.id],
        team2: [target.b.id],
        mode: "cinematic",
        upset: false,
        modifierId: null,
      },
    });
  }

  async function shareResult() {
    if (!tournament) return;
    const text = `🏆 ${tournament.championName} won the ${tournament.name} on A.v.A — Anyone vs Anyone!`;
    try {
      if (navigator.share) {
        await navigator.share({ title: tournament.name, text });
        return;
      }
    } catch {
      // user cancelled or share failed — fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard unavailable — nothing else to do
    }
  }

  // ── RESULT VIEW ────────────────────────────────────────────────────────────
  if (tournament) {
    return (
      <div className="min-h-full bg-background px-3 pt-4 pb-10">
        <div className="mx-auto max-w-5xl">
          <ChampionBanner tournament={tournament} onShare={shareResult} />

          <div className="mt-6 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Bracket
            </h2>
            <button
              onClick={resetToSetup}
              className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-foreground hover:bg-white/5"
            >
              New Tournament
            </button>
          </div>

          <div className="mt-3 flex gap-4 overflow-x-auto pb-4">
            {tournament.bracket.rounds.map((round, ri) => (
              <div key={ri} className="flex min-w-[230px] flex-col gap-3">
                <div className="text-center text-[11px] font-bold uppercase tracking-widest text-primary">
                  {round.name}
                </div>
                <div
                  className="flex flex-1 flex-col justify-around gap-3"
                >
                  {round.matches.map((m) => (
                    <BracketMatchCard key={m.matchId} match={m} onWatch={() => watchMatch(m)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <FightScreen
          open={watchOpen}
          onClose={() => {
            setWatchOpen(false);
            simulateFight.reset();
            setWatchTarget(null);
          }}
          onRematch={() => {
            if (!watchTarget) return;
            simulateFight.mutate({
              data: {
                team1: [watchTarget.a.id],
                team2: [watchTarget.b.id],
                mode: "cinematic",
                upset: false,
                modifierId: null,
              },
            });
          }}
          result={censoredResult}
          isSimulating={simulateFight.isPending && !simulateFight.streaming}
          team1Names={watchTarget ? [watchTarget.a.name] : []}
          team2Names={watchTarget ? [watchTarget.b.name] : []}
          team1Images={watchTarget ? [watchTarget.a.imageUrl] : []}
          team2Images={watchTarget ? [watchTarget.b.imageUrl] : []}
          completedSections={simulateFight.completedSections}
        />
      </div>
    );
  }

  // ── SETUP VIEW ─────────────────────────────────────────────────────────────
  const canRun = selectedIds.length >= 2 && !createTournament.isPending;

  return (
    <div className="min-h-full bg-background px-3 pt-4 pb-28">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-2">
          <Trophy className="h-7 w-7 text-primary" strokeWidth={2.5} />
          <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">
            Tournament
          </h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Seed a bracket of single fighters. The engine runs every round instantly and crowns a champion. Watch any match in full.
        </p>

        {/* Size selector */}
        <div className="mt-5">
          <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Bracket size
          </div>
          <div className="mt-2 flex gap-2">
            {SIZE_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setSizeAndTrim(s)}
                className={`flex-1 rounded-lg border px-4 py-3 text-center font-black uppercase tracking-widest transition-all ${
                  size === s
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-white/15 text-muted-foreground hover:bg-white/5"
                }`}
              >
                {s} Fighters
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div className="mt-4">
          <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Tournament name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="A.v.A Cup"
            maxLength={60}
            className="mt-2 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
          />
        </div>

        {/* Selected summary */}
        <div className="mt-5 flex items-center justify-between gap-2">
          <div className="text-sm font-bold text-foreground">
            <span className="text-primary">{selectedIds.length}</span> / {size} selected
          </div>
          <div className="flex gap-2">
            <button
              onClick={surpriseFill}
              disabled={selectedIds.length >= size}
              className="flex items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-foreground hover:bg-white/5 disabled:opacity-40"
            >
              <Shuffle className="h-3.5 w-3.5" /> Fill
            </button>
            <button
              onClick={() => setSelectedIds([])}
              disabled={selectedIds.length === 0}
              className="flex items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-foreground hover:bg-white/5 disabled:opacity-40"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          </div>
        </div>

        {/* Selected chips */}
        {selectedIds.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedIds.map((id, idx) => {
              const c = charById.get(id);
              if (!c) return null;
              return (
                <button
                  key={id}
                  onClick={() => toggleSelect(id)}
                  className="group flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 py-1 pl-2 pr-2.5 text-xs font-semibold text-foreground"
                >
                  <span className="text-primary/70">#{idx + 1}</span>
                  {c.name}
                  <X className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                </button>
              );
            })}
          </div>
        )}

        {/* Search + filter */}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search fighters…"
              className="w-full rounded-lg border border-white/15 bg-black/40 py-2.5 pl-9 pr-3 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
            />
          </div>
          <select
            value={universeFilter}
            onChange={(e) => setUniverseFilter(e.target.value)}
            className="rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-foreground focus:border-primary focus:outline-none"
          >
            <option value="all">All universes</option>
            {universes.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        {/* Roster grid */}
        <div className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {filtered.slice(0, 120).map((c) => {
                const sel = selectedIds.includes(c.id);
                const full = !sel && selectedIds.length >= size;
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleSelect(c.id)}
                    disabled={full}
                    className={`group relative overflow-hidden rounded-lg border text-left transition-all ${
                      sel
                        ? "border-primary ring-2 ring-primary/50"
                        : "border-white/10 hover:border-white/30"
                    } ${full ? "opacity-40" : ""}`}
                  >
                    <div className="aspect-square w-full bg-gradient-to-b from-white/5 to-black/40">
                      {c.imageUrl ? (
                        <img
                          src={c.imageUrl}
                          alt={c.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <Swords className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    {sel && (
                      <div className="absolute right-1 top-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-black text-primary-foreground">
                        ✓
                      </div>
                    )}
                    <div className="truncate px-1.5 py-1 text-[11px] font-semibold text-foreground">
                      {c.name}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {!isLoading && filtered.length > 120 && (
            <div className="mt-3 text-center text-xs text-muted-foreground">
              Showing first 120 — refine your search to see more.
            </div>
          )}
        </div>
      </div>

      {/* Sticky run bar */}
      <div className="fixed inset-x-0 bottom-[72px] z-40 border-t border-white/10 bg-[#030308]/95 px-3 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          {createTournament.isError && (
            <span className="text-xs font-semibold text-rose-400">
              Could not run tournament — try again.
            </span>
          )}
          <button
            onClick={runTournament}
            disabled={!canRun}
            className="ml-auto flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-black uppercase tracking-widest text-primary-foreground transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {createTournament.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Running…
              </>
            ) : (
              <>
                <Trophy className="h-5 w-5" /> Run Tournament
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChampionBanner({
  tournament,
  onShare,
}: {
  tournament: Tournament;
  onShare: () => void;
}) {
  const champ = useMemo(() => {
    for (const round of tournament.bracket.rounds) {
      for (const m of round.matches) {
        if (m.a?.id === tournament.championId) return m.a;
        if (m.b?.id === tournament.championId) return m.b;
      }
    }
    return null;
  }, [tournament]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-b from-amber-400/15 via-amber-400/5 to-transparent p-5 text-center">
      <div className="flex items-center justify-center gap-2 text-amber-400">
        <Crown className="h-5 w-5" />
        <span className="text-[11px] font-black uppercase tracking-[0.3em]">
          {tournament.name} Champion
        </span>
        <Crown className="h-5 w-5" />
      </div>
      <div className="mt-4 flex flex-col items-center">
        {champ?.imageUrl ? (
          <img
            src={champ.imageUrl}
            alt={tournament.championName}
            className="h-28 w-28 rounded-full border-2 border-amber-400 object-cover shadow-[0_0_40px_rgba(251,191,36,0.5)]"
          />
        ) : (
          <div className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-amber-400 bg-black/40">
            <Trophy className="h-12 w-12 text-amber-400" />
          </div>
        )}
        <h1 className="mt-3 text-3xl font-black uppercase tracking-tight text-foreground">
          {tournament.championName}
        </h1>
        {champ?.universe && (
          <div className="text-xs font-semibold uppercase tracking-widest text-amber-400/80">
            {champ.universe}
          </div>
        )}
      </div>
      <button
        onClick={onShare}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-amber-400/50 bg-amber-400/10 px-5 py-2.5 text-sm font-black uppercase tracking-widest text-amber-300 hover:bg-amber-400/20"
      >
        <Share2 className="h-4 w-4" /> Share
      </button>
    </div>
  );
}

function BracketMatchCard({
  match,
  onWatch,
}: {
  match: TournamentMatch;
  onWatch: () => void;
}) {
  const canWatch = !!match.a && !!match.b;
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 p-2">
      <Competitor
        comp={match.a}
        won={match.winnerSide === 1}
        lost={match.winnerSide === 2}
      />
      <div className="my-1 flex items-center justify-center">
        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
          vs
        </span>
      </div>
      <Competitor
        comp={match.b}
        won={match.winnerSide === 2}
        lost={match.winnerSide === 1}
      />
      <div className="mt-2 flex items-center justify-between gap-1">
        {match.difficulty && (
          <span
            className={`text-[9px] font-bold uppercase tracking-widest ${difficultyColor(match.difficulty)}`}
          >
            {match.fightType ?? match.difficulty}
          </span>
        )}
        {canWatch && (
          <button
            onClick={onWatch}
            className="ml-auto flex items-center gap-1 rounded-md bg-primary/20 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/30"
          >
            <Play className="h-3 w-3" /> Watch
          </button>
        )}
      </div>
    </div>
  );
}

function Competitor({
  comp,
  won,
  lost,
}: {
  comp: TournamentMatch["a"];
  won: boolean;
  lost: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md px-1.5 py-1 ${
        won ? "bg-amber-400/15" : ""
      } ${lost ? "opacity-50" : ""}`}
    >
      <div className="h-7 w-7 flex-shrink-0 overflow-hidden rounded-full border border-white/15 bg-black/40">
        {comp?.imageUrl ? (
          <img src={comp.imageUrl} alt={comp.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Swords className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        )}
      </div>
      <span
        className={`truncate text-xs font-semibold ${won ? "text-amber-300" : "text-foreground"}`}
      >
        {comp?.name ?? "—"}
      </span>
      {won && <Crown className="ml-auto h-3.5 w-3.5 flex-shrink-0 text-amber-400" />}
    </div>
  );
}
