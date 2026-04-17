import { useMusic } from "@/contexts/music-context";
import { Volume2, VolumeX } from "lucide-react";

export function MusicToggle() {
  const { muted, toggleMute, track } = useMusic();

  return (
    <button
      onClick={toggleMute}
      title={muted ? "Unmute music" : "Mute music"}
      className="relative flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
      style={{
        width: 36,
        height: 36,
        background: muted ? "rgba(255,255,255,0.05)" : "rgba(0,240,255,0.08)",
        border: `1.5px solid ${muted ? "rgba(255,255,255,0.12)" : "rgba(0,240,255,0.35)"}`,
        boxShadow: muted ? "none" : "0 0 10px rgba(0,240,255,0.15)",
        color: muted ? "rgba(255,255,255,0.35)" : "#00f0ff",
      }}
    >
      {muted ? (
        <VolumeX size={16} />
      ) : (
        <Volume2 size={16} />
      )}

      {/* Pulse ring when music is playing */}
      {!muted && track !== "off" && (
        <span
          className="absolute inset-0 rounded-full animate-ping"
          style={{
            background: "rgba(0,240,255,0.12)",
            animationDuration: "2.5s",
          }}
        />
      )}
    </button>
  );
}
