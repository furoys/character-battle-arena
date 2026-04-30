import { Zap } from "lucide-react";
import { useEnergy, formatRefillCountdown } from "@/hooks/use-energy";

// ⚡ Energy badge — sits in the top bar.
// Signed-in users: shows their current energy / max with a refill countdown.
// Guests: shows ∞ (unlimited fights, no energy gate).
export function EnergyBadge() {
  const { state, isSignedIn, isLoading } = useEnergy();

  // While Clerk is still loading, render nothing to avoid a flash.
  if (isLoading) return null;

  // Guest mode — unlimited fights, show a dimmed ∞ badge.
  if (!isSignedIn) {
    const color = "rgba(255,160,0,0.55)";
    return (
      <div
        className="flex items-center gap-1"
        style={{
          height: 24,
          padding: "0 7px",
          background: "rgba(255,160,0,0.05)",
          border: "1px solid rgba(255,160,0,0.2)",
        }}
        title="Guest mode — unlimited fights"
        data-testid="energy-badge"
      >
        <Zap className="h-3 w-3" style={{ color }} fill={color} />
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
          <span data-testid="energy-value">∞</span>
        </span>
      </div>
    );
  }

  // Still fetching energy state after sign-in.
  if (!state) return null;

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
