import { useState } from "react";
import {
  useListFights,
  useClearFightHistory,
  useDeleteFight,
  getListFightsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Trophy, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function Fights() {
  const { data: fights, isLoading } = useListFights();
  const clearHistory = useClearFightHistory();
  const deleteFight  = useDeleteFight();
  const queryClient  = useQueryClient();
  const { toast }    = useToast();
  const [confirmClear, setConfirmClear] = useState(false);

  const handleClearAll = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    try {
      await clearHistory.mutateAsync();
      queryClient.invalidateQueries({ queryKey: getListFightsQueryKey() });
      toast({ title: "History Cleared", description: "All fight records have been removed." });
    } catch {
      toast({ title: "Error", description: "Failed to clear history.", variant: "destructive" });
    }
    setConfirmClear(false);
  };

  const handleDeleteOne = async (id: number) => {
    try {
      await deleteFight.mutateAsync(id);
      queryClient.invalidateQueries({ queryKey: getListFightsQueryKey() });
    } catch {
      toast({ title: "Error", description: "Failed to remove fight.", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between border-b border-border/30">
        <h1 className="font-display text-2xl uppercase tracking-widest text-primary">Fight History</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-muted-foreground">{fights?.length || 0} matches</span>
          {fights && fights.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={clearHistory.isPending}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1.5 border transition-all"
              style={{
                borderColor: confirmClear ? "#ff3b3060" : "rgba(255,255,255,0.12)",
                color: confirmClear ? "#ff3b30" : "rgba(255,255,255,0.35)",
                background: confirmClear ? "rgba(255,59,48,0.07)" : "transparent",
              }}
            >
              <Trash2 className="h-3 w-3" />
              {confirmClear ? "Confirm?" : "Clear All"}
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center p-16">
          <p className="font-display text-2xl uppercase animate-pulse text-muted-foreground">Loading...</p>
        </div>
      ) : fights?.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 gap-4 text-center">
          <Trophy className="h-16 w-16 text-muted-foreground/30" />
          <p className="font-display text-xl text-muted-foreground uppercase">No fights yet.</p>
          <p className="text-sm text-muted-foreground">Go to the Arena and start a match.</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border/30">
          {fights?.map((fight) => (
            <div key={fight.id} className="relative px-4 py-4 flex flex-col gap-3 group">
              {/* Winner color bar */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${fight.winner === 1 ? "bg-team1" : "bg-team2"}`} />

              {/* Header row */}
              <div className="flex items-center justify-between pl-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Match #{fight.id}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(fight.simulatedAt), "MMM d, yyyy · HH:mm")}
                  </span>
                  <button
                    onClick={() => handleDeleteOne(fight.id)}
                    disabled={deleteFight.isPending}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-destructive"
                    style={{ color: "rgba(255,255,255,0.25)" }}
                    title="Remove this fight"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Teams vs layout */}
              <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center pl-2">
                <div className={`${fight.winner === 1 ? "opacity-100" : "opacity-40"}`}>
                  <div className="flex items-center gap-1 mb-1">
                    {fight.winner === 1 && (
                      <span className="text-[9px] font-bold bg-team1 text-black px-1.5 py-0.5 uppercase tracking-wider">Winner</span>
                    )}
                    <span className="font-display text-sm text-team1 uppercase">Team 1</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-tight">{fight.team1Names.join(", ")}</p>
                </div>

                <div className="font-display text-lg text-primary bg-primary/10 border border-primary/30 px-2 py-1 italic">
                  VS
                </div>

                <div className={`text-right ${fight.winner === 2 ? "opacity-100" : "opacity-40"}`}>
                  <div className="flex items-center justify-end gap-1 mb-1">
                    <span className="font-display text-sm text-team2 uppercase">Team 2</span>
                    {fight.winner === 2 && (
                      <span className="text-[9px] font-bold bg-team2 text-white px-1.5 py-0.5 uppercase tracking-wider">Winner</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-tight">{fight.team2Names.join(", ")}</p>
                </div>
              </div>

              {/* Summary */}
              <div className="pl-2 text-xs text-muted-foreground border-l-2 border-primary/30 ml-0.5">
                {fight.summary}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
