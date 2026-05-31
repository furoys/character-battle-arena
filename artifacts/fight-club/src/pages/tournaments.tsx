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
  Sparkles,
  Check,
  Copy,
  ArrowLeft,
} from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
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
import { UniverseCombobox, type UniverseOption } from "@/components/universe-combobox";
import { DraftPickCard } from "@/components/draft-pick-card";

type Size = 8 | 16 | 32;

type WatchTarget = {
  a: { id: number; name: string; imageUrl: string | null };
  b: { id: number; name: string; imageUrl: string | null };
};

const SIZE_OPTIONS: Size[] = [8, 16, 32];

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

// ── Running record vs CPU (client-only, localStorage) ───────────────────────
// Persisted so the player builds a streak across sessions — the main "run
// another one" hook. Guests and signed-in users alike keep a local record.
type CpuRecord = {
  wins: number;
  losses: number;
  streak: number; // signed: + = win streak, - = loss streak
  best: number; // best win streak ever
  lastId: number | null; // last tournament id counted (de-dupe)
};
const RECORD_KEY = "ava_tournament_cpu_record";
const EMPTY_RECORD: CpuRecord = { wins: 0, losses: 0, streak: 0, best: 0, lastId: null };

function loadCpuRecord(): CpuRecord {
  try {
    const raw = localStorage.getItem(RECORD_KEY);
    if (!raw) return { ...EMPTY_RECORD };
    const p = JSON.parse(raw) as Partial<CpuRecord>;
    return {
      wins: num(p.wins),
      losses: num(p.losses),
      streak: num(p.streak),
      best: num(p.best),
      lastId: typeof p.lastId === "number" ? p.lastId : null,
    };
  } catch {
    return { ...EMPTY_RECORD };
  }
}

function applyOutcome(rec: CpuRecord, tournamentId: number, won: boolean): CpuRecord {
  if (rec.lastId === tournamentId) return rec; // already counted this cup
  const streak = won ? (rec.streak > 0 ? rec.streak + 1 : 1) : rec.streak < 0 ? rec.streak - 1 : -1;
  return {
    wins: rec.wins + (won ? 1 : 0),
    losses: rec.losses + (won ? 0 : 1),
    streak,
    best: Math.max(rec.best, streak),
    lastId: tournamentId,
  };
}

// Letter grade for a squad from its average-power percentile within the roster.
function gradeFromPercentile(pct: number): { grade: string; color: string } {
  if (pct >= 0.9) return { grade: "S", color: "text-amber-300" };
  if (pct >= 0.75) return { grade: "A", color: "text-emerald-400" };
  if (pct >= 0.55) return { grade: "B", color: "text-sky-400" };
  if (pct >= 0.35) return { grade: "C", color: "text-muted-foreground" };
  return { grade: "D", color: "text-rose-400" };
}

// How aggressively the CPU drafts. "Fun cool picks" is the constant across all
// three — difficulty only changes how much raw power it chases on top of that.
type CpuDifficulty = "chill" | "rival" | "boss";

// Crowd-pleasing fighters the CPU loves to draft, so the bracket feels iconic
// instead of a parade of obscure max-stat characters. Single tokens match by
// whole word ("goku" hits "Goku Black"); multi-word entries match the full name.
const ICONIC_NAMES = new Set<string>([
  // Marvel
  "spider-man", "iron man", "captain america", "thor", "hulk", "wolverine",
  "deadpool", "thanos", "venom", "magneto", "doctor strange", "black panther",
  "storm", "captain marvel", "scarlet witch", "ghost rider", "silver surfer",
  // DC
  "superman", "batman", "wonder woman", "flash", "aquaman", "joker", "darkseid",
  "shazam", "harley quinn", "green lantern",
  // Dragon Ball
  "goku", "vegeta", "gohan", "frieza", "broly", "beerus", "cell", "jiren",
  "gogeta", "vegito", "trunks", "whis",
  // Naruto / Boruto
  "naruto", "sasuke", "kakashi", "itachi", "madara", "minato", "pain",
  // One Piece
  "luffy", "zoro", "sanji", "shanks", "kaido", "whitebeard",
  // Bleach / JJK / MHA / Demon Slayer
  "ichigo", "aizen", "kenpachi", "gojo", "sukuna", "deku", "all might",
  "tanjiro", "rengoku", "muzan", "yoriichi",
  // Pokémon
  "pikachu", "charizard", "mewtwo", "mew",
  // Star Wars
  "darth vader", "yoda", "luke skywalker", "obi-wan", "darth maul", "kylo ren",
  // Fighting games
  "scorpion", "sub-zero", "raiden", "liu kang", "ryu", "ken", "chun-li", "akuma",
  // Nintendo / Sega
  "sonic", "mario", "luigi", "link", "kirby", "samus", "bowser", "donkey kong",
  // TMNT
  "leonardo", "raphael", "donatello", "michelangelo", "shredder",
  // Heavy hitters / horror / misc
  "saitama", "kratos", "master chief", "doomslayer", "doom slayer", "predator",
  "xenomorph", "terminator", "john wick", "freddy krueger", "jason voorhees",
  "michael myers", "pennywise", "gandalf", "aragorn", "sauron", "harry potter",
  "voldemort", "eren", "levi", "ryuk", "alucard", "dio", "jotaro", "meruem",
  "gon", "hisoka", "sephiroth", "cloud", "aang", "zuko", "optimus prime",
  "megatron", "homelander", "omni-man", "invincible",
]);

