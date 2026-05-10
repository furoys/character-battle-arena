import { useState, useEffect, useRef, useCallback } from "react";
import { useListCharacters, useGetCharacterStats, useDeleteCharacter, getListCharactersQueryKey, getGetCharacterStatsQueryKey } from "@workspace/api-client-react";
import { RosterFlipCard, powerAvg, powerTier } from "@/components/roster-flip-card";
import { Input } from "@/components/ui/input";
import { Search, Swords, Zap, Brain, ChevronDown } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { getUniverseCategory, CATEGORY_ORDER, CATEGORY_COLORS, type UniverseCategory } from "@/lib/universe-categories";

type SortKey = "power" | "str" | "spd" | "int" | "dur" | "name";
type TierFilter = "all" | "cosmic" | "elite" | "standard" | "street";
type CategoryFilter = "all" | UniverseCategory;

const BEHAVIOR_TAGS: { tag: string; color: string }[] = [
  { tag: "aggressive",     color: "#ff3b30" },
  { tag: "tactical",       color: "#00f0ff" },
  { tag: "defensive",      color: "#30d158" },
  { tag: "speedster",      color: "#ffe234" },
  { tag: "regen",          color: "#30d158" },
  { tag: "stealth",        color: "#8e8e93" },
  { tag: "arrogant",       color: "#ff9f0a" },
  { tag: "sadistic",       color: "#ff0055" },
  { tag: "reality-warper", color: "#bf5af2" },
  { tag: "long-range",     color: "#64d2ff" },
  { tag: "close-quarters", color: "#ff6b30" },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "power", label: "Power (avg)" },
  { key: "str",   label: "Strength" },
  { key: "spd",   label: "Speed" },
  { key: "int",   label: "Intelligence" },
  { key: "dur",   label: "Durability" },
  { key: "name",  label: "Name A–Z" },
];

const TIER_OPTIONS: { key: TierFilter; label: string; color: string }[] = [
  { key: "all",      label: "All Tiers",  color: "hsl(var(--muted-foreground))" },
  { key: "cosmic",   label: "★ Cosmic",   color: "#ff0055" },
  { key: "elite",    label: "◆ Elite",    color: "#c084fc" },
  { key: "standard", label: "● Standard", color: "#00f0ff" },
  { key: "street",   label: "○ Street",   color: "#94a3b8" },
];

const INITIAL_VISIBLE = 60;
const PAGE_SIZE       = 40;

