import { useState } from "react";
import { useListCharacters, useGetCharacterStats, useDeleteCharacter, getListCharactersQueryKey, getGetCharacterStatsQueryKey } from "@workspace/api-client-react";
import { CharacterCard } from "@/components/character-card";
import { Input } from "@/components/ui/input";
import { Search, Filter, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await deleteCharacter.mutateAsync({ id });
        queryClient.invalidateQueries({ queryKey: getListCharactersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetCharacterStatsQueryKey() });
        toast({ title: "Character Deleted", description: `${name} has been removed from the roster.` });
      } catch (err) {
        toast({ title: "Error", description: "Failed to delete character.", variant: "destructive" });
      }
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center font-display text-2xl animate-pulse">Loading Roster...</div>;
  }

  const universes = Array.from(new Set(characters?.map(c => c.universe) || []));

  const filteredCharacters = characters?.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesUniverse = universeFilter === "all" || c.universe === universeFilter;
    return matchesSearch && matchesUniverse;
  });

  return (
    <div className="flex flex-col gap-8">
      {/* Stats Section */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-none border-2 bg-card/50">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase font-bold tracking-wider">Total Fighters</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="font-display text-4xl text-primary">{stats.totalCharacters}</p>
            </CardContent>
          </Card>
          
          <Card className="rounded-none border-2 bg-card/50">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase font-bold tracking-wider">Top Strength</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="font-display text-2xl text-team2 truncate">{stats.topStrength?.name || 'N/A'}</p>
              <p className="text-xs text-muted-foreground">{stats.topStrength?.strength} STR</p>
            </CardContent>
          </Card>

          <Card className="rounded-none border-2 bg-card/50">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase font-bold tracking-wider">Top Speed</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="font-display text-2xl text-team1 truncate">{stats.topSpeed?.name || 'N/A'}</p>
              <p className="text-xs text-muted-foreground">{stats.topSpeed?.speed} SPD</p>
            </CardContent>
          </Card>

          <Card className="rounded-none border-2 bg-card/50">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase font-bold tracking-wider">Top Intelligence</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="font-display text-2xl text-secondary truncate">{stats.topIntelligence?.name || 'N/A'}</p>
              <p className="text-xs text-muted-foreground">{stats.topIntelligence?.intelligence} INT</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Universe Breakdown */}
      {stats?.universeBreakdown && stats.universeBreakdown.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {stats.universeBreakdown.map(u => (
            <Badge key={u.universe} variant="secondary" className="rounded-none px-3 py-1 font-bold text-xs uppercase">
              {u.universe}: {u.count}
            </Badge>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 border-2 border-border">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search characters..." 
            className="pl-10 rounded-none border-2 h-12 font-display text-xl tracking-wider uppercase bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-64">
          <Select value={universeFilter} onValueChange={setUniverseFilter}>
            <SelectTrigger className="rounded-none border-2 h-12 font-display text-xl tracking-wider uppercase bg-background">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="Universe" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-none font-display text-lg uppercase tracking-wider">
              <SelectItem value="all">All Universes</SelectItem>
              {universes.map(u => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {filteredCharacters?.map(character => (
          <div key={character.id} className="relative group">
            <CharacterCard character={character} />
            <Button 
              variant="destructive" 
              size="icon" 
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-none z-10"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(character.id, character.name);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      
      {filteredCharacters?.length === 0 && (
        <div className="text-center p-12 bg-card border-2 border-border border-dashed">
          <p className="text-2xl text-muted-foreground font-display uppercase">No characters found matching criteria.</p>
        </div>
      )}
    </div>
  );
}
