import { useState, useMemo, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListCharacters, useListSavedTeams, useSaveTeam, useDeleteSavedTeam, SavedTeam, getListSavedTeamsQueryKey } from "@workspace/api-client-react";
import { useSimulateFightStream } from "@/hooks/use-simulate-fight-stream";
import { Character } from "@workspace/api-client-react";
import { CharacterCard } from "@/components/character-card";
import { useToast } from "@/hooks/use-toast";
import { FightScreen } from "@/components/fight-screen";
import { AvaLogo } from "@/components/ava-logo";
import { useAgeMode } from "@/hooks/use-age-mode";
import { censorFightResult } from "@/lib/profanity-filter";
import { Search, Shuffle, Swords, X, Zap, AlertTriangle, Link, Mic, MicOff, Bookmark, Trash2 } from "lucide-react";
import { Link as NavLink, useLocation } from "wouter";
import { Show, useUser } from "@clerk/react";
import { CharacterAvatar } from "@/components/character-avatar";
import { computeSynergy } from "@/lib/synergies";
import { powerAvg, powerTier } from "@/components/roster-flip-card";
import { getUniverseCategory, CATEGORY_ORDER, CATEGORY_COLORS } from "@/lib/universe-categories";
import { setCreatorToken } from "@/lib/challenge-tokens";
import { subscribeForChallenge, requestNotificationPermissionFromGesture } from "@/lib/push-subscribe";
import { LS_LAST_MODIFIER, getModifier } from "@/lib/modifiers";
import { ModifierPicker, ModifierTrigger, useStoredModifier } from "@/components/modifier-picker";
import { PendingChallengesBar } from "@/components/pending-challenges-bar";
import { useMusic } from "@/contexts/music-context";
import { MusicToggle } from "@/components/music-toggle";
import { EnergyBadge } from "@/components/energy-badge";
import { useEnergy } from "@/hooks/use-energy";

