import { useEffect, useState } from "react";
import { X, Dices } from "lucide-react";
import {
  MODIFIERS,
  MODIFIER_IDS,
  getModifier,
  rollRandomModifier,
  type ModifierId,
} from "@/lib/modifiers";

interface ModifierPickerProps {
  open: boolean;
  current: ModifierId | null;
  onClose: () => void;
  onChange: (id: ModifierId | null) => void;
}

// Bottom-sheet picker for the pre-fight chaos modifier. Mobile-first; rendered
// as a fixed full-screen overlay with a scroll list inside. Tapping a tile
// commits the selection and closes the sheet — no extra confirm step.
export function ModifierPicker({ open, current, onClose, onChange }: ModifierPickerProps) {
  // Lock background scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="mt-auto rounded-t-2xl flex flex-col max-h-[85vh]"
        style={{
          background: "linear-gradient(180deg, #0a0a14 0%, #050509 100%)",
          borderTop: "1.5px solid rgba(255,0,85,0.45)",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.8)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle + header */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
              Chaos Modifier
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/5"
            aria-label="Close modifier picker"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-4 pb-2">
          <p className="text-[11px] text-muted-foreground/70 leading-snug">
            Bend the rules. Picked once, applies to this fight only.
          </p>
        </div>

        {/* Action row: NONE + RANDOM */}
        <div className="px-4 pt-2 pb-3 flex gap-2">
          <button
            onClick={() => { onChange(null); onClose(); }}
            className="flex-1 py-2.5 px-3 rounded-lg text-[12px] font-bold uppercase tracking-wider transition-colors"
            style={{
              background: current === null ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${current === null ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.12)"}`,
              color: current === null ? "#fff" : "rgba(255,255,255,0.65)",
            }}
          >
            None
          </button>
          <button
            onClick={() => { onChange(rollRandomModifier()); onClose(); }}
            className="flex-1 py-2.5 px-3 rounded-lg text-[12px] font-bold uppercase tracking-wider flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(180deg, rgba(255,0,85,0.15) 0%, rgba(255,0,85,0.30) 100%)",
              border: "1px solid rgba(255,0,85,0.55)",
              color: "#fff",
            }}
          >
            <Dices className="h-4 w-4" />
            Random
          </button>
        </div>

        {/* Modifier tiles */}
        <div className="px-3 pb-[max(env(safe-area-inset-bottom),20px)] overflow-y-auto">
          <div className="grid grid-cols-1 gap-2">
            {MODIFIER_IDS.map((id) => {
              const m = MODIFIERS[id];
              const selected = current === id;
              return (
                <button
                  key={id}
                  onClick={() => { onChange(id); onClose(); }}
                  className="text-left rounded-lg p-3 flex items-center gap-3 transition-transform active:scale-[0.99]"
                  style={{
                    background: selected
                      ? `linear-gradient(180deg, ${m.color}25 0%, ${m.color}10 100%)`
                      : "rgba(255,255,255,0.03)",
                    border: `1px solid ${selected ? m.color : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{
                      background: `${m.color}20`,
                      border: `1px solid ${m.color}40`,
                    }}
                  >
                    <span>{m.emoji}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold uppercase tracking-wide" style={{ color: selected ? "#fff" : "rgba(255,255,255,0.85)" }}>
                      {m.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground/80 leading-snug mt-0.5">
                      {m.blurb}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ModifierTriggerProps {
  current: ModifierId | null;
  onClick: () => void;
}

// Compact strip used above the FIGHT bar / above lobby. Tapping opens the
// picker. When no modifier is set we show a muted "Add Chaos" call-to-action.
export function ModifierTrigger({ current, onClick }: ModifierTriggerProps) {
  const m = getModifier(current);
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-1.5 transition-colors active:scale-[0.99]"
      style={{
        background: m
          ? `linear-gradient(180deg, ${m.color}15 0%, ${m.color}25 100%)`
          : "rgba(255,255,255,0.03)",
        borderTop: `1px solid ${m ? `${m.color}50` : "rgba(255,255,255,0.06)"}`,
        borderBottom: `1px solid ${m ? `${m.color}30` : "rgba(255,255,255,0.04)"}`,
      }}
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
        Chaos
      </span>
      <span className="text-base leading-none">{m?.emoji ?? "🎲"}</span>
      <span className="text-[11px] font-bold uppercase tracking-wider truncate" style={{ color: m ? "#fff" : "rgba(255,255,255,0.55)" }}>
        {m?.label ?? "Add modifier"}
      </span>
      <span className="ml-auto text-[10px] text-muted-foreground/60">▸</span>
    </button>
  );
}

// Used elsewhere (state-management helpers).
export function useStoredModifier(storageKey: string): [ModifierId | null, (id: ModifierId | null) => void] {
  const [id, setId] = useState<ModifierId | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    return (MODIFIER_IDS as readonly string[]).includes(raw) ? (raw as ModifierId) : null;
  });

  const update = (next: ModifierId | null) => {
    setId(next);
    if (typeof window !== "undefined") {
      if (next) window.localStorage.setItem(storageKey, next);
      else window.localStorage.removeItem(storageKey);
    }
  };

  return [id, update];
}
