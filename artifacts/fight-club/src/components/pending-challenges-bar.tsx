import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Bell, Swords, Clock, Check, Eye } from "lucide-react";
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

// Polls every challenge this browser has tokens for and surfaces the live
// status so the player can see at a glance whether their friend has accepted,
// whether the lobby is waiting on them, or whether the fight finished while
// they were away. Tapping a pill jumps back into that challenge.
export function PendingChallengesBar() {
  const [, navigate] = useLocation();
  const [items, setItems] = useState<ChallengeStatus[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const stored = getAllStoredChallenges();
      if (stored.length === 0) {
        if (!cancelled) setItems([]);
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
          // Drop completed fights from the inbox the next refresh — they'd
          // just be dead weight on a list focused on actionable challenges.
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

      if (!cancelled) {
        setItems(results.filter((x): x is ChallengeStatus => x !== null));
      }
    }

    refresh();
    const id = setInterval(refresh, 8000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (items.length === 0) return null;

  return (
    <div style={{
      display: "flex", gap: 8, padding: "8px 12px",
      overflowX: "auto", flexShrink: 0,
      borderBottom: "1px solid rgba(0,240,255,0.15)",
      background: "linear-gradient(180deg, rgba(0,240,255,0.04) 0%, transparent 100%)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        fontSize: 8, letterSpacing: "0.22em", fontWeight: 800,
        color: "rgba(0,240,255,0.7)", flexShrink: 0,
      }}>
        <Bell style={{ width: 10, height: 10 }} />
        <span>YOUR CHALLENGES</span>
      </div>
      {items.map((c) => {
        // Pick the right user-facing label per state.
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
        return (
          <button
            key={c.code}
            onClick={() => navigate(href)}
            style={{
              flexShrink: 0, padding: "6px 10px",
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(0,0,0,0.4)",
              border: `1px solid ${color === "#ff0055" ? "rgba(255,0,85,0.5)" : "rgba(0,240,255,0.3)"}`,
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: color === "#ff0055" ? "0 0 12px rgba(255,0,85,0.25)" : "none",
            }}
          >
            <Icon style={{ width: 11, height: 11, color }} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
              <span style={{ fontSize: 8, letterSpacing: "0.22em", color: "rgba(255,255,255,0.85)", fontWeight: 800 }}>
                {c.code}
              </span>
              <span style={{ fontSize: 7.5, letterSpacing: "0.1em", color, fontWeight: 600 }}>
                {label}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