// ─── localStorage helpers ────────────────────────────────────────────────────
function readLS<T>(key: string, fallback: T): T {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "null");
    if (parsed === null || parsed === undefined) return fallback;
    // Shape guard: when caller expects an array but storage holds a non-array
    // (corrupted, legacy, or tampered value), fall back rather than letting
    // downstream `.map` / `new Set(...)` crash on a mobile WebView.
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
    return parsed as T;
  } catch { return fallback; }
}
function writeLS(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

type ActiveFilter = null | "__faves__" | "__recent__" | string;

// ─── Narration toggle (controlled — state lives in Home) ─────────────────────
// Pre-fight narration chip — sits above the FIGHT bar so players make the
// audio choice at the moment of commitment rather than digging through a
// top-bar icon. Wider + labeled so the state is unmistakable.
function NarrationToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={on}
      aria-label={on ? "Turn AI narration off" : "Turn AI narration on"}
      title={on ? "AI Narration ON — tap to turn off" : "AI Narration OFF — tap to enable"}
      className="w-full flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
      style={{
        height: 30,
        background: on
          ? "linear-gradient(180deg, rgba(0,240,255,0.10) 0%, rgba(0,240,255,0.18) 100%)"
          : "rgba(255,255,255,0.025)",
        borderTop: `1px solid ${on ? "rgba(0,240,255,0.45)" : "rgba(255,255,255,0.10)"}`,
        borderBottom: `1px solid ${on ? "rgba(0,240,255,0.20)" : "rgba(255,255,255,0.06)"}`,
        color: on ? "#00f0ff" : "rgba(255,255,255,0.45)",
        fontFamily: "var(--font-display, monospace)",
        fontSize: 9,
        letterSpacing: "0.28em",
        fontWeight: 700,
        textTransform: "uppercase",
      }}
    >
      {on ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
      <span>Narration: {on ? "On" : "Off"}</span>
    </button>
  );
}

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
function TeamSlot({ team, members, active, flash, onActivate, onRemove, onSave }: {
  team: 1 | 2;
  members: Character[];
  active: boolean;
  flash: boolean;
  onActivate: () => void;
  onRemove: (id: number) => void;
  onSave?: () => void;
}) {
  const color = team === 1 ? "#00f0ff" : "#ff3b30";
  const dimColor = team === 1 ? "rgba(0,240,255,0.08)" : "rgba(255,59,48,0.08)";
  const glowColor = team === 1 ? "rgba(0,240,255,0.25)" : "rgba(255,59,48,0.25)";
  const flashGlow = team === 1 ? "rgba(0,240,255,0.85)" : "rgba(255,59,48,0.85)";
  const totalPower = members.reduce((s, c) => s + c.strength + c.speed + c.intelligence + c.durability, 0);

  return (
    <div
      className="flex-1 relative cursor-pointer transition-all duration-200 select-none overflow-hidden"
      style={{
        background: active ? dimColor : "rgba(255,255,255,0.02)",
        border: `1px solid ${active ? color + "60" : "rgba(255,255,255,0.08)"}`,
        boxShadow: flash
          ? `0 0 0 2px ${flashGlow}, 0 0 32px ${flashGlow}`
          : active ? `0 0 24px ${glowColor}` : "none",
        padding: "6px 8px 4px",
        minWidth: 0,
        animation: flash ? "slotPop 360ms ease-out" : undefined,
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
          {onSave && members.length > 0 && (
            <button
              title="Save this team"
              onClick={(e) => { e.stopPropagation(); onSave(); }}
              className="flex items-center justify-center transition-opacity hover:opacity-100 opacity-50"
              style={{ width: 18, height: 18 }}
            >
              <Bookmark className="h-3 w-3" style={{ color }} />
            </button>
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
  const { setTrack } = useMusic();
  useEffect(() => { setTrack("lobby"); }, []);
  const { data: characters, isLoading } = useListCharacters();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user } = useUser();
  const queryClient = useQueryClient();

  // Saved teams
  const { data: savedTeams } = useListSavedTeams({ query: { enabled: !!user, queryKey: getListSavedTeamsQueryKey() } });
  const saveTeamMutation = useSaveTeam();
  const deleteTeamMutation = useDeleteSavedTeam();
  const [savingTeamSlot, setSavingTeamSlot] = useState<1 | 2 | null>(null);
  const [saveTeamName, setSaveTeamName] = useState("");
  const saveNameInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (savingTeamSlot !== null) {
      setSaveTeamName("");
      setTimeout(() => saveNameInputRef.current?.focus(), 50);
    }
  }, [savingTeamSlot]);

  const handleSaveTeam = async () => {
    if (!savingTeamSlot || !saveTeamName.trim()) return;
    const members = savingTeamSlot === 1 ? team1 : team2;
    if (members.length === 0) return;
    try {
      await saveTeamMutation.mutateAsync({ data: { name: saveTeamName.trim(), characterIds: members.map(c => c.id) } });
      await queryClient.invalidateQueries({ queryKey: getListSavedTeamsQueryKey() });
      toast({ title: "Team saved!", description: `"${saveTeamName.trim()}" added to My Teams` });
      setSavingTeamSlot(null);
    } catch {
      toast({ title: "Error", description: "Couldn't save team", variant: "destructive" });
    }
  };

  const handleDeleteSavedTeam = async (id: number, name: string) => {
    try {
      await deleteTeamMutation.mutateAsync({ id });
      await queryClient.invalidateQueries({ queryKey: getListSavedTeamsQueryKey() });
      toast({ title: "Removed", description: `"${name}" deleted from My Teams` });
    } catch {
      toast({ title: "Error", description: "Couldn't delete team", variant: "destructive" });
    }
  };

  const handleLoadSavedTeam = (savedTeam: SavedTeam) => {
    if (!characters) return;
    const members = savedTeam.characterIds
      .map(id => characters.find(c => c.id === id))
      .filter((c): c is Character => c !== undefined)
      .slice(0, 5);
    if (activeTeam === 1) setTeam1(members);
    else setTeam2(members);
    toast({ title: `Loaded "${savedTeam.name}"`, description: `Team ${activeTeam} updated` });
  };

  const [team1, setTeam1] = useState<Character[]>([]);
  const [team2, setTeam2] = useState<Character[]>([]);
  const [activeTeam, setActiveTeam] = useState<1 | 2>(1);
  const [flashTeam, setFlashTeam] = useState<1 | 2 | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerFlash = (team: 1 | 2) => {
    setFlashTeam(null);
    requestAnimationFrame(() => setFlashTeam(team));
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashTeam(null), 380);
  };
  const [showModal, setShowModal] = useState(false);
  const [showRefusal, setShowRefusal] = useState(false);
  const energy = useEnergy();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>(null);
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [showTauntPanel, setShowTauntPanel] = useState(false);
  const [tauntInput, setTauntInput] = useState("");
  const [creatingChallenge, setCreatingChallenge] = useState(false);

  const [ttsEnabled, setTtsEnabled] = useState(() => {
    try { return localStorage.getItem("ava:tts") === "1"; } catch { return false; }
  });
  const toggleTts = () => {
    const next = !ttsEnabled;
    try { localStorage.setItem("ava:tts", next ? "1" : "0"); } catch {}
    setTtsEnabled(next);
  };

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
      const parsed = JSON.parse(raw) as { team1?: unknown; team2?: unknown; mode?: string };
      const team1 = Array.isArray(parsed?.team1) ? (parsed.team1 as Character[]) : [];
      const team2 = Array.isArray(parsed?.team2) ? (parsed.team2 as Character[]) : [];
      if (team1.length) setTeam1(team1.slice(0, 5));
      if (team2.length) setTeam2(team2.slice(0, 5));
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Favorites — persisted to localStorage
  const [favorites, setFavorites] = useState<Set<number>>(() => new Set(readLS<number[]>("ava_faves", [])));
  const [upsetMode, setUpsetMode] = useState(false);
  // Chaos modifier — persisted so a player's last pick survives reloads but
  // is NOT sticky across new sessions (cleared via the picker's "None" tile).
  const [modifierId, setModifierId] = useStoredModifier(LS_LAST_MODIFIER);
  const [modifierPickerOpen, setModifierPickerOpen] = useState(false);
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

  // Synchronous in-flight lock. React's `simulateFight.isPending` flips via
  // setState which is async — two clicks within the same render frame can
  // both see isPending===false and both fire mutate(), double-charging
  // energy. This ref flips synchronously inside the click handler so the
  // second event in the same frame short-circuits before reaching mutate().
  const fightInFlightRef = useRef(false);
  const simulateFight = useSimulateFightStream({
    onError: (error) => {
      fightInFlightRef.current = false;
      toast({ title: "Simulation Failed", description: error.message || "Unknown error", variant: "destructive" });
      setShowModal(false);
      // The server may or may not have consumed energy (depends where it
      // failed). Refetch to be honest with the user.
      if (energy.isSignedIn) void energy.refetch();
    },
    onComplete: () => {
      fightInFlightRef.current = false;
      // Reconcile the optimistic decrement with the server's truth at fight-end.
      if (energy.isSignedIn) void energy.refetch();
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
      triggerFlash(1);
    } else {
      if (team2.length >= 5) { toast({ title: "Team Full", description: "Max 5 per team", variant: "destructive" }); return; }
      setTeam2(t => [...t, character]);
      triggerFlash(2);
    }
  };

  const DEVELOPER_IDS = [780, 781]; // Chris Henry, Troy Wilson

  const handleFight = () => {
    // Synchronous lock — closes the same-frame race window that the React
    // state-based check (simulateFight.isPending) leaves open, since
    // setIsPending only flips on the next render.
    if (fightInFlightRef.current || simulateFight.isPending) return;
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
    // Take the synchronous lock BEFORE any await/mutate so a second click in
    // the same event-loop tick short-circuits at the guard above.
    fightInFlightRef.current = true;
    setShowModal(true);
    // Optimistically decrement so the badge updates the moment FIGHT is hit.
    // After the fight call resolves, refetch from the server to reconcile.
    if (energy.isSignedIn) energy.applyOptimisticConsume();
    simulateFight.mutate({ data: { team1: team1.map(c => c.id), team2: team2.map(c => c.id), mode: "cinematic", upset: upsetMode, modifierId: modifierId ?? null } });
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

  const handleCreateChallenge = async () => {
    if (team1.length === 0) {
      toast({ title: "Pick Your Team", description: "Add at least 1 fighter to Team 1 first", variant: "destructive" });
      return;
    }
    // Ask for notification permission BEFORE any await — iOS Safari and
    // Chrome Android suppress the prompt if it's requested after the
    // user-gesture context is lost (i.e. across a fetch). We ignore the
    // result here; the subsequent subscribe call uses the resolved state.
    const permissionPromise = requestNotificationPermissionFromGesture();
    setCreatingChallenge(true);
    setShowTauntPanel(false);
    try {
      const r = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team1Ids: team1.map(c => c.id),
          mode: "cinematic",
          modifierId: modifierId ?? null,
          taunt: tauntInput.trim() || null,
        }),
      });
      if (!r.ok) throw new Error("Failed to create challenge");
      const { code, creatorToken } = await r.json() as { code: string; creatorToken?: string };
      if (creatorToken) {
        setCreatorToken(code, creatorToken);
        // Fire-and-forget: register a push subscription so the creator can
        // leave the screen and still be told when their friend accepts.
        // Permission was already prompted above; prompt:false here just uses
        // the resolved state. UI polls as a fallback regardless.
        void permissionPromise.then(() => subscribeForChallenge({ code, token: creatorToken, prompt: false }));
      }
      setTauntInput("");
      navigate(`/challenge/${code}?creator=1`);
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setCreatingChallenge(false);
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
        @keyframes vsPulse {
          0%, 100% {
            transform: scale(1) skewX(-4deg);
            text-shadow: 0 0 14px rgba(255,0,85,0.95), 0 0 28px rgba(255,0,85,0.55), 0 0 50px rgba(255,0,85,0.25);
          }
          50% {
            transform: scale(1.12) skewX(-4deg);
            text-shadow: 0 0 22px rgba(255,0,85,1), 0 0 44px rgba(255,0,85,0.8), 0 0 80px rgba(255,0,85,0.4);
          }
        }
        @keyframes vsHalo {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%      { opacity: 1;    transform: scale(1.3); }
        }
        .ava-vs-pulse { animation: vsPulse 1.4s ease-in-out infinite; transform-origin: center; display: inline-block; }
        .ava-vs-halo  { animation: vsHalo 1.4s ease-in-out infinite; }
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
        @keyframes slotPop {
          0% { transform: scale(1); }
          35% { transform: scale(1.04); }
          100% { transform: scale(1); }
        }
      `}</style>

      <div className="flex flex-col h-full min-h-0">
        <PendingChallengesBar />
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
            <MusicToggle />
            {/* UPSET MODE — promoted to the top bar so the primary action row
                stays focused on starting matches. Tap to toggle cached vs
                fresh verdict generation. */}
            <button
              onClick={() => setUpsetMode(m => !m)}
              className="flex items-center gap-1 transition-all duration-200 active:scale-[0.97]"
              style={{
                height: 24,
                padding: "0 7px",
                background: upsetMode ? "rgba(255,160,0,0.14)" : "transparent",
                border: `1px solid ${upsetMode ? "rgba(255,160,0,0.6)" : "rgba(255,255,255,0.12)"}`,
                cursor: "pointer",
              }}
              title={upsetMode ? "Upset Mode ON — bypasses cached verdict" : "Upset Mode OFF — uses cached verdict"}
            >
              <Zap
                className="h-3 w-3"
                style={{ color: upsetMode ? "#ffa000" : "rgba(255,255,255,0.4)" }}
                fill={upsetMode ? "#ffa000" : "none"}
              />
              <span
                style={{
                  fontSize: 8,
                  fontFamily: "var(--font-display, monospace)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  color: upsetMode ? "rgba(255,160,0,0.95)" : "rgba(255,255,255,0.45)",
                }}
              >
                Upset
              </span>
            </button>
            <Show when="signed-in">
              <EnergyBadge />
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
            {/* Search + filter — sticky so users can refilter without scrolling back up */}
            <div
              className="px-3 pt-1.5 pb-1.5 space-y-1 sticky top-0 z-20"
              style={{
                background: "rgba(3,3,8,0.92)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}>
              {/* Row 1: Search + tier icons + FAVES */}
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

                {/* Tier filter — compact icon-only row */}
                <div className="flex gap-0.5 flex-shrink-0">
                  {[
                    { key: "cosmic",   icon: "★", color: "#ff0055", label: "Cosmic"   },
                    { key: "elite",    icon: "◆", color: "#c084fc", label: "Elite"    },
                    { key: "standard", icon: "●", color: "#00f0ff", label: "Standard" },
                    { key: "street",   icon: "○", color: "#94a3b8", label: "Street"   },
                  ].map(t => {
                    const active = tierFilter === t.key;
                    return (
                      <button
                        key={t.key}
                        onClick={() => setTierFilter(active ? "all" : t.key)}
                        className="flex items-center justify-center transition-all duration-150"
                        style={{
                          width: 22, height: 26,
                          fontSize: 12, fontWeight: 700, lineHeight: 1,
                          background: active ? t.color : "transparent",
                          border: `1px solid ${active ? t.color : t.color + "40"}`,
                          color: active ? "#000" : t.color,
                          opacity: tierFilter !== "all" && !active ? 0.35 : 1,
                        }}
                        title={`${t.label} tier`}
                      >
                        {t.icon}
                      </button>
                    );
                  })}
                </div>

                {/* FAVES button */}
                <button
                  onClick={() => setActiveFilter(f => f === "__faves__" ? null : "__faves__")}
                  className="flex-shrink-0 flex items-center gap-1 transition-all duration-150"
                  style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
                    padding: "5px 7px",
                    background: activeFilter === "__faves__" ? "rgba(255,200,0,0.18)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${activeFilter === "__faves__" ? "rgba(255,200,0,0.6)" : "rgba(255,255,255,0.12)"}`,
                    color: activeFilter === "__faves__" ? "#ffc800" : "rgba(255,255,255,0.4)",
                    whiteSpace: "nowrap",
                  }}
                  title="Favorites"
                >
                  ★{favorites.size > 0 && <span style={{ opacity: 0.65 }}>{favorites.size}</span>}
                </button>
              </div>

              {/* Row 2: Universe pills (with RECENT inlined) */}
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
                {recentPicks.length > 0 && (
                  <button
                    onClick={() => setActiveFilter(f => f === "__recent__" ? null : "__recent__")}
                    className="flex-shrink-0 flex items-center gap-1 transition-all duration-150 whitespace-nowrap"
                    style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
                      padding: "3px 7px",
                      background: activeFilter === "__recent__" ? "rgba(160,80,255,0.18)" : "transparent",
                      border: `1px solid ${activeFilter === "__recent__" ? "rgba(160,80,255,0.6)" : "rgba(160,80,255,0.4)"}`,
                      color: activeFilter === "__recent__" ? "#a050ff" : "rgba(160,80,255,0.7)",
                    }}
                    title="Recent picks"
                  >
                    ⏱ RECENT
                  </button>
                )}
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
            </div>

            {/* Filter status bar — only shown when a filter/search is active */}
            {(activeFilter || searchQuery || tierFilter !== "all") && (
              <div
                className="flex items-center justify-between px-3 py-1.5"
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
                {(Array.isArray(filteredCharacters) ? filteredCharacters : []).slice(0, visibleCount).map(character => (
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

        {/* ── BOTTOM DOCK — team builder + actions + sticky FIGHT bar ─ */}
        <div
          className="flex-shrink-0 relative"
          style={{
            background: "linear-gradient(0deg, #000000 0%, #080810 100%)",
            borderTop: "1px solid rgba(255,0,85,0.25)",
            boxShadow: "0 -8px 24px rgba(0,0,0,0.6)",
          }}
        >
          {/* Narration toggle — appears alongside FIGHT so the user explicitly
              opts in (or out) of AI narration at the moment of commitment.
              Lives here (not the top bar) because the choice is per-fight. */}
          {canFight && (
            <NarrationToggle on={ttsEnabled} onToggle={toggleTts} />
          )}

          {/* Chaos modifier strip — sits directly above the FIGHT bar so the
              modifier in play is visible at the moment of commitment. The same
              picker is also reachable from the CHALLENGE dropdown so the
              modifier choice is shared between arena and PvP. */}
          {canFight && (
            <ModifierTrigger current={modifierId} onClick={() => setModifierPickerOpen(true)} />
          )}

          {/* Glowing FIGHT bar — only when both teams have fighters.
              Switches to a greyed "OUT OF ENERGY" affordance when a signed-in
              user has 0 energy: tapping it opens the same modal handleFight
              would have, but the visual state makes it obvious WHY before
              they tap. Guests / pre-load (no state yet) see the normal
              FIGHT bar so the gate never blocks them. */}
          {canFight && (() => {
            return (
              <button
                onClick={handleFight}
                disabled={simulateFight.isPending}
                data-testid="button-fight"
                className="w-full flex items-center justify-center gap-3 font-display uppercase active:scale-[0.99] transition-transform disabled:opacity-70 disabled:cursor-wait"
                style={{
                  height: 44,
                  borderTop: "1.5px solid #ff0055",
                  borderBottom: "1.5px solid rgba(255,0,85,0.3)",
                  background: "linear-gradient(180deg, rgba(255,0,85,0.18) 0%, rgba(255,0,85,0.32) 100%)",
                  color: "#fff",
                  fontSize: 15,
                  letterSpacing: "0.4em",
                  cursor: simulateFight.isPending ? "wait" : "pointer",
                  animation: simulateFight.isPending ? "none" : "fightPulse 1.4s ease-in-out infinite",
                  textShadow: "0 0 16px rgba(255,0,85,0.95)",
                }}
              >
                <Swords className="h-5 w-5" style={{ color: "#ff0055" }} />
                <span>{simulateFight.isPending ? "•  •  •" : "FIGHT"}</span>
                <Swords className="h-5 w-5 -scale-x-100" style={{ color: "#ff0055" }} />
              </button>
            );
          })()}

          {/* Team slots — compact horizontal */}
          <div className="flex items-stretch gap-2 px-2 pt-1.5">
            <TeamSlot
              team={1}
              members={team1}
              active={activeTeam === 1}
              flash={flashTeam === 1}
              onActivate={() => setActiveTeam(1)}
              onRemove={(id) => setTeam1(t => t.filter(c => c.id !== id))}
              onSave={user ? () => setSavingTeamSlot(1) : undefined}
            />
            <div
              className="flex-shrink-0 flex items-center justify-center relative"
              style={{ width: 46 }}
            >
              {/* Soft halo behind the VS */}
              <div
                className="absolute inset-0 ava-vs-halo"
                style={{
                  background: "radial-gradient(circle at center, rgba(255,0,85,0.35) 0%, transparent 65%)",
                  pointerEvents: "none",
                }}
              />
              <div
                className="ava-vs-pulse font-display font-black uppercase relative"
                style={{
                  fontSize: 30,
                  color: "#fff",
                  WebkitTextStroke: "1px #ff0055",
                  textShadow: "0 0 14px rgba(255,0,85,0.95), 0 0 28px rgba(255,0,85,0.55), 0 0 50px rgba(255,0,85,0.25)",
                  letterSpacing: "0.02em",
                  lineHeight: 1,
                }}
              >
                VS
              </div>
            </div>
            <TeamSlot
              team={2}
              members={team2}
              active={activeTeam === 2}
              flash={flashTeam === 2}
              onActivate={() => setActiveTeam(2)}
              onRemove={(id) => setTeam2(t => t.filter(c => c.id !== id))}
              onSave={user ? () => setSavingTeamSlot(2) : undefined}
            />
          </div>

          {/* Save-team dialog — inline banner */}
          {savingTeamSlot !== null && (
            <div
              className="mx-2 flex items-center gap-2"
              style={{
                background: "rgba(0,0,0,0.6)",
                border: `1px solid ${savingTeamSlot === 1 ? "rgba(0,240,255,0.3)" : "rgba(255,59,48,0.3)"}`,
                padding: "6px 8px",
              }}
            >
              <span
                className="font-display text-[9px] uppercase tracking-widest flex-shrink-0"
                style={{ color: savingTeamSlot === 1 ? "#00f0ff" : "#ff3b30", opacity: 0.7 }}
              >
                T{savingTeamSlot} NAME
              </span>
              <input
                ref={saveNameInputRef}
                value={saveTeamName}
                onChange={e => setSaveTeamName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSaveTeam(); if (e.key === "Escape") setSavingTeamSlot(null); }}
                placeholder="e.g. Dream Squad"
                maxLength={32}
                className="flex-1 bg-transparent outline-none text-xs font-display uppercase tracking-wider text-white placeholder:text-white/20"
                style={{ minWidth: 0 }}
              />
              <button
                onClick={handleSaveTeam}
                disabled={!saveTeamName.trim() || saveTeamMutation.isPending}
                className="font-display text-[9px] uppercase tracking-widest px-2 py-1 border transition-opacity disabled:opacity-30"
                style={{
                  borderColor: savingTeamSlot === 1 ? "rgba(0,240,255,0.4)" : "rgba(255,59,48,0.4)",
                  color: savingTeamSlot === 1 ? "#00f0ff" : "#ff3b30",
                }}
              >
                {saveTeamMutation.isPending ? "…" : "SAVE"}
              </button>
              <button onClick={() => setSavingTeamSlot(null)} className="opacity-30 hover:opacity-60 transition-opacity">
                <X className="h-3.5 w-3.5 text-white" />
              </button>
            </div>
          )}

          {/* MY TEAMS quick-load strip */}
          {user && savedTeams && savedTeams.length > 0 && (
            <div className="px-2">
              <div
                className="flex gap-1.5 overflow-x-auto items-center py-1"
                style={{ scrollbarWidth: "none" }}
              >
                <span
                  className="font-display text-[8px] uppercase tracking-[0.2em] flex-shrink-0"
                  style={{ color: "rgba(255,255,255,0.25)" }}
                >
                  SAVED
                </span>
                {savedTeams.map(t => (
                  <div
                    key={t.id}
                    className="flex-shrink-0 flex items-center gap-1"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 2,
                      padding: "2px 6px 2px 7px",
                    }}
                  >
                    <button
                      onClick={() => handleLoadSavedTeam(t)}
                      title={`Load "${t.name}" into Team ${activeTeam}`}
                      className="font-display text-[9px] uppercase tracking-wider text-white/60 hover:text-white/90 transition-colors"
                      style={{ whiteSpace: "nowrap" }}
                    >
                      {t.name}
                      <span className="ml-1 opacity-40">({t.characterIds.length})</span>
                    </button>
                    <button
                      onClick={() => handleDeleteSavedTeam(t.id, t.name)}
                      title="Remove"
                      className="opacity-25 hover:opacity-60 transition-opacity ml-0.5"
                    >
                      <Trash2 className="h-2.5 w-2.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Power comparison bar */}
          <PowerComparison team1={team1} team2={team2} />

          {/* Synergy strip — container always rendered to keep dock height
              stable so the character grid above doesn't reflow as teams change. */}
          <div
            className="flex gap-1 overflow-x-auto px-2 pb-1"
            style={{ scrollbarWidth: "none", minHeight: 18 }}
          >
            {synergyPills.length > 0 && synergyPills.map((p, i) => {
                const teamColor = p.team === 1 ? "#00f0ff" : "#ff3b30";
                const color = p.positive ? (p.team === 1 ? "#34d399" : "#f87171") : "#fb923c";
                return (
                  <div
                    key={i}
                    className="flex-shrink-0 flex items-center gap-0.5 px-1.5 py-0.5"
                    style={{
                      background: p.positive ? `${color}12` : "rgba(249,115,22,0.1)",
                      border: `1px solid ${color}40`,
                      fontSize: 7.5,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    <span style={{ color: teamColor, opacity: 0.7 }}>T{p.team}</span>
                    <span style={{ color: "rgba(255,255,255,0.2)", margin: "0 2px" }}>·</span>
                    <span style={{ color }}>{p.label}</span>
                    <span style={{ color, opacity: 0.8, marginLeft: 2 }}>
                      {p.bonus > 0 ? "+" : ""}{Math.round(p.bonus * 100)}%
                    </span>
                  </div>
                );
              })}
          </div>

          {/* Secondary action row: RANDOM | CHALLENGE */}
          <div className="px-2 pb-2 pt-1 flex gap-1.5 items-center">
            {/* RANDOM */}
            <button
              className="flex items-center justify-center gap-1.5 font-display uppercase tracking-widest transition-all duration-200 active:scale-[0.97] flex-1"
              style={{
                height: 30,
                fontSize: 9,
                letterSpacing: "0.18em",
                border: "1.5px solid rgba(255,200,0,0.35)",
                background: "rgba(255,200,0,0.07)",
                color: "rgba(255,200,0,0.8)",
                cursor: simulateFight.isPending ? "not-allowed" : "pointer",
              }}
              onClick={handleRandomFight}
              disabled={simulateFight.isPending || !characters?.length}
              title="Random fight — fully randomized teams"
            >
              <Shuffle className="h-3 w-3" />
              <span>RANDOM</span>
            </button>

            {/* CHALLENGE */}
            <div style={{ position: "relative", flex: 1 }}>
              <button
                onClick={() => setShowTauntPanel(m => !m)}
                disabled={creatingChallenge}
                title="Send a PvP challenge link to a friend"
                className="w-full"
                style={{
                  height: 30,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                  fontSize: 9, letterSpacing: "0.18em", fontFamily: "inherit", fontWeight: 700, textTransform: "uppercase",
                  border: "1.5px solid rgba(0,240,255,0.35)",
                  background: showTauntPanel ? "rgba(0,240,255,0.12)" : "rgba(0,240,255,0.06)",
                  color: "rgba(0,240,255,0.85)",
                  cursor: creatingChallenge ? "not-allowed" : "pointer",
                }}
              >
                <Link style={{ width: 11, height: 11 }} />
                <span>{creatingChallenge ? "…" : "CHALLENGE"}</span>
              </button>

              {showTauntPanel && !creatingChallenge && (
                <>
                  <div onClick={() => setShowTauntPanel(false)} style={{ position: "fixed", inset: 0, zIndex: 59 }} />
                  <div style={{
                    position: "absolute", bottom: "calc(100% + 6px)", right: 0, zIndex: 60,
                    background: "#080c14", border: "1px solid rgba(0,240,255,0.25)",
                    width: 240, boxShadow: "0 0 28px rgba(0,0,0,0.9)",
                    padding: "10px 12px 12px",
                  }}>
                    <div style={{ fontSize: 7.5, letterSpacing: "0.22em", color: "rgba(0,240,255,0.45)", marginBottom: 10 }}>
                      ⚔ PvP CHALLENGE
                    </div>

                    {/* Chaos modifier row */}
                    {(() => {
                      const meta = getModifier(modifierId);
                      return (
                        <button
                          onClick={() => { setShowTauntPanel(false); setModifierPickerOpen(true); }}
                          style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", cursor: "pointer", textAlign: "left", marginBottom: 10 }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,240,255,0.06)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                        >
                          <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>{meta?.emoji ?? "⚙"}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 7, letterSpacing: "0.2em", color: "rgba(0,240,255,0.5)", fontWeight: 700 }}>CHAOS MODIFIER</div>
                            <div style={{ fontSize: 9, color: meta ? (meta.color ?? "#00f0ff") : "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: "0.05em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {meta?.label ?? "None — tap to pick"}
                            </div>
                          </div>
                        </button>
                      );
                    })()}

                    {/* Battle cry / taunt input */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 7, letterSpacing: "0.2em", color: "rgba(255,255,255,0.3)", marginBottom: 5, textTransform: "uppercase" }}>
                        Battle Cry <span style={{ color: "rgba(255,255,255,0.18)" }}>(optional)</span>
                      </div>
                      <textarea
                        value={tauntInput}
                        onChange={e => setTauntInput(e.target.value.slice(0, 100))}
                        placeholder={`"My squad is unstoppable."`}
                        rows={2}
                        style={{
                          width: "100%", resize: "none", boxSizing: "border-box",
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(0,240,255,0.18)",
                          color: "#fff", fontSize: 11, padding: "6px 8px",
                          fontFamily: "inherit", outline: "none", lineHeight: 1.4,
                        }}
                      />
                      <div style={{ textAlign: "right", fontSize: 7, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>
                        {tauntInput.length}/100
                      </div>
                    </div>

                    {/* Send button */}
                    <button
                      onClick={() => handleCreateChallenge()}
                      style={{
                        width: "100%", height: 36, fontFamily: "inherit",
                        background: "rgba(0,240,255,0.1)", border: "1.5px solid rgba(0,240,255,0.55)",
                        color: "#00f0ff", fontSize: 9, letterSpacing: "0.22em", fontWeight: 800,
                        cursor: "pointer", textTransform: "uppercase",
                      }}
                    >
                      SEND CHALLENGE →
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>

        <FightScreen
          open={showModal}
          onClose={() => { fightInFlightRef.current = false; setShowModal(false); simulateFight.reset(); }}
          onRematch={() => {
            simulateFight.mutate({ data: { team1: team1.map(c => c.id), team2: team2.map(c => c.id), mode: "cinematic", upset: upsetMode, modifierId: modifierId ?? null } });
          }}
          result={censoredResult}
          isSimulating={simulateFight.isPending && !simulateFight.streaming}
          team1Names={team1.map(c => c.name)}
          team2Names={team2.map(c => c.name)}
          team1Images={team1.map(c => c.imageUrl)}
          team2Images={team2.map(c => c.imageUrl)}
          completedSections={simulateFight.completedSections}
          ttsEnabled={ttsEnabled}
          onToggleTts={toggleTts}
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

      {/* Chaos modifier picker — bottom sheet, mounted at root so it overlays
          the FIGHT modal too if reopened mid-stream. */}
      <ModifierPicker
        open={modifierPickerOpen}
        current={modifierId}
        onClose={() => setModifierPickerOpen(false)}
        onChange={setModifierId}
      />
    </>
  );
}
