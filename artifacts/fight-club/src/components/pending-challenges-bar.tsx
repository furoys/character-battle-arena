import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Bell, Swords, Clock, Check, Eye, X } from "lucide-react";
import { getAllStoredChallenges, forgetChallenge } from "@/lib/challenge-tokens";

interface ChallengeStatus {
  code: string;
  side: "creator" | "joiner";
  status: string;
  team1Ready: boolean;
  team2Ready: boolean;
  hasOpponent: boolean;
  fightId: number | null;
}

export function PendingChallengesBar() {
  const [, navigate] = useLocation();
  const [items, setItems] = useState<ChallengeStatus[]>([]);

  const refresh = useCallback(async (cancelled: { v: boolean }) => {
    const stored = getAllStoredChallenges();
    if (stored.length === 0) {
      if (!cancelled.v) setItems([]);
      return;
    }

    const results = await Promise.all(stored.map(async (s) => {
      try {
        const r = await fetch(`/api/challenges/${s.code}`);
        if (r.status === 404 || r.status === 410) {
          forgetChallenge(s.code);
          return null;
        }
        if (!r.ok) return null;
        const j = await r.json() as {
          status: string;
          team1Ready: boolean;
          team2Ready: boolean;
          team2Ids: number[] | null;
          fightId: number | null;
        };
        if (j.status === "completed" || j.fightId !== null) {
          forgetChallenge(s.code);
          return null;
        }
        return {
          code: s.code,
          side: s.side,
          status: j.status,
          team1Ready: j.team1Ready,
          team2Ready: j.team2Ready,
          hasOpponent: !!j.team2Ids,
          fightId: j.fightId,
        } as ChallengeStatus;
      } catch {
        return null;
      }
    }));

    if (!cancelled.v) {
      setItems(results.filter((x): x is ChallengeStatus => x !== null));
    }
  }, []);

  useEffect(() => {
    const cancelled = { v: false };
    refresh(cancelled);
    const id = setInterval(() => refresh(cancelled), 8000);
    return () => { cancelled.v = true; clearInterval(id); };
  }, [refresh]);

  const dismiss = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    forgetChallenge(code);
    setItems(prev => prev.filter(c => c.code !== code));
  };

  if (items.length === 0) return null;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, padding: "6px 12px",
      overflowX: "auto", flexShrink: 0,
      borderBottom: "1px solid rgba(0,240,255,0.15)",
      background: "linear-gradient(180deg, rgba(0,240,255,0.04) 0%, transparent 100%)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 5,
        fontSize: 7.5, letterSpacing: "0.22em", fontWeight: 800,
        color: "rgba(0,240,255,0.6)", flexShrink: 0,
      }}>
        <Bell style={{ width: 9, height: 9 }} />
        <span>CHALLENGES</span>
      </div>

      {items.map((c) => {
        const ownReady = c.side === "creator" ? c.team1Ready : c.team2Ready;
        const oppReady = c.side === "creator" ? c.team2Ready : c.team1Ready;
        let label: string;
        let Icon = Clock;
        let color = "rgba(255,255,255,0.4)";
        if (!c.hasOpponent) {
          label = "Waiting for opponent";
          Icon = Eye;
          color = "rgba(255,255,255,0.45)";
        } else if (c.status === "ready") {
          label = "Both ready — fight on";
          Icon = Swords;
          color = "#ff0055";
        } else if (ownReady && !oppReady) {
          label = "Waiting on opponent";
          Icon = Clock;
          color = "rgba(255,255,255,0.5)";
        } else if (!ownReady && oppReady) {
          label = "YOUR turn — opponent ready";
          Icon = Swords;
          color = "#ff0055";
        } else {
          label = "Lobby — hit READY";
          Icon = Check;
          color = "#00f0ff";
        }
        const href = c.side === "creator"
          ? `/challenge/${c.code}?creator=1`
          : `/challenge/${c.code}`;

        const urgent = color === "#ff0055";

        return (
          <div
            key={c.code}
            style={{
              flexShrink: 0, display: "flex", alignItems: "stretch",
              background: "rgba(0,0,0,0.45)",
              border: `1px solid ${urgent ? "rgba(255,0,85,0.5)" : "rgba(0,240,255,0.3)"}`,
              boxShadow: urgent ? "0 0 10px rgba(255,0,85,0.2)" : "none",
            }}
          >
            {/* Main tap target → navigate into challenge */}
            <button
              onClick={() => navigate(href)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 8px",
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <Icon style={{ width: 10, height: 10, color, flexShrink: 0 }} />
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1 }}>
                <span style={{ fontSize: 8, letterSpacing: "0.22em", color: "rgba(255,255,255,0.85)", fontWeight: 800 }}>
                  {c.code}
                </span>
                <span style={{ fontSize: 7, letterSpacing: "0.08em", color, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {label}
                </span>
              </div>
            </button>

            {/* Dismiss × — forgets this code from localStorage immediately */}
            <button
              onClick={(e) => dismiss(c.code, e)}
              title="Remove from list"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "0 6px",
                background: "none", border: "none",
                borderLeft: "1px solid rgba(255,255,255,0.08)",
                cursor: "pointer", color: "rgba(255,255,255,0.3)",
                fontFamily: "inherit",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.75)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
            >
              <X style={{ width: 9, height: 9 }} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
