// ── Daily themes ─────────────────────────────────────────────────────────────
// Day-of-week themed lineup selection. Every day of the week gets a "vibe":
// Marvel Monday, Anime Friday, etc. Within each theme bucket we walk a
// pre-shuffled list using a week-index offset, so the same matchup never
// reappears until the entire bucket has been cycled through. This is a hard
// no-repeat guarantee (per theme), as opposed to the previous pure-random
// Fisher-Yates that statistically averaged ~20 days between repeats but
// could occasionally pair-up the same matchup in adjacent weeks.
//
// Lineup-stability invariant: once `ensureDailyRows` materializes a date,
// those rows ARE the canonical lineup. This module's selection only affects
// dates that have NOT been materialized yet. Already-stored dates are never
// reshuffled by a code change here — that's enforced in routes/daily.ts.

import { DAILY_POOL, type DailyPoolEntry, DAILY_LINEUP_SIZE } from "./dailyPool";

// ── Theme types ──────────────────────────────────────────────────────────────
export type ThemeKey =
  | "marvel"
  | "dc"
  | "anime"
  | "gaming"
  | "throwdown"   // horror / villains / slashers
  | "team"        // multi-character team battles
  | "wildcard";   // cross-universe & everything else

export type DailyTheme = {
  key: ThemeKey;
  label: string;       // header label, e.g. "MARVEL MONDAY"
  blurb: string;       // one-line subhead description
};

// JS Date.getUTCDay(): 0 = Sunday, 1 = Monday, ..., 6 = Saturday.
// (We compute the day of week off the ET-anchored calendar date string, so
// "Sunday" here means the lineup that drops at 8pm ET on Saturday and runs
// through 8pm ET Sunday — i.e. the lineup the user sees on Sunday evening.)
const DAY_THEMES: Record<number, DailyTheme> = {
  0: { key: "dc",        label: "DC SUNDAY",          blurb: "Heroes & villains of the Distinguished Competition." },
  1: { key: "marvel",    label: "MARVEL MONDAY",      blurb: "Earth's Mightiest. Mutants. Cosmic gods." },
  2: { key: "team",      label: "TEAM-UP TUESDAY",    blurb: "Squads, factions, and roster-wide brawls." },
  3: { key: "wildcard",  label: "WILDCARD WEDNESDAY", blurb: "Cross-universe carnage. Anything goes." },
  4: { key: "throwdown", label: "THROWDOWN THURSDAY", blurb: "Slashers, dark lords, and the worst people alive." },
  5: { key: "anime",     label: "ANIME FRIDAY",       blurb: "Shonen titans, demon kings, and ultimate quirks." },
  6: { key: "gaming",    label: "SMASH SATURDAY",     blurb: "Boss battles from the games you grew up on." },
};

// ── Keyword tags ─────────────────────────────────────────────────────────────
// Lowercase substrings to detect each theme from an entry's `id` or `title`.
// Keep these tight — anything that's only ambiguously in a theme should fall
// through to `wildcard` instead of polluting two buckets and reducing the
// effective no-repeat window for that theme.

const MARVEL_KEYS = [
  "spider", "iron-man", "iron man", "thor", "hulk", "captain-america", "captain america",
  "wolverine", "deadpool", "xmen", "x-men", "avengers", "magneto", "professor-x", "professor x",
  "phoenix", "jean", "storm", "cyclops", "venom", "carnage", "thanos", "galactus",
  "sentry", "knull", "dormammu", "mephisto", "fantastic-four", "fantastic four",
  "punisher", "daredevil", "moon-knight", "moon knight", "black-panther", "black panther",
  "scarlet-witch", "scarlet witch", "dr-strange", "strange", "doctor doom", "-doom-", "doom-",
  "silver-surfer", "silver surfer", "hela", "apocalypse", "gambit", "colossus",
  "iceman", "hawkeye", "adam-warlock", "adam warlock", "beta-ray", "beta ray",
  "emma-frost", "emma frost", "psylocke", "bishop", "cable", "wanda", "loki",
  "she-hulk", "luke-cage", "luke cage", "iron-fist", "iron fist", "miles",
  "sabretooth", "winter-soldier", "winter soldier", "hyperion", "onslaught",
  "living-tribunal", "living tribunal", "ghost-rider", "ghost rider",
];

