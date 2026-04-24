import { getModifier, type ModifierId } from "@/lib/modifiers";

interface ModifierBadgeProps {
  modifierId: ModifierId | string | null | undefined;
  size?: "sm" | "md";
  className?: string;
}

// Compact pill used in the lobby, history list, and fight HUD to show the
// active chaos modifier. Renders nothing when modifierId is null/unknown so
// callers can drop it in unconditionally.
export function ModifierBadge({ modifierId, size = "md", className = "" }: ModifierBadgeProps) {
  const m = getModifier(modifierId);
  if (!m) return null;

  const small = size === "sm";
  return (
    <span
      className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider ${className}`}
      style={{
        padding: small ? "2px 6px" : "3px 8px",
        background: `${m.color}18`,
        border: `1px solid ${m.color}55`,
        color: "#fff",
        fontSize: small ? 9 : 10,
        lineHeight: 1.2,
        letterSpacing: "0.08em",
        borderRadius: 3,
      }}
    >
      <span style={{ fontSize: small ? 10 : 11 }}>{m.emoji}</span>
      <span>{m.label}</span>
    </span>
  );
}
