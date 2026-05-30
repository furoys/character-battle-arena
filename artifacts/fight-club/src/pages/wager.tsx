import { useEffect, useMemo, useRef, useState } from "react";
import {
  Coins,
  Gift,
  Search,
  X,
  Shuffle,
  Flame,
  Trophy,
  History,
  Play,
} from "lucide-react";
import {
  useListCharacters,
  useGetWallet,
  useClaimDailyCoins,
  useQuoteWager,
  usePlaceWager,
  useListWagers,
  Character,
  WagerQuote,
  WagerResult,
} from "@workspace/api-client-react";
import { useSimulateFightStream } from "@/hooks/use-simulate-fight-stream";
import { FightScreen } from "@/components/fight-screen";

const MAX_PER_SIDE = 5;

function oddsLabel(oddsBp: number): string {
  return `${(oddsBp / 10000).toFixed(2)}x`;
}

function FighterChip({ c, onRemove }: { c: Character; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-md pl-1 pr-2 py-1">
      <div className="w-7 h-7 rounded overflow-hidden bg-white/10 shrink-0">
        {c.imageUrl ? (
          <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover object-top" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold">
            {c.name.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>
      <span className="text-xs font-semibold truncate max-w-[88px]">{c.name}</span>
      <button onClick={onRemove} className="text-muted-foreground hover:text-foreground">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function Wager() {
  const { data: characters } = useListCharacters();
  const wallet = useGetWallet();
  const wagers = useListWagers();
  const claimMutation = useClaimDailyCoins();
  const quoteMutation = useQuoteWager();
  const placeMutation = usePlaceWager();

  const [team1, setTeam1] = useState<Character[]>([]);
  const [team2, setTeam2] = useState<Character[]>([]);
  const [pickerOpen, setPickerOpen] = useState<null | 1 | 2>(null);
  const [search, setSearch] = useState("");

  const [quote, setQuote] = useState<WagerQuote | null>(null);
  const [side, setSide] = useState<1 | 2>(1);
  const [stake, setStake] = useState<number>(50);
  const [result, setResult] = useState<WagerResult | null>(null);
  const [fightOpen, setFightOpen] = useState(false);

  const simulateFight = useSimulateFightStream();

  const minStake = quote?.minStake ?? 10;
  const ready = team1.length > 0 && team2.length > 0;

  // Re-quote odds whenever the two teams change. The verdict is deterministic
  // server-side (and cached), so the quoted odds match what `place` will lock.
  const t1Key = team1.map((c) => c.id).join(",");
  const t2Key = team2.map((c) => c.id).join(",");
  useEffect(() => {
    if (!ready) {
      setQuote(null);
      return;
    }
    // Clear the prior quote immediately so a stale payout/odds can never be
    // shown (or bet against) for the new matchup while the fresh quote is in
    // flight — Place stays disabled until the new quote lands.
    setQuote(null);
    let cancelled = false;
    quoteMutation
      .mutateAsync({ data: { team1: team1.map((c) => c.id), team2: team2.map((c) => c.id) } })
      .then((q) => {
        if (!cancelled) setQuote(q);
      })
      .catch(() => {
        if (!cancelled) setQuote(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t1Key, t2Key, ready]);

  const filtered = useMemo(() => {
    if (!characters) return [];
    const q = search.trim().toLowerCase();
    const inUse = new Set([...team1, ...team2].map((c) => c.id));
    return characters
      .filter((c) => !inUse.has(c.id))
      .filter((c) => (q ? c.name.toLowerCase().includes(q) || c.universe.toLowerCase().includes(q) : true))
      .slice(0, 60);
  }, [characters, search, team1, team2]);

  function addFighter(c: Character) {
    if (pickerOpen === 1) {
      setTeam1((t) => (t.length < MAX_PER_SIDE ? [...t, c] : t));
    } else if (pickerOpen === 2) {
      setTeam2((t) => (t.length < MAX_PER_SIDE ? [...t, c] : t));
    }
    setResult(null);
  }

  function surprise() {
    if (!characters || characters.length < 2) return;
    const pool = [...characters];
    const pick = () => pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    setTeam1([pick()]);
    setTeam2([pick()]);
    setResult(null);
  }

  async function claim() {
    await claimMutation.mutateAsync();
    wallet.refetch();
  }

  async function place() {
    if (!ready || !quote) return;
    const res = await placeMutation.mutateAsync({
      data: { team1: team1.map((c) => c.id), team2: team2.map((c) => c.id), side, stake },
    });
    setResult(res);
    wallet.refetch();
    wagers.refetch();
  }

  function watchFight() {
    if (!result) return;
    simulateFight.reset();
    setFightOpen(true);
    simulateFight.mutate({
      data: {
        team1: result.team1Ids,
        team2: result.team2Ids,
        mode: "cinematic",
        // Replay the actual settled outcome: when the underdog won the roll we
        // pass upset so the cinematic crowns the same winner the bet paid out.
        upset: result.upset,
        modifierId: null,
      },
    });
  }

  const balance = wallet.data?.balance ?? 0;
  const canClaim = wallet.data?.canClaimDaily ?? false;
  const dropAmount = wallet.data?.dailyDropAmount ?? 0;
  const currentStreak = wallet.data?.currentStreak ?? 0;
  const bestStreak = wallet.data?.bestStreak ?? 0;

  const stakeValid = ready && !!quote && stake >= minStake && stake <= balance;

  return (
    <div className="min-h-full px-4 pt-4 pb-8 max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-3xl font-black uppercase tracking-tight">Wager</h1>
        <div className="flex items-center gap-2 bg-amber-500/15 border border-amber-400/40 rounded-full px-3 py-1.5">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="font-black text-amber-300 tabular-nums">{balance.toLocaleString()}</span>
        </div>
      </div>
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-4">
        Virtual coins · play money only
      </p>

      {/* Daily drop + streaks */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <button
          onClick={claim}
          disabled={!canClaim || claimMutation.isPending}
          className={`col-span-1 flex flex-col items-center justify-center gap-1 rounded-lg border py-3 transition
            ${canClaim ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-300 active:scale-95" : "border-white/10 bg-white/5 text-muted-foreground"}`}
        >
          <Gift className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {canClaim ? `+${dropAmount}` : "Claimed"}
          </span>
        </button>
        <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 py-3">
          <Flame className={`w-5 h-5 ${currentStreak > 0 ? "text-orange-400" : "text-muted-foreground"}`} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Streak {currentStreak}
          </span>
        </div>
        <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 py-3">
          <Trophy className="w-5 h-5 text-amber-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Best {bestStreak}
          </span>
        </div>
      </div>

      {/* Matchup builder */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">The Matchup</h2>
        <button
          onClick={surprise}
          className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-primary"
        >
          <Shuffle className="w-3.5 h-3.5" /> Surprise
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        {([1, 2] as const).map((s) => {
          const teamArr = s === 1 ? team1 : team2;
          const setTeam = s === 1 ? setTeam1 : setTeam2;
          const sideOdds = s === 1 ? quote?.team1 : quote?.team2;
          const isPicked = side === s;
          return (
            <button
              key={s}
              onClick={() => ready && setSide(s)}
              className={`text-left rounded-xl border-2 p-3 transition ${
                isPicked && ready
                  ? s === 1
                    ? "border-team1 bg-team1/10"
                    : "border-team2 bg-team2/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-black uppercase ${s === 1 ? "text-team1" : "text-team2"}`}>
                  Team {s}
                </span>
                {sideOdds && (
                  <span className="text-xs font-black tabular-nums">{oddsLabel(sideOdds.oddsBp)}</span>
                )}
              </div>
              <div className="flex flex-col gap-1.5 min-h-[40px]">
                {teamArr.map((c, i) => (
                  <FighterChip
                    key={c.id}
                    c={c}
                    onRemove={() => {
                      setTeam((t) => t.filter((_, idx) => idx !== i));
                      setResult(null);
                    }}
                  />
                ))}
              </div>
              {teamArr.length < MAX_PER_SIDE && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearch("");
                    setPickerOpen(s);
                  }}
                  className="mt-2 w-full text-[11px] font-bold uppercase tracking-wider text-muted-foreground border border-dashed border-white/15 rounded-md py-1.5 hover:text-foreground"
                >
                  + Add
                </button>
              )}
              {sideOdds && (
                <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {sideOdds.winProbPct}% chance
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Bet controls */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Your Stake</span>
          <span className="text-[11px] text-muted-foreground">min {minStake}</span>
        </div>
        <div className="flex items-center gap-2 mb-3">
          {[50, 100, 250].map((v) => (
            <button
              key={v}
              onClick={() => setStake(v)}
              disabled={v > balance}
              className={`flex-1 rounded-md border py-2 text-sm font-bold tabular-nums transition disabled:opacity-30 ${
                stake === v ? "border-amber-400/60 bg-amber-500/15 text-amber-300" : "border-white/10 bg-white/5"
              }`}
            >
              {v}
            </button>
          ))}
          <button
            onClick={() => setStake(balance)}
            disabled={balance < minStake}
            className="flex-1 rounded-md border border-white/10 bg-white/5 py-2 text-sm font-bold uppercase disabled:opacity-30"
          >
            Max
          </button>
        </div>
        <input
          type="number"
          value={stake}
          min={minStake}
          onChange={(e) => setStake(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
          className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-lg font-black tabular-nums text-center mb-3"
        />
        {quote && ready && (
          <p className="text-center text-xs text-muted-foreground mb-3">
            Backing <span className={side === 1 ? "text-team1 font-bold" : "text-team2 font-bold"}>Team {side}</span> ·
            to win{" "}
            <span className="text-amber-300 font-bold tabular-nums">
              {Math.floor((stake * (side === 1 ? quote.team1.oddsBp : quote.team2.oddsBp)) / 10000).toLocaleString()}
            </span>{" "}
            coins
          </p>
        )}
        <button
          onClick={place}
          disabled={!stakeValid || placeMutation.isPending}
          className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-red-500 py-3 font-black uppercase tracking-widest text-black disabled:opacity-40 active:scale-[0.99] transition"
        >
          {placeMutation.isPending ? "Settling…" : "Place Bet"}
        </button>
        {ready && stake > balance && (
          <p className="text-center text-[11px] text-red-400 mt-2">Not enough coins</p>
        )}
      </div>

      {/* Result */}
      {result && (
        <div
          className={`rounded-xl border-2 p-4 mb-6 ${
            result.won ? "border-emerald-400/60 bg-emerald-500/10" : "border-red-400/50 bg-red-500/10"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-2xl font-black uppercase ${result.won ? "text-emerald-300" : "text-red-300"}`}>
              {result.won ? "You Won!" : "You Lost"}
            </span>
            <span className={`text-2xl font-black tabular-nums ${result.won ? "text-emerald-300" : "text-red-300"}`}>
              {result.won ? `+${(result.payout - result.stake).toLocaleString()}` : `-${result.stake.toLocaleString()}`}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {result.upset && <span className="text-amber-400 font-bold">UPSET! </span>}
            Team {result.winnerSide} took it.{result.turningPoint ? ` ${result.turningPoint}` : ""}
          </p>
          <button
            onClick={watchFight}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 py-2.5 font-bold uppercase tracking-wider text-sm active:scale-[0.99]"
          >
            <Play className="w-4 h-4" /> Watch the Fight
          </button>
        </div>
      )}

      {/* History */}
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Bet History</h2>
      </div>
      <div className="flex flex-col gap-2">
        {wagers.data && wagers.data.length > 0 ? (
          wagers.data.map((w) => (
            <div
              key={w.id}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">
                  {w.team1Names.join(", ")} <span className="text-muted-foreground">vs</span> {w.team2Names.join(", ")}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Backed Team {w.pickedSide} · {oddsLabel(w.oddsBp)} · stake {w.stake}
                </p>
              </div>
              <span
                className={`text-sm font-black tabular-nums shrink-0 ml-2 ${
                  w.status === "won" ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {w.status === "won" ? `+${(w.payout - w.stake).toLocaleString()}` : `-${w.stake.toLocaleString()}`}
              </span>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground text-center py-6">No bets yet. Place your first wager!</p>
        )}
      </div>

      {/* Fighter picker */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col" onClick={() => setPickerOpen(null)}>
          <div
            className="mt-auto bg-[#0a0a14] border-t border-white/10 rounded-t-2xl max-h-[80dvh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-black uppercase">
                  Add to Team {pickerOpen}
                </span>
                <button onClick={() => setPickerOpen(null)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-md px-3 py-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search fighters…"
                  className="bg-transparent outline-none text-sm flex-1"
                />
              </div>
            </div>
            <div className="overflow-y-auto p-2 grid grid-cols-2 gap-2">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    addFighter(c);
                    setPickerOpen(null);
                  }}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2 text-left active:scale-95"
                >
                  <div className="w-9 h-9 rounded overflow-hidden bg-white/10 shrink-0">
                    {c.imageUrl ? (
                      <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover object-top" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] font-bold">
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{c.universe}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cinematic replay */}
      <FightScreen
        open={fightOpen}
        onClose={() => setFightOpen(false)}
        result={simulateFight.data}
        isSimulating={simulateFight.isPending && !simulateFight.streaming}
        team1Names={result?.team1Names ?? []}
        team2Names={result?.team2Names ?? []}
        team1Images={team1.map((c) => c.imageUrl)}
        team2Images={team2.map((c) => c.imageUrl)}
        completedSections={simulateFight.completedSections}
      />
    </div>
  );
}