const DC_KEYS = [
  "batman", "superman", "joker", "flash", "aquaman", "wonder-woman", "wonder woman",
  "green-lantern", "green lantern", "darkseid", "brainiac", "lex", "luthor",
  "nightwing", "red-hood", "red hood", "robin", "riddler", "bane", "raven",
  "trigon", "catwoman", "titans", "justice-league", "justice league",
  "legion-of-doom", "legion of doom", "cyborg", "doomsday", "general-zod", "general zod",
  "doctor-manhattan", "doctor manhattan", "anti-monitor", "sinestro", "atrocitus",
  "larfleeze", "mongul", "ras-al-ghul", "ra's al ghul", "wally", "barry",
  "deathstroke", "dr-fate", "dr fate", "scarecrow", "killer-croc",
  "harley", "kgbeast", "bat-family", "bat family", "gl-corps", "gl corps",
];

const ANIME_KEYS = [
  "goku", "vegeta", "naruto", "sasuke", "itachi", "gojo", "sukuna", "saitama",
  "luffy", "zoro", "kaido", "whitebeard", "ichigo", "yhwach", "hitsugaya",
  "all-might", "all might", "deku", "bakugo", "endeavor", "all-for-one", "all for one",
  "garou", "mob", "edward", "roy", "rimuru", "meruem", "asta", "yuno",
  "kenshiro", "jotaro", "denji", "power", "makima", "light", "-l-", "vs-l",
  "akaza", "kokushibo", "doma", "alucard", "yusuke", "broly", "frieza", "cell",
  "gohan", "beerus", "jiren", "father", "aizen", "kira", "saiyan", "shinigami",
  "bleach", "naruto-", "jjk", "mha", "dbz", "anime",
];

const GAMING_KEYS = [
  "kratos", "doomslayer", "doom-slayer", "doom slayer", "master-chief", "master chief",
  "sub-zero", "scorpion", "raiden", "ryu", "akuma", "bison",
  "cloud", "sephiroth", "vergil", "dante", "bayonetta",
  "link", "ganondorf", "mario", "bowser", "pikachu", "mewtwo", "charizard",
  "arceus", "rayquaza", "samus", "geralt", "aloy", "ellie", "lara", "nathan",
  "knuckles", "sonic", "jin-sakai", "jin sakai", "solid-snake", "solid snake",
  "t1000", "t-1000", "t800", "t-800", "robocop", "tomb",
];

const THROWDOWN_KEYS = [
  "pennywise", "freddy", "jason", "michael-myers", "michael myers", "pinhead",
  "voldemort", "sauron", "saruman", "vader", "darth", "kylo", "palpatine",
  "hannibal", "chucky", "dracula", "horror", "predator", "alien", "xenomorph",
  "terminator", "night-king", "night king", "ash", "judge-dredd", "judge dredd",
  "rambo", "boba-fett", "boba fett", "boogeyman", "slasher",
];

const TEAM_KEYS = [
  "avengers-vs", "justice-league-vs", "legion-of-doom", "bat-family",
  "teen-titans", "z-fighters", "akatsuki", "marvel-cosmic", "dc-cosmic",
  "sorcerers-summit", "speedsters-relay", "billionaires-with-toys",
  "street-tier-war", "fantastic-four-vs", "four-horsemen", "devils-vs-angels",
  "gl-corps-vs", "sinestro-corps", "bleach-vs-naruto", "mha-vs-jjk",
  "horror-icons", "devil-summit", "dc-women", "marvel-women", "chainsaw-vs",
];

function containsAny(haystack: string, needles: string[]): boolean {
  for (const n of needles) {
    if (haystack.includes(n)) return true;
  }
  return false;
}

// Returns the set of themes this entry naturally belongs to. An entry can
// belong to multiple (e.g. "avengers-vs-justice-league" is marvel + dc +
// team). We use ALL of them at bucket-build time so each themed day pulls
// from the largest plausible pool.
export function inferThemes(entry: DailyPoolEntry): Set<ThemeKey> {
  const hay = (entry.id + " " + entry.title).toLowerCase();
  const teamSize = entry.team1Ids.length + entry.team2Ids.length;
  const out = new Set<ThemeKey>();
  if (containsAny(hay, MARVEL_KEYS)) out.add("marvel");
  if (containsAny(hay, DC_KEYS)) out.add("dc");
  if (containsAny(hay, ANIME_KEYS)) out.add("anime");
  if (containsAny(hay, GAMING_KEYS)) out.add("gaming");
  if (containsAny(hay, THROWDOWN_KEYS)) out.add("throwdown");
  if (teamSize >= 5 || containsAny(hay, TEAM_KEYS)) out.add("team");
  // Wildcard always includes everything so it's a safe filler / standalone bucket.
  out.add("wildcard");
  return out;
}