export function Roster() {
  const [search, setSearch]           = useState("");
  const [universeFilter, setUniverse] = useState<CategoryFilter>("all");
  const [sortBy, setSortBy]           = useState<SortKey>("power");
  const [tierFilter, setTierFilter]   = useState<TierFilter>("all");
  const [tagFilter, setTagFilter]     = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data: characters, isLoading } = useListCharacters();
  const { data: stats } = useGetCharacterStats();
  const deleteCharacter = useDeleteCharacter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Reset when any filter changes
  useEffect(() => { setVisibleCount(INITIAL_VISIBLE); }, [search, universeFilter, tierFilter, tagFilter, sortBy]);

  // IntersectionObserver — load more when sentinel scrolls into view
  const loadMore = useCallback(() => setVisibleCount(n => n + PAGE_SIZE), []);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => { if (entries[0].isIntersecting) loadMore(); }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  const handleDelete = async (id: number, name: string) => {
    if (confirm(`Remove ${name} from roster?`)) {
      try {
        await deleteCharacter.mutateAsync({ id });
        queryClient.invalidateQueries({ queryKey: getListCharactersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetCharacterStatsQueryKey() });
        toast({ title: "Fighter Removed", description: `${name} has left the arena.` });
      } catch {
        toast({ title: "Error", description: "Failed to remove fighter.", variant: "destructive" });
      }
    }
  };

  const safeChars = Array.isArray(characters) ? characters : [];
  const filtered = safeChars
    .filter(c => {
      if (!c.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (universeFilter !== "all" && getUniverseCategory(c.universe) !== universeFilter) return false;
      if (tierFilter !== "all") {
        const avg = powerAvg(c);
        const t = powerTier(avg).label.toLowerCase();
        if (tierFilter !== t) return false;
      }
      if (tagFilter && !(c.behaviorTags ?? []).includes(tagFilter)) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "str":   return b.strength - a.strength;
        case "spd":   return b.speed - a.speed;
        case "int":   return b.intelligence - a.intelligence;
        case "dur":   return b.durability - a.durability;
        case "name":  return a.name.localeCompare(b.name);
        default:      return powerAvg(b) - powerAvg(a);
      }
    });

  const currentSort = SORT_OPTIONS.find(o => o.key === sortBy)!;
  const currentTier = TIER_OPTIONS.find(o => o.key === tierFilter)!;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between border-b border-border/30">
        <h1 className="font-display text-2xl uppercase tracking-widest text-primary">Roster</h1>
        {stats && (
          <span className="text-sm font-bold text-muted-foreground">{stats.totalCharacters} fighters</span>
        )}
      </div>

      {/* Stat leaders */}
      {stats && (
        <div className="grid grid-cols-3 border-b border-border/30">
          {[
            { label: "Strongest", name: stats.topStrength?.name, value: `${stats.topStrength?.strength?.toLocaleString()} STR`, icon: Swords, color: "text-team2" },
            { label: "Fastest",   name: stats.topSpeed?.name,    value: `${stats.topSpeed?.speed?.toLocaleString()} SPD`,        icon: Zap,    color: "text-team1" },
            { label: "Smartest",  name: stats.topIntelligence?.name, value: `${stats.topIntelligence?.intelligence?.toLocaleString()} INT`, icon: Brain, color: "text-secondary" },
          ].map(s => (
            <div key={s.label} className="p-3 border-r last:border-r-0 border-border/30 flex flex-col gap-0.5">
              <div className="flex items-center gap-1">
                <s.icon className={`h-3 w-3 ${s.color}`} />
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{s.label}</span>
              </div>
              <p className={`font-display text-sm uppercase truncate ${s.color}`}>{s.name || "N/A"}</p>
              <p className="text-[9px] text-muted-foreground">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Category quick tags (consolidated from 100+ universes) */}
      {safeChars.length > 0 && (
        <div className="flex gap-1.5 px-3 py-2 overflow-x-auto border-b border-border/30 flex-nowrap scrollbar-none">
          <button
            onClick={() => setUniverse("all")}
            className="flex-shrink-0 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border transition-all"
            style={{
              color: universeFilter === "all" ? "#000" : "hsl(var(--muted-foreground))",
              background: universeFilter === "all" ? "hsl(var(--muted-foreground))" : "transparent",
              borderColor: "hsl(var(--muted-foreground) / 0.4)",
            }}
          >
            ALL {safeChars.length}
          </button>
          {CATEGORY_ORDER.map(cat => {
            const count = safeChars.filter(c => getUniverseCategory(c.universe) === cat).length;
            if (count === 0) return null;
            const color = CATEGORY_COLORS[cat];
            const active = universeFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setUniverse(active ? "all" : cat)}
                className="flex-shrink-0 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border transition-all"
                style={{
                  color: active ? "#000" : color,
                  background: active ? color : "transparent",
                  borderColor: `${color}60`,
                  opacity: universeFilter !== "all" && !active ? 0.4 : 1,
                }}
              >
                {cat} {count}
              </button>
            );
          })}
        </div>
      )}

      {/* Power tier filter pills */}
      <div className="flex gap-1.5 px-3 py-2 overflow-x-auto border-b border-border/30 flex-nowrap scrollbar-none">
        {TIER_OPTIONS.map(t => (
          <button
            key={t.key}
            onClick={() => setTierFilter(t.key === tierFilter ? "all" : t.key)}
            className="flex-shrink-0 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border transition-all"
            style={{
              color: tierFilter === t.key ? "#000" : t.color,
              background: tierFilter === t.key ? t.color : "transparent",
              borderColor: `${t.color}60`,
              opacity: tierFilter !== "all" && tierFilter !== t.key ? 0.4 : 1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Behavior tag filter pills */}
      <div className="flex gap-1.5 px-3 py-2 overflow-x-auto border-b border-border/30 flex-nowrap scrollbar-none items-center">
        <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/40 flex-shrink-0 mr-1">STYLE</span>
        {BEHAVIOR_TAGS.map(({ tag, color }) => {
          const active = tagFilter === tag;
          return (
            <button
              key={tag}
              onClick={() => setTagFilter(active ? null : tag)}
              className="flex-shrink-0 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border transition-all"
              style={{
                color: active ? "#000" : color,
                background: active ? color : `${color}10`,
                borderColor: `${color}50`,
                opacity: tagFilter !== null && !active ? 0.35 : 1,
              }}
            >
              {tag}
            </button>
          );
        })}
      </div>

      {/* Search + Sort */}
      <div className="flex gap-2 p-3 bg-card/50 border-b border-border/30 sticky top-0 z-20">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search fighters..."
            className="pl-9 rounded-none border-2 h-10 bg-background text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Sort dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="rounded-none border-2 h-10 px-3 gap-1 text-xs font-bold uppercase whitespace-nowrap">
              {currentSort.label}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="rounded-none min-w-[160px]">
            <DropdownMenuLabel className="text-[9px] uppercase tracking-widest text-muted-foreground">Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SORT_OPTIONS.map(o => (
              <DropdownMenuItem
                key={o.key}
                className={`text-xs font-bold uppercase ${sortBy === o.key ? "text-primary" : ""}`}
                onClick={() => setSortBy(o.key)}
              >
                {o.label}
                {sortBy === o.key && <span className="ml-auto text-primary">✓</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Tier quick filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="rounded-none border-2 h-10 px-3 gap-1 text-xs font-bold uppercase whitespace-nowrap"
              style={{ color: currentTier.color, borderColor: tierFilter !== "all" ? currentTier.color : undefined }}
            >
              {tierFilter === "all" ? "Tier" : currentTier.label}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="rounded-none min-w-[140px]">
            <DropdownMenuLabel className="text-[9px] uppercase tracking-widest text-muted-foreground">Power Tier</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {TIER_OPTIONS.map(t => (
              <DropdownMenuItem
                key={t.key}
                className="text-xs font-bold uppercase"
                style={{ color: tierFilter === t.key ? t.color : undefined }}
                onClick={() => setTierFilter(t.key)}
              >
                {t.label}
                {tierFilter === t.key && <span className="ml-auto">✓</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Results count */}
      {(search || universeFilter !== "all" || tierFilter !== "all" || tagFilter) && (
        <div className="px-3 py-1.5 border-b border-border/20 flex items-center justify-between bg-card/30">
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
            {filtered?.length ?? 0} results
          </span>
          <button
            className="text-[10px] text-primary uppercase tracking-widest hover:underline"
            onClick={() => { setSearch(""); setUniverse("all"); setTierFilter("all"); setTagFilter(null); }}
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center p-16">
          <p className="font-display text-2xl uppercase animate-pulse text-muted-foreground">Loading...</p>
        </div>
      ) : (
        <>
          <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {(Array.isArray(filtered) ? filtered : []).slice(0, visibleCount).map(character => (
              <div key={character.id} className="group/card">
                <RosterFlipCard
                  character={character}
                  onDelete={() => handleDelete(character.id, character.name)}
                />
              </div>
            ))}
            {filtered?.length === 0 && (
              <div className="col-span-full text-center p-12 flex flex-col items-center gap-3">
                <p className="font-display text-lg text-muted-foreground uppercase">No fighters found.</p>
                <button
                  className="text-xs text-primary uppercase tracking-widest hover:underline"
                  onClick={() => { setSearch(""); setUniverse("all"); setTierFilter("all"); setTagFilter(null); }}
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
          {/* Sentinel — triggers loading the next batch */}
          {(filtered?.length ?? 0) > visibleCount && (
            <div ref={sentinelRef} className="flex justify-center py-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 animate-pulse">
                Loading more…
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
