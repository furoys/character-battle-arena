import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/react";
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
  useGetMyTournamentRecord,
  getGetMyTournamentRecordQueryKey,
  useRecordTournamentResult,
  useGetTournamentLeaderboard,
  type Character,
  type Tournament,
  type TournamentMatch,
} from "@workspace/api-client-react";
import { useSimulateFightStream } from "@/hooks/use-simulate-fight-stream";
import { FightScreen } from "@/components/fight-screen";
import { useAgeMode } from "@/hooks/use-age-mode";
import { censorFightResult } from "@/lib/profanity-filter";
import { UniverseCombobox, type UniverseOption } from "@/components/universe-combobox";
import { DraftPickCard, type DraftTrait } from "@/components/draft-pick-card";

type Size = 8 | 16 | 32;

type WatchTarget = {
  a: { id: number; name: string; imageUrl: string | null };
  b: { id: number; name: string; imageUrl: string | null };
  // When the bracket recorded a risk/reward upset, the replay forces the
  // Underdog modifier so the watched narrative ends the same way it did live.
  upset: boolean;
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

// ── Draft power budget ───────────────────────────────────────────────────────
// Each fighter has a COST (1–10) from its summed stats on an ABSOLUTE scale
// (fixed thresholds, no roster distribution) so the client and server always
// agree. Each side gets budget = (size/2) * BUDGET_PER_PICK, forcing tradeoffs:
// you can field one or two marquee monsters, but never a whole team of them.
// KEEP IN SYNC with fighterCost()/draftBudget() in the API server
// (artifacts/api-server/src/routes/tournaments.ts).
const BUDGET_PER_PICK = 5;
function fighterCost(c: Character): number {
  const ps = powerScore(c);
  if (ps < 50_000) return 1;
  if (ps < 150_000) return 2;
  if (ps < 400_000) return 3;
  if (ps < 950_000) return 4;
  if (ps < 2_500_000) return 5;
  if (ps < 6_100_000) return 6;
  if (ps < 12_000_000) return 7;
  if (ps < 18_500_000) return 8;
  if (ps < 35_000_000) return 9;
  return 10;
}
// Risk/reward trait by cost. KEEP IN SYNC with fighterTrait() in the API server
// (artifacts/api-server/src/routes/tournaments.ts).
function fighterTrait(cost: number): DraftTrait {
  if (cost <= 3) return "underdog";
  if (cost >= 8) return "legend";
  return null;
}
function draftBudget(size: number): number {
  return Math.floor(size / 2) * BUDGET_PER_PICK;
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

// The CPU drafts under the SAME power budget as the player, so it can't just
// hoard max-stat fighters. Difficulty controls intent:
//   chill → leans toward weaker fun fighters (easy to beat)
//   rival → balanced fun spread
//   boss  → plays to win: when it picks AFTER you in a draft pair it counters the
//           exact fighter it will face (cheapest affordable that still beats it,
//           to conserve budget); otherwise it fields the strongest it can afford.
function cpuChoose(
  available: Character[],
  difficulty: CpuDifficulty,
  ctx: { remaining: number; slotsLeft: number; opponent: Character | null },
): Character | null {
  if (available.length === 0) return null;
  // Reserve at least 1 budget point for every remaining slot after this one so
  // the CPU never strands itself unable to fill its bracket.
  const ceiling = ctx.remaining - Math.max(0, ctx.slotsLeft - 1);
  const affordable = available.filter((c) => fighterCost(c) <= ceiling);
  if (affordable.length === 0) {
    return [...available].sort((a, b) => fighterCost(a) - fighterCost(b))[0] ?? null;
  }

  if (difficulty === "boss") {
    const strongest = [...affordable].sort((a, b) => powerScore(b) - powerScore(a));
    if (ctx.opponent) {
      const oppPow = powerScore(ctx.opponent);
      // Cheapest affordable fighter that still beats the known opponent — win the
      // matchup while spending as little budget as possible. If nothing in budget
      // can beat it, punt with the strongest affordable (best effort).
      const beats = affordable
        .filter((c) => powerScore(c) > oppPow)
        .sort(
          (a, b) => fighterCost(a) - fighterCost(b) || powerScore(b) - powerScore(a),
        );
      return beats[0] ?? strongest[0] ?? null;
    }
    // Picking first in the pair (you'll counter next): field the strongest it can
    // afford so you have to spend to beat it.
    return strongest[0] ?? null;
  }

  // chill / rival keep the "fun, recognizable" feel, constrained to affordable.
  const fun = affordable.filter(isFunPick);
  const pool = fun.length >= 3 ? fun : affordable;
  const ranked = [...pool].sort((a, b) => powerScore(b) - powerScore(a));
  const n = ranked.length;
  const weighted = ranked.map((c, i) => {
    const top = n - i; // strongest = n, weakest = 1
    let w = difficulty === "chill" ? i + 1 : n + top;
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

  // ── Server-side record + leaderboard (signed-in users persist across devices;
  // guests keep the localStorage record). ──────────────────────────────────────
  const { user, isSignedIn } = useUser();
  const myRecordQuery = useGetMyTournamentRecord({
    query: { enabled: !!isSignedIn, queryKey: getGetMyTournamentRecordQueryKey() },
  });
  const recordResult = useRecordTournamentResult();
  const leaderboardQuery = useGetTournamentLeaderboard();

  const displayName = useMemo(() => {
    const name =
      user?.firstName ||
      user?.username ||
      user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
      "Player";
    return name.slice(0, 24);
  }, [user]);

  // The record shown in the UI: server record for signed-in users, else local.
  const record = useMemo(() => {
    if (isSignedIn && myRecordQuery.data) {
      const r = myRecordQuery.data;
      return { wins: r.wins, losses: r.losses, streak: r.streak, best: r.best };
    }
    return {
      wins: cpuRecord.wins,
      losses: cpuRecord.losses,
      streak: cpuRecord.streak,
      best: cpuRecord.best,
    };
  }, [isSignedIn, myRecordQuery.data, cpuRecord]);

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
  // when the final match has been revealed. Signed-in users persist to the
  // server (cross-device + leaderboard); guests fall back to localStorage.
  const recordedCupRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!tournament || !allRevealed) return;
    // Only count the cup the user actually ran this session — reopened past or
    // community cups (loaded via the recent feed) must not move the record.
    if (tournament.id !== sessionCupId) return;
    if (draftChampOwner !== "user" && draftChampOwner !== "cpu") return;
    if (recordedCupRef.current.has(tournament.id)) return;
    recordedCupRef.current.add(tournament.id);
    const won = draftChampOwner === "user";

    if (isSignedIn) {
      recordResult.mutate(
        { data: { tournamentId: tournament.id, won, displayName } },
        {
          onSuccess: () => {
            void myRecordQuery.refetch();
            void leaderboardQuery.refetch();
          },
        },
      );
      return;
    }

    setCpuRecord((prev) => {
      const next = applyOutcome(prev, tournament.id, won);
      if (next === prev) return prev;
      try {
        localStorage.setItem(RECORD_KEY, JSON.stringify(next));
      } catch {
        /* localStorage unavailable — record stays in memory only */
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament, allRevealed, draftChampOwner, sessionCupId, isSignedIn]);

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
    const c = charById.get(id);
    if (!c) return;
    // Enforce the power budget client-side too (server is the source of truth):
    // reserve 1 point per remaining slot so the squad can always be filled.
    const budget = draftBudget(size);
    const userSpent = picks.reduce((s, p) => {
      if (p.owner !== "user") return s;
      const pc = charById.get(p.id);
      return s + (pc ? fighterCost(pc) : 0);
    }, 0);
    const slotsAfter = Math.max(0, size / 2 - userPicks.length - 1);
    if (fighterCost(c) > budget - userSpent - slotsAfter) return; // over budget
    setPicks((prev) => [...prev, { id, owner: "user" }]);
  }

  // CPU takes its turn (handles consecutive CPU picks in the snake order).
  useEffect(() => {
    if (phase !== "drafting" || currentOwner !== "cpu" || draftComplete) return;
    setCpuThinking(true);
    const pool = draftable.filter((c) => !pickedIds.has(c.id));
    const budget = draftBudget(size);
    const cpuSpent = picks.reduce((s, p) => {
      if (p.owner !== "cpu") return s;
      const c = charById.get(p.id);
      return s + (c ? fighterCost(c) : 0);
    }, 0);
    // When the CPU picks SECOND in a draft pair (odd index), it already knows the
    // fighter it will face in round 1 (the previous, user-owned pick) and can
    // counter it. When it picks first, the opponent is unknown.
    const idx = picks.length;
    const prevPick = idx % 2 === 1 ? picks[idx - 1] : undefined;
    const opponent =
      prevPick && prevPick.owner === "user" ? charById.get(prevPick.id) ?? null : null;
    const choice = cpuChoose(pool, cpuDifficulty, {
      remaining: budget - cpuSpent,
      slotsLeft: size / 2 - cpuPicks.length,
      opponent,
    });
    const t = setTimeout(() => {
      if (choice) setPicks((prev) => [...prev, { id: choice.id, owner: "cpu" }]);
      setCpuThinking(false);
    }, 550 + Math.random() * 350);
    return () => clearTimeout(t);
  }, [
    phase,
    currentOwner,
    draftComplete,
    draftable,
    pickedIds,
    cpuDifficulty,
    picks,
    charById,
    size,
    cpuPicks.length,
  ]);

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
    const upset = match.upset === true;
    const target: WatchTarget = {
      a: { id: match.a.id, name: match.a.name, imageUrl: match.a.imageUrl },
      b: { id: match.b.id, name: match.b.name, imageUrl: match.b.imageUrl },
      upset,
    };
    setWatchTarget(target);
    setWatchOpen(true);
    simulateFight.mutate({
      data: {
        team1: [target.a.id],
        team2: [target.b.id],
        mode: "cinematic",
        upset: false,
        // Force the bracket's recorded result: on an upset the Underdog modifier
        // re-points the win to the weaker fighter (and skips the shared cache).
        modifierId: upset ? "underdog" : null,
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

    // PvP "Draft a Friend" cups show both players' names in place of "You"/"CPU".
    // Detect PvP via the durable theme label (names may be blank if guests skip
    // them), and fall back to neutral PvP labels rather than "CPU" when blank.
    const isPvp = tournament.themeLabel === "PvP Draft";
    const userSideLabel = (tournament.creatorName ?? "").trim() || (isPvp ? "Host" : "You");
    const cpuSideLabel = (tournament.joinerName ?? "").trim() || (isPvp ? "Challenger" : "CPU");

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
              ownerText={
                !isDraft
                  ? null
                  : champOwner === "user"
                    ? isPvp
                      ? `${userSideLabel}'s champion`
                      : "Your champion"
                    : champOwner === "cpu"
                      ? isPvp
                        ? `${cpuSideLabel}'s champion`
                        : "CPU's champion"
                      : null
              }
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
                    <User className="h-3.5 w-3.5" /> {userSideLabel}
                  </div>
                  <div className="text-4xl font-black tabular-nums text-foreground">{userMatchWins}</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Wins</div>
                </div>
                <div className="flex flex-col items-center justify-center gap-1 border-x border-white/10 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {!allRevealed
                      ? "Running…"
                      : champOwner === "user"
                        ? `${userSideLabel} wins the cup`
                        : champOwner === "cpu"
                          ? `${cpuSideLabel} wins the cup`
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
                        ? `🏆 ${userSideLabel}`
                        : champOwner === "cpu"
                          ? `${cpuSideLabel} 🏆`
                          : "—"}
                  </div>
                </div>
                <div
                  className={`flex flex-col items-center justify-center gap-1 p-4 transition-colors ${
                    allRevealed && champOwner === "cpu" ? "bg-sky-400/15" : ""
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-sky-400">
                    <Cpu className="h-3.5 w-3.5" /> {cpuSideLabel}
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
                  <span className="text-[11px] font-bold uppercase tracking-widest text-primary">{userSideLabel}</span>
                  <span className={`text-3xl font-black ${userGrade.color}`}>{userGrade.grade}</span>
                </div>
                <div className="flex items-center justify-center gap-2 rounded-xl border border-sky-400/30 bg-sky-400/5 py-3">
                  <Cpu className="h-4 w-4 text-sky-400" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-sky-400">{cpuSideLabel}</span>
                  <span className={`text-3xl font-black ${cpuGrade.color}`}>{cpuGrade.grade}</span>
                </div>
              </div>
              {stealPick && (
                <div className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>
                    Steal of the draft:{" "}
                    <span className="font-bold text-amber-300">{stealPick.name}</span>
                    {stealPick.owner === "user"
                      ? ` (${userSideLabel})`
                      : stealPick.owner === "cpu"
                        ? ` (${cpuSideLabel})`
                        : ""}
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

          <div className="mt-3 flex gap-1.5 pb-4 sm:gap-3">
            {rounds.map((round, ri) => (
              <div key={ri} className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="mx-auto max-w-full truncate rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-center text-[10px] font-black uppercase tracking-widest text-primary">
                  {round.name}
                </div>
                <div className="flex flex-1 flex-col justify-around gap-2">
                  {round.matches.map((m) => {
                    const revealed = (matchOrder.get(m.matchId) ?? 0) < revealedMatches;
                    // Prefer the bracket's authoritative risk/reward upset flag.
                    // Fall back to a power comparison for older brackets that
                    // predate the field (lower-power fighter won = upset).
                    let isUpset = m.upset === true;
                    if (!isUpset && m.upset == null && m.winnerId != null && m.a && m.b) {
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
                modifierId: watchTarget.upset ? "underdog" : null,
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
    const userPower = userPicks.reduce((s, p) => {
      const c = charById.get(p.id);
      return s + (c ? powerScore(c) : 0);
    }, 0);
    const cpuPower = cpuPicks.reduce((s, p) => {
      const c = charById.get(p.id);
      return s + (c ? powerScore(c) : 0);
    }, 0);
    const totalPow = userPower + cpuPower;
    const userPowerPct = totalPow > 0 ? userPower / totalPow : 0.5;
    const budget = draftBudget(size);
    const userSpent = userPicks.reduce((s, p) => {
      const c = charById.get(p.id);
      return s + (c ? fighterCost(c) : 0);
    }, 0);
    const cpuSpent = cpuPicks.reduce((s, p) => {
      const c = charById.get(p.id);
      return s + (c ? fighterCost(c) : 0);
    }, 0);
    // Most expensive fighter the user can still afford for the NEXT pick (reserve
    // 1 point per remaining slot). Drives the gray-out of unaffordable cards.
    const userSlotsAfter = Math.max(0, size / 2 - userPicks.length - 1);
    const userCeiling = budget - userSpent - userSlotsAfter;
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

          {/* Snake-order pick tracker */}
          <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1">
            {draftOrder.map((o, i) => {
              const done = i < picks.length;
              const active = i === picks.length && !draftComplete;
              return (
                <div
                  key={i}
                  className={`flex h-6 min-w-6 flex-1 items-center justify-center rounded-md border text-[9px] font-black transition-all ${
                    o === "user"
                      ? done
                        ? "border-primary/60 bg-primary/25 text-primary"
                        : "border-primary/25 text-primary/60"
                      : done
                        ? "border-sky-400/60 bg-sky-400/25 text-sky-300"
                        : "border-sky-400/25 text-sky-400/60"
                  } ${active ? "turn-pulse scale-110 border-dashed" : ""}`}
                  style={
                    active
                      ? {
                          ["--turn-ring" as string]:
                            o === "user" ? "rgba(244,63,94,0.4)" : "rgba(56,189,248,0.4)",
                        }
                      : undefined
                  }
                  title={`Pick ${i + 1} — ${o === "user" ? "You" : "CPU"}`}
                >
                  {o === "user" ? "Y" : "C"}
                </div>
              );
            })}
          </div>

          {/* Squad columns */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <DraftSquad
              title="Your Squad"
              owner="user"
              picks={userPicks}
              charById={charById}
              size={size / 2}
              powerPct={userPowerPct}
            />
            <DraftSquad
              title="CPU Squad"
              owner="cpu"
              picks={cpuPicks}
              charById={charById}
              size={size / 2}
              powerPct={1 - userPowerPct}
            />
          </div>

          {/* Power budget meters */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <BudgetBar label="Your budget" spent={userSpent} total={budget} tone="user" />
            <BudgetBar label="CPU budget" spent={cpuSpent} total={budget} tone="cpu" />
          </div>
          <p className="mt-1.5 text-center text-[11px] leading-snug text-muted-foreground">
            Each fighter has a <span className="font-bold text-amber-300">cost</span> (1–10) by power.
            Spend your <span className="font-bold text-foreground">{budget}</span>-point budget wisely —
            you can't afford a whole team of titans, so counter the CPU's picks.
          </p>
          <p className="mt-1 text-center text-[11px] leading-snug text-muted-foreground">
            Risk vs reward: cheap <span className="font-bold text-emerald-300">Slayers</span> (cost ≤3)
            can pull off giant-slaying upsets, while pricey{" "}
            <span className="font-bold text-violet-300">Legends</span> (cost ≥8) are front-runners that
            can be toppled. Mid-tier fighters are the safe, reliable picks.
          </p>

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
                {availableFiltered.map((c) => {
                  const cost = fighterCost(c);
                  const locked = currentOwner !== "user" || cpuThinking || draftComplete;
                  const unaffordable = !locked && cost > userCeiling;
                  return (
                    <DraftPickCard
                      key={c.id}
                      char={c}
                      cost={cost}
                      trait={fighterTrait(cost)}
                      locked={locked}
                      unaffordable={unaffordable}
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
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-5">
          <div className="absolute inset-0 -z-0 opacity-30">
            <div className="champ-sweep absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
          <div className="relative flex items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/40 bg-primary/15">
              <Trophy className="h-6 w-6 text-primary" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase leading-none tracking-tight text-foreground">
                Tournament
              </h1>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary/80">
                Draft · Battle · Crown a champion
              </p>
            </div>
          </div>
          <p className="relative mt-3 text-sm text-muted-foreground">
            Pick your fighters one by one, then watch the bracket play out match by match.
          </p>
        </div>

        {/* Pick a mode */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {/* Draft a friend (async PvP) */}
          <button
            onClick={() => {
              setPvpInitialCode(null);
              setShowPvp(true);
            }}
            data-testid="button-draft-friend"
            className="group flex flex-col gap-2 rounded-2xl border border-sky-400/30 bg-sky-400/10 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-sky-400/60 hover:bg-sky-400/15"
          >
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 flex-shrink-0 text-sky-400" />
              <span className="text-sm font-black uppercase tracking-wide text-sky-300">Draft a Friend</span>
              <ChevronRight className="ml-auto h-5 w-5 flex-shrink-0 text-sky-400 transition-transform group-hover:translate-x-0.5" />
            </div>
            <span className="text-[11px] text-muted-foreground">
              Share a code, draft alternately, then both watch the same bracket play out.
            </span>
          </button>

          {/* Draft vs CPU (configured below) */}
          <div className="flex flex-col gap-2 rounded-2xl border border-primary/40 bg-primary/10 p-4">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 flex-shrink-0 text-primary" />
              <span className="text-sm font-black uppercase tracking-wide text-primary">Draft vs CPU</span>
              <span className="ml-auto rounded-full bg-primary/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary">
                Set up below
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Snake-draft against the computer, then run the bracket. Configure it below.
            </span>
          </div>
        </div>

        {/* Running record vs CPU */}
        {record.wins + record.losses > 0 && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Your record vs CPU
                  {isSignedIn ? (
                    <span className="ml-1 text-emerald-400/80">· synced</span>
                  ) : (
                    <span className="ml-1 text-muted-foreground/60">· this device</span>
                  )}
                </div>
                <div className="text-lg font-black tabular-nums text-foreground">
                  {record.wins}
                  <span className="text-muted-foreground"> – </span>
                  {record.losses}
                  <span className="ml-1 text-xs font-bold text-muted-foreground">
                    ({record.wins + record.losses} cups)
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-right">
              {record.streak !== 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Streak
                  </div>
                  <div
                    className={`text-base font-black ${
                      record.streak > 0 ? "text-primary" : "text-sky-400"
                    }`}
                  >
                    {record.streak > 0
                      ? `W${record.streak}`
                      : `L${Math.abs(record.streak)}`}
                  </div>
                </div>
              )}
              {record.best > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Best
                  </div>
                  <div className="text-base font-black text-amber-300">W{record.best}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Global leaderboard — best vs-CPU streaks across all signed-in players */}
        {leaderboardQuery.data && leaderboardQuery.data.length > 0 && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              <Crown className="h-3.5 w-3.5 text-amber-400" /> Leaderboard — best streaks
            </div>
            <div className="mt-2 divide-y divide-white/5">
              {leaderboardQuery.data.slice(0, 10).map((e, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5 text-sm">
                  <span className="w-5 text-right font-black tabular-nums text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate font-bold text-foreground">
                    {e.displayName}
                  </span>
                  <span className="text-xs font-black text-amber-300">W{e.best}</span>
                  <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">
                    {e.wins}–{e.losses}
                  </span>
                </div>
              ))}
            </div>
            {!isSignedIn && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Sign in to put your streak on the board.
              </p>
            )}
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
          <div className="mt-2 grid grid-cols-3 gap-2">
            {SIZE_OPTIONS.map((s) => {
              const selected = size === s;
              return (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-center transition-all ${
                    selected
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-white/15 text-muted-foreground hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-end gap-0.5" aria-hidden>
                    {Array.from({ length: Math.log2(s) }).map((_, i) => (
                      <span
                        key={i}
                        className={`w-1 rounded-sm ${selected ? "bg-primary" : "bg-white/30"}`}
                        style={{ height: 6 + i * 4 }}
                      />
                    ))}
                  </div>
                  <span className="text-lg font-black leading-none">{s}</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest">Fighters</span>
                </button>
              );
            })}
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
          <ol className="mt-2 space-y-1 text-xs text-muted-foreground">
            <li>1. Snake draft — you pick first, then alternate with the CPU.</li>
            <li>2. Round one pits your fighters against the CPU's.</li>
            <li>3. The bracket runs to a single champion.</li>
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
  creatorName: string | null;
  joinerName: string | null;
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
  const { user } = useUser();
  // Prefer the profile "@tag" (Clerk unsafeMetadata.username) the player chose
  // in-app, falling back to their Clerk username / first name.
  const suggestedName =
    (user?.unsafeMetadata?.username as string | undefined) ||
    user?.username ||
    user?.firstName ||
    "";
  const [view, setView] = useState<"menu" | "room">(initialCode ? "room" : "menu");
  const [createSize, setCreateSize] = useState<Size>(8);
  const [nameInput, setNameInput] = useState(suggestedName);
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

  // Prefill the name field from the signed-in Clerk profile once it loads.
  useEffect(() => {
    if (suggestedName) setNameInput((prev) => (prev ? prev : suggestedName));
  }, [suggestedName]);

  async function createDraft() {
    setBusy(true);
    setError(null);
    try {
      const r = await apiFetch("/api/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ size: createSize, name: nameInput.trim() || undefined }),
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
        body: JSON.stringify({ name: nameInput.trim() || undefined }),
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
  const myRawName = role === "creator" ? session?.creatorName : session?.joinerName;
  const oppRawName = role === "creator" ? session?.joinerName : session?.creatorName;
  const myName = (myRawName ?? "").trim() || "You";
  const oppName = (oppRawName ?? "").trim() || "Opponent";
  const myPower = myPicks.reduce((s, p) => {
    const c = charById.get(p.id);
    return s + (c ? powerScore(c) : 0);
  }, 0);
  const oppPower = oppPicks.reduce((s, p) => {
    const c = charById.get(p.id);
    return s + (c ? powerScore(c) : 0);
  }, 0);
  const totalPvpPower = myPower + oppPower;
  const myPowerPct = totalPvpPower > 0 ? myPower / totalPvpPower : 0.5;

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
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.universe.toLowerCase().includes(q));
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

          {/* Your name (shared by create + join) */}
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
            <label
              htmlFor="pvp-name"
              className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
            >
              Your name
            </label>
            <input
              id="pvp-name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="e.g. Alex"
              maxLength={24}
              data-testid="input-pvp-name"
              className="mt-2 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-sky-400 focus:outline-none"
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Shown to your friend during the draft and on the final bracket.
            </p>
          </div>

          {/* Create */}
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
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
              <Loader2 className="h-4 w-4 animate-spin" /> {oppName} is picking…
            </span>
          )}
        </div>

        {/* Squads */}
        {session && session.status !== "open" && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <DraftSquad
              title={myName}
              owner="user"
              picks={myPicks.map((p) => ({ id: p.id, owner: "user" as Owner }))}
              charById={charById}
              size={perSide}
              powerPct={myPowerPct}
              isCpuSide={false}
            />
            <DraftSquad
              title={oppName}
              owner="cpu"
              picks={oppPicks.map((p) => ({ id: p.id, owner: "cpu" as Owner }))}
              charById={charById}
              size={perSide}
              powerPct={1 - myPowerPct}
              isCpuSide={false}
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

// Compact spent/total budget meter for one side of the draft.
function BudgetBar({
  label,
  spent,
  total,
  tone,
}: {
  label: string;
  spent: number;
  total: number;
  tone: "user" | "cpu";
}) {
  const pct = total > 0 ? Math.min(100, (spent / total) * 100) : 0;
  const over = spent > total;
  const bar = over ? "bg-rose-500" : tone === "user" ? "bg-primary" : "bg-sky-400";
  const accent = tone === "user" ? "text-primary" : "text-sky-400";
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-2.5">
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
        <span className={accent}>{label}</span>
        <span className={`tabular-nums ${over ? "text-rose-400" : "text-muted-foreground"}`}>
          {spent}/{total}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all ${bar}`}
          style={{ width: `${pct}%` }}
        />
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
  powerPct,
  isCpuSide,
}: {
  title: string;
  owner: Owner;
  picks: Pick[];
  charById: Map<number, Character>;
  size: number;
  /** Share of combined squad power (0–1) — drives the strength bar. */
  powerPct?: number;
  /** When true, show a CPU icon; otherwise a user icon (PvP both sides are people). */
  isCpuSide?: boolean;
}) {
  const accent = owner === "user" ? "text-primary" : "text-sky-400";
  const ring = owner === "user" ? "border-primary/30" : "border-sky-400/30";
  const barColor = owner === "user" ? "bg-primary" : "bg-sky-400";
  const showCpuIcon = isCpuSide ?? owner === "cpu";
  return (
    <div className={`rounded-xl border ${ring} bg-black/30 p-2.5`}>
      <div className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest ${accent}`}>
        {showCpuIcon ? <Cpu className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
        <span className="truncate">{title}</span>
        <span className="ml-auto text-muted-foreground">
          {picks.length}/{size}
        </span>
      </div>
      {powerPct != null && (
        <div className="mt-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full ${barColor} transition-all duration-500`}
              style={{ width: `${Math.round(Math.max(0, Math.min(1, powerPct)) * 100)}%` }}
            />
          </div>
          <div className="mt-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            Squad power
          </div>
        </div>
      )}
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
  ownerText,
}: {
  tournament: Tournament;
  champion: Character | null;
  ownerLabel?: Owner | null;
  ownerText?: string | null;
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

  // Rising embers behind the champion — randomized once per mount.
  const embers = useMemo(
    () =>
      Array.from({ length: 18 }).map(() => ({
        left: Math.random() * 100,
        drift: `${(Math.random() - 0.5) * 70}px`,
        delay: Math.random() * 3,
        dur: 3.2 + Math.random() * 2.6,
        size: 3 + Math.random() * 5,
      })),
    [],
  );

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
      {/* Atmosphere: light rays + rising embers behind the content */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="victory-light-ray absolute left-1/2 top-0 h-full w-40 -translate-x-1/2 bg-gradient-to-b from-amber-300/25 to-transparent blur-2xl" />
        <div className="victory-light-ray absolute left-1/4 top-0 h-full w-24 -translate-x-1/2 bg-gradient-to-b from-amber-400/15 to-transparent blur-2xl" style={{ animationDelay: "0.8s" }} />
        <div className="victory-light-ray absolute left-3/4 top-0 h-full w-24 -translate-x-1/2 bg-gradient-to-b from-amber-400/15 to-transparent blur-2xl" style={{ animationDelay: "1.6s" }} />
        {embers.map((e, i) => (
          <span
            key={i}
            className="champ-ember bg-amber-300"
            style={{
              left: `${e.left}%`,
              width: e.size,
              height: e.size,
              ["--drift" as string]: e.drift,
              ["--dur" as string]: `${e.dur}s`,
              ["--delay" as string]: `${e.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="relative flex items-center justify-center gap-2 text-amber-400">
        <Crown className="victory-crown h-5 w-5" />
        <span className="text-[11px] font-black uppercase tracking-[0.3em]">
          {tournament.name} Champion
        </span>
        <Crown className="victory-crown h-5 w-5" />
      </div>
      <div className="relative mt-4 flex flex-col items-center">
        <div className="relative">
          <div aria-hidden className="absolute inset-0 -z-10 rounded-full bg-amber-400/30 blur-2xl victory-glow-pulse" />
          {championPortrait ? (
            <img
              src={championPortrait}
              alt={tournament.championName}
              className="victory-portrait-rise h-28 w-28 rounded-full border-2 border-amber-400 object-cover shadow-[0_0_40px_rgba(251,191,36,0.5)]"
            />
          ) : (
            <div className="victory-portrait-rise flex h-28 w-28 items-center justify-center rounded-full border-2 border-amber-400 bg-black/40">
              <Trophy className="h-12 w-12 text-amber-400" />
            </div>
          )}
        </div>
        <h1 className="victory-slam mt-3 text-3xl font-black uppercase tracking-tight text-foreground">
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
                <User className="h-3.5 w-3.5" /> {ownerText ?? "Your champion"}
              </>
            ) : (
              <>
                <Cpu className="h-3.5 w-3.5" /> {ownerText ?? "CPU's champion"}
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
        showUpset
          ? "border-amber-400/50 shadow-[0_0_18px_rgba(251,191,36,0.18)]"
          : showResult
            ? "border-white/10"
            : "border-white/5"
      } ${revealed ? "opacity-100 translate-y-0" : "opacity-40 translate-y-1"} ${
        showResult ? "bracket-pop" : ""
      }`}
    >
      {showUpset && (
        <div className="upset-shake absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-black shadow-[0_0_12px_rgba(251,191,36,0.6)]">
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
        className={`min-w-0 truncate text-xs font-semibold ${won ? "text-amber-300" : "text-foreground"}`}
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
