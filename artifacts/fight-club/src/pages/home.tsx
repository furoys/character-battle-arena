import { useState, useMemo, useRef, useEffect } from "react";
import { useListCharacters } from "@workspace/api-client-react";
import { useSimulateFightStream } from "@/hooks/use-simulate-fight-stream";
import { Character } from "@workspace/api-client-react/src/generated/api.schemas";
import { CharacterCard } from "@/components/character-card";
import { useToast } from "@/hooks/use-toast";
import { FightScreen } from "@/components/fight-screen";
import { AvaLogo } from "@/components/ava-logo";
import { useAgeMode } from "@/hooks/use-age-mode";
import { censorFightResult } from "@/lib/profanity-filter";
import { Search, Shuffle, Swords, X, Zap, AlertTriangle, Link, EyeOff, LogIn } from "lucide-react";
import { Link as NavLink, useLocation } from "wouter";
import { Show, useUser } from "@clerk/react";
import { CharacterAvatar } from "@/components/character-avatar";
import { computeSynergy } from "@/lib/synergies";
import { powerAvg, powerTier } from "@/components/roster-flip-card";
import { getUniverseCategory, CATEGORY_ORDER, CATEGORY_COLORS } from "@/lib/universe-categories";

// ─── localStorage helpers ────────────────────────────────────────────────────
function readLS<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback; }
  catch { return fallback; }
}
function writeLS(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

type ActiveFilter = null | "__faves__" | "__recent__" | string;

// ─── Corner bracket decoration ──────────────────────────────────────────────
function Brackets({ color, size = 10 }: { color: string; size?: number }) {
  const s: React.CSSProperties = { position: "absolute", width: size, height: size };
  const b = `2px solid ${color}`;
  return (
    <>
      <div style={{ ...s, top: -1, left: -1, borderTop: b, borderLeft: b }} />
      <div style={{ ...s, top: -1, right: -1, borderTop: b, borderRight: b }} />
      <div style={{ ...s, bottom: -1, left: -1, borderBottom: b, borderLeft: b }} />
      <div style={{ ...s, bottom: -1, right: -1, borderBottom: b, borderRight: b }} />
    </>
  );
}

// ─── Team portrait thumbnail ─────────────────────────────────────────────────
function TeamPortrait({ character, team, onRemove }: { character: Character; team: 1 | 2; onRemove: () => void }) {
  const color = team === 1 ? "#00f0ff" : "#ff3b30";
  const initials = character.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div
      className="relative overflow-hidden flex-shrink-0"
      style={{ width: 32, height: 42, border: `1.5px solid ${color}40`, boxShadow: `0 0 8px ${color}20` }}
    >
      {character.imageUrl ? (
        <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover object-top" />
      ) : (
        <div className="w-full h-full flex items-center justify-center font-display font-bold text-xs" style={{ background: `${color}15`, color }}>
          {initials}
        </div>
      )}
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)" }} />
      <div className="absolute bottom-0.5 left-0 right-0 text-center">
        <span className="text-[7px] font-bold uppercase truncate px-0.5 leading-none" style={{ color }}>
          {character.name.split(" ")[0]}
        </span>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onRemove(); }}
        className="absolute top-0.5 right-0.5 w-3.5 h-3.5 flex items-center justify-center transition-colors"
        style={{ background: "rgba(0,0,0,0.7)" }}
      >
        <X className="w-2 h-2 text-white" />
      </button>
    </div>
  );
}

