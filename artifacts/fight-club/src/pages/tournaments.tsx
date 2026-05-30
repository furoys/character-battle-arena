import { useEffect, useMemo, useRef, useState } from "react";
import {
  Trophy,
  Swords,
  Loader2,
  Crown,
  Shuffle,
  X,
  Search,
  Play,
  Share2,
  Sparkles,
  History,
  ChevronRight,
} from "lucide-react";
import {
  useListCharacters,
  useListTournaments,
  useGetTournament,
  getGetTournamentQueryKey,
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

type WatchTarget = {
  a: { id: number; name: string; imageUrl: string | null };
  b: { id: number; name: string; imageUrl: string | null };
};

const SIZE_OPTIONS: Size[] = [8, 16];

// Themed quick-fill cups. Each picks fighters at random from a curated set of
// universes. Only cups whose pool has at least 8 fighters are shown.
const THEME_CUPS: { label: string; universes: string[] }[] = [
  { label: "Comic Crossover", universes: ["Multiverse Comics", "Legacy Comics", "Marvel", "DC"] },
  { label: "Marvel vs DC", universes: ["Marvel", "DC"] },
  { label: "Anime Grand Prix", universes: ["Dragon Ball", "Naruto", "One Piece", "Bleach", "Demon Slayer"] },
  { label: "Kombat Kup", universes: ["Mortal Kombat", "Street Fighter", "Boxing"] },
  { label: "Villain Royale", universes: ["Action Villains", "Horror", "The Boys"] },
  { label: "Historical Clash", universes: ["Historical"] },
  { label: "Galaxy Far Away", universes: ["Star Wars"] },
  { label: "Fantasy Realms", universes: ["Harry Potter", "Lord of the Rings", "Game of Thrones", "Mythology"] },
];

function difficultyColor(d: string | null): string {
  if (d === "easy") return "text-emerald-400";
  if (d === "moderate") return "text-amber-400";
  if (d === "hard") return "text-rose-400";
  return "text-muted-foreground";
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

// ── Champion share-card generator (1080×1350 PNG, pure canvas) ────────────────
async function generateChampionShareImage(
  t: Tournament,
  championImageUrl: string | null,
): Promise<Blob | null> {
  const W = 1080;
  const H = 1350;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) return null;

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#1a0008");
  bg.addColorStop(0.5, "#0a0a14");
  bg.addColorStop(1, "#08010a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "#ffc800";
  ctx.lineWidth = 6;
  ctx.strokeRect(36, 36, W - 72, H - 72);
  ctx.strokeStyle = "rgba(255,107,53,0.6)";
  ctx.lineWidth = 2;
  ctx.strokeRect(60, 60, W - 120, H - 120);

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,200,0,0.55)";
  ctx.font = "900 30px Impact, 'Bebas Neue', sans-serif";
  ctx.fillText((t.name || "A.V.A CUP").toUpperCase(), W / 2, 140);

  ctx.fillStyle = "#ffc800";
  ctx.font = "900 120px Impact, 'Bebas Neue', sans-serif";
  ctx.fillText("CHAMPION", W / 2, 260);

  // Champion portrait in a gold ring
  const cx = W / 2;
  const cy = 560;
  const r = 200;
  if (championImageUrl) {
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const im = new Image();
        im.crossOrigin = "anonymous";
        im.onload = () => resolve(im);
        im.onerror = reject;
        im.src = championImageUrl;
      });
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      const ar = img.width / img.height;
      let dw = r * 2;
      let dh = r * 2;
      if (ar > 1) dw = dh * ar;
      else dh = dw / ar;
      ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
      ctx.restore();
    } catch {
      // portrait failed to load — skip it, the ring + name still read fine
    }
  }
  ctx.strokeStyle = "#ffc800";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 96px Impact, 'Bebas Neue', sans-serif";
  ctx.fillText(t.championName.toUpperCase(), W / 2, 880);

  ctx.fillStyle = "rgba(255,107,53,0.95)";
  ctx.font = "900 44px Impact, 'Bebas Neue', sans-serif";
  ctx.fillText(`WON THE ${t.size}-FIGHTER BRACKET`, W / 2, 960);

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "italic 600 30px 'Helvetica Neue', Arial, sans-serif";
  ctx.fillText("Last one standing. Anyone vs Anyone.", W / 2, 1060);

  ctx.fillStyle = "#ffc800";
  ctx.font = "900 60px Impact, 'Bebas Neue', sans-serif";
  ctx.fillText("ANYONE   VS   ANYONE", W / 2, 1210);
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "700 24px 'Helvetica Neue', Arial, sans-serif";
  ctx.fillText("AnyoneVsAnyone.replit.app", W / 2, 1260);

  return await new Promise<Blob | null>((resolve) => c.toBlob((b) => resolve(b), "image/png"));
}

