import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import { useListCharacters } from "@workspace/api-client-react";
import { Character } from "@workspace/api-client-react/src/generated/api.schemas";
import { CharacterCard } from "@/components/character-card";
import { FightScreen } from "@/components/fight-screen";
import { useSimulateFightStream } from "@/hooks/use-simulate-fight-stream";
import { useToast } from "@/hooks/use-toast";
import { Swords, Search, Eye, EyeOff, Copy, CheckCheck, Link } from "lucide-react";
import { useAgeMode } from "@/hooks/use-age-mode";
import { censorFightResult } from "@/lib/profanity-filter";

interface ChallengeData {
  code: string;
  team1Ids: number[] | null;
  team2Ids: number[] | null;
  mode: string;
  blind: boolean;
  status: string;
  team1Hidden: boolean;
}

function useChallenge(code: string) {
  const [data, setData] = useState<ChallengeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    fetch(`/api/challenges/${code.toUpperCase()}`)
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error((j as { error?: string }).error ?? "Challenge not found");
        }
        return r.json() as Promise<ChallengeData>;
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError((e as Error).message); setLoading(false); });
  }, [code]);

  return { data, error, loading, setData };
}

function MiniPortrait({ char, team }: { char: Character | undefined; team: 1 | 2; hidden?: boolean }) {
  const color = team === 1 ? "#00f0ff" : "#ff3b30";
  if (!char) {
    return (
      <div style={{
        width: 44, height: 58, border: `1.5px solid ${color}30`,
        background: `${color}05`, display: "flex", alignItems: "center",
        justifyContent: "center", flexDirection: "column", gap: 2,
      }}>
        <EyeOff style={{ width: 11, height: 11, color: `${color}40` }} />
        <span style={{ fontSize: 6, color: `${color}40`, letterSpacing: "0.08em" }}>???</span>
      </div>
    );
  }
  const initials = char.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{ width: 44, height: 58, border: `1.5px solid ${color}50`, overflow: "hidden", position: "relative" }}>
      {char.imageUrl
        ? <img src={char.imageUrl} alt={char.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
        : <div style={{ width: "100%", height: "100%", background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 11, color, fontWeight: 700 }}>{initials}</span>
          </div>
      }
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)" }} />
      <span style={{
        position: "absolute", bottom: 2, left: 0, right: 0, textAlign: "center",
        fontSize: 6, color, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase",
      }}>{char.name.split(" ")[0]}</span>
    </div>
  );
}