// ─── Team slot ───────────────────────────────────────────────────────────────
function TeamSlot({ team, members, active, onActivate, onRemove }: {
  team: 1 | 2;
  members: Character[];
  active: boolean;
  onActivate: () => void;
  onRemove: (id: number) => void;
}) {
  const color = team === 1 ? "#00f0ff" : "#ff3b30";
  const dimColor = team === 1 ? "rgba(0,240,255,0.08)" : "rgba(255,59,48,0.08)";
  const glowColor = team === 1 ? "rgba(0,240,255,0.25)" : "rgba(255,59,48,0.25)";
  const totalPower = members.reduce((s, c) => s + c.strength + c.speed + c.intelligence + c.durability, 0);

  return (
    <div
      className="flex-1 relative cursor-pointer transition-all duration-200 select-none overflow-hidden"
      style={{
        background: active ? dimColor : "rgba(255,255,255,0.02)",
        border: `1px solid ${active ? color + "60" : "rgba(255,255,255,0.08)"}`,
        boxShadow: active ? `0 0 24px ${glowColor}` : "none",
        padding: "6px 8px 4px",
        minWidth: 0,
      }}
      onClick={onActivate}
    >
      {/* Corner brackets when active */}
      {active && <Brackets color={color} size={8} />}

      {/* Header row */}
      <div className="flex items-center justify-between mb-1.5">
        <span
          className="font-display text-sm uppercase tracking-[0.2em] leading-none"
          style={{ color: active ? color : "rgba(255,255,255,0.3)" }}
        >
          Team {team}
        </span>
        <div className="flex items-center gap-1.5">
          {members.length > 0 && (
            <span className="font-display text-[9px]" style={{ color: `${color}90` }}>
              {totalPower >= 1_000_000 ? `${+(totalPower / 1_000_000).toFixed(1)}M` : totalPower >= 1_000 ? `${Math.round(totalPower / 1_000)}K` : totalPower} PWR
            </span>
          )}
          <span
            className="text-[9px] font-bold px-1 py-0.5 leading-none"
            style={{
              background: active ? `${color}20` : "rgba(255,255,255,0.05)",
              color: active ? color : "rgba(255,255,255,0.25)",
            }}
          >
            {members.length}/5
          </span>
        </div>
      </div>

      {/* Portraits — scrollable so they never overflow onto the FIGHT button */}
      <div className="flex gap-1 min-h-[42px] items-end overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {members.map(c => (
          <TeamPortrait key={c.id} character={c} team={team} onRemove={() => onRemove(c.id)} />
        ))}
        {members.length < 5 && (
          <div
            className="flex-shrink-0 flex items-center justify-center"
            style={{
              width: 32, height: 42,
              border: `1px dashed ${active ? color + "35" : "rgba(255,255,255,0.08)"}`,
            }}
          >
            <span style={{ color: active ? `${color}50` : "rgba(255,255,255,0.12)", fontSize: 18, fontWeight: 300, lineHeight: 1 }}>+</span>
          </div>
        )}
        {members.length > 0 && members.length < 4 && (
          <div className="flex items-end pb-1 pl-0.5">
            <span className="text-[9px] font-bold" style={{ color: active ? `${color}30` : "rgba(255,255,255,0.1)" }}>
              +{5 - members.length - 1}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Power bar comparison ────────────────────────────────────────────────────
// Uses logarithmic scoring so a 10M-stat cosmic character properly dominates
// a 1K-stat street fighter, instead of raw sums where one huge number swamps all.
function logPowerScore(c: Character): number {
  const stats = [c.strength, c.speed, c.intelligence, c.durability];
  // Average the log10 of each stat (clamped to min 100 so log stays ≥ 2)
  const logAvg = stats.reduce((s, v) => s + Math.log10(Math.max(100, v)), 0) / 4;
  return Math.pow(10, logAvg);
}

function PowerComparison({ team1, team2 }: { team1: Character[]; team2: Character[] }) {
  const p1 = team1.reduce((s, c) => s + logPowerScore(c), 0);
  const p2 = team2.reduce((s, c) => s + logPowerScore(c), 0);
  if (p1 === 0 && p2 === 0) return null;
  const total = p1 + p2 || 1;
  const pct1 = Math.round((p1 / total) * 100);
  const pct2 = 100 - pct1;
  const gap = Math.abs(pct1 - pct2);
  let prediction = "";
  let predColor = "rgba(255,255,255,0.2)";
  if (p1 > 0 && p2 > 0) {
    if (gap < 5) { prediction = "EVEN MATCH"; predColor = "#ffd700"; }
    else if (pct1 > pct2) { prediction = `T1 FAVORED`; predColor = "#00f0ff"; }
    else { prediction = `T2 FAVORED`; predColor = "#ff3b30"; }
  }
  return (
    <div className="px-2 pb-1">
      <div className="h-0.5 flex overflow-hidden">
        <div className="h-full transition-all duration-700" style={{ width: `${pct1}%`, background: "linear-gradient(to right, #00f0ff80, #00f0ff)" }} />
        <div className="h-full transition-all duration-700" style={{ width: `${pct2}%`, background: "linear-gradient(to left, #ff3b3080, #ff3b30)" }} />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[8px] font-bold" style={{ color: "#00f0ff80" }}>{pct1}%</span>
        <span className="text-[8px] font-bold text-center" style={{ color: predColor }}>{prediction || "PWR RATIO"}</span>
        <span className="text-[8px] font-bold" style={{ color: "#ff3b3080" }}>{pct2}%</span>
      </div>
    </div>
  );
}

// ─── Universe filter pill ────────────────────────────────────────────────────
function UniversePill({ label, count, active, onClick }: { label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 flex items-center gap-1 transition-all duration-150"
      style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        padding: "3px 8px",
        border: active ? "1px solid rgba(255,0,85,0.7)" : "1px solid rgba(255,255,255,0.1)",
        background: active ? "rgba(255,0,85,0.15)" : "rgba(255,255,255,0.03)",
        color: active ? "#ff0055" : "rgba(255,255,255,0.4)",
      }}
    >
      {label}
      {count !== undefined && (
        <span style={{ color: active ? "rgba(255,0,85,0.7)" : "rgba(255,255,255,0.2)", fontSize: 8 }}>{count}</span>
      )}
    </button>
  );
}

