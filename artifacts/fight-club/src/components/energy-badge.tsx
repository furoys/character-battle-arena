import { Zap } from "lucide-react";
import { useEnergy, formatRefillCountdown } from "@/hooks/use-energy";

// ⚡ Energy: X / 10 — sits in the top bar next to the profile button.
// Only rendered for signed-in users (the gate is per-user). Shows a tooltip
// with the time until the next +1 refill so the player knows when to come back.
export function EnergyBadge() {
  const { state, isSignedIn } = useEnergy();
  if (!isSignedIn || !state) return null;

  const { energy, max, msUntilNextRefill } = state;
  const isFull = energy >= max;
  const isEmpty = energy <= 0;

  const color = isEmpty
    ? "rgba(255,80,80,0.95)"
    : isFull
      ? "rgba(255,200,0,0.95)"
      : "rgba(255,160,0,0.95)";
  const borderColor = isEmpty
    ? "rgba(255,80,80,0.6)"
    : isFull
      ? "rgba(255,200,0,0.5)"
      : "rgba(255,160,0,0.45)";
  const bg = isEmpty
    ? "rgba(255,80,80,0.10)"
    : isFull
      ? "rgba(255,200,0,0.10)"
      : "rgba(255,160,0,0.08)";

  const tooltip = isFull
    ? `Energy: ${energy} / ${max} — full`
    : `Energy: ${energy} / ${max} — next +1 in ${formatRefillCountdown(msUntilNextRefill)}`;

  return (
    <div
      className="flex items-center gap-1"
      style={{
        height: 24,
        padding: "0 7px",
        background: bg,
        border: `1px solid ${borderColor}`,
      }}
      title={tooltip}
      data-testid="energy-badge"
    >
      <Zap
        className="h-3 w-3"
        style={{ color }}
        fill={isEmpty ? "none" : color}
      />
      <span
        style={{
          fontSize: 9,
          fontFamily: "var(--font-display, monospace)",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          fontWeight: 700,
          color,
        }}
      >
        <span data-testid="energy-value">{energy}</span>
        <span style={{ opacity: 0.55 }}> / {max}</span>
      </span>
    </div>
  );
}