function ShareBox({ code, blind }: { code: string; blind: boolean }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}${import.meta.env.BASE_URL}challenge/${code}`;
  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div style={{ background: "rgba(0,240,255,0.04)", border: "1px solid rgba(0,240,255,0.2)", padding: "10px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
        <Link style={{ width: 10, height: 10, color: "#00f0ff" }} />
        <span style={{ fontSize: 8, letterSpacing: "0.2em", color: "#00f0ff", fontWeight: 700, textTransform: "uppercase" }}>
          {blind ? "Blind Pick" : "Challenge"} · {code}
        </span>
      </div>
      <div style={{ display: "flex", gap: 5 }}>
        <div style={{ flex: 1, padding: "5px 7px", fontSize: 9, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {url}
        </div>
        <button onClick={copy} style={{ display: "flex", alignItems: "center", gap: 3, padding: "5px 10px", fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", background: copied ? "rgba(0,240,255,0.12)" : "rgba(0,240,255,0.06)", border: `1px solid ${copied ? "#00f0ff" : "rgba(0,240,255,0.25)"}`, color: "#00f0ff", cursor: "pointer", flexShrink: 0 }}>
          {copied ? <CheckCheck style={{ width: 9, height: 9 }} /> : <Copy style={{ width: 9, height: 9 }} />}
          {copied ? "COPIED" : "COPY"}
        </button>
      </div>
      <p style={{ fontSize: 7.5, color: "rgba(255,255,255,0.25)", marginTop: 5, lineHeight: 1.4 }}>
        {blind ? "Opponent won't see your team until they lock in their picks." : "Opponent picks their team then the fight starts."} Expires in 7 days.
      </p>
    </div>
  );
}

export function Challenge() {
  const { code } = useParams<{ code: string }>();
  const [, navigate] = useLocation();
  const search = useSearch();
  const isCreatorParam = new URLSearchParams(search).get("creator") === "1";
  const { toast } = useToast();
  const { data: challenge, error: challengeError, loading, setData: setChallenge } = useChallenge(code ?? "");
  const { data: allCharacters, isLoading: charsLoading } = useListCharacters();

  const [team2, setTeam2] = useState<Character[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [showFight, setShowFight] = useState(false);
  const [fightTeam1, setFightTeam1] = useState<number[]>([]);
  const [fightTeam2, setFightTeam2] = useState<number[]>([]);

  const { isMinor } = useAgeMode();
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(80);

  const simulateFight = useSimulateFightStream({
    onError: (err) => toast({ title: "Fight failed", description: err.message, variant: "destructive" }),
  });

  const censoredResult = useMemo(
    () => simulateFight.data ? (isMinor ? censorFightResult(simulateFight.data) : simulateFight.data) : null,
    [simulateFight.data, isMinor]
  );

  const team1Characters = useMemo(() => {
    if (!allCharacters || !challenge?.team1Ids) return [];
    return challenge.team1Ids.map(id => allCharacters.find(c => c.id === id)!).filter(Boolean);
  }, [allCharacters, challenge?.team1Ids]);

  const filteredChars = useMemo(() => {
    if (!allCharacters) return [];
    const q = searchQuery.trim().toLowerCase();
    const t1Ids = new Set(challenge?.team1Ids ?? []);
    return (q
      ? allCharacters.filter(c => c.name.toLowerCase().includes(q) || c.universe.toLowerCase().includes(q))
      : allCharacters
    ).filter(c => !t1Ids.has(c.id));
  }, [allCharacters, searchQuery, challenge?.team1Ids]);

  useEffect(() => {
    setVisibleCount(80);
  }, [searchQuery]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) setVisibleCount(n => n + 60); },
      { root: gridScrollRef.current, rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredChars.length]);

  const handleCharClick = (char: Character) => {
    if (!challenge) return;
    setTeam2(prev => {
      if (prev.some(c => c.id === char.id)) return prev.filter(c => c.id !== char.id);
      if (prev.length >= 5) { toast({ title: "Team Full", description: "Max 5 per team", variant: "destructive" }); return prev; }
      return [...prev, char];
    });
  };

  const startFight = (t1Ids: number[], t2Ids: number[], mode: string) => {
    setFightTeam1(t1Ids);
    setFightTeam2(t2Ids);
    setShowFight(true);
    simulateFight.mutate({ data: { team1: t1Ids, team2: t2Ids, mode: mode as "cinematic" } });
  };

  const handleAccept = async () => {
    if (!challenge || team2.length === 0) return;
    setAccepting(true);
    try {
      const r = await fetch(`/api/challenges/${challenge.code}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team2Ids: team2.map(c => c.id) }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Failed to accept");
      }
      const updated = await r.json() as { team1Ids: number[]; team2Ids: number[]; mode: string };

      if (challenge.blind) {
        setChallenge(prev => prev ? { ...prev, team1Ids: updated.team1Ids, team2Ids: updated.team2Ids, status: "accepted", team1Hidden: false } : prev);
        setRevealed(true);
        setTimeout(() => startFight(updated.team1Ids, updated.team2Ids, updated.mode), 1600);
      } else {
        startFight(updated.team1Ids, updated.team2Ids, updated.mode);
      }
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setAccepting(false);
    }
  };

  // Already used by someone else: team2 set on server, and we didn't just accept it here
  const challengeAlreadyAccepted = !!challenge?.team2Ids && !showFight && !isCreatorParam && !revealed && !accepting;
  // Determine if viewer is the "creator" — explicit param set when creating the challenge
  const isCreatorView = isCreatorParam;
  const canLockIn = team2.length > 0 && !accepting;
  const blindHideTeam1 = challenge?.blind && !revealed && !challenge?.team2Ids;

  if (loading || charsLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 12 }}>
        <Swords style={{ width: 28, height: 28, color: "#ff0055", opacity: 0.5 }} />
        <span style={{ fontSize: 9, letterSpacing: "0.3em", color: "rgba(255,255,255,0.35)" }}>LOADING CHALLENGE…</span>
      </div>
    );
  }

  if (challengeError || !challenge) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 12, padding: 24 }}>
        <span style={{ fontSize: 40 }}>⚔</span>
        <h2 style={{ fontSize: 18, letterSpacing: "0.1em", color: "#ff0055", textAlign: "center" }}>CHALLENGE NOT FOUND</h2>
        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textAlign: "center", lineHeight: 1.5 }}>
          {challengeError ?? "This link may have expired or already been used."}
        </p>
        <button onClick={() => navigate("/")} style={{ padding: "8px 18px", background: "rgba(255,0,85,0.1)", border: "1px solid rgba(255,0,85,0.35)", color: "#ff0055", fontSize: 10, letterSpacing: "0.2em", cursor: "pointer" }}>
          ← BACK TO ARENA
        </button>
      </div>
    );
  }

  const fightTeam1Chars = allCharacters?.filter(c => fightTeam1.includes(c.id)) ?? [];
  const fightTeam2Chars = allCharacters?.filter(c => fightTeam2.includes(c.id)) ?? [];

  if (challengeAlreadyAccepted) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 12, padding: 24 }}>
        <span style={{ fontSize: 36 }}>⚔</span>
        <h2 style={{ fontSize: 14, letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)", textAlign: "center" }}>CHALLENGE ALREADY ACCEPTED</h2>
        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", textAlign: "center", lineHeight: 1.5 }}>
          This challenge link has already been used.
        </p>
        <button onClick={() => navigate("/")} style={{ padding: "8px 18px", background: "rgba(255,0,85,0.1)", border: "1px solid rgba(255,0,85,0.35)", color: "#ff0055", fontSize: 10, letterSpacing: "0.2em", cursor: "pointer" }}>
          ← BACK TO ARENA
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#030308" }}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, background: "linear-gradient(180deg, #000 0%, #080810 100%)", borderBottom: "1px solid rgba(255,0,85,0.2)" }}>
        <div style={{ padding: "8px 12px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: 0, fontSize: 9, letterSpacing: "0.15em" }}>
              ← ARENA
            </button>
            <span style={{ color: "rgba(255,255,255,0.1)" }}>|</span>
            <span style={{ fontSize: 8, letterSpacing: "0.25em", color: "rgba(255,0,85,0.6)", fontWeight: 700 }}>
              {challenge.blind ? "⚔ BLIND PICK" : "⚔ CHALLENGE"} · {challenge.code}
            </span>
          </div>

          {/* Teams side by side */}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
            {/* Team 1 */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 7.5, letterSpacing: "0.2em", color: "rgba(0,240,255,0.5)", marginBottom: 5 }}>
                {blindHideTeam1 ? "CHALLENGER" : "CHALLENGER'S TEAM"}
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {blindHideTeam1
                  ? Array.from({ length: 3 }).map((_, i) => <MiniPortrait key={i} char={undefined} team={1} />)
                  : team1Characters.map(c => <MiniPortrait key={c.id} char={c} team={1} />)
                }
              </div>
            </div>

            {/* VS */}
            <div style={{ display: "flex", alignItems: "center", paddingTop: 16 }}>
              <span style={{ fontSize: 13, letterSpacing: "0.1em", color: "#ff0055", textShadow: "0 0 10px rgba(255,0,85,0.5)" }}>VS</span>
            </div>

            {/* Team 2 */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 7.5, letterSpacing: "0.2em", color: "rgba(255,59,48,0.5)", marginBottom: 5 }}>
                {isCreatorView ? "OPPONENT" : `YOUR TEAM (${team2.length}/5)`}
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {team2.map(c => (
                  <div key={c.id} onClick={() => !showFight && setTeam2(prev => prev.filter(x => x.id !== c.id))} style={{ cursor: "pointer" }}>
                    <MiniPortrait char={c} team={2} />
                  </div>
                ))}
                {team2.length === 0 && isCreatorView && (
                  <div style={{ width: 44, height: 58, border: "1.5px dashed rgba(255,59,48,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 14, color: "rgba(255,59,48,0.2)", fontWeight: 300 }}>?</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Blind reveal flash */}
          {revealed && !showFight && (
            <div style={{ textAlign: "center", padding: "6px 0 8px", fontSize: 11, letterSpacing: "0.2em", color: "#00f0ff", textShadow: "0 0 16px rgba(0,240,255,0.8)" }}>
              ✦ TEAMS REVEALED — FIGHT STARTING… ✦
            </div>
          )}

          {/* Share box for creator */}
          {isCreatorView && (
            <div style={{ marginBottom: 10 }}>
              <ShareBox code={challenge.code} blind={challenge.blind} />
            </div>
          )}

          {/* Lock-in button for opponent */}
          {!isCreatorView && !showFight && (
            <div style={{ padding: "0 0 10px" }}>
              <button
                onClick={handleAccept}
                disabled={!canLockIn}
                style={{
                  width: "100%", height: 38,
                  background: canLockIn ? "rgba(255,0,85,0.12)" : "rgba(255,255,255,0.02)",
                  border: `1.5px solid ${canLockIn ? "rgba(255,0,85,0.55)" : "rgba(255,255,255,0.08)"}`,
                  color: canLockIn ? "#ff0055" : "rgba(255,255,255,0.18)",
                  fontSize: 10, letterSpacing: "0.25em", fontWeight: 700,
                  cursor: canLockIn ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  animation: canLockIn ? "fightPulse 2s ease-in-out infinite" : "none",
                }}
              >
                <Swords style={{ width: 13, height: 13 }} />
                {accepting ? "STARTING FIGHT…" : challenge.blind ? "LOCK IN & REVEAL" : "ACCEPT & FIGHT"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Character picker (opponent only) ─────────────────────── */}
      {!isCreatorView && !showFight && (
        <>
          <div style={{ flexShrink: 0, padding: "6px 10px 4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", padding: "6px 10px" }}>
              <Search style={{ width: 11, height: 11, color: "rgba(255,255,255,0.3)", flexShrink: 0 }} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search fighters…"
                style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#fff", fontSize: 11 }}
              />
            </div>
          </div>
          <div ref={gridScrollRef} style={{ flex: 1, overflowY: "auto", padding: "4px 10px 16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {filteredChars.slice(0, visibleCount).map(char => (
                <CharacterCard
                  key={char.id}
                  character={char}
                  selectedTeam={team2.some(c => c.id === char.id) ? 2 : null}
                  onClick={() => handleCharClick(char)}
                  disabled={team2.length >= 5 && !team2.some(c => c.id === char.id)}
                />
              ))}
            </div>
            <div ref={sentinelRef} style={{ height: 1 }} />
          </div>
        </>
      )}

      {/* Creator waiting state */}
      {isCreatorView && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10, color: "rgba(255,255,255,0.15)" }}>
          <Eye style={{ width: 24, height: 24 }} />
          <span style={{ fontSize: 8, letterSpacing: "0.3em" }}>WAITING FOR OPPONENT</span>
        </div>
      )}

      {/* ── Fight overlay ─────────────────────────────────────────── */}
      <FightScreen
        open={showFight}
        onClose={() => { simulateFight.reset(); setShowFight(false); }}
        onRematch={() => startFight(fightTeam1, fightTeam2, challenge.mode)}
        result={censoredResult}
        isSimulating={simulateFight.isPending && !simulateFight.streaming}
        team1Names={fightTeam1Chars.map(c => c.name)}
        team2Names={fightTeam2Chars.map(c => c.name)}
        team1Images={fightTeam1Chars.map(c => c.imageUrl)}
        team2Images={fightTeam2Chars.map(c => c.imageUrl)}
        completedSections={simulateFight.completedSections}
      />
    </div>
  );
}