// ─── Profile button used in the unified top bar ──────────────────────────────
function HomeProfileButton() {
  const { user } = useUser();
  const name =
    (user?.unsafeMetadata?.username as string) ||
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "You";
  const initial = name.charAt(0).toUpperCase();
  return (
    <NavLink href="/profile">
      <button
        className="flex items-center gap-2 px-1.5 py-0.5 transition-all hover:bg-primary/10 rounded"
        title={`Signed in as ${name}`}
      >
        <span
          className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          {name}
        </span>
        <CharacterAvatar size={28} fallbackInitial={initial} />
      </button>
    </NavLink>
  );
}

// ─── Home page ───────────────────────────────────────────────────────────────
export function Home() {
  const { data: characters, isLoading } = useListCharacters();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [team1, setTeam1] = useState<Character[]>([]);
  const [team2, setTeam2] = useState<Character[]>([]);
  const [activeTeam, setActiveTeam] = useState<1 | 2>(1);
  const [showModal, setShowModal] = useState(false);
  const [showRefusal, setShowRefusal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>(null);
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [showChallengeMenu, setShowChallengeMenu] = useState(false);
  const [creatingChallenge, setCreatingChallenge] = useState(false);

  // Progressive rendering state — actual IntersectionObserver is wired AFTER filteredCharacters
  const INITIAL_VISIBLE = 80;
  const PAGE_SIZE = 60;
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset visible count whenever the filter/search changes.
  // When a specific universe is selected, show all its characters immediately.
  // Only cap to INITIAL_VISIBLE when browsing "All" (955 chars) or special filters.
  useEffect(() => {
    const isSpecificUniverse = activeFilter !== null && activeFilter !== "__recent__" && activeFilter !== "__faves__";
    setVisibleCount(isSpecificUniverse ? 9999 : INITIAL_VISIBLE);
  }, [searchQuery, activeFilter, tierFilter]);

  // Load a pending fight from the Suggest page (written to localStorage before navigating here)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("ava_pending_fight");
      if (!raw) return;
      localStorage.removeItem("ava_pending_fight");
      const { team1, team2 } = JSON.parse(raw) as { team1: Character[]; team2: Character[]; mode: string };
      if (team1?.length) setTeam1(team1.slice(0, 5));
      if (team2?.length) setTeam2(team2.slice(0, 5));
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Favorites — persisted to localStorage
  const [favorites, setFavorites] = useState<Set<number>>(() => new Set(readLS<number[]>("ava_faves", [])));
  const [upsetMode, setUpsetMode] = useState(false);
  const toggleFavorite = (id: number) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      writeLS("ava_faves", [...next]);
      return next;
    });
  };

  // Recent picks — persisted to localStorage, ordered most-recent-first
  const [recentPicks, setRecentPicks] = useState<number[]>(() => readLS<number[]>("ava_recent", []));
  const pushRecentPicks = (ids: number[]) => {
    setRecentPicks(prev => {
      const next = [...ids, ...prev.filter(id => !ids.includes(id))].slice(0, 20);
      writeLS("ava_recent", next);
      return next;
    });
  };
  const clearRecentPicks = () => {
    setRecentPicks([]);
    writeLS("ava_recent", []);
    if (activeFilter === "__recent__") setActiveFilter(null);
  };
  const pillsRef = useRef<HTMLDivElement>(null);

  // Consolidated category counts (11 broad buckets across all 100+ universes)
  const categoryCounts = useMemo(() => {
    if (!characters) return [] as Array<{ category: string; count: number }>;
    const counts: Record<string, number> = {};
    for (const c of characters) {
      const cat = getUniverseCategory(c.universe);
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
    return CATEGORY_ORDER
      .map(cat => ({ category: cat as string, count: counts[cat] ?? 0 }))
      .filter(({ count }) => count > 0);
  }, [characters]);

  const filteredCharacters = useMemo(() => {
    if (!characters) return [];
    let pool: Character[];
    if (activeFilter === "__faves__") {
      pool = characters.filter(c => favorites.has(c.id));
    } else if (activeFilter === "__recent__") {
      const order = new Map(recentPicks.map((id, i) => [id, i]));
      pool = characters.filter(c => order.has(c.id)).sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
    } else if (activeFilter) {
      pool = characters.filter(c => getUniverseCategory(c.universe) === activeFilter);
    } else {
      pool = characters;
    }
    if (tierFilter !== "all") {
      pool = pool.filter(c => powerTier(powerAvg(c)).label.toLowerCase() === tierFilter);
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter(c => c.name.toLowerCase().includes(q) || c.universe.toLowerCase().includes(q));
  }, [characters, searchQuery, activeFilter, favorites, recentPicks, tierFilter]);

  const simulateFight = useSimulateFightStream({
    onError: (error) => {
      toast({ title: "Simulation Failed", description: error.message || "Unknown error", variant: "destructive" });
      setShowModal(false);
    },
  });

  const { isMinor } = useAgeMode();
  const censoredResult = useMemo(
    () => (simulateFight.data ? (isMinor ? censorFightResult(simulateFight.data) : simulateFight.data) : null),
    [simulateFight.data, isMinor]
  );

  // IntersectionObserver — appends PAGE_SIZE cards when the sentinel scrolls into view.
  // Must live AFTER filteredCharacters is declared (avoids TDZ).
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount(n => n + PAGE_SIZE);
        }
      },
      { root: gridScrollRef.current, rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  // Re-create the observer whenever the filtered list changes so the sentinel
  // is watched relative to the new scroll container content.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredCharacters.length]);

  const handleCharacterClick = (character: Character) => {
    const inTeam1 = team1.some(c => c.id === character.id);
    const inTeam2 = team2.some(c => c.id === character.id);
    if (inTeam1) { setTeam1(t => t.filter(c => c.id !== character.id)); return; }
    if (inTeam2) { setTeam2(t => t.filter(c => c.id !== character.id)); return; }
    if (activeTeam === 1) {
      if (team1.length >= 5) { toast({ title: "Team Full", description: "Max 5 per team", variant: "destructive" }); return; }
      setTeam1(t => [...t, character]);
    } else {
      if (team2.length >= 5) { toast({ title: "Team Full", description: "Max 5 per team", variant: "destructive" }); return; }
      setTeam2(t => [...t, character]);
    }
  };

  const DEVELOPER_IDS = [780, 781]; // Chris Henry, Troy Wilson

  const handleFight = () => {
    if (team1.length === 0 || team2.length === 0) {
      toast({ title: "Teams Required", description: "Both teams need at least 1 fighter", variant: "destructive" });
      return;
    }
    // Chris Henry and Troy Wilson REFUSE to fight each other — under any circumstances
    const t1HasDev = team1.some(c => DEVELOPER_IDS.includes(c.id));
    const t2HasDev = team2.some(c => DEVELOPER_IDS.includes(c.id));
    const devsOnOpposingSides = t1HasDev && t2HasDev;
    if (devsOnOpposingSides) {
      setShowRefusal(true);
      return;
    }
    pushRecentPicks([...team1.map(c => c.id), ...team2.map(c => c.id)]);
    setShowModal(true);
    simulateFight.mutate({ data: { team1: team1.map(c => c.id), team2: team2.map(c => c.id), mode: "cinematic", upset: upsetMode } });
  };

  const handleRandomFight = () => {
    if (!characters || characters.length < 2) return;

    // Weighted random team size: 1 char more likely than 5 (feels more surprising)
    const pickSize = () => {
      const roll = Math.random();
      if (roll < 0.30) return 1;
      if (roll < 0.55) return 2;
      if (roll < 0.75) return 3;
      if (roll < 0.90) return 4;
      return 5;
    };

    const size1 = pickSize();
    const size2 = pickSize();
    const total = size1 + size2;

    // Shuffle all characters and take the first (size1 + size2)
    const shuffled = [...characters].sort(() => Math.random() - 0.5).slice(0, total);
    const r1 = shuffled.slice(0, size1);
    const r2 = shuffled.slice(size1, size1 + size2);

    setTeam1(r1);
    setTeam2(r2);
  };

  const getCharacterTeam = (id: number) => {
    if (team1.some(c => c.id === id)) return 1 as const;
    if (team2.some(c => c.id === id)) return 2 as const;
    return null;
  };

  const handleCreateChallenge = async (blind: boolean) => {
    if (team1.length === 0) {
      toast({ title: "Pick Your Team", description: "Add at least 1 fighter to Team 1 first", variant: "destructive" });
      return;
    }
    setCreatingChallenge(true);
    try {
      const r = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team1Ids: team1.map(c => c.id), mode: "cinematic", blind }),
      });
      if (!r.ok) throw new Error("Failed to create challenge");
      const { code } = await r.json() as { code: string };
      navigate(`/challenge/${code}?creator=1`);
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setCreatingChallenge(false);
      setShowChallengeMenu(false);
    }
  };

  const canFight = team1.length > 0 && team2.length > 0;

  // Synergy strip — computed for both teams to show in HUD
  const syn1 = useMemo(() => computeSynergy(team1), [team1]);
  const syn2 = useMemo(() => computeSynergy(team2), [team2]);
  const synergyPills = useMemo(() => {
    const pills: Array<{ label: string; bonus: number; team: 1 | 2; positive: boolean }> = [];
    for (const s of syn1.active) pills.push({ ...s, team: 1 });
    for (const s of syn2.active) pills.push({ ...s, team: 2 });
    return pills;
  }, [syn1, syn2]);

  return (
    <>
      <style>{`
        @keyframes scanMove {
          from { transform: translateY(0); }
          to { transform: translateY(4px); }
        }
        @keyframes fightPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(255,0,85,0.4), 0 0 40px rgba(255,0,85,0.15); }
          50% { box-shadow: 0 0 30px rgba(255,0,85,0.7), 0 0 60px rgba(255,0,85,0.3); }
        }
        @keyframes fingerBounce {
          0%, 100% { transform: translateY(0) rotate(-5deg) scale(1); }
          20% { transform: translateY(-18px) rotate(5deg) scale(1.15); }
          40% { transform: translateY(-8px) rotate(-8deg) scale(1.08); }
          60% { transform: translateY(-22px) rotate(3deg) scale(1.2); }
          80% { transform: translateY(-4px) rotate(-3deg) scale(1.05); }
        }
        @keyframes refusalGlow {
          0%, 100% { text-shadow: 0 0 20px rgba(255,0,85,0.8), 0 0 40px rgba(255,0,85,0.4); }
          50% { text-shadow: 0 0 40px rgba(255,0,85,1), 0 0 80px rgba(255,0,85,0.6); }
        }
        @keyframes refusalFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes hudGlow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
      `}</style>

      <div className="flex flex-col h-full min-h-0">
        {/* ── TOP BAR — logo + profile only ───────────────────────────── */}
        <div
          className="flex-shrink-0 sticky top-0 z-30 flex items-center justify-between px-3 py-2"
          style={{
            background: "linear-gradient(180deg, #000000 0%, #080810 100%)",
            borderBottom: "1px solid rgba(255,0,85,0.2)",
          }}
        >
          <AvaLogo className="h-7 w-auto" />
          <div className="flex items-center gap-2">
            <Show when="signed-out">
              <NavLink href="/sign-in">
                <button
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest border transition-all hover:border-primary/60 hover:text-primary"
                  style={{ color: "rgba(255,255,255,0.5)", borderColor: "rgba(255,255,255,0.12)" }}
                >
                  <LogIn className="h-3 w-3" />
                  Sign in
                </button>
              </NavLink>
            </Show>
            <Show when="signed-in">
              <HomeProfileButton />
            </Show>
          </div>
        </div>

        {/* ── CHARACTER GRID ─────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ background: "#ff0055", animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <p className="font-display text-lg uppercase tracking-widest animate-pulse" style={{ color: "rgba(255,255,255,0.3)" }}>
              Loading Roster...
            </p>
          </div>
        ) : (
          <div ref={gridScrollRef} className="flex-1 overflow-y-auto" style={{ background: "rgba(0,0,0,0.3)" }}>
            {/* Search + filter — scrolls naturally with character grid */}
            <div className="px-3 pt-1.5 pb-1.5 space-y-1">
              {/* Search + FAVES on same row */}
              <div className="flex gap-1.5 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3" style={{ color: "rgba(255,255,255,0.25)" }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search fighters..."
                    className="w-full text-xs pl-7 pr-7 py-1.5 focus:outline-none transition-colors"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: searchQuery ? "1px solid rgba(255,0,85,0.4)" : "1px solid rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.9)",
                      fontSize: 11,
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {/* FAVES button — same row as search */}
                <button
                  onClick={() => setActiveFilter(f => f === "__faves__" ? null : "__faves__")}
                  className="flex-shrink-0 flex items-center gap-1 transition-all duration-150"
                  style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
                    padding: "5px 8px",
                    background: activeFilter === "__faves__" ? "rgba(255,200,0,0.18)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${activeFilter === "__faves__" ? "rgba(255,200,0,0.6)" : "rgba(255,255,255,0.12)"}`,
                    color: activeFilter === "__faves__" ? "#ffc800" : "rgba(255,255,255,0.4)",
                    whiteSpace: "nowrap",
                  }}
                >
                  ★ FAVES{favorites.size > 0 && <span style={{ opacity: 0.65 }}> {favorites.size}</span>}
                </button>
              </div>

              {/* RECENT quick filter (only visible when there are recent picks) */}
              {recentPicks.length > 0 && (
                <div className="flex gap-1 items-center">
                  <button
                    onClick={() => setActiveFilter(f => f === "__recent__" ? null : "__recent__")}
                    className="flex-shrink-0 flex items-center gap-1 transition-all duration-150"
                    style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
                      padding: "3px 8px",
                      background: activeFilter === "__recent__" ? "rgba(160,80,255,0.18)" : "transparent",
                      border: `1px solid ${activeFilter === "__recent__" ? "rgba(160,80,255,0.6)" : "rgba(255,255,255,0.10)"}`,
                      color: activeFilter === "__recent__" ? "#a050ff" : "rgba(255,255,255,0.35)",
                    }}
                  >
                    ⏱ RECENT
                  </button>
                  <button
                    onClick={clearRecentPicks}
                    title="Clear history"
                    className="flex-shrink-0 flex items-center justify-center transition-all duration-150 hover:bg-white/10"
                    style={{
                      fontSize: 11, fontWeight: 700,
                      width: 16, height: 16,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "rgba(255,255,255,0.35)",
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Category pills (consolidated from 100+ universes) */}
              <div
                ref={pillsRef}
                className="flex gap-1 overflow-x-auto pb-0.5"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                <UniversePill
                  label="All"
                  active={activeFilter === null}
                  onClick={() => setActiveFilter(null)}
                />
                {categoryCounts.map(({ category, count }) => {
                  const color = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS];
                  const active = activeFilter === category;
                  return (
                    <button
                      key={category}
                      onClick={() => setActiveFilter(prev => prev === category ? null : category)}
                      className="flex-shrink-0 transition-all duration-150 whitespace-nowrap"
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        padding: "3px 7px",
                        color: active ? "#000" : color,
                        background: active ? color : "transparent",
                        border: `1px solid ${active ? color : color + "60"}`,
                        opacity: activeFilter && !active && activeFilter !== "__faves__" && activeFilter !== "__recent__" ? 0.4 : 1,
                      }}
                    >
                      {category} {count}
                    </button>
                  );
                })}
              </div>

              {/* Tier filter pills */}
              <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {[
                  { key: "all",      label: "All",     color: "rgba(255,255,255,0.35)" },
                  { key: "cosmic",   label: "★ Cosmic",   color: "#ff0055" },
                  { key: "elite",    label: "◆ Elite",    color: "#c084fc" },
                  { key: "standard", label: "● Standard", color: "#00f0ff" },
                  { key: "street",   label: "○ Street",   color: "#94a3b8" },
                ].map(t => (
                  <button
                    key={t.key}
                    onClick={() => setTierFilter(t.key === tierFilter ? "all" : t.key)}
                    className="flex-shrink-0 transition-all duration-150"
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      letterSpacing: "0.12em",
                      padding: "3px 7px",
                      color: tierFilter === t.key ? "#000" : t.color,
                      background: tierFilter === t.key ? t.color : "transparent",
                      border: `1px solid ${tierFilter === t.key ? t.color : t.color + "50"}`,
                      opacity: tierFilter !== "all" && tierFilter !== t.key ? 0.4 : 1,
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter status bar — only shown when a filter/search is active */}
            {(activeFilter || searchQuery || tierFilter !== "all") && (
              <div
                className="flex items-center justify-between px-3 py-1.5 sticky top-0 z-10"
                style={{ background: "rgba(0,0,0,0.88)", borderBottom: "1px solid rgba(255,0,85,0.15)" }}
              >
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.45)" }}>
                  <span style={{ color: "rgba(255,255,255,0.7)" }}>{filteredCharacters.length}</span>
                  {" "}fighter{filteredCharacters.length !== 1 ? "s" : ""} found
                  {activeFilter === "__faves__" ? " — Favorites" : activeFilter === "__recent__" ? " — Recent" : activeFilter ? ` — ${activeFilter}` : ""}
                  {tierFilter !== "all" ? ` · ${tierFilter}` : ""}
                  {searchQuery ? ` · "${searchQuery}"` : ""}
                </span>
                <button
                  onClick={() => { setSearchQuery(""); setActiveFilter(null); setTierFilter("all"); }}
                  className="text-[10px] font-bold uppercase tracking-widest transition-colors"
                  style={{ color: "#ff0055" }}
                >
                  Clear filters
                </button>
              </div>
            )}

            <div className="p-2.5">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
                {filteredCharacters.slice(0, visibleCount).map(character => (
                  <CharacterCard
                    key={character.id}
                    character={character}
                    selectedTeam={getCharacterTeam(character.id)}
                    onClick={() => handleCharacterClick(character)}
                    isFavorite={favorites.has(character.id)}
                    onToggleFavorite={() => toggleFavorite(character.id)}
                    disabled={
                      (activeTeam === 1 && team1.length >= 5 && getCharacterTeam(character.id) === null) ||
                      (activeTeam === 2 && team2.length >= 5 && getCharacterTeam(character.id) === null)
                    }
                  />
                ))}
              </div>
              {/* Sentinel div — intersection observer loads more cards when this comes into view */}
              {visibleCount < filteredCharacters.length && (
                <div ref={sentinelRef} className="h-4 mt-1" aria-hidden />
              )}
              {filteredCharacters.length === 0 && !isLoading && (
                <div className="text-center p-16 space-y-3">
                  <p className="font-display text-xl uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>No fighters found</p>
                  <button
                    onClick={() => { setSearchQuery(""); setActiveFilter(null); }}
                    className="text-xs font-bold uppercase tracking-widest transition-colors"
                    style={{ color: "#ff0055" }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <FightScreen
          open={showModal}
          onClose={() => { setShowModal(false); simulateFight.reset(); }}
          onRematch={() => {
            simulateFight.mutate({ data: { team1: team1.map(c => c.id), team2: team2.map(c => c.id), mode: "cinematic", upset: upsetMode } });
          }}
          result={censoredResult}
          isSimulating={simulateFight.isPending && !simulateFight.streaming}
          team1Names={team1.map(c => c.name)}
          team2Names={team2.map(c => c.name)}
          team1Images={team1.map(c => c.imageUrl)}
          team2Images={team2.map(c => c.imageUrl)}
          completedSections={simulateFight.completedSections}
        />
      </div>

      {/* ── REFUSAL SCREEN — Chris Henry & Troy Wilson refuse to fight ─── */}
      {showRefusal && (
        <div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
          style={{
            background: "linear-gradient(180deg, #000000 0%, #0a0005 60%, #000000 100%)",
            animation: "refusalFadeIn 0.3s ease-out",
          }}
        >
          {/* Scanlines */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.12) 3px, rgba(0,0,0,0.12) 4px)",
            }}
          />

          <div className="relative z-10 flex flex-col items-center gap-6 px-8 text-center max-w-sm">
            {/* Portraits */}
            <div className="flex items-center gap-4 mb-2">
              {[team1.find(c => [780,781].includes(c.id)), team2.find(c => [780,781].includes(c.id))].filter(Boolean).map((c, i) => (
                <div key={i} className="relative" style={{ width: 64, height: 80, border: "1.5px solid rgba(255,200,0,0.4)" }}>
                  {c?.imageUrl && (
                    <img src={c.imageUrl} alt={c?.name} className="w-full h-full object-cover object-top" />
                  )}
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)" }} />
                </div>
              ))}
            </div>

            {/* Animated middle finger */}
            <div
              style={{
                fontSize: 72,
                lineHeight: 1,
                animation: "fingerBounce 1.2s ease-in-out infinite",
                userSelect: "none",
              }}
            >
              🖕
            </div>

            {/* Title */}
            <div>
              <p
                className="font-display uppercase tracking-[0.3em] mb-3"
                style={{
                  fontSize: 11,
                  color: "rgba(255,200,0,0.8)",
                  letterSpacing: "0.35em",
                }}
              >
                ◆ Developer Legends
              </p>
              <h2
                className="font-display uppercase leading-tight mb-3"
                style={{
                  fontSize: 22,
                  color: "#ffffff",
                  animation: "refusalGlow 2s ease-in-out infinite",
                }}
              >
                These two don't fight each other.
              </h2>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
                Chris Henry and Troy Wilson built this whole arena. They answer to no one inside it —
                and they sure as hell don't answer to you.
              </p>
            </div>

            {/* Only option: New Fight */}
            <button
              onClick={() => {
                setShowRefusal(false);
                setTeam1([]);
                setTeam2([]);
              }}
              className="w-full font-display uppercase tracking-widest transition-all duration-150 active:scale-95"
              style={{
                marginTop: 8,
                padding: "14px 24px",
                fontSize: 12,
                letterSpacing: "0.25em",
                background: "rgba(255,0,85,0.12)",
                border: "1.5px solid rgba(255,0,85,0.6)",
                color: "#ff3b30",
                boxShadow: "0 0 20px rgba(255,0,85,0.2)",
              }}
            >
              ⚔ NEW FIGHT
            </button>
          </div>
        </div>
      )}
    </>
  );
}
