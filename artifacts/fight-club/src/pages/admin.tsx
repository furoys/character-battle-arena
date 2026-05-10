import { useState, useCallback } from "react";
import { Shield, Check, X, ChevronRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListCharactersQueryKey, getGetCharacterStatsQueryKey } from "@workspace/api-client-react";

interface Suggestion {
  id: number;
  name: string;
  universe: string;
  strength: number;
  speed: number;
  intelligence: number;
  durability: number;
  specialAbility: string;
  weaknesses: string;
  description: string;
  status: string;
  createdAt: string;
}

const STAT_COLORS: Record<string, string> = {
  strength: "#ff3b30",
  speed: "#00f0ff",
  intelligence: "#c084fc",
  durability: "#eab308",
};

function StatPill({ label, value }: { label: string; value: number }) {
  const color = STAT_COLORS[label.toLowerCase()] ?? "#aaa";
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-0">
      <span className="font-display text-base font-bold leading-none" style={{ color }}>{value}</span>
      <div className="w-8 h-0.5 bg-white/10 overflow-hidden">
        <div className="h-full" style={{ width: `${value}%`, background: color, opacity: 0.7 }} />
      </div>
      <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/60">{label}</span>
    </div>
  );
}

function SuggestionCard({ s, pin, onApprove, onReject }: {
  s: Suggestion;
  pin: string;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border/50 bg-card/40">
      <div className="p-3 flex gap-3 items-start">
        {/* Name + universe */}
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-bold uppercase tracking-widest text-primary truncate">{s.universe}</div>
          <h3 className="font-display text-lg uppercase leading-none truncate">{s.name}</h3>
        </div>

        {/* Stat pills */}
        <div className="flex gap-2 shrink-0">
          <StatPill label="STR" value={s.strength} />
          <StatPill label="SPD" value={s.speed} />
          <StatPill label="INT" value={s.intelligence} />
          <StatPill label="DUR" value={s.durability} />
        </div>
      </div>

      {/* Expandable lore */}
      <div
        className="px-3 pb-1 flex items-center gap-1 cursor-pointer text-muted-foreground hover:text-foreground"
        onClick={() => setExpanded(e => !e)}
      >
        <ChevronRight className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`} />
        <span className="text-[10px] uppercase tracking-widest font-bold">Details</span>
      </div>

      {expanded && (
        <div className="px-3 pb-2 space-y-2 text-xs text-muted-foreground">
          <div>
            <span className="font-bold uppercase text-[9px] tracking-wider text-primary">Ability — </span>
            {s.specialAbility}
          </div>
          <div>
            <span className="font-bold uppercase text-[9px] tracking-wider text-destructive">Weakness — </span>
            {s.weaknesses}
          </div>
          <div>
            <span className="font-bold uppercase text-[9px] tracking-wider text-muted-foreground">Lore — </span>
            {s.description}
          </div>
          <div className="text-[9px] text-muted-foreground/40">
            Submitted {new Date(s.createdAt).toLocaleDateString()}
            <br />
            Stats shown as suggested (1–100). Will scale to 0–10,000 on approval.
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex border-t border-border/30">
        <button
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/10 transition-colors"
          onClick={() => onApprove(s.id)}
        >
          <Check className="w-3.5 h-3.5" />
          Approve & Add
        </button>
        <div className="w-px bg-border/30" />
        <button
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold uppercase tracking-widest text-destructive hover:bg-destructive/10 transition-colors"
          onClick={() => onReject(s.id)}
        >
          <X className="w-3.5 h-3.5" />
          Reject
        </button>
      </div>
    </div>
  );
}

const PIN_KEY = "ava_admin_pin";

export function Admin() {
  const [pin, setPin] = useState(() => localStorage.getItem(PIN_KEY) ?? "");
  const [pinInput, setPinInput] = useState("");
  const [unlocked, setUnlocked] = useState(() => !!localStorage.getItem(PIN_KEY));
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fetchSuggestions = useCallback(async (p: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/suggestions`, {
        headers: { "x-admin-pin": p },
      });
      if (res.status === 401) {
        toast({ title: "Wrong PIN", variant: "destructive" });
        setUnlocked(false);
        localStorage.removeItem(PIN_KEY);
        return;
      }
      const data = await res.json();
      setSuggestions(Array.isArray(data) ? (data as Suggestion[]) : []);
    } catch {
      toast({ title: "Error loading suggestions", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  function handleUnlock() {
    const p = pinInput.trim();
    if (!p) return;
    setPin(p);
    localStorage.setItem(PIN_KEY, p);
    setUnlocked(true);
    fetchSuggestions(p);
  }

  async function handleApprove(id: number) {
    const res = await fetch(`${import.meta.env.BASE_URL}api/suggestions/${id}/approve`, {
      method: "POST",
      headers: { "x-admin-pin": pin },
    });
    if (!res.ok) {
      toast({ title: "Approval failed", variant: "destructive" });
      return;
    }
    const character = await res.json();
    toast({ title: "Fighter Added", description: `${character.name} is now on the roster.` });
    setSuggestions(s => s?.filter(x => x.id !== id) ?? null);
    queryClient.invalidateQueries({ queryKey: getListCharactersQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetCharacterStatsQueryKey() });
  }

  async function handleReject(id: number) {
    const res = await fetch(`${import.meta.env.BASE_URL}api/suggestions/${id}`, {
      method: "DELETE",
      headers: { "x-admin-pin": pin },
    });
    if (!res.ok && res.status !== 204) {
      toast({ title: "Rejection failed", variant: "destructive" });
      return;
    }
    toast({ title: "Suggestion removed" });
    setSuggestions(s => s?.filter(x => x.id !== id) ?? null);
  }

  if (!unlocked) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 pt-4 pb-2 border-b border-border/30">
          <h1 className="font-display text-2xl uppercase tracking-widest text-primary">Admin</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <div className="w-full max-w-xs space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground text-center">Enter Admin PIN</p>
            <Input
              type="password"
              placeholder="PIN"
              className="rounded-none border-2 font-display text-xl text-center h-12 tracking-widest"
              value={pinInput}
              onChange={e => setPinInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleUnlock()}
            />
            <Button
              className="w-full font-display text-lg uppercase tracking-widest h-12 rounded-none"
              onClick={handleUnlock}
            >
              Unlock
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-4 pb-2 border-b border-border/30 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl uppercase tracking-widest text-primary">Suggestions</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Review and approve fighter submissions</p>
        </div>
        <div className="flex items-center gap-2">
          {suggestions !== null && (
            <Button size="sm" variant="ghost" className="font-display uppercase tracking-widest text-xs rounded-none" onClick={() => fetchSuggestions(pin)}>
              Refresh
            </Button>
          )}
          {suggestions === null && !loading && (
            <Button size="sm" className="font-display uppercase tracking-widest text-xs rounded-none" onClick={() => fetchSuggestions(pin)}>
              Load
            </Button>
          )}
        </div>
      </div>

      <div className="p-3 space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            Loading suggestions...
          </div>
        )}

        {!loading && suggestions !== null && suggestions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Shield className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">No pending suggestions</p>
          </div>
        )}

        {!loading && Array.isArray(suggestions) && suggestions.map(s => (
          <SuggestionCard key={s.id} s={s} pin={pin} onApprove={handleApprove} onReject={handleReject} />
        ))}

        {suggestions === null && !loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Shield className="w-10 h-10 text-primary/40" />
            <p className="text-muted-foreground text-sm">Tap Load to fetch pending suggestions</p>
          </div>
        )}
      </div>
    </div>
  );
}
