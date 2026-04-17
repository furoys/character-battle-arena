import { useState } from "react";
import { useListCharacters, useGetCharacterStats, useDeleteCharacter, getListCharactersQueryKey, getGetCharacterStatsQueryKey } from "@workspace/api-client-react";
import { RosterFlipCard } from "@/components/roster-flip-card";
import { Input } from "@/components/ui/input";
import { Search, Filter, Swords, Zap, Brain } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export function Roster() {
  const [search, setSearch] = useState("");
  const [universeFilter, setUniverseFilter] = useState<string>("all");

  const { data: characters, isLoading } = useListCharacters();
  const { data: stats } = useGetCharacterStats();
  const deleteCharacter = useDeleteCharacter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  const universes = Array.from(new Set(characters?.map(c => c.universe) || []));

  const filteredCharacters = characters?.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesUniverse = universeFilter === "all" || c.universe === universeFilter;
    return matchesSearch && matchesUniverse;
  });

  return (
    <div className="flex flex-col">
      {/* Page title */}
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
            { label: "Fastest", name: stats.topSpeed?.name, value: `${stats.topSpeed?.speed?.toLocaleString()} SPD`, icon: Zap, color: "text-team1" },
            { label: "Smartest", name: stats.topIntelligence?.name, value: `${stats.topIntelligence?.intelligence?.toLocaleString()} INT`, icon: Brain, color: "text-secondary" },
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

      {/* Universe tags */}
      {stats?.universeBreakdown && stats.universeBreakdown.length > 0 && (
        <div className="flex gap-1.5 px-3 py-2 overflow-x-auto border-b border-border/30 flex-nowrap">
          {stats.universeBreakdown.map(u => (
            <Badge
              key={u.universe}
              variant="secondary"
              className="rounded-none px-2 py-0.5 font-bold text-[9px] uppercase tracking-wider whitespace-nowrap cursor-pointer flex-shrink-0"
              onClick={() => setUniverseFilter(u.universe === universeFilter ? "all" : u.universe)}
              style={{ opacity: universeFilter !== "all" && universeFilter !== u.universe ? 0.4 : 1 }}
            >
              {u.universe} {u.count}
            </Badge>
          ))}
        </div>
      )}

      {/* Search + Filter */}
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
        <Select value={universeFilter} onValueChange={setUniverseFilter}>
          <SelectTrigger className="rounded-none border-2 h-10 w-[140px] bg-background text-xs font-bold uppercase">
            <div className="flex items-center gap-1">
              <Filter className="h-3 w-3" />
              <SelectValue placeholder="Universe" />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-none font-bold text-xs uppercase">
            <SelectItem value="all">All Universes</SelectItem>
            {universes.map(u => (
              <SelectItem key={u} value={u}>{u}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center p-16">
          <p className="font-display text-2xl uppercase animate-pulse text-muted-foreground">Loading...</p>
        </div>
      ) : (
        <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filteredCharacters?.map(character => (
            <div key={character.id} className="group/card">
              <RosterFlipCard
                character={character}
                onDelete={() => handleDelete(character.id, character.name)}
              />
            </div>
          ))}
          {filteredCharacters?.length === 0 && (
            <div className="col-span-full text-center p-12">
              <p className="font-display text-lg text-muted-foreground uppercase">No fighters found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