// Universes whose roster is broadly recognizable. Generic mega-buckets like
// "Multiverse Comics" / "Legacy Comics" / "Kingdom" are intentionally excluded.
const FUN_UNIVERSES = new Set<string>([
  "Marvel", "DC", "Dragon Ball", "Naruto", "Boruto", "One Piece", "Bleach",
  "Demon Slayer", "My Hero Academia", "Jujutsu Kaisen", "Hunter x Hunter",
  "Attack on Titan", "JoJo's Bizarre Adventure", "Fullmetal Alchemist",
  "Pokémon", "Star Wars", "Mortal Kombat", "Street Fighter", "Harry Potter",
  "Lord of the Rings", "TMNT", "Cartoon Network", "Adventure Time", "Ben 10",
  "God of War", "Halo", "Avatar: The Last Airbender", "Transformers",
  "The Boys", "Invincible", "Nintendo", "Final Fantasy",
]);

function isIconicName(name: string): boolean {
  const lower = name.toLowerCase();
  if (ICONIC_NAMES.has(lower)) return true;
  return lower
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .some((w) => ICONIC_NAMES.has(w));
}

function isFunPick(c: Character): boolean {
  return isIconicName(c.name) || (!!c.universe && FUN_UNIVERSES.has(c.universe));
}

function pickWeighted(items: { c: Character; w: number }[]): Character | null {
  if (items.length === 0) return null;
  const total = items.reduce((s, it) => s + Math.max(0, it.w), 0);
  if (total <= 0) return items[Math.floor(Math.random() * items.length)]!.c;
  let r = Math.random() * total;
  for (const it of items) {
    r -= Math.max(0, it.w);
    if (r <= 0) return it.c;
  }
  return items[items.length - 1]!.c;
}

// The CPU drafts fun, recognizable fighters with real variety. It draws from a
// "fun pool" (iconic names + popular universes) whenever that pool is big
// enough, and difficulty only tilts how much power it chases inside that pool:
//   chill → leans toward weaker fighters (easy to beat)
//   rival → balanced, lots of spread
//   boss  → hunts the strongest fun fighters (tough to beat)
function cpuChoose(available: Character[], difficulty: CpuDifficulty): Character | null {
  if (available.length === 0) return null;
  const fun = available.filter(isFunPick);
  const pool = fun.length >= 3 ? fun : available;
  const ranked = [...pool].sort((a, b) => powerScore(b) - powerScore(a));
  const n = ranked.length;
  const weighted = ranked.map((c, i) => {
    const top = n - i; // strongest = n, weakest = 1
    let w: number;
    if (difficulty === "boss") w = top * top;
    else if (difficulty === "chill") w = i + 1;
    else w = n + top;
    if (isIconicName(c.name)) w *= 1.6;
    return { c, w };
  });
  return pickWeighted(weighted);
}

