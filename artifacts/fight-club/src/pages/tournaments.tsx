import { useEffect, useMemo, useRef, useState } from "react";
import {
  Trophy,
  Swords,
  Loader2,
  Crown,
  Search,
  Play,
  Share2,
  History,
  ChevronRight,
  Cpu,
  User,
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

// Developer Legends (Chris, Troy, Tim, Cory) have max stats and are barred from tournaments.
const EXCLUDED_UNIVERSE = "Developer Legends";

type Owner = "user" | "cpu";
type Pick = { id: number; owner: Owner };

function difficultyColor(d: string | null): string {
  if (d === "easy") return "text-emerald-400";
  if (d === "moderate") return "text-amber-400";
  if (d === "hard") return "text-rose-400";
  return "text-muted-foreground";
}

// Snake draft order. Built so every ADJACENT pair is one "user" + one "cpu",
// which means the bracket's round-1 matches (which pair seeds 0-1, 2-3, …) are
// always YOU vs CPU. The human always gets the very first pick.
function buildDraftOrder(size: number): Owner[] {
  const order: Owner[] = [];
  let first: Owner = "user";
  for (let i = 0; i < size; i += 2) {
    order.push(first);
    order.push(first === "user" ? "cpu" : "user");
    first = first === "user" ? "cpu" : "user";
  }
  return order;
}

function num(n: number | null | undefined): number {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

// Rough power ranking used only to drive the CPU's draft choices.
function powerScore(c: Character): number {
  return (
    num(c.strength) + num(c.speed) + num(c.intelligence) + num(c.durability)
  );
}

// CPU drafts strong but not perfectly — picks randomly from the top few
// available fighters so the same draft doesn't repeat every time.
function cpuChoose(available: Character[]): Character | null {
  if (available.length === 0) return null;
  const ranked = [...available].sort((a, b) => powerScore(b) - powerScore(a));
  const topN = ranked.slice(0, Math.min(5, ranked.length));
  return topN[Math.floor(Math.random() * topN.length)] ?? ranked[0]!;
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
  const [search, setSearch] = useState("");
  const [universeFilter, setUniverseFilter] = useState<string>("all");
  const [tournament, setTournament] = useState<Tournament | null>(null);

  // ── Draft state ────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<"config" | "drafting">("config");
  const [picks, setPicks] = useState<Pick[]>([]);
  const [cpuThinking, setCpuThinking] = useState(false);
  const draftSubmittedRef = useRef(false);

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

  // Developer Legends (Chris, Troy, Tim, Cory) have max stats and would trivially
  // win any bracket, so they're barred from tournaments. charById above still
  // includes them so old cups that contain them render correctly.
  const draftable = useMemo(
    () => (characters ?? []).filter((c) => c.universe !== EXCLUDED_UNIVERSE),
    [characters],
  );

  const universes = useMemo(() => {
    const set = new Set<string>();
    draftable.forEach((c) => c.universe && set.add(c.universe));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [draftable]);

  // ── Draft derivations ──────────────────────────────────────────────────────
  const draftOrder = useMemo(() => buildDraftOrder(size), [size]);
  const pickedIds = useMemo(() => new Set(picks.map((p) => p.id)), [picks]);
  const draftComplete = picks.length === size;
  const currentOwner: Owner | null = draftComplete ? null : draftOrder[picks.length] ?? null;
  const userPicks = useMemo(() => picks.filter((p) => p.owner === "user"), [picks]);
  const cpuPicks = useMemo(() => picks.filter((p) => p.owner === "cpu"), [picks]);

  // Roster available to draft from: not yet picked, plus search/universe filter.
  const availableFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return draftable.filter((c) => {
      if (pickedIds.has(c.id)) return false;
      if (universeFilter !== "all" && c.universe !== universeFilter) return false;
      if (q && !c.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [draftable, search, universeFilter, pickedIds]);

  function startDraft() {
    setPicks([]);
    setCpuThinking(false);
    draftSubmittedRef.current = false;
    setSearch("");
    setUniverseFilter("all");
    setPhase("drafting");
  }

  function userPick(id: number) {
    if (phase !== "drafting" || currentOwner !== "user" || cpuThinking) return;
    if (pickedIds.has(id) || picks.length >= size) return;
    setPicks((prev) => [...prev, { id, owner: "user" }]);
  }

  // CPU takes its turn (handles consecutive CPU picks in the snake order).
  useEffect(() => {
    if (phase !== "drafting" || currentOwner !== "cpu" || draftComplete) return;
    setCpuThinking(true);
    const pool = draftable.filter((c) => !pickedIds.has(c.id));
    const choice = cpuChoose(pool);
    const t = setTimeout(() => {
      if (choice) setPicks((prev) => [...prev, { id: choice.id, owner: "cpu" }]);
      setCpuThinking(false);
    }, 550 + Math.random() * 350);
    return () => clearTimeout(t);
  }, [phase, currentOwner, draftComplete, draftable, pickedIds]);

  async function submitDraft() {
    try {
      const result = await createTournament.mutateAsync({
        data: {
          size,
          name: name.trim() || undefined,
          competitorIds: picks.map((p) => p.id),
          owners: picks.map((p) => p.owner),
          mode: "draft",
        },
      });
      setReopenId(null);
      setTournament(result);
      setPhase("config");
      setPicks([]);
      void refetchRecent();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      // surfaced via createTournament.isError; allow a retry
      draftSubmittedRef.current = false;
    }
  }

  // Auto-run the bracket once the draft is full (guarded against double-fire).
  useEffect(() => {
    if (phase !== "drafting" || !draftComplete) return;
    if (draftSubmittedRef.current) return;
    draftSubmittedRef.current = true;
    void submitDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, draftComplete]);

  function resetToSetup() {
    setTournament(null);
    setReopenId(null);
    setPicks([]);
    setCpuThinking(false);
    draftSubmittedRef.current = false;
    setPhase("config");
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

  // ── RESULT VIEW ────────────────────────────────────────────────────────────
  if (tournament) {
    const rounds = tournament.bracket.rounds;
    const isDraft = tournament.mode === "draft";

    // Tally head-to-head wins by owner and find whose fighter took the cup.
    const ownerById = new Map<number, Owner | null>();
    let userMatchWins = 0;
    let cpuMatchWins = 0;
    for (const r of rounds) {
      for (const m of r.matches) {
        if (m.a) ownerById.set(m.a.id, (m.a.owner as Owner | null) ?? null);
        if (m.b) ownerById.set(m.b.id, (m.b.owner as Owner | null) ?? null);
        if (m.winnerId != null) {
          const wOwner =
            m.a?.id === m.winnerId
              ? ((m.a.owner as Owner | null) ?? null)
              : m.b?.id === m.winnerId
                ? ((m.b.owner as Owner | null) ?? null)
                : null;
          if (wOwner === "user") userMatchWins++;
          else if (wOwner === "cpu") cpuMatchWins++;
        }
      }
    }
    const champOwner = ownerById.get(tournament.championId) ?? null;

    return (
      <div className="min-h-full bg-background px-3 pt-4 pb-10">
        <div className="mx-auto max-w-5xl">
          {allRevealed ? (
            <ChampionBanner
              tournament={tournament}
              champion={charById.get(tournament.championId) ?? null}
              ownerLabel={isDraft ? champOwner : null}
            />
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

          {isDraft && allRevealed && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              <div className="grid grid-cols-3 items-stretch text-center">
                <div
                  className={`flex flex-col items-center justify-center gap-1 p-4 ${
                    champOwner === "user" ? "bg-primary/15" : ""
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-primary">
                    <User className="h-3.5 w-3.5" /> You
                  </div>
                  <div className="text-4xl font-black text-foreground">{userMatchWins}</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Wins</div>
                </div>
                <div className="flex flex-col items-center justify-center gap-1 border-x border-white/10 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {champOwner === "user"
                      ? "You win the cup"
                      : champOwner === "cpu"
                        ? "CPU wins the cup"
                        : "Final"}
                  </div>
                  <div
                    className={`text-2xl font-black uppercase ${
                      champOwner === "user"
                        ? "text-primary"
                        : champOwner === "cpu"
                          ? "text-sky-400"
                          : "text-amber-400"
                    }`}
                  >
                    {champOwner === "user" ? "🏆 You" : champOwner === "cpu" ? "CPU 🏆" : "—"}
                  </div>
                </div>
                <div
                  className={`flex flex-col items-center justify-center gap-1 p-4 ${
                    champOwner === "cpu" ? "bg-sky-400/15" : ""
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-sky-400">
                    <Cpu className="h-3.5 w-3.5" /> CPU
                  </div>
                  <div className="text-4xl font-black text-foreground">{cpuMatchWins}</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Wins</div>
                </div>
              </div>
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
                      <BracketMatchCard
                        key={m.matchId}
                        match={m}
                        showOwners={isDraft}
                        onWatch={() => watchMatch(m)}
                      />
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

  // ── DRAFTING VIEW ──────────────────────────────────────────────────────────
  if (phase === "drafting") {
    const pickNumber = Math.min(picks.length + 1, size);
    return (
      <div className="min-h-full bg-background px-3 pt-4 pb-28">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Swords className="h-6 w-6 text-primary" strokeWidth={2.5} />
              <h1 className="text-2xl font-black uppercase tracking-tight text-foreground">
                Draft vs CPU
              </h1>
            </div>
            <button
              onClick={resetToSetup}
              className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-foreground hover:bg-white/5"
            >
              Cancel
            </button>
          </div>

          {/* Turn indicator */}
          <div
            className={`mt-4 flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-center transition-colors ${
              draftComplete
                ? "border-amber-400/40 bg-amber-400/10"
                : currentOwner === "user"
                  ? "border-primary/50 bg-primary/10"
                  : "border-sky-400/40 bg-sky-400/10"
            }`}
          >
            {draftComplete ? (
              createTournament.isError ? (
                <>
                  <span className="text-sm font-black uppercase tracking-widest text-rose-400">
                    Couldn't run the bracket
                  </span>
                  <button
                    onClick={() => {
                      draftSubmittedRef.current = true;
                      void submitDraft();
                    }}
                    className="rounded-md border border-white/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-foreground hover:bg-white/5"
                  >
                    Retry
                  </button>
                </>
              ) : (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                  <span className="text-sm font-black uppercase tracking-widest text-amber-300">
                    Draft complete — running the bracket…
                  </span>
                </>
              )
            ) : currentOwner === "user" ? (
              <>
                <User className="h-4 w-4 text-primary" />
                <span className="text-sm font-black uppercase tracking-widest text-primary">
                  Your pick — fighter {pickNumber} of {size}
                </span>
              </>
            ) : (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
                <span className="text-sm font-black uppercase tracking-widest text-sky-400">
                  CPU is drafting…
                </span>
              </>
            )}
          </div>

          {/* Squad columns */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <DraftSquad title="Your Squad" owner="user" picks={userPicks} charById={charById} size={size / 2} />
            <DraftSquad title="CPU Squad" owner="cpu" picks={cpuPicks} charById={charById} size={size / 2} />
          </div>

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

          {/* Roster grid — pick when it's your turn */}
          <div className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {availableFiltered.slice(0, 120).map((c) => {
                  const locked = currentOwner !== "user" || cpuThinking || draftComplete;
                  return (
                    <button
                      key={c.id}
                      onClick={() => userPick(c.id)}
                      disabled={locked}
                      className={`group relative overflow-hidden rounded-lg border text-left transition-all ${
                        locked
                          ? "border-white/10 opacity-50"
                          : "border-white/10 hover:border-primary hover:ring-2 hover:ring-primary/40"
                      }`}
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
                      <div className="truncate px-1.5 py-1 text-[11px] font-semibold text-foreground">
                        {c.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {!isLoading && availableFiltered.length > 120 && (
              <div className="mt-3 text-center text-xs text-muted-foreground">
                Showing first 120 — refine your search to see more.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── CONFIG VIEW ────────────────────────────────────────────────────────────
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
          Draft against the CPU — you alternate picks, then your fighters battle through the bracket. Every round-one match is you vs the computer. Watch any match in full.
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
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-bold text-foreground">{t.name}</span>
                      {t.mode === "draft" && (
                        <span className="flex flex-shrink-0 items-center gap-0.5 rounded-full bg-sky-400/15 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-sky-400">
                          <Cpu className="h-2.5 w-2.5" /> CPU
                        </span>
                      )}
                    </div>
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
                onClick={() => setSize(s)}
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
          <p className="mt-2 text-[11px] text-muted-foreground">
            You and the CPU each draft {size / 2} fighters.
          </p>
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

        {/* How it works */}
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-primary">
            <Swords className="h-3.5 w-3.5" /> How the draft works
          </div>
          <ol className="mt-2 space-y-1.5 text-xs text-muted-foreground">
            <li>1. You pick first, then you and the CPU alternate (snake order).</li>
            <li>2. The CPU drafts strong fighters — choose wisely.</li>
            <li>3. Your fighters meet the CPU's in round one, then the bracket runs to a champion.</li>
          </ol>
        </div>
      </div>

      {/* Sticky start bar */}
      <div className="fixed inset-x-0 bottom-[72px] z-40 border-t border-white/10 bg-[#030308]/95 px-3 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button
            onClick={startDraft}
            disabled={isLoading || draftable.length < size}
            className="ml-auto flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-black uppercase tracking-widest text-primary-foreground transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Swords className="h-5 w-5" /> Start Draft
          </button>
        </div>
      </div>
    </div>
  );
}

function DraftSquad({
  title,
  owner,
  picks,
  charById,
  size,
}: {
  title: string;
  owner: Owner;
  picks: Pick[];
  charById: Map<number, Character>;
  size: number;
}) {
  const accent = owner === "user" ? "text-primary" : "text-sky-400";
  const ring = owner === "user" ? "border-primary/30" : "border-sky-400/30";
  return (
    <div className={`rounded-xl border ${ring} bg-black/30 p-2.5`}>
      <div className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest ${accent}`}>
        {owner === "user" ? <User className="h-3.5 w-3.5" /> : <Cpu className="h-3.5 w-3.5" />}
        {title}
        <span className="ml-auto text-muted-foreground">
          {picks.length}/{size}
        </span>
      </div>
      <div className="mt-2 flex flex-col gap-1.5">
        {Array.from({ length: size }).map((_, i) => {
          const p = picks[i];
          const c = p ? charById.get(p.id) : null;
          return (
            <div
              key={i}
              className={`flex items-center gap-2 rounded-md border px-1.5 py-1 ${
                c ? "border-white/10 bg-white/5" : "border-dashed border-white/10"
              }`}
            >
              <div className="h-7 w-7 flex-shrink-0 overflow-hidden rounded-full border border-white/15 bg-black/40">
                {c?.imageUrl ? (
                  <img src={c.imageUrl} alt={c.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground/50">
                    <Swords className="h-3 w-3" />
                  </div>
                )}
              </div>
              <span className="truncate text-xs font-semibold text-foreground">
                {c?.name ?? <span className="text-muted-foreground/40">—</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChampionBanner({
  tournament,
  champion,
  ownerLabel,
}: {
  tournament: Tournament;
  champion: Character | null;
  ownerLabel?: Owner | null;
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
        {ownerLabel && (
          <div
            className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-widest ${
              ownerLabel === "user"
                ? "bg-primary/15 text-primary"
                : "bg-sky-400/15 text-sky-400"
            }`}
          >
            {ownerLabel === "user" ? (
              <>
                <User className="h-3.5 w-3.5" /> Your champion
              </>
            ) : (
              <>
                <Cpu className="h-3.5 w-3.5" /> CPU's champion
              </>
            )}
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
  showOwners,
  onWatch,
}: {
  match: TournamentMatch;
  showOwners: boolean;
  onWatch: () => void;
}) {
  const canWatch = !!match.a && !!match.b;
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 p-2">
      <Competitor
        comp={match.a}
        won={match.winnerSide === 1}
        lost={match.winnerSide === 2}
        showOwners={showOwners}
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
        showOwners={showOwners}
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
  showOwners,
}: {
  comp: TournamentMatch["a"];
  won: boolean;
  lost: boolean;
  showOwners: boolean;
}) {
  const owner = showOwners ? ((comp?.owner as Owner | null | undefined) ?? null) : null;
  const ringColor =
    owner === "user"
      ? "border-primary/70"
      : owner === "cpu"
        ? "border-sky-400/70"
        : "border-white/15";
  return (
    <div
      className={`flex items-center gap-2 rounded-md px-1.5 py-1 ${
        won ? "bg-amber-400/15" : ""
      } ${lost ? "opacity-50" : ""}`}
    >
      <div className={`h-7 w-7 flex-shrink-0 overflow-hidden rounded-full border-2 bg-black/40 ${ringColor}`}>
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
      {owner === "user" && (
        <User className="h-3 w-3 flex-shrink-0 text-primary" aria-label="Your fighter" />
      )}
      {owner === "cpu" && (
        <Cpu className="h-3 w-3 flex-shrink-0 text-sky-400" aria-label="CPU fighter" />
      )}
      {won && <Crown className="ml-auto h-3.5 w-3.5 flex-shrink-0 text-amber-400" />}
    </div>
  );
}
