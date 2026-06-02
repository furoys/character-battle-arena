import type { Character } from "@workspace/api-client-react";
import { Swords } from "lucide-react";

export type DraftTrait = "underdog" | "legend" | null;

/**
 * Portrait card used in the tournament draft pickers (PvE and PvP). Shows the
 * fighter's art with name + universe in a readable gradient overlay, so names
 * are never truncated off-screen and the universe is always visible.
 */
export function DraftPickCard({
  char,
  locked,
  unaffordable,
  cost,
  trait,
  onPick,
  testId,
}: {
  char: Character;
  locked?: boolean;
  unaffordable?: boolean;
  cost?: number;
  trait?: DraftTrait;
  onPick: () => void;
  testId?: string;
}) {
  const disabled = locked || unaffordable;
  return (
    <button
      onClick={onPick}
      disabled={disabled}
      data-testid={testId}
      title={
        unaffordable && cost != null ? `${char.name} — costs ${cost}, over budget` : char.name
      }
      className={`group relative flex aspect-[3/4] flex-col overflow-hidden rounded-xl border bg-black/40 text-left transition-all ${
        disabled
          ? `cursor-not-allowed border-white/10 ${unaffordable && !locked ? "opacity-40 grayscale" : "opacity-50"}`
          : "border-white/10 hover:-translate-y-0.5 hover:border-primary hover:ring-2 hover:ring-primary/40 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      }`}
    >
      {cost != null && (
        <div className="absolute left-1.5 top-1.5 z-10 flex items-center">
          <span
            className={`rounded-md px-1.5 py-0.5 text-[10px] font-black tabular-nums shadow ${
              unaffordable
                ? "bg-rose-500/90 text-white"
                : "bg-amber-400/95 text-black"
            }`}
          >
            {cost}
          </span>
        </div>
      )}
      {trait && (
        <div className="absolute right-1.5 top-1.5 z-10 flex items-center">
          <span
            title={
              trait === "underdog"
                ? "Giant Slayer — can upset much stronger fighters"
                : "Legend — a front-runner that can be slain by underdogs"
            }
            className={`rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide shadow ${
              trait === "underdog"
                ? "bg-emerald-400/95 text-black"
                : "bg-violet-500/90 text-white"
            }`}
          >
            {trait === "underdog" ? "Slayer" : "Legend"}
          </span>
        </div>
      )}
      {char.imageUrl ? (
        <img
          src={char.imageUrl}
          alt={char.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-white/5 to-black/40 text-muted-foreground/40">
          <Swords className="h-7 w-7" />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent px-2 pb-2 pt-6">
        <div className="truncate text-xs font-bold leading-tight text-white">
          {char.name}
        </div>
        {char.universe && (
          <div className="truncate text-[9px] uppercase tracking-wider text-white/60">
            {char.universe}
          </div>
        )}
      </div>
      {!locked && (
        <div className="absolute inset-x-0 top-0 flex justify-end p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary-foreground">
            Pick
          </span>
        </div>
      )}
    </button>
  );
}