const CPU_DIFFICULTIES: { key: CpuDifficulty; label: string; blurb: string }[] = [
  { key: "chill", label: "Chill", blurb: "Fun picks, easier to beat" },
  { key: "rival", label: "Rival", blurb: "Fun picks, balanced fight" },
  { key: "boss", label: "Boss", blurb: "Fun picks, tough as nails" },
];

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
  const [cpuDifficulty, setCpuDifficulty] = useState<CpuDifficulty>("rival");
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [universeFilter, setUniverseFilter] = useState<string>("all");
  const [tournament, setTournament] = useState<Tournament | null>(null);

  // ── Draft state ────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<"config" | "drafting">("config");
  const [picks, setPicks] = useState<Pick[]>([]);
  const [cpuThinking, setCpuThinking] = useState(false);
  const draftSubmittedRef = useRef(false);
  const [cpuRecord, setCpuRecord] = useState<CpuRecord>(() => loadCpuRecord());
  // Only the cup the user just ran this session counts toward the vs-CPU record —
  // reopening past/community cups from the recent feed must never move it.
  const [sessionCupId, setSessionCupId] = useState<number | null>(null);

  // ── Async PvP draft (draft a friend) ────────────────────────────────────────
  const [showPvp, setShowPvp] = useState(false);
  const [pvpInitialCode, setPvpInitialCode] = useState<string | null>(null);
  // Open straight into the draft room if arriving via a shared ?draft=CODE link.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("draft");
    if (code) {
      setPvpInitialCode(code.toUpperCase());
      setShowPvp(true);
    }
  }, []);

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

  // Match-by-match reveal animation — matches resolve one at a time, in bracket
  // order (all of round 1, then round 2, …), so the YOU-vs-CPU drama builds.
  const totalMatches = useMemo(
    () =>
      tournament
        ? tournament.bracket.rounds.reduce((s, r) => s + r.matches.length, 0)
        : 0,
    [tournament],
  );
  const [revealedMatches, setRevealedMatches] = useState(0);
  const revealTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    revealTimers.current.forEach(clearTimeout);
    revealTimers.current = [];
    if (!tournament) {
      setRevealedMatches(0);
      return;
    }
    setRevealedMatches(0);
    // Slightly faster per-match on a 16 bracket (15 matches) so it never drags.
    const step = totalMatches > 8 ? 480 : 620;
    for (let i = 1; i <= totalMatches; i++) {
      revealTimers.current.push(
        setTimeout(() => setRevealedMatches(i), 400 + i * step),
      );
    }
    return () => {
      revealTimers.current.forEach(clearTimeout);
      revealTimers.current = [];
    };
  }, [tournament, totalMatches]);

  const allRevealed = !!tournament && revealedMatches >= totalMatches;

  function revealAll() {
    if (!tournament) return;
    revealTimers.current.forEach(clearTimeout);
    revealTimers.current = [];
    setRevealedMatches(totalMatches);
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

  // Percentile of a power score within the whole roster — drives draft grades.
  const powerPercentile = useMemo(() => {
    const scores = (characters ?? []).map(powerScore).sort((a, b) => a - b);
    return (s: number): number => {
      if (scores.length === 0) return 0.5;
      let lo = 0;
      let hi = scores.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (scores[mid]! < s) lo = mid + 1;
        else hi = mid;
      }
      return lo / scores.length;
    };
  }, [characters]);

  // Who took the cup in a draft tournament (used to record the vs-CPU streak).
  const draftChampOwner = useMemo<Owner | null>(() => {
    if (!tournament || tournament.mode !== "draft") return null;
    let owner: Owner | null = null;
    for (const r of tournament.bracket.rounds) {
      for (const m of r.matches) {
        if (m.a?.id === tournament.championId) owner = (m.a.owner as Owner | null) ?? null;
        if (m.b?.id === tournament.championId) owner = (m.b.owner as Owner | null) ?? null;
      }
    }
    return owner;
  }, [tournament]);

  // Record the result against the running vs-CPU record exactly once per cup,
  // when the final match has been revealed.
  useEffect(() => {
    if (!tournament || !allRevealed) return;
    // Only count the cup the user actually ran this session — reopened past or
    // community cups (loaded via the recent feed) must not move the record.
    if (tournament.id !== sessionCupId) return;
    if (draftChampOwner !== "user" && draftChampOwner !== "cpu") return;
    setCpuRecord((prev) => {
      const next = applyOutcome(prev, tournament.id, draftChampOwner === "user");
      if (next === prev) return prev;
      try {
        localStorage.setItem(RECORD_KEY, JSON.stringify(next));
      } catch {
        /* localStorage unavailable — record stays in memory only */
      }
      return next;
    });
  }, [tournament, allRevealed, draftChampOwner, sessionCupId]);

  // Developer Legends (Chris, Troy, Tim, Cory) have max stats and would trivially
  // win any bracket, so they're barred from tournaments. charById above still
  // includes them so old cups that contain them render correctly.
  const draftable = useMemo(
    () => (characters ?? []).filter((c) => c.universe !== EXCLUDED_UNIVERSE),
    [characters],
  );

  const universeOptions = useMemo<UniverseOption[]>(() => {
    const counts = new Map<string, number>();
    draftable.forEach((c) => {
      if (c.universe) counts.set(c.universe, (counts.get(c.universe) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
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
    const choice = cpuChoose(pool, cpuDifficulty);
    const t = setTimeout(() => {
      if (choice) setPicks((prev) => [...prev, { id: choice.id, owner: "cpu" }]);
      setCpuThinking(false);
    }, 550 + Math.random() * 350);
    return () => clearTimeout(t);
  }, [phase, currentOwner, draftComplete, draftable, pickedIds, cpuDifficulty]);

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
      setSessionCupId(result.id);
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

    // Tally head-to-head wins by owner and find whose fighter took the cup. The
    // tally only counts matches that have already been REVEALED so the scoreboard
    // ticks up live during the run. Each match gets a global reveal index.
    const ownerById = new Map<number, Owner | null>();
    const matchOrder = new Map<string, number>();
    let userMatchWins = 0;
    let cpuMatchWins = 0;
    let gi = 0;
    for (const r of rounds) {
      for (const m of r.matches) {
        matchOrder.set(m.matchId, gi);
        if (m.a) ownerById.set(m.a.id, (m.a.owner as Owner | null) ?? null);
        if (m.b) ownerById.set(m.b.id, (m.b.owner as Owner | null) ?? null);
        if (gi < revealedMatches && m.winnerId != null) {
          const wOwner =
            m.a?.id === m.winnerId
              ? ((m.a.owner as Owner | null) ?? null)
              : m.b?.id === m.winnerId
                ? ((m.b.owner as Owner | null) ?? null)
                : null;
          if (wOwner === "user") userMatchWins++;
          else if (wOwner === "cpu") cpuMatchWins++;
        }
        gi++;
      }
    }
    const champOwner = ownerById.get(tournament.championId) ?? null;

    // ── Draft grades + "steal of the draft" (draft cups only) ────────────────
    // Round 0 competitors are in seed = pick order, so we can reconstruct each
    // side's squad and the order fighters were drafted in.
    const seedOrder: { id: number; owner: Owner | null; name: string }[] = [];
    for (const m of rounds[0]?.matches ?? []) {
      if (m.a) seedOrder.push({ id: m.a.id, owner: (m.a.owner as Owner | null) ?? null, name: m.a.name });
      if (m.b) seedOrder.push({ id: m.b.id, owner: (m.b.owner as Owner | null) ?? null, name: m.b.name });
    }
    const sidePct = (owner: Owner) => {
      const ids = seedOrder.filter((s) => s.owner === owner);
      if (ids.length === 0) return 0.5;
      const sum = ids.reduce((acc, s) => {
        const c = charById.get(s.id);
        return acc + (c ? powerPercentile(powerScore(c)) : 0.5);
      }, 0);
      return sum / ids.length;
    };
    const userGrade = gradeFromPercentile(sidePct("user"));
    const cpuGrade = gradeFromPercentile(sidePct("cpu"));
    // Steal of the draft: the strongest fighter taken in the back half of the
    // draft (a late pick that punches above its slot). Only flag a real bargain.
    let steal: { name: string; owner: Owner | null; pct: number } | null = null;
    seedOrder.forEach((s, i) => {
      if (i < seedOrder.length / 2) return;
      const c = charById.get(s.id);
      const pct = c ? powerPercentile(powerScore(c)) : 0;
      if (pct >= 0.6 && (!steal || pct > steal.pct)) steal = { name: s.name, owner: s.owner, pct };
    });
    const stealPick = steal as { name: string; owner: Owner | null; pct: number } | null;

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

          {isDraft && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              <div className="grid grid-cols-3 items-stretch text-center">
                <div
                  className={`flex flex-col items-center justify-center gap-1 p-4 transition-colors ${
                    allRevealed && champOwner === "user" ? "bg-primary/15" : ""
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-primary">
                    <User className="h-3.5 w-3.5" /> You
                  </div>
                  <div className="text-4xl font-black tabular-nums text-foreground">{userMatchWins}</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Wins</div>
                </div>
                <div className="flex flex-col items-center justify-center gap-1 border-x border-white/10 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {!allRevealed
                      ? "Running…"
                      : champOwner === "user"
                        ? "You win the cup"
                        : champOwner === "cpu"
                          ? "CPU wins the cup"
                          : "Final"}
                  </div>
                  <div
                    className={`text-2xl font-black uppercase ${
                      allRevealed && champOwner === "user"
                        ? "text-primary"
                        : allRevealed && champOwner === "cpu"
                          ? "text-sky-400"
                          : "text-amber-400"
                    }`}
                  >
                    {!allRevealed
                      ? "VS"
                      : champOwner === "user"
                        ? "🏆 You"
                        : champOwner === "cpu"
                          ? "CPU 🏆"
                          : "—"}
                  </div>
                </div>
                <div
                  className={`flex flex-col items-center justify-center gap-1 p-4 transition-colors ${
                    allRevealed && champOwner === "cpu" ? "bg-sky-400/15" : ""
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-sky-400">
                    <Cpu className="h-3.5 w-3.5" /> CPU
                  </div>
                  <div className="text-4xl font-black tabular-nums text-foreground">{cpuMatchWins}</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Wins</div>
                </div>
              </div>
            </div>
          )}

          {isDraft && allRevealed && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                Draft Report
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 py-3">
                  <User className="h-4 w-4 text-primary" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-primary">You</span>
                  <span className={`text-3xl font-black ${userGrade.color}`}>{userGrade.grade}</span>
                </div>
                <div className="flex items-center justify-center gap-2 rounded-xl border border-sky-400/30 bg-sky-400/5 py-3">
                  <Cpu className="h-4 w-4 text-sky-400" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-sky-400">CPU</span>
                  <span className={`text-3xl font-black ${cpuGrade.color}`}>{cpuGrade.grade}</span>
                </div>
              </div>
              {stealPick && (
                <div className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>
                    Steal of the draft:{" "}
                    <span className="font-bold text-amber-300">{stealPick.name}</span>
                    {stealPick.owner === "user" ? " (You)" : stealPick.owner === "cpu" ? " (CPU)" : ""}
                  </span>
                </div>
              )}
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
            {rounds.map((round, ri) => (
              <div key={ri} className="flex min-w-[230px] flex-col gap-3">
                <div className="text-center text-[11px] font-bold uppercase tracking-widest text-primary">
                  {round.name}
                </div>
                <div className="flex flex-1 flex-col justify-around gap-3">
                  {round.matches.map((m) => {
                    const revealed = (matchOrder.get(m.matchId) ?? 0) < revealedMatches;
                    // Upset = the lower-power fighter won. Power is looked up from
                    // the roster so we can compare without extra payload.
                    let isUpset = false;
                    if (m.winnerId != null && m.a && m.b) {
                      const loserId = m.winnerId === m.a.id ? m.b.id : m.a.id;
                      const wc = charById.get(m.winnerId);
                      const lc = charById.get(loserId);
                      if (wc && lc) isUpset = powerScore(wc) < powerScore(lc);
                    }
                    return (
                      <BracketMatchCard
                        key={m.matchId}
                        match={m}
                        revealed={revealed}
                        concealIdentity={ri > 0 && !revealed}
                        isUpset={isUpset}
                        showOwners={isDraft}
                        onWatch={() => watchMatch(m)}
                      />
                    );
                  })}
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

  // ── PvP DRAFT ROOM (draft a friend) ──────────────────────────────────────────
  if (showPvp && !tournament) {
    return (
      <PvpDraftRoom
        characters={characters ?? []}
        charById={charById}
        initialCode={pvpInitialCode}
        onComplete={(id) => {
          setShowPvp(false);
          setReopenId(id);
        }}
        onClose={() => {
          setShowPvp(false);
          setPvpInitialCode(null);
        }}
      />
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
            <UniverseCombobox
              value={universeFilter}
              onChange={setUniverseFilter}
              options={universeOptions}
              totalCount={draftable.length}
              className="sm:w-52"
            />
          </div>

          {(search.trim() || universeFilter !== "all") && (
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                {availableFiltered.length} fighter{availableFiltered.length === 1 ? "" : "s"} available
              </span>
              <button
                onClick={() => {
                  setSearch("");
                  setUniverseFilter("all");
                }}
                className="font-bold uppercase tracking-widest text-primary hover:underline"
              >
                Clear
              </button>
            </div>
          )}

          {/* Roster grid — pick when it's your turn */}
          <div className="mt-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : availableFiltered.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-black/30 py-12 text-center text-sm text-muted-foreground">
                No fighters match your search.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
                {availableFiltered.slice(0, 120).map((c) => {
                  const locked = currentOwner !== "user" || cpuThinking || draftComplete;
                  return (
                    <DraftPickCard
                      key={c.id}
                      char={c}
                      locked={locked}
                      onPick={() => userPick(c.id)}
                    />
                  );
                })}
              </div>
            )}
            {!isLoading && availableFiltered.length > 120 && (
              <div className="mt-3 text-center text-xs text-muted-foreground">
                Showing first 120 of {availableFiltered.length} — refine your search to see more.
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

        {/* Draft a friend (async PvP) */}
        <button
          onClick={() => {
            setPvpInitialCode(null);
            setShowPvp(true);
          }}
          data-testid="button-draft-friend"
          className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-sky-400/30 bg-sky-400/10 px-4 py-3 text-left transition-all hover:border-sky-400/60 hover:bg-sky-400/15"
        >
          <Share2 className="h-5 w-5 flex-shrink-0 text-sky-400" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-black uppercase tracking-wide text-sky-300">Draft a Friend</div>
            <div className="text-[11px] text-muted-foreground">
              Share a code, draft alternately, then both watch the same bracket play out.
            </div>
          </div>
          <ChevronRight className="h-5 w-5 flex-shrink-0 text-sky-400" />
        </button>

        {/* Running record vs CPU */}
        {cpuRecord.wins + cpuRecord.losses > 0 && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Your record vs CPU
                </div>
                <div className="text-lg font-black tabular-nums text-foreground">
                  {cpuRecord.wins}
                  <span className="text-muted-foreground"> – </span>
                  {cpuRecord.losses}
                  <span className="ml-1 text-xs font-bold text-muted-foreground">
                    ({cpuRecord.wins + cpuRecord.losses} cups)
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-right">
              {cpuRecord.streak !== 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Streak
                  </div>
                  <div
                    className={`text-base font-black ${
                      cpuRecord.streak > 0 ? "text-primary" : "text-sky-400"
                    }`}
                  >
                    {cpuRecord.streak > 0
                      ? `W${cpuRecord.streak}`
                      : `L${Math.abs(cpuRecord.streak)}`}
                  </div>
                </div>
              )}
              {cpuRecord.best > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Best
                  </div>
                  <div className="text-base font-black text-amber-300">W{cpuRecord.best}</div>
                </div>
              )}
            </div>
          </div>
        )}

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

        {/* CPU difficulty */}
        <div className="mt-5">
          <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            CPU difficulty
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {CPU_DIFFICULTIES.map((d) => (
              <button
                key={d.key}
                onClick={() => setCpuDifficulty(d.key)}
                className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-center transition-all ${
                  cpuDifficulty === d.key
                    ? "border-sky-400 bg-sky-400/15 text-sky-300"
                    : "border-white/15 text-muted-foreground hover:bg-white/5"
                }`}
              >
                <span className="text-xs font-black uppercase tracking-widest">{d.label}</span>
                <span className="text-[10px] leading-tight text-muted-foreground">{d.blurb}</span>
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

// ── Async PvP Draft Room ──────────────────────────────────────────────────────
type DraftRole = "creator" | "joiner";
type PvpPick = { id: number; owner: DraftRole };
type PvpSession = {
  code: string;
  size: number;
  status: "open" | "drafting" | "complete";
  picks: PvpPick[];
  pickCount: number;
  turn: DraftRole | null;
  joinerPresent: boolean;
  tournamentId: number | null;
  championOwner: DraftRole | null;
  expiresAt: string;
};

function pvpCredsKey(code: string): string {
  return `ava:pvpDraft:${code}`;
}
function loadPvpCreds(code: string): { token: string; role: DraftRole } | null {
  try {
    const raw = localStorage.getItem(pvpCredsKey(code));
    if (!raw) return null;
    const v = JSON.parse(raw) as { token?: string; role?: DraftRole };
    if (v.token && (v.role === "creator" || v.role === "joiner")) return { token: v.token, role: v.role };
  } catch {
    /* ignore */
  }
  return null;
}

function PvpDraftRoom({
  characters,
  charById,
  initialCode,
  onComplete,
  onClose,
}: {
  characters: Character[];
  charById: Map<number, Character>;
  initialCode: string | null;
  onComplete: (tournamentId: number) => void;
  onClose: () => void;
}) {
  const [view, setView] = useState<"menu" | "room">(initialCode ? "room" : "menu");
  const [createSize, setCreateSize] = useState<Size>(8);
  const [joinInput, setJoinInput] = useState("");
  const [code, setCode] = useState<string | null>(initialCode);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<DraftRole | null>(null);
  const [session, setSession] = useState<PvpSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [universeFilter, setUniverseFilter] = useState<string>("all");
  const [copied, setCopied] = useState(false);
  const completedRef = useRef(false);
  const joinAttemptedRef = useRef(false);
  const shareInputRef = useRef<HTMLInputElement>(null);

  async function createDraft() {
    setBusy(true);
    setError(null);
    try {
      const r = await apiFetch("/api/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ size: createSize }),
      });
      const d = (await r.json()) as PvpSession & { creatorToken: string; role: DraftRole; error?: string };
      if (!r.ok) throw new Error(d.error || "Could not create draft");
      localStorage.setItem(pvpCredsKey(d.code), JSON.stringify({ token: d.creatorToken, role: "creator" }));
      setCode(d.code);
      setToken(d.creatorToken);
      setRole("creator");
      setSession(d);
      setView("room");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create draft");
    } finally {
      setBusy(false);
    }
  }

  const joinDraft = async (raw: string) => {
    const c = raw.toUpperCase().trim();
    if (!c) return;
    setBusy(true);
    setError(null);
    try {
      // If we already hold creds for this code (creator opening their own link,
      // or a refresh), just resume — don't try to join a second time.
      const stored = loadPvpCreds(c);
      if (stored) {
        setCode(c);
        setToken(stored.token);
        setRole(stored.role);
        setView("room");
        return;
      }
      const r = await apiFetch(`/api/drafts/${c}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      const d = (await r.json()) as PvpSession & { joinerToken: string; role: DraftRole; error?: string };
      if (!r.ok) throw new Error(d.error || "Could not join draft");
      localStorage.setItem(pvpCredsKey(c), JSON.stringify({ token: d.joinerToken, role: "joiner" }));
      setCode(c);
      setToken(d.joinerToken);
      setRole("joiner");
      setSession(d);
      setView("room");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join draft");
    } finally {
      setBusy(false);
    }
  };

  // Auto-join when arriving via a shared ?draft=CODE link.
  useEffect(() => {
    if (initialCode && !joinAttemptedRef.current) {
      joinAttemptedRef.current = true;
      void joinDraft(initialCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  // Restore creds from storage if we have a code but no token (e.g. refresh).
  useEffect(() => {
    if (code && !token) {
      const stored = loadPvpCreds(code);
      if (stored) {
        setToken(stored.token);
        setRole(stored.role);
      }
    }
  }, [code, token]);

  // Poll session state while the room is open.
  useEffect(() => {
    if (!code) return;
    let active = true;
    const poll = async () => {
      try {
        const r = await apiFetch(`/api/drafts/${code}`);
        if (!r.ok) return;
        const d = (await r.json()) as PvpSession;
        if (active) setSession(d);
      } catch {
        /* transient */
      }
    };
    void poll();
    const id = setInterval(() => void poll(), 2000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [code]);

  // Hand off to the shared bracket view once the draft completes.
  useEffect(() => {
    if (session?.status === "complete" && session.tournamentId && !completedRef.current) {
      completedRef.current = true;
      onComplete(session.tournamentId);
    }
  }, [session, onComplete]);

  async function placePick(id: number) {
    if (!code || !token || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await apiFetch(`/api/drafts/${code}/pick`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, characterId: id }),
      });
      const d = (await r.json()) as PvpSession & { error?: string };
      if (!r.ok) throw new Error(d.error || "Pick failed");
      setSession(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pick failed");
    } finally {
      setBusy(false);
    }
  }

  const shareUrl = code ? `${window.location.origin}${window.location.pathname}?draft=${code}` : "";
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  function flashCopied() {
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  // Share/copy the invite. The clipboard API is blocked in some contexts
  // (preview iframes, in-app webviews), so we degrade gracefully: native share
  // sheet → clipboard → legacy execCommand on the selectable link → manual.
  async function copyShare() {
    if (!shareUrl) return;
    setError(null);
    if (canNativeShare) {
      try {
        await navigator.share({
          title: "A.v.A — Draft a Friend",
          text: `Join my draft${code ? ` (code ${code})` : ""} on Anyone vs Anyone`,
          url: shareUrl,
        });
        return;
      } catch {
        // User dismissed the sheet or it's unsupported — the link stays visible
        // and copyable below, so just stop here without surfacing an error.
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      flashCopied();
      return;
    } catch {
      /* clipboard blocked — fall back to manual selection */
    }
    try {
      const el = shareInputRef.current;
      if (el) {
        el.focus();
        el.select();
        el.setSelectionRange(0, shareUrl.length);
        if (document.execCommand("copy")) {
          flashCopied();
          return;
        }
      }
    } catch {
      /* ignore */
    }
    setError("Couldn't copy automatically — tap the link to select it, then copy.");
  }

  const pickedIds = useMemo(() => new Set((session?.picks ?? []).map((p) => p.id)), [session]);
  const myPicks = (session?.picks ?? []).filter((p) => p.owner === role);
  const oppPicks = (session?.picks ?? []).filter((p) => p.owner !== role);
  const myTurn = session?.status === "drafting" && session.turn === role;
  const perSide = session ? session.size / 2 : 0;

  const universeOptions = useMemo<UniverseOption[]>(() => {
    const counts = new Map<string, number>();
    characters.forEach((c) => {
      if (c.universe && c.universe !== EXCLUDED_UNIVERSE) {
        counts.set(c.universe, (counts.get(c.universe) ?? 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [characters]);
  const draftablePool = useMemo(
    () => characters.filter((c) => c.universe !== EXCLUDED_UNIVERSE),
    [characters],
  );

  const available = useMemo(() => {
    const q = search.trim().toLowerCase();
    return draftablePool
      .filter((c) => !pickedIds.has(c.id))
      .filter((c) => universeFilter === "all" || c.universe === universeFilter)
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.universe.toLowerCase().includes(q))
      .slice(0, 90);
  }, [draftablePool, pickedIds, search, universeFilter]);

  // ── MENU: create or join ─────────────────────────────────────────────────────
  if (view === "menu") {
    return (
      <div className="min-h-full bg-background px-3 pt-4 pb-28">
        <div className="mx-auto max-w-md">
          <button
            onClick={onClose}
            data-testid="button-pvp-back"
            className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <div className="flex items-center gap-2">
            <Share2 className="h-6 w-6 text-sky-400" strokeWidth={2.5} />
            <h1 className="text-2xl font-black uppercase tracking-tight text-foreground">Draft a Friend</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a draft, send the code to a friend, and take turns picking. When the field is full, you both
            watch the identical bracket play out.
          </p>

          {error && (
            <div className="mt-3 rounded-lg border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-300">
              {error}
            </div>
          )}

          {/* Create */}
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Create a draft</div>
            <div className="mt-2 flex gap-2">
              {SIZE_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setCreateSize(s)}
                  data-testid={`button-pvp-size-${s}`}
                  className={`flex-1 rounded-lg border px-3 py-2.5 text-center text-sm font-black uppercase tracking-widest transition-all ${
                    createSize === s
                      ? "border-sky-400 bg-sky-400/15 text-sky-300"
                      : "border-white/15 text-muted-foreground hover:bg-white/5"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">You each draft {createSize / 2} fighters.</p>
            <button
              onClick={() => void createDraft()}
              disabled={busy}
              data-testid="button-pvp-create"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-3 text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-sky-400 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
              Create & Share
            </button>
          </div>

          {/* Join */}
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Join with a code</div>
            <div className="mt-2 flex gap-2">
              <input
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                data-testid="input-pvp-join-code"
                className="flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-center font-mono text-lg font-black uppercase tracking-[0.3em] text-foreground placeholder:text-muted-foreground/40 focus:border-sky-400 focus:outline-none"
              />
              <button
                onClick={() => void joinDraft(joinInput)}
                disabled={busy || joinInput.trim().length < 4}
                data-testid="button-pvp-join"
                className="rounded-lg bg-white/10 px-4 py-2.5 text-sm font-black uppercase tracking-widest text-foreground transition-all hover:bg-white/20 disabled:opacity-40"
              >
                Join
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── ROOM: lobby + drafting ───────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-background px-3 pt-4 pb-28">
      <div className="mx-auto max-w-3xl">
        <button
          onClick={onClose}
          data-testid="button-pvp-back"
          className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Leave room
        </button>

        {/* Code + share */}
        <div className="rounded-2xl border border-sky-400/30 bg-sky-400/10 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Draft code</div>
              <div className="font-mono text-2xl font-black tracking-[0.3em] text-sky-300" data-testid="text-pvp-code">
                {code}
              </div>
            </div>
            <button
              onClick={() => void copyShare()}
              data-testid="button-pvp-copy"
              className="flex items-center gap-1.5 rounded-lg bg-sky-500/20 px-3 py-2 text-xs font-black uppercase tracking-widest text-sky-200 hover:bg-sky-500/30"
            >
              {canNativeShare ? (
                <Share2 className="h-3.5 w-3.5" />
              ) : copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {canNativeShare ? "Share" : copied ? "Copied" : "Copy link"}
            </button>
          </div>
          {/* Always-visible, selectable link so sharing works even where the
              clipboard API is blocked (preview iframes / in-app webviews). */}
          <input
            ref={shareInputRef}
            value={shareUrl}
            readOnly
            onFocus={(e) => e.currentTarget.select()}
            data-testid="input-pvp-share-link"
            className="mt-3 w-full select-all rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-center text-[11px] text-sky-200/90 focus:border-sky-400 focus:outline-none"
          />
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            Send this link to a friend, or have them enter the code on the Tournament screen.
          </p>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-300">
            {error}
          </div>
        )}

        {/* Status line */}
        <div className="mt-4 flex items-center justify-center gap-2 text-center text-sm font-bold">
          {!session ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </span>
          ) : session.status === "open" ? (
            <span className="flex items-center gap-2 text-amber-300">
              <Loader2 className="h-4 w-4 animate-spin" /> Waiting for your opponent to join…
            </span>
          ) : session.status === "complete" ? (
            <span className="flex items-center gap-2 text-sky-300">
              <Loader2 className="h-4 w-4 animate-spin" /> Draft complete — running the bracket…
            </span>
          ) : myTurn ? (
            <span className="text-primary">Your pick — choose a fighter below</span>
          ) : (
            <span className="flex items-center gap-2 text-sky-300">
              <Loader2 className="h-4 w-4 animate-spin" /> Opponent is picking…
            </span>
          )}
        </div>

        {/* Squads */}
        {session && session.status !== "open" && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <DraftSquad
              title="Your Squad"
              owner="user"
              picks={myPicks.map((p) => ({ id: p.id, owner: "user" as Owner }))}
              charById={charById}
              size={perSide}
            />
            <DraftSquad
              title="Opponent"
              owner="cpu"
              picks={oppPicks.map((p) => ({ id: p.id, owner: "cpu" as Owner }))}
              charById={charById}
              size={perSide}
            />
          </div>
        )}

        {/* Picker — only on your turn */}
        {myTurn && (
          <div className="mt-5">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search fighters…"
                  data-testid="input-pvp-search"
                  className="w-full rounded-lg border border-white/15 bg-black/40 py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
                />
              </div>
              <UniverseCombobox
                value={universeFilter}
                onChange={setUniverseFilter}
                options={universeOptions}
                totalCount={draftablePool.length}
                className="sm:w-52"
              />
            </div>
            {available.length === 0 ? (
              <div className="mt-3 rounded-xl border border-white/10 bg-black/30 py-12 text-center text-sm text-muted-foreground">
                No fighters match your search.
              </div>
            ) : (
            <div className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
              {available.map((c) => (
                <DraftPickCard
                  key={c.id}
                  char={c}
                  locked={busy}
                  onPick={() => void placePick(c.id)}
                  testId={`button-pvp-pick-${c.id}`}
                />
              ))}
            </div>
            )}
          </div>
        )}
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
  revealed,
  concealIdentity,
  isUpset,
  showOwners,
  onWatch,
}: {
  match: TournamentMatch;
  revealed: boolean;
  concealIdentity: boolean;
  isUpset: boolean;
  showOwners: boolean;
  onWatch: () => void;
}) {
  const canWatch = !!match.a && !!match.b;
  // Until a match is revealed, hide the outcome (winner highlight, blurb, Watch)
  // so the result builds drama match-by-match instead of showing the whole bracket.
  // For rounds past the first, also conceal the competitors themselves — their
  // identity is the result of an earlier (still-hidden) match, so showing them
  // would spoil who already advanced.
  const showResult = revealed && match.winnerId != null;
  const showUpset = showResult && isUpset;
  return (
    <div
      className={`relative rounded-lg border bg-black/30 p-2 transition-all duration-300 ${
        showUpset ? "border-amber-400/50" : showResult ? "border-white/10" : "border-white/5"
      } ${revealed ? "opacity-100 translate-y-0" : "opacity-40 translate-y-1"}`}
    >
      {showUpset && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-black shadow-[0_0_12px_rgba(251,191,36,0.6)]">
          ⚡ Upset
        </div>
      )}
      {concealIdentity ? (
        <>
          <PendingCompetitor />
          <div className="my-1 flex items-center justify-center">
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
              vs
            </span>
          </div>
          <PendingCompetitor />
          <div className="mt-2 flex items-center justify-center gap-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
            <Loader2 className="h-3 w-3 animate-spin" /> Awaiting fighters
          </div>
        </>
      ) : (
      <>
      <Competitor
        comp={match.a}
        won={showResult && match.winnerSide === 1}
        lost={showResult && match.winnerSide === 2}
        showOwners={showOwners}
      />
      <div className="my-1 flex items-center justify-center">
        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
          vs
        </span>
      </div>
      <Competitor
        comp={match.b}
        won={showResult && match.winnerSide === 2}
        lost={showResult && match.winnerSide === 1}
        showOwners={showOwners}
      />
      {!revealed && canWatch ? (
        <div className="mt-2 flex items-center justify-center gap-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
          <Loader2 className="h-3 w-3 animate-spin" /> Pending
        </div>
      ) : (
        <>
          {showResult && match.blurb && (
            <p className="mt-1.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
              {match.blurb}
            </p>
          )}
          <div className="mt-2 flex items-center justify-between gap-1">
            {showResult && match.difficulty && (
              <span
                className={`text-[9px] font-bold uppercase tracking-widest ${difficultyColor(match.difficulty)}`}
              >
                {match.fightType ?? match.difficulty}
              </span>
            )}
            {showResult && canWatch && (
              <button
                onClick={onWatch}
                className="ml-auto flex items-center gap-1 rounded-md bg-primary/20 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/30"
              >
                <Play className="h-3 w-3" /> Watch
              </button>
            )}
          </div>
        </>
      )}
      </>
      )}
    </div>
  );
}

function PendingCompetitor() {
  return (
    <div className="flex items-center gap-2 rounded-md px-1.5 py-1">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 border-white/10 bg-black/40">
        <Swords className="h-3.5 w-3.5 text-muted-foreground/50" />
      </div>
      <span className="truncate text-xs font-semibold text-muted-foreground/50">???</span>
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