export function Tournaments() {
  const { data: characters, isLoading } = useListCharacters();
  const { data: recent, refetch: refetchRecent } = useListTournaments();
  const createTournament = useCreateTournament();
  const { isMinor } = useAgeMode();

  const [size, setSize] = useState<Size>(8);
  const [name, setName] = useState("");
  const [themeLabel, setThemeLabel] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [universeFilter, setUniverseFilter] = useState<string>("all");
  const [tournament, setTournament] = useState<Tournament | null>(null);

  // Reopen a past tournament from the recent list.
  const [reopenId, setReopenId] = useState<number | null>(null);
  const reopenQuery = useGetTournament(reopenId ?? 0, {
    query: {
      enabled: reopenId != null && reopenId > 0,
      queryKey: getGetTournamentQueryKey(reopenId ?? 0),
    },
  });
  useEffect(() => {
    if (reopenQuery.data) {
      setTournament(reopenQuery.data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [reopenQuery.data]);

  // Round-by-round reveal animation.
  const [revealedRounds, setRevealedRounds] = useState(0);
  const revealTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    revealTimers.current.forEach(clearTimeout);
    revealTimers.current = [];
    if (!tournament) {
      setRevealedRounds(0);
      return;
    }
    const total = tournament.bracket.rounds.length;
    setRevealedRounds(0);
    for (let i = 1; i <= total; i++) {
      revealTimers.current.push(
        setTimeout(() => setRevealedRounds(i), i * 750),
      );
    }
    return () => {
      revealTimers.current.forEach(clearTimeout);
      revealTimers.current = [];
    };
  }, [tournament]);

  const allRevealed =
    !!tournament && revealedRounds >= tournament.bracket.rounds.length;

  function revealAll() {
    if (!tournament) return;
    revealTimers.current.forEach(clearTimeout);
    revealTimers.current = [];
    setRevealedRounds(tournament.bracket.rounds.length);
  }

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

  // A cup is only offered if its pool can fill the CURRENT bracket size fully —
  // otherwise themed quick-fill would top up with off-theme random fighters.
  const availableThemes = useMemo(() => {
    const list = characters ?? [];
    return THEME_CUPS.filter((cup) => {
      const pool = list.filter((c) => cup.universes.includes(c.universe));
      return pool.length >= size;
    });
  }, [characters, size]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (characters ?? []).filter((c) => {
      if (universeFilter !== "all" && c.universe !== universeFilter) return false;
      if (q && !c.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [characters, search, universeFilter]);

  function toggleSelect(id: number) {
    setThemeLabel(null);
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= size) return prev;
      return [...prev, id];
    });
  }

  function setSizeAndTrim(next: Size) {
    setSize(next);
    setSelectedIds((prev) => prev.slice(0, next));
  }

  function surpriseFill() {
    const pool = (characters ?? []).filter((c) => !selectedIds.includes(c.id));
    const need = size - selectedIds.length;
    setSelectedIds((prev) => [...prev, ...shuffle(pool).slice(0, need).map((c) => c.id)]);
  }

  function applyTheme(cup: { label: string; universes: string[] }) {
    const pool = (characters ?? []).filter((c) => cup.universes.includes(c.universe));
    const picked = shuffle(pool).slice(0, size).map((c) => c.id);
    setSelectedIds(picked);
    setThemeLabel(cup.label);
    if (!name.trim()) setName(cup.label);
  }

  async function runTournament() {
    if (createTournament.isPending) return;
    try {
      const result = await createTournament.mutateAsync({
        data: {
          size,
          name: name.trim() || undefined,
          themeLabel: themeLabel ?? undefined,
          competitorIds: selectedIds,
        },
      });
      setReopenId(null);
      setTournament(result);
      void refetchRecent();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      // surfaced via createTournament.isError below
    }
  }

  function resetToSetup() {
    setTournament(null);
    setReopenId(null);
    setSelectedIds([]);
    setName("");
    setThemeLabel(null);
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

  // ── RESULT VIEW ────────────────────────────────────────────────────────────
  if (tournament) {
    const rounds = tournament.bracket.rounds;
    return (
      <div className="min-h-full bg-background px-3 pt-4 pb-10">
        <div className="mx-auto max-w-5xl">
          {allRevealed ? (
            <ChampionBanner tournament={tournament} champion={charById.get(tournament.championId) ?? null} />
          ) : (
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-black/30 py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Running the bracket…
              </span>
              <button
                onClick={revealAll}
                className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-foreground hover:bg-white/5"
              >
                Skip
              </button>
            </div>
          )}

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
            {rounds.map((round, ri) => {
              const shown = ri < revealedRounds;
              return (
                <div key={ri} className="flex min-w-[230px] flex-col gap-3">
                  <div className="text-center text-[11px] font-bold uppercase tracking-widest text-primary">
                    {round.name}
                  </div>
                  <div
                    className={`flex flex-1 flex-col justify-around gap-3 transition-all duration-500 ${
                      shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"
                    }`}
                  >
                    {round.matches.map((m) => (
                      <BracketMatchCard key={m.matchId} match={m} onWatch={() => watchMatch(m)} />
                    ))}
                  </div>
                </div>
              );
            })}
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

        {/* Recent tournaments */}
        {recent && recent.length > 0 && (
          <div className="mt-5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              <History className="h-3.5 w-3.5" /> Recent
            </div>
            {reopenQuery.isFetching && (
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Opening…
              </div>
            )}
            {reopenQuery.isError && (
              <div className="mt-1 text-[11px] font-semibold text-rose-400">
                Could not open that tournament — try again.
              </div>
            )}
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {recent.slice(0, 12).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setReopenId(t.id)}
                  className="flex min-w-[180px] items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-left hover:border-white/30"
                >
                  <Trophy className="h-4 w-4 flex-shrink-0 text-amber-400" />
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold text-foreground">{t.name}</div>
                    <div className="truncate text-[10px] text-muted-foreground">
                      🏆 {t.championName} · {t.size}
                    </div>
                  </div>
                  <ChevronRight className="ml-auto h-4 w-4 flex-shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}

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

        {/* Themed quick-fill */}
        {availableThemes.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" /> Themed quick-fill
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {availableThemes.map((cup) => (
                <button
                  key={cup.label}
                  onClick={() => applyTheme(cup)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
                    themeLabel === cup.label
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-white/15 text-foreground hover:bg-white/5"
                  }`}
                >
                  {cup.label}
                </button>
              ))}
            </div>
          </div>
        )}

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
              onClick={() => {
                setSelectedIds([]);
                setThemeLabel(null);
              }}
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
  champion,
}: {
  tournament: Tournament;
  champion: Character | null;
}) {
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  // Tale of the tape — derived purely from the persisted bracket.
  const tale = useMemo(() => {
    const beats: string[] = [];
    let toughest: { name: string; difficulty: string } | null = null;
    for (const round of tournament.bracket.rounds) {
      for (const m of round.matches) {
        if (m.winnerId !== tournament.championId) continue;
        const loser = m.winnerSide === 1 ? m.b : m.a;
        if (loser) beats.push(loser.name);
        const diffRank = (d: string | null) =>
          d === "hard" ? 3 : d === "moderate" ? 2 : d === "easy" ? 1 : 0;
        if (loser && (!toughest || diffRank(m.difficulty) > diffRank(toughest.difficulty))) {
          toughest = { name: loser.name, difficulty: m.difficulty ?? "—" };
        }
      }
    }
    return { wins: beats.length, beats, toughest };
  }, [tournament]);

  const championPortrait = champion?.imageUrl ?? null;

  async function share() {
    setSharing(true);
    setShareError(null);
    try {
      const blob = await generateChampionShareImage(tournament, championPortrait);
      if (!blob) throw new Error("image-failed");
      const file = new File([blob], `ava-champion-${tournament.id}.png`, { type: "image/png" });
      const text = `🏆 ${tournament.championName} won the ${tournament.name} on A.v.A — Anyone vs Anyone!`;
      const shareData: ShareData = {
        title: tournament.name,
        text,
        url: "https://AnyoneVsAnyone.replit.app",
        files: [file],
      };
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare && nav.canShare(shareData) && nav.share) {
        await nav.share(shareData);
        return;
      }
      if (nav.share) {
        await nav.share({ title: shareData.title, text, url: shareData.url });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ava-champion-${tournament.id}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      const err = e as { name?: string };
      if (err?.name !== "AbortError") setShareError("Share failed. Try again.");
    } finally {
      setSharing(false);
    }
  }

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
        {championPortrait ? (
          <img
            src={championPortrait}
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
        {champion?.universe && (
          <div className="text-xs font-semibold uppercase tracking-widest text-amber-400/80">
            {champion.universe}
          </div>
        )}
      </div>

      {/* Tale of the tape */}
      <div className="mx-auto mt-4 max-w-md rounded-xl border border-amber-400/20 bg-black/30 p-3 text-left">
        <div className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-amber-400/80">
          Tale of the Tape
        </div>
        <div className="mt-2 flex items-center justify-center gap-4 text-center">
          <div>
            <div className="text-2xl font-black text-amber-300">{tale.wins}–0</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Undefeated</div>
          </div>
          {tale.toughest && (
            <div className="border-l border-white/10 pl-4">
              <div className="text-sm font-bold text-foreground">{tale.toughest.name}</div>
              <div className={`text-[10px] uppercase tracking-widest ${difficultyColor(tale.toughest.difficulty)}`}>
                Toughest fight
              </div>
            </div>
          )}
        </div>
        {tale.beats.length > 0 && (
          <div className="mt-2 text-center text-[11px] text-muted-foreground">
            Beat {tale.beats.join(" → ")}
          </div>
        )}
      </div>

      <button
        onClick={share}
        disabled={sharing}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-amber-400/50 bg-amber-400/10 px-5 py-2.5 text-sm font-black uppercase tracking-widest text-amber-300 hover:bg-amber-400/20 disabled:opacity-50"
      >
        {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
        Share
      </button>
      {shareError && <div className="mt-2 text-xs text-rose-400">{shareError}</div>}
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
      {match.blurb && (
        <p className="mt-1.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
          {match.blurb}
        </p>
      )}
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
