import { useEffect, useState, useMemo } from "react";
import { Character, FightResult } from "@workspace/api-client-react/src/generated/api.schemas";
import { Swords } from "lucide-react";

interface VictoryScreenProps {
  result: FightResult;
  onClose: () => void;
}

interface Particle {
  id: number;
  left: string;
  bottom: string;
  size: number;
  color: string;
  duration: number;
  delay: number;
  drift: string;
}

function useParticles(count: number, teamColor: string): Particle[] {
  return useMemo(() => {
    const colors =
      teamColor === "team1"
        ? ["#00f0ff", "#00b8cc", "#ffffff", "#80f8ff", "#00d4e8"]
        : ["#ff3b30", "#ff6b5b", "#ffffff", "#ffaa99", "#ff5545"];
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      bottom: `${Math.random() * 20}%`,
      size: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      duration: Math.random() * 3 + 2.5,
      delay: Math.random() * 2,
      drift: `${(Math.random() - 0.5) * 120}px`,
    }));
  }, [count, teamColor]);
}

function PortraitPillar({ character, delay, teamColor }: { character: Character; delay: number; teamColor: string }) {
  const [imgError, setImgError] = useState(false);
  const initials = character.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  const borderColor = teamColor === "team1" ? "border-[#00f0ff]" : "border-[#ff3b30]";
  const shadowColor = teamColor === "team1" ? "shadow-[0_0_30px_rgba(0,240,255,0.6)]" : "shadow-[0_0_30px_rgba(255,59,48,0.6)]";
  const glowColor = teamColor === "team1" ? "#00f0ff" : "#ff3b30";

  return (
    <div
      className={`victory-portrait-rise flex flex-col items-center gap-2`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Crown */}
      <div className="victory-crown text-2xl" style={{ animationDelay: `${delay + 400}ms`, color: "#ffd700" }}>
        👑
      </div>

      {/* Portrait */}
      <div
        className={`relative overflow-hidden border-2 ${borderColor} ${shadowColor}`}
        style={{
          width: "clamp(80px, 18vw, 140px)",
          height: "clamp(110px, 24vw, 190px)",
        }}
      >
        {character.imageUrl && !imgError ? (
          <img
            src={character.imageUrl}
            alt={character.name}
            className="w-full h-full object-cover object-top"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center font-display text-4xl font-bold"
            style={{ background: `${glowColor}20`, color: glowColor }}
          >
            {initials}
          </div>
        )}

        {/* Bottom gradient + name */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div
          className="absolute bottom-0 left-0 right-0 py-1.5 px-1 text-center"
          style={{
            background: `linear-gradient(to top, ${glowColor}40, transparent)`,
          }}
        >
          <p className="font-display text-xs uppercase tracking-wider text-white leading-tight truncate">
            {character.name.split(" ")[0]}
          </p>
        </div>

        {/* Scan line shimmer */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, ${glowColor}10 0%, transparent 60%)`,
          }}
        />
      </div>
    </div>
  );
}

export function VictoryScreen({ result, onClose }: VictoryScreenProps) {
  const [phase, setPhase] = useState(0);
  const winnerTeam = result.winner === 1 ? result.team1 : result.team2;
  const teamColor = result.winner === 1 ? "team1" : "team2";
  const teamColorHex = result.winner === 1 ? "#00f0ff" : "#ff3b30";
  const particles = useParticles(36, teamColor);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 100),   // flash
      setTimeout(() => setPhase(2), 500),   // portraits rise
      setTimeout(() => setPhase(3), 1600),  // VICTORIOUS text
      setTimeout(() => setPhase(4), 2400),  // summary
      setTimeout(() => setPhase(5), 3100),  // buttons
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at center, #0a0a0f 0%, #000000 100%)",
      }}
    >
      {/* Light rays behind characters */}
      {phase >= 2 && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="victory-light-ray absolute top-0 bottom-0 origin-bottom"
              style={{
                left: `${10 + i * 11}%`,
                width: "6%",
                background: `linear-gradient(to top, ${teamColorHex}00, ${teamColorHex}18, ${teamColorHex}00)`,
                transform: `rotate(${(i - 3.5) * 3}deg)`,
                animationDelay: `${i * 0.3}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="victory-particle"
          style={{
            left: p.left,
            bottom: p.bottom,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            ["--drift" as string]: p.drift,
            boxShadow: `0 0 ${p.size * 1.5}px ${p.color}`,
          }}
        />
      ))}

      {/* Screen flash */}
      {phase === 1 && (
        <div
          className="victory-flash absolute inset-0 pointer-events-none"
          style={{ background: teamColorHex }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-4 w-full max-w-2xl">

        {/* Winner portraits row */}
        {phase >= 2 && (
          <div className="flex items-end justify-center gap-3 sm:gap-6">
            {winnerTeam.map((character: Character, i: number) => (
              <PortraitPillar
                key={character.id}
                character={character}
                delay={i * 180}
                teamColor={teamColor}
              />
            ))}
          </div>
        )}

        {/* VICTORIOUS text */}
        {phase >= 3 && (
          <div className="text-center">
            <p
              className="victory-slam font-display text-[10px] sm:text-xs uppercase tracking-[0.5em] mb-2"
              style={{ color: teamColorHex, animationDelay: "0ms" }}
            >
              Team {result.winner}
            </p>
            <h1
              className="victory-slam victory-glow-pulse font-display uppercase leading-none"
              style={{
                fontSize: "clamp(3rem, 12vw, 7rem)",
                color: teamColorHex,
                animationDelay: "60ms",
              }}
            >
              Victorious
            </h1>
            <div
              className="mx-auto mt-3 h-px"
              style={{
                width: "clamp(120px, 40vw, 300px)",
                background: `linear-gradient(to right, transparent, ${teamColorHex}, transparent)`,
              }}
            />
          </div>
        )}

        {/* Summary */}
        {phase >= 4 && (
          <p
            className="victory-fade-up text-center text-sm text-muted-foreground max-w-md leading-relaxed italic px-4"
            style={{ animationDelay: "0ms" }}
          >
            {result.summary}
          </p>
        )}

        {/* Buttons */}
        {phase >= 5 && (
          <div className="victory-fade-up flex gap-4 mt-2" style={{ animationDelay: "0ms" }}>
            <button
              onClick={onClose}
              className="flex items-center gap-2 font-display text-sm uppercase tracking-widest px-6 py-3 border-2 transition-all duration-200 hover:scale-105"
              style={{
                borderColor: teamColorHex,
                color: teamColorHex,
                background: `${teamColorHex}10`,
                boxShadow: `0 0 20px ${teamColorHex}30`,
              }}
            >
              <Swords className="h-4 w-4" />
              Fight Again
            </button>
          </div>
        )}
      </div>

      {/* Bottom vignette */}
      <div
        className="absolute inset-x-0 bottom-0 h-32 pointer-events-none"
        style={{ background: "linear-gradient(to top, #000, transparent)" }}
      />
    </div>
  );
}
