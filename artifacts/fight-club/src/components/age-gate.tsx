import { useAgeMode, AgeMode } from "@/hooks/use-age-mode";
import { AvaLogo } from "@/components/ava-logo";
import { AlertTriangle } from "lucide-react";

export function AgeGate() {
  const { mode, setMode } = useAgeMode();
  if (mode !== null) return null;

  const choose = (m: AgeMode) => setMode(m);

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center px-6"
      style={{
        background: "linear-gradient(180deg, #000000 0%, #0a0510 50%, #000000 100%)",
      }}
    >
      {/* Scanlines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.18) 3px, rgba(0,0,0,0.18) 4px)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-sm w-full text-center">
        <div className="flex flex-col items-center gap-3">
          <AvaLogo />
          <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: "rgba(255,255,255,0.4)" }}>
            Anyone vs Anyone
          </p>
        </div>

        <div
          className="flex items-center gap-2 px-4 py-2 rounded"
          style={{
            border: "1px solid rgba(255,59,48,0.3)",
            background: "rgba(255,59,48,0.05)",
          }}
        >
          <AlertTriangle size={14} style={{ color: "#ff3b30" }} />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#ff3b30" }}>
            Mature Content Warning
          </span>
        </div>

        <div className="space-y-3">
          <h2 className="font-display text-2xl font-bold uppercase tracking-wider" style={{ color: "#ffffff" }}>
            How old are you?
          </h2>
          <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
            Fights contain stylized violence and strong language.
            Under 16, swear words are masked.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => choose("adult")}
            className="w-full py-3.5 font-display font-bold text-sm uppercase tracking-widest transition-all hover:scale-[1.02]"
            style={{
              border: "1.5px solid #00f0ff",
              background: "linear-gradient(180deg, rgba(0,240,255,0.15), rgba(0,240,255,0.05))",
              color: "#00f0ff",
              boxShadow: "0 0 20px rgba(0,240,255,0.2)",
            }}
          >
            I'm 16 or older
          </button>
          <button
            onClick={() => choose("minor")}
            className="w-full py-3.5 font-display font-bold text-sm uppercase tracking-widest transition-all hover:scale-[1.02]"
            style={{
              border: "1.5px solid rgba(255,255,255,0.3)",
              background: "rgba(255,255,255,0.03)",
              color: "rgba(255,255,255,0.7)",
            }}
          >
            I'm under 16
          </button>
        </div>

        <p className="text-[9px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.25)" }}>
          You can change this later in Settings
        </p>
      </div>
    </div>
  );
}