// ── PRNG (mulberry32) ────────────────────────────────────────────────────────
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function themeSeed(key: ThemeKey): number {
  // Cheap deterministic 32-bit hash so each theme has a stable, distinct
  // initial shuffle order across server restarts.
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ── Bucket build (memoized; pure over DAILY_POOL) ─────────────────────────────
type BucketMap = Map<ThemeKey, DailyPoolEntry[]>;

let _buckets: BucketMap | null = null;

function buildBuckets(): BucketMap {
  const themes: ThemeKey[] = ["marvel", "dc", "anime", "gaming", "throwdown", "team", "wildcard"];
  const map: BucketMap = new Map(themes.map((t) => [t, [] as DailyPoolEntry[]]));
  for (const entry of DAILY_POOL) {
    const ts = inferThemes(entry);
    for (const t of ts) {
      map.get(t)!.push(entry);
    }
  }
  // Per-bucket deterministic Fisher-Yates so the walk order is stable across
  // server restarts but distinct between themes.
  for (const t of themes) {
    const list = map.get(t)!;
    const rng = mulberry32(themeSeed(t));
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = list[i]!;
      list[i] = list[j]!;
      list[j] = tmp;
    }
  }
  return map;
}

function getBuckets(): BucketMap {
  if (_buckets === null) _buckets = buildBuckets();
  return _buckets;
}

// ── Date helpers ─────────────────────────────────────────────────────────────
function epochDaysFromDate(dateStr: string): number {
  return Math.floor(Date.UTC(
    Number(dateStr.slice(0, 4)),
    Number(dateStr.slice(5, 7)) - 1,
    Number(dateStr.slice(8, 10)),
  ) / 86400000);
}

function dayOfWeekFromDate(dateStr: string): number {
  // dateStr is the ET-anchored calendar date (see getDailyDateString). We
  // anchor at UTC midnight to read the weekday; this matches calendar intuition
  // for ET dates within the same hour-of-day band, which is all that matters
  // for "which day's theme is it".
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.getUTCDay();
}

// ── Public API ───────────────────────────────────────────────────────────────
export function getDailyThemeForDate(dateStr: string): DailyTheme {
  return DAY_THEMES[dayOfWeekFromDate(dateStr)]!;
}

// Themed lineup for a given date. Walks DAILY_LINEUP_SIZE entries through
// the theme bucket starting at offset = (weekIndex * LINEUP_SIZE) % size.
// This means every entry in the theme's bucket appears once before any
// matchup repeats on that day-of-week. Then we do a tiny per-day re-shuffle
// inside the chosen slice so the display order on the page varies day to day
// even though the underlying 10 are the same that "themed week" within the
// cycle.
export function getThemedDailyMatchupsForDate(
  dateStr: string,
  count: number = DAILY_LINEUP_SIZE,
): { theme: DailyTheme; entries: DailyPoolEntry[] } {
  const theme = getDailyThemeForDate(dateStr);
  const buckets = getBuckets();
  const bucket = buckets.get(theme.key) ?? [];
  // If the themed bucket somehow can't supply enough distinct entries, fall
  // back to wildcard (which is the full pool) for the gap. Should never
  // trigger with the current pool (smallest themed bucket is `throwdown` at
  // 20+), but keeps the function total in the face of future pool edits.
  let pool: DailyPoolEntry[] = bucket;
  if (pool.length < count) {
    const wildcard = buckets.get("wildcard") ?? [];
    const seen = new Set(pool.map((e) => e.id));
    pool = [...pool, ...wildcard.filter((e) => !seen.has(e.id))];
  }
  if (pool.length === 0) {
    return { theme, entries: [] };
  }
  const epochDays = epochDaysFromDate(dateStr);
  // weekIndex changes every 7 epoch days. Each week, the same day-of-week
  // walks forward by `count` entries through the bucket. Negative-safe mod.
  const weekIndex = Math.floor(epochDays / 7);
  const size = pool.length;
  const offset = (((weekIndex * count) % size) + size) % size;
  const picks: DailyPoolEntry[] = [];
  for (let i = 0; i < count; i++) {
    picks.push(pool[(offset + i) % size]!);
  }
  // Per-day display-order reshuffle of the chosen 10 (doesn't change the
  // contents, just the order, so the page doesn't look stagnant when a
  // matchup repeats every full theme-cycle).
  const dayRng = mulberry32(Math.imul(epochDays + 1, 2654435761));
  for (let i = picks.length - 1; i > 0; i--) {
    const j = Math.floor(dayRng() * (i + 1));
    const tmp = picks[i]!;
    picks[i] = picks[j]!;
    picks[j] = tmp;
  }
  return { theme, entries: picks };
}

// Debug helper — used by tests or admin tooling to inspect how big each
// themed bucket ended up after keyword inference. Not used in request paths.
export function getThemeBucketSizes(): Record<ThemeKey, number> {
  const buckets = getBuckets();
  const out = {} as Record<ThemeKey, number>;
  for (const [k, v] of buckets) out[k] = v.length;
  return out;
}
