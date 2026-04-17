import { useState, useMemo, useRef } from "react";
import { useListCharacters, useSimulateFight } from "@workspace/api-client-react";
import { Character } from "@workspace/api-client-react/src/generated/api.schemas";
import { CharacterCard } from "@/components/character-card";
import { useToast } from "@/hooks/use-toast";
import { FightScreen } from "@/components/fight-screen";
import { AvaLogo } from "@/components/ava-logo";
import { Search, Swords, X, Zap, AlertTriangle, ChevronDown } from "lucide-react";
import { computeSynergy } from "@/lib/synergies";

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
      style={{ width: 44, height: 54, border: `1.5px solid ${color}40`, boxShadow: `0 0 8px ${color}20` }}
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

  const synergy = useMemo(() => computeSynergy(members), [members]);
  const positiveSynergies = synergy.active.filter(s => s.positive);
  const negativeSynergies = synergy.active.filter(s => !s.positive);

  return (
    <div
      className="flex-1 relative cursor-pointer transition-all duration-200 select-none"
      style={{
        background: active ? dimColor : "rgba(255,255,255,0.02)",
        border: `1px solid ${active ? color + "60" : "rgba(255,255,255,0.08)"}`,
        boxShadow: active ? `0 0 24px ${glowColor}` : "none",
        padding: "8px 10px 6px",
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
              {(totalPower / 1000).toFixed(1)}K PWR
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

      {/* Portraits */}
      <div className="flex gap-1 min-h-[54px] items-end">
        {members.map(c => (
          <TeamPortrait key={c.id} character={c} team={team} onRemove={() => onRemove(c.id)} />
        ))}
        {/* One empty slot placeholder */}
        {members.length < 5 && (
          <div
            className="flex-shrink-0 flex items-center justify-center"
            style={{
              width: 44, height: 54,
              border: `1px dashed ${active ? color + "35" : "rgba(255,255,255,0.08)"}`,
            }}
          >
            <span style={{ color: active ? `${color}50` : "rgba(255,255,255,0.12)", fontSize: 20, fontWeight: 300, lineHeight: 1 }}>+</span>
          </div>
        )}
        {/* Remaining count ghost when team has some members */}
        {members.length > 0 && members.length < 4 && (
          <div className="flex items-end pb-1 pl-0.5">
            <span className="text-[9px] font-bold" style={{ color: active ? `${color}30` : "rgba(255,255,255,0.1)" }}>
              +{5 - members.length - 1} more
            </span>
          </div>
        )}
      </div>

      {/* Synergy badges */}
      {members.length >= 2 && (positiveSynergies.length + negativeSynergies.length > 0) && (
        <div className="flex flex-wrap gap-0.5 mt-1.5">
          {positiveSynergies.map(s => (
            <div key={s.label} className="flex items-center gap-0.5 px-1 py-0.5" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" }}>
              <Zap className="w-2 h-2 flex-shrink-0" style={{ color: "#34d399" }} />
              <span className="text-[8px] font-bold uppercase tracking-wider leading-none" style={{ color: "#34d399" }}>{s.label}</span>
              <span className="text-[8px] font-bold ml-0.5" style={{ color: "#6ee7b7" }}>+{Math.round(s.bonus * 100)}%</span>
            </div>
          ))}
          {negativeSynergies.map(s => (
            <div key={s.label} className="flex items-center gap-0.5 px-1 py-0.5" style={{ background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.25)" }}>
              <AlertTriangle className="w-2 h-2 flex-shrink-0" style={{ color: "#fb923c" }} />
              <span className="text-[8px] font-bold uppercase tracking-wider leading-none" style={{ color: "#fb923c" }}>{s.label}</span>
              <span className="text-[8px] font-bold ml-0.5" style={{ color: "#fdba74" }}>{Math.round(s.bonus * 100)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Power bar comparison ────────────────────────────────────────────────────
function PowerComparison({ team1, team2 }: { team1: Character[]; team2: Character[] }) {
  const p1 = team1.reduce((s, c) => s + c.strength + c.speed + c.intelligence + c.durability, 0);
  const p2 = team2.reduce((s, c) => s + c.strength + c.speed + c.intelligence + c.durability, 0);
  if (p1 === 0 && p2 === 0) return null;
  const total = p1 + p2 || 1;
  const pct1 = Math.round((p1 / total) * 100);
  const pct2 = 100 - pct1;
  return (
    <div className="px-3 pb-1">
      <div className="h-0.5 flex overflow-hidden">
        <div className="h-full transition-all duration-700" style={{ width: `${pct1}%`, background: "linear-gradient(to right, #00f0ff80, #00f0ff)" }} />
        <div className="h-full transition-all duration-700" style={{ width: `${pct2}%`, background: "linear-gradient(to left, #ff3b3080, #ff3b30)" }} />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[8px] font-bold" style={{ color: "#00f0ff80" }}>{pct1}%</span>
        <span className="text-[8px] font-bold text-center" style={{ color: "rgba(255,255,255,0.2)" }}>PWR RATIO</span>
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

// ─── Home page ───────────────────────────────────────────────────────────────
export function Home() {
  const { data: characters, isLoading } = useListCharacters();
  const { toast } = useToast();
  const [team1, setTeam1] = useState<Character[]>([]);
  const [team2, setTeam2] = useState<Character[]>([]);
  const [activeTeam, setActiveTeam] = useState<1 | 2>(1);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUniverse, setSelectedUniverse] = useState<string | null>(null);
  const [showAllUniverses, setShowAllUniverses] = useState(false);
  const pillsRef = useRef<HTMLDivElement>(null);

  // Build universe list sorted by count, only show 4+ in main bar
  const { mainUniverses, allUniverses } = useMemo(() => {
    if (!characters) return { mainUniverses: [], allUniverses: [] };
    const counts: Record<string, number> = {};
    for (const c of characters) counts[c.universe] = (counts[c.universe] ?? 0) + 1;
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return {
      mainUniverses: sorted.filter(([, n]) => n >= 4).map(([u, n]) => ({ universe: u, count: n })),
      allUniverses: sorted.map(([u, n]) => ({ universe: u, count: n })),
    };
  }, [characters]);

  const displayUniverses = showAllUniverses ? allUniverses : mainUniverses;

  const filteredCharacters = useMemo(() => {
    if (!characters) return [];
    const q = searchQuery.trim().toLowerCase();
    return characters.filter(c => {
      const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.universe.toLowerCase().includes(q);
      const matchesUniverse = !selectedUniverse || c.universe === selectedUniverse;
      return matchesSearch && matchesUniverse;
    });
  }, [characters, searchQuery, selectedUniverse]);

  const simulateFight = useSimulateFight({
    mutation: {
      onError: (error) => {
        toast({ title: "Simulation Failed", description: error.error || "Unknown error", variant: "destructive" });
        setShowModal(false);
      },
    },
  });

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

  const handleFight = () => {
    if (team1.length === 0 || team2.length === 0) {
      toast({ title: "Teams Required", description: "Both teams need at least 1 fighter", variant: "destructive" });
      return;
    }
    setShowModal(true);
    simulateFight.mutate({ data: { team1: team1.map(c => c.id), team2: team2.map(c => c.id) } });
  };

  const getCharacterTeam = (id: number) => {
    if (team1.some(c => c.id === id)) return 1 as const;
    if (team2.some(c => c.id === id)) return 2 as const;
    return null;
  };

  const canFight = team1.length > 0 && team2.length > 0;
  const activeColor = activeTeam === 1 ? "#00f0ff" : "#ff3b30";

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
        @keyframes pickingBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes hudGlow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
      `}</style>

      <div className="flex flex-col h-full min-h-0">
        {/* ── ARENA HUD ─────────────────────────────────────────────────── */}
        <div
          className="flex-shrink-0 sticky top-0 z-30"
          style={{
            background: "linear-gradient(180deg, #000000 0%, #080810 100%)",
            borderBottom: "1px solid rgba(255,0,85,0.2)",
          }}
        >
          {/* Scanline overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)",
              zIndex: 1,
            }}
          />

          {/* Content above scanlines */}
          <div className="relative z-10">
            {/* Logo strip */}
            <div
              className="flex items-center justify-center py-1.5 relative"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
            >
              {/* Left decoration */}
              <div className="absolute left-3 flex items-center gap-1.5">
                <div className="h-px w-8" style={{ background: "linear-gradient(to right, transparent, rgba(0,240,255,0.5))" }} />
                <div className="h-1 w-1 rotate-45" style={{ background: "#00f0ff60" }} />
              </div>
              <AvaLogo className="h-9 w-auto" />
              {/* Right decoration */}
              <div className="absolute right-3 flex items-center gap-1.5">
                <div className="h-1 w-1 rotate-45" style={{ background: "#ff3b3060" }} />
                <div className="h-px w-8" style={{ background: "linear-gradient(to left, transparent, rgba(255,59,48,0.5))" }} />
              </div>
            </div>

            {/* Team builder */}
            <div className="flex items-stretch gap-2 p-2">
              <TeamSlot
                team={1}
                members={team1}
                active={activeTeam === 1}
                onActivate={() => setActiveTeam(1)}
                onRemove={(id) => setTeam1(t => t.filter(c => c.id !== id))}
              />

              {/* CENTER: VS + FIGHT */}
              <div className="flex-shrink-0 flex flex-col items-center justify-between gap-1" style={{ width: 52 }}>
                {/* VS label */}
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div
                      className="font-display text-xs uppercase tracking-[0.3em] leading-none"
                      style={{ color: "rgba(255,0,85,0.5)", textShadow: "0 0 12px rgba(255,0,85,0.4)" }}
                    >
                      vs
                    </div>
                  </div>
                </div>

                {/* FIGHT button */}
                <button
                  className="flex flex-col items-center justify-center font-display text-[10px] uppercase tracking-widest transition-all duration-200 active:scale-95"
                  style={{
                    width: 52,
                    height: 52,
                    border: canFight ? "1.5px solid #ff0055" : "1.5px solid rgba(255,255,255,0.1)",
                    background: canFight ? "rgba(255,0,85,0.12)" : "rgba(255,255,255,0.03)",
                    color: canFight ? "#ff0055" : "rgba(255,255,255,0.2)",
                    cursor: canFight ? "pointer" : "not-allowed",
                    animation: canFight ? "fightPulse 2s ease-in-out infinite" : "none",
                  }}
                  onClick={handleFight}
                  disabled={!canFight || simulateFight.isPending}
                >
                  <Swords className="h-5 w-5 mb-0.5" />
                  <span className="leading-none text-[9px]">
                    {simulateFight.isPending ? "•••" : "FIGHT"}
                  </span>
                </button>

                {/* Slot dots */}
                <div className="flex gap-0.5 justify-center">
                  {[0,1,2,3,4].map(i => (
                    <div
                      key={i}
                      className="w-1 h-1 rounded-full"
                      style={{
                        background: i < Math.max(team1.length, team2.length)
                          ? "#ff005560"
                          : "rgba(255,255,255,0.1)",
                      }}
                    />
                  ))}
                </div>
              </div>

              <TeamSlot
                team={2}
                members={team2}
                active={activeTeam === 2}
                onActivate={() => setActiveTeam(2)}
                onRemove={(id) => setTeam2(t => t.filter(c => c.id !== id))}
              />
            </div>

            {/* Power comparison bar */}
            <PowerComparison team1={team1} team2={team2} />

            {/* Picking indicator */}
            <div
              className="text-center py-1 text-[10px] font-bold uppercase tracking-[0.25em]"
              style={{
                color: activeColor,
                background: `${activeColor}08`,
                borderTop: `1px solid ${activeColor}20`,
                animation: "pickingBlink 2.5s ease-in-out infinite",
              }}
            >
              ▸ Picking for Team {activeTeam} — tap a fighter below ◂
            </div>

            {/* Search + filter */}
            <div
              className="px-3 pt-2 pb-2 space-y-1.5"
              style={{ background: "rgba(0,0,0,0.3)", borderTop: "1px solid rgba(255,255,255,0.04)" }}
            >
              {/* Search */}
              <div className="relative">
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

              {/* Universe pills */}
              <div
                ref={pillsRef}
                className="flex gap-1 overflow-x-auto pb-0.5"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                <UniversePill
                  label="All"
                  active={!selectedUniverse}
                  onClick={() => setSelectedUniverse(null)}
                />
                {displayUniverses.map(({ universe, count }) => (
                  <UniversePill
                    key={universe}
                    label={universe}
                    count={count}
                    active={selectedUniverse === universe}
                    onClick={() => setSelectedUniverse(prev => prev === universe ? null : universe)}
                  />
                ))}
                {/* Toggle to show all universes */}
                <button
                  onClick={() => setShowAllUniverses(s => !s)}
                  className="flex-shrink-0 flex items-center gap-0.5 transition-all duration-150"
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    padding: "3px 6px",
                    border: "1px dashed rgba(255,255,255,0.12)",
                    background: showAllUniverses ? "rgba(255,255,255,0.07)" : "transparent",
                    color: "rgba(255,255,255,0.25)",
                  }}
                >
                  <ChevronDown className={`w-2.5 h-2.5 transition-transform ${showAllUniverses ? "rotate-180" : ""}`} />
                  {showAllUniverses ? "Less" : "More"}
                </button>
              </div>
            </div>
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
          <div className="flex-1 overflow-y-auto" style={{ background: "rgba(0,0,0,0.3)" }}>
            {/* Filter status bar */}
            {(selectedUniverse || searchQuery) && (
              <div
                className="flex items-center justify-between px-3 py-1.5 sticky top-0 z-10"
                style={{ background: "rgba(0,0,0,0.85)", borderBottom: "1px solid rgba(255,0,85,0.15)" }}
              >
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {filteredCharacters.length} fighter{filteredCharacters.length !== 1 ? "s" : ""}
                  {selectedUniverse ? ` — ${selectedUniverse}` : ""}
                  {searchQuery ? ` matching "${searchQuery}"` : ""}
                </span>
                <button
                  onClick={() => { setSearchQuery(""); setSelectedUniverse(null); }}
                  className="text-[10px] font-bold uppercase tracking-widest transition-colors"
                  style={{ color: "#ff0055" }}
                >
                  Clear
                </button>
              </div>
            )}

            <div className="p-2.5">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
                {filteredCharacters.map(character => (
                  <CharacterCard
                    key={character.id}
                    character={character}
                    selectedTeam={getCharacterTeam(character.id)}
                    onClick={() => handleCharacterClick(character)}
                    disabled={
                      (activeTeam === 1 && team1.length >= 5 && getCharacterTeam(character.id) === null) ||
                      (activeTeam === 2 && team2.length >= 5 && getCharacterTeam(character.id) === null)
                    }
                  />
                ))}
              </div>
              {filteredCharacters.length === 0 && !isLoading && (
                <div className="text-center p-16 space-y-3">
                  <p className="font-display text-xl uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>No fighters found</p>
                  <button
                    onClick={() => { setSearchQuery(""); setSelectedUniverse(null); }}
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
          onClose={() => setShowModal(false)}
          result={simulateFight.data || null}
          isSimulating={simulateFight.isPending}
          team1Names={team1.map(c => c.name)}
          team2Names={team2.map(c => c.name)}
          team1Images={team1.map(c => c.imageUrl)}
          team2Images={team2.map(c => c.imageUrl)}
        />
      </div>
    </>
  );
}
