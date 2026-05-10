import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import { useListCharacters } from "@workspace/api-client-react";
import { Character } from "@workspace/api-client-react";
import { CharacterCard } from "@/components/character-card";
import { FightScreen } from "@/components/fight-screen";
import { useSimulateFightStream } from "@/hooks/use-simulate-fight-stream";
import { useToast } from "@/hooks/use-toast";
import { Swords, Search, Eye, EyeOff, Copy, CheckCheck, Link, Share2, X, BellOff, Check } from "lucide-react";
import { useAgeMode } from "@/hooks/use-age-mode";
import { censorFightResult } from "@/lib/profanity-filter";
import { getUniverseCategory, CATEGORY_ORDER, CATEGORY_COLORS } from "@/lib/universe-categories";
import { setJoinerToken, getCreatorToken, getJoinerToken } from "@/lib/challenge-tokens";
import { subscribeForChallenge, pushSupported, requestNotificationPermissionFromGesture } from "@/lib/push-subscribe";
import { ModifierBadge } from "@/components/modifier-badge";
import { EnergyBadge } from "@/components/energy-badge";
import { useEnergy } from "@/hooks/use-energy";

interface ChallengeData {
  code: string;
  team1Ids: number[] | null;
  team2Ids: number[] | null;
  mode: string;
  status: string;
  team1Ready: boolean;
  team2Ready: boolean;
  fightId: number | null;
  // Chaos modifier id (e.g. "lava_floor") or null for standard rules. Locked
  // at challenge-create time and shown in the lobby + fight HUD so both
  // players know the rules before they hit READY.
  modifierId: string | null;
  // Optional battle cry typed by the creator. Shown to the opponent on the
  // acceptance screen so the challenge feels personal.
  taunt: string | null;
}

// Polls until the challenge is "settled" — i.e. both sides ready or fight
// completed. The poll covers two cases:
//   - creator waiting for opponent to accept (team2Ids appears)
//   - either side waiting for the other to hit READY in the lobby
// We always poll while there's a chance the state can change.
function useChallenge(code: string, polling = true) {
  const [data, setData] = useState<ChallengeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchChallenge = async (isInitial = false): Promise<ChallengeData | undefined> => {
    if (!code) return undefined;
    if (isInitial) setLoading(true);
    try {
      const r = await fetch(`/api/challenges/${code.toUpperCase()}`);
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Challenge not found");
      }
      const d = await r.json() as ChallengeData;
      setData(d);
      if (isInitial) setLoading(false);
      return d;
    } catch (e) {
      if (isInitial) { setError((e as Error).message); setLoading(false); }
      return undefined;
    }
  };

  useEffect(() => {
    fetchChallenge(true);
  }, [code]);

  useEffect(() => {
    if (!polling || !code) return;
    const interval = setInterval(async () => {
      const d = await fetchChallenge(false);
      // Once both sides are ready or the fight is on disk, no point polling.
      if (d && (d.fightId !== null || (d.team1Ready && d.team2Ready))) {
        clearInterval(interval);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [code, polling]);

  return { data, error, loading, setData };
}

function ReadyChip({ label, ready, isYou, color }: { label: string; ready: boolean; isYou: boolean; color: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "6px 11px",
      background: ready ? `${color}15` : "rgba(255,255,255,0.03)",
      border: `1px solid ${ready ? `${color}80` : "rgba(255,255,255,0.08)"}`,
      color: ready ? color : "rgba(255,255,255,0.35)",
      fontWeight: 700,
      letterSpacing: "0.18em",
      fontSize: 9,
      textTransform: "uppercase",
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: 999,
        background: ready ? color : "rgba(255,255,255,0.18)",
        boxShadow: ready ? `0 0 8px ${color}` : "none",
      }} />
      <span>{label}{isYou ? " · YOU" : ""}</span>
      <span style={{ opacity: 0.7 }}>{ready ? "READY" : "WAITING"}</span>
    </div>
  );
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

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function MessengerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
      <path d="M12 0C5.373 0 0 4.975 0 11.111c0 3.497 1.745 6.616 4.472 8.652V24l4.086-2.242c1.09.301 2.246.464 3.442.464 6.627 0 12-4.974 12-11.111C24 4.975 18.627 0 12 0zm1.193 14.963l-3.056-3.259-5.963 3.259 6.559-6.963 3.13 3.259 5.889-3.259-6.559 6.963z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function ShareBox({ code, taunt, team1Names }: { code: string; taunt?: string | null; team1Names: string[] }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}${import.meta.env.BASE_URL}challenge/${code}`;

  const shareText = taunt
    ? `⚔ "${taunt}" — Accept my A.v.A challenge and prove it!`
    : `⚔ ${team1Names.length > 0 ? `I picked ${team1Names.slice(0, 2).join(" & ")}${team1Names.length > 2 ? ` +${team1Names.length - 2} more` : ""}` : "I've picked my team"} — can YOUR squad beat mine? Accept my A.v.A challenge!`;

  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(url);

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const nativeShare = () => {
    if (navigator.share) {
      navigator.share({ title: "A.v.A Challenge", text: shareText, url });
    }
  };

  const socials: { label: string; color: string; bg: string; href: string; icon: React.ReactNode }[] = [
    {
      label: "X",
      color: "#fff",
      bg: "#111",
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      icon: <XIcon />,
    },
    {
      label: "Messenger",
      color: "#fff",
      bg: "#0099FF",
      href: `fb-messenger://share/?link=${encodedUrl}`,
      icon: <MessengerIcon />,
    },
    {
      label: "WhatsApp",
      color: "#fff",
      bg: "#25D366",
      href: `https://wa.me/?text=${encodeURIComponent(shareText + " " + url)}`,
      icon: <WhatsAppIcon />,
    },
    {
      label: "Telegram",
      color: "#fff",
      bg: "#229ED9",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      icon: <TelegramIcon />,
    },
  ];

  const hasNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div style={{ background: "linear-gradient(135deg, rgba(0,240,255,0.05) 0%, rgba(0,0,0,0) 100%)", border: "1px solid rgba(0,240,255,0.18)", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid rgba(0,240,255,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Share2 style={{ width: 11, height: 11, color: "#00f0ff" }} />
          <span style={{ fontSize: 9, letterSpacing: "0.22em", color: "#00f0ff", fontWeight: 700, textTransform: "uppercase" }}>
            Share Challenge
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(0,240,255,0.08)", border: "1px solid rgba(0,240,255,0.2)", padding: "2px 7px" }}>
          <span style={{ fontSize: 11, letterSpacing: "0.18em", color: "#00f0ff", fontWeight: 800, fontFamily: "monospace" }}>{code}</span>
        </div>
      </div>

      {/* Social buttons */}
      <div style={{ padding: "10px 12px 8px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 10 }}>
          {socials.map(s => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              title={`Share on ${s.label}`}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                padding: "8px 4px", background: s.bg, color: s.color,
                textDecoration: "none", cursor: "pointer",
                transition: "opacity 0.15s", opacity: 1,
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              {s.icon}
              <span style={{ fontSize: 7, letterSpacing: "0.05em", fontWeight: 700 }}>{s.label}</span>
            </a>
          ))}
        </div>

        {/* Copy link row */}
        <div style={{ display: "flex", gap: 5 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <Link style={{ width: 9, height: 9, color: "rgba(255,255,255,0.25)", flexShrink: 0 }} />
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</span>
          </div>
          <button
            onClick={copy}
            style={{
              display: "flex", alignItems: "center", gap: 4, padding: "6px 11px", flexShrink: 0,
              fontSize: 8, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "inherit",
              background: copied ? "rgba(0,240,255,0.18)" : "rgba(0,240,255,0.08)",
              border: `1px solid ${copied ? "#00f0ff" : "rgba(0,240,255,0.3)"}`,
              color: "#00f0ff", cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {copied ? <CheckCheck style={{ width: 10, height: 10 }} /> : <Copy style={{ width: 10, height: 10 }} />}
            {copied ? "COPIED!" : "COPY"}
          </button>
          {hasNativeShare && (
            <button
              onClick={nativeShare}
              title="Share via…"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", padding: "6px 10px", flexShrink: 0,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.5)", cursor: "pointer",
              }}
            >
              <Share2 style={{ width: 10, height: 10 }} />
            </button>
          )}
        </div>

        <p style={{ fontSize: 7.5, color: "rgba(255,255,255,0.2)", marginTop: 7, lineHeight: 1.5 }}>
          Opponent picks their team, then the fight starts. Link expires in 7 days.
        </p>
      </div>
    </div>
  );
}

export function Challenge() {
  const { code } = useParams<{ code: string }>();
  const [, navigate] = useLocation();
  const search = useSearch();
  const isCreatorParam = new URLSearchParams(search).get("creator") === "1";
  const { toast } = useToast();
  // Always poll — both creator and joiner need to see opponent state changes
  // (acceptance, ready toggles). The hook stops polling on its own once the
  // fight is on disk or both sides are ready.
  const { data: challenge, error: challengeError, loading, setData: setChallenge } = useChallenge(code ?? "", true);
  const { data: allCharacters, isLoading: charsLoading } = useListCharacters();

  const energy = useEnergy();

  const [team2, setTeam2] = useState<Character[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [showFight, setShowFight] = useState(false);
  const [fightTeam1, setFightTeam1] = useState<number[]>([]);
  const [fightTeam2, setFightTeam2] = useState<number[]>([]);
  // Hooks MUST live above the early-return guards below; testingPush is used
  // by the optional "TEST PING" button further down the render.
  const [testingPush, setTestingPush] = useState(false);

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
    if (!Array.isArray(allCharacters) || !challenge?.team1Ids) return [];
    const ids = Array.isArray(challenge.team1Ids) ? challenge.team1Ids : [];
    return ids.map(id => allCharacters.find(c => c.id === id)!).filter(Boolean);
  }, [allCharacters, challenge?.team1Ids]);

  const filteredChars = useMemo(() => {
    if (!allCharacters) return [];
    const q = searchQuery.trim().toLowerCase();
    const t1Ids = new Set(challenge?.team1Ids ?? []);
    return allCharacters
      .filter(c => !t1Ids.has(c.id))
      .filter(c => !q || c.name.toLowerCase().includes(q) || c.universe.toLowerCase().includes(q))
      .filter(c => !activeFilter || getUniverseCategory(c.universe) === activeFilter);
  }, [allCharacters, searchQuery, challenge?.team1Ids, activeFilter]);

  const categoryCounts = useMemo(() => {
    if (!allCharacters) return [];
    const t1Ids = new Set(challenge?.team1Ids ?? []);
    const counts: Record<string, number> = {};
    for (const c of allCharacters) {
      if (t1Ids.has(c.id)) continue;
      const cat = getUniverseCategory(c.universe);
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
    return CATEGORY_ORDER.filter(cat => counts[cat] > 0).map(cat => ({ category: cat, count: counts[cat] }));
  }, [allCharacters, challenge?.team1Ids]);

  useEffect(() => {
    setVisibleCount(80);
  }, [searchQuery, activeFilter]);

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

  const requiredTeamSize = challenge?.team1Ids?.length ?? 0;

  const handleCharClick = (char: Character) => {
    if (!challenge) return;
    setTeam2(prev => {
      if (prev.some(c => c.id === char.id)) return prev.filter(c => c.id !== char.id);
      if (requiredTeamSize > 0 && prev.length >= requiredTeamSize) {
        toast({
          title: "Team Full",
          description: `Challenger picked ${requiredTeamSize} — you must match exactly`,
          variant: "destructive",
        });
        return prev;
      }
      return [...prev, char];
    });
  };

  const startFight = (t1Ids: number[], t2Ids: number[], mode: string) => {
    setFightTeam1(t1Ids);
    setFightTeam2(t2Ids);
    setShowFight(true);
    // Pass the challenge code so both players see the SAME generated narrative
    // — first one through generates, the other waits for the saved fight id
    // and replays it instead of running its own AI roundtrip.
    simulateFight.mutate({
      data: {
        team1: t1Ids,
        team2: t2Ids,
        mode: mode as "cinematic",
        challengeCode: challenge?.code,
        // Pass through for clarity / non-challenge fallback. The server
        // re-reads the modifier from the challenge row regardless, so this
        // can't be tampered with by the client.
        modifierId: challenge?.modifierId ?? null,
      },
    });
  };

  // Both-ready trigger — once the server flips status to "ready" (both sides
  // hit the READY button) we kick off the fight stream. Race-safe: server is
  // also gated on team1Ready && team2Ready, and the existing claim-the-slot
  // logic ensures only one client actually generates the narrative.
  useEffect(() => {
    if (!challenge || showFight) return;
    if (!challenge.team1Ids || !challenge.team2Ids) return;
    if (challenge.team1Ready && challenge.team2Ready) {
      startFight(challenge.team1Ids, challenge.team2Ids, challenge.mode);
    }
  }, [challenge?.team1Ready, challenge?.team2Ready, challenge?.team1Ids, challenge?.team2Ids, showFight]);

  const handleAccept = async () => {
    if (!challenge || team2.length === 0) return;
    // Ask for notification permission BEFORE the await fetch — on iOS Safari
    // and Chrome Android the prompt is silently suppressed if it fires after
    // the user-gesture context is lost. We chain the actual subscribe call
    // off this promise once the accept response comes back.
    const permissionPromise = requestNotificationPermissionFromGesture();
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
      const updated = await r.json() as {
        team1Ids: number[]; team2Ids: number[]; mode: string;
        joinerToken?: string;
      };

      // Persist joiner identity so /ready and /push/subscribe can prove who we
      // are. Permission was already requested above (gesture-preserving);
      // prompt:false uses the resolved state without re-prompting.
      if (updated.joinerToken) {
        setJoinerToken(challenge.code, updated.joinerToken);
        void permissionPromise.then(() => subscribeForChallenge({
          code: challenge.code, token: updated.joinerToken!, prompt: false,
        }));
      }

      // Drop into the lobby — the existing render path picks LOBBY when
      // team2Ids is set and !showFight. Blind reveal animation runs via the
      // useEffect above.
      setChallenge(prev => prev ? {
        ...prev,
        team1Ids: updated.team1Ids,
        team2Ids: updated.team2Ids,
        status: "accepted",
        team1Hidden: false,
      } : prev);
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setAccepting(false);
    }
  };

  // ── Lobby: READY button handler ─────────────────────────────────────────────
  const [readyPending, setReadyPending] = useState(false);
  const handleReady = async () => {
    if (!challenge || !ownToken || readyPending || ownReady) return;
    setReadyPending(true);
    try {
      const r = await fetch(`/api/challenges/${challenge.code}/ready`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: ownToken, ready: true }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Failed to mark ready");
      }
      const upd = await r.json() as { team1Ready: boolean; team2Ready: boolean; status: string };
      setChallenge(prev => prev ? {
        ...prev,
        team1Ready: upd.team1Ready,
        team2Ready: upd.team2Ready,
        status: upd.status,
      } : prev);
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setReadyPending(false);
    }
  };

  // Identify the local viewer via tokens stored in localStorage. Creator wins
  // ties (testing both sides in one browser stays sane), and a returning
  // creator who clicked the push notification will still be recognised even
  // if the URL lost the ?creator=1 param.
  const creatorToken = challenge ? getCreatorToken(challenge.code) : null;
  const joinerToken = challenge ? getJoinerToken(challenge.code) : null;
  const isCreatorView = isCreatorParam || !!creatorToken;
  const isJoinerView = !isCreatorView && !!joinerToken;
  const ownSide: 1 | 2 | null = isCreatorView ? 1 : isJoinerView ? 2 : null;
  const ownToken = isCreatorView ? creatorToken : joinerToken;
  const ownReady = ownSide === 1 ? !!challenge?.team1Ready : ownSide === 2 ? !!challenge?.team2Ready : false;
  const opponentReady = ownSide === 1 ? !!challenge?.team2Ready : ownSide === 2 ? !!challenge?.team1Ready : false;

  // Re-attach a push subscription whenever a player revisits a challenge
  // they already own a token for. Handles PWA reinstall, browser storage
  // wipe, or SW unregister since the original create/accept. prompt:false
  // keeps it silent — if permission isn't granted, the in-page button asks.
  // Without this, the only push subscription we ever stored is from the
  // moment of create/accept, and any later device change leaves the player
  // unreachable.
  useEffect(() => {
    if (!challenge || !ownToken) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    void subscribeForChallenge({ code: challenge.code, token: ownToken, prompt: false });
  }, [challenge?.code, ownToken]);

  // Stranger arrived after someone else accepted the link — there's nothing
  // for them to do, so show the "already accepted" page.
  const challengeAlreadyAccepted = !!challenge?.team2Ids && !isCreatorView && !isJoinerView && !accepting;
  const canLockIn = team2.length === requiredTeamSize && requiredTeamSize > 0 && !accepting;

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

  const safeAllChars = Array.isArray(allCharacters) ? allCharacters : [];
  const fightTeam1Chars = safeAllChars.filter(c => fightTeam1.includes(c.id));
  const fightTeam2Chars = safeAllChars.filter(c => fightTeam2.includes(c.id));

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

  /* ── OPPONENT PICKER VIEW ───────────────────────────────────────── */
  // Only shown to a fresh visitor (no token) before they've locked in a
  // team. Once team2Ids is set on the server, both sides fall through to
  // the lobby render block below.
  if (!isCreatorView && !showFight && !challenge.team2Ids) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#030308", position: "relative" }}>
        {/* ── Cinematic header ─────────────────────────── */}
        <div style={{
          flexShrink: 0,
          background: "linear-gradient(180deg, #000 0%, #06060f 100%)",
          borderBottom: "1px solid rgba(255,0,85,0.25)",
          padding: "10px 14px 12px",
        }}>
          {/* Top nav row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer", padding: 0, fontSize: 9, letterSpacing: "0.15em" }}>
              ← ARENA
            </button>
            <span style={{
              fontSize: 7, letterSpacing: "0.3em", fontWeight: 800,
              color: "rgba(255,0,85,0.5)",
              textTransform: "uppercase", background: "rgba(255,0,85,0.06)",
              border: "1px solid rgba(255,0,85,0.2)",
              padding: "2px 7px",
            }}>
              ⚔ CHALLENGE · {challenge.code}
            </span>
          </div>

          {/* "YOU'VE BEEN CHALLENGED" title */}
          <div style={{ textAlign: "center", marginBottom: challenge.taunt ? 10 : 12 }}>
            <div style={{
              fontSize: 16, fontWeight: 900, letterSpacing: "0.12em",
              color: "#fff", textTransform: "uppercase",
              textShadow: "0 0 30px rgba(255,0,85,0.6), 0 0 60px rgba(255,0,85,0.2)",
              lineHeight: 1.1,
            }}>
              You've Been<br />
              <span style={{ color: "#ff0055" }}>Challenged</span>
            </div>
          </div>

          {/* Creator's battle cry — shown below the title if set */}
          {challenge.taunt && (
            <div style={{
              margin: "0 auto 10px",
              padding: "8px 14px",
              background: "rgba(255,0,85,0.06)",
              border: "1px solid rgba(255,0,85,0.2)",
              borderLeft: "3px solid rgba(255,0,85,0.55)",
              maxWidth: 300, width: "100%",
            }}>
              <div style={{ fontSize: 7, letterSpacing: "0.22em", color: "rgba(255,0,85,0.5)", marginBottom: 5, textTransform: "uppercase" }}>
                Their Battle Cry
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.88)", fontStyle: "italic", lineHeight: 1.45, letterSpacing: "0.01em" }}>
                "{challenge.taunt}"
              </div>
            </div>
          )}

          {/* Teams row */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            {/* Challenger's team */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 7, letterSpacing: "0.22em", color: "rgba(0,240,255,0.6)", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>
                Their Team
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {team1Characters.map(c => <MiniPortrait key={c.id} char={c} team={1} />)}
              </div>
            </div>

            {/* VS */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 18, flexShrink: 0 }}>
              <span style={{
                fontSize: 18, fontWeight: 900, letterSpacing: "0.06em",
                color: "#ff0055", textShadow: "0 0 16px rgba(255,0,85,0.7)",
                lineHeight: 1,
              }}>VS</span>
            </div>

            {/* Your team */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 7, letterSpacing: "0.22em", color: "rgba(255,59,48,0.6)", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>
                Your Team ({team2.length}/{requiredTeamSize})
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", minHeight: 60 }}>
                {team2.map(c => (
                  <div key={c.id} onClick={() => setTeam2(prev => prev.filter(x => x.id !== c.id))} style={{ cursor: "pointer", position: "relative" }} title={`Remove ${c.name}`}>
                    <MiniPortrait char={c} team={2} />
                    <div style={{
                      position: "absolute", top: -3, right: -3, width: 13, height: 13,
                      background: "rgba(255,0,85,0.9)", borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <X style={{ width: 7, height: 7, color: "#fff" }} />
                    </div>
                  </div>
                ))}
                {Array.from({ length: Math.max(0, requiredTeamSize - team2.length) }).map((_, i) => (
                  <div key={`empty-${i}`} style={{
                    width: 44, height: 58,
                    border: "1.5px dashed rgba(255,59,48,0.25)",
                    background: "rgba(255,59,48,0.03)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{ fontSize: 18, color: "rgba(255,59,48,0.2)", lineHeight: 1 }}>+</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Instruction */}
          {team2.length < requiredTeamSize && (
            <p style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", letterSpacing: "0.12em", textAlign: "center", marginTop: 10, marginBottom: 0 }}>
              {requiredTeamSize === 1
                ? "1v1 — pick your fighter, then lock in"
                : `${requiredTeamSize}v${requiredTeamSize} — pick exactly ${requiredTeamSize} fighters (${requiredTeamSize - team2.length} to go)`}
            </p>
          )}

        </div>

        {/* ── Character grid + scrollable search/filter ─── */}
        <div ref={gridScrollRef} style={{ flex: 1, overflowY: "auto", padding: "0 12px 80px" }}>
          {/* Search + filter — scrolls with content, disappears as you go deeper */}
          <div style={{ padding: "8px 0 6px" }}>
            {/* Search row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", padding: "6px 10px", marginBottom: 6 }}>
              <Search style={{ width: 11, height: 11, color: "rgba(255,255,255,0.3)", flexShrink: 0 }} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search fighters…"
                style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#fff", fontSize: 11 }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "rgba(255,255,255,0.3)" }}>
                  <X style={{ width: 10, height: 10 }} />
                </button>
              )}
            </div>
            {/* Category pills */}
            <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              <button
                onClick={() => setActiveFilter(null)}
                className="flex-shrink-0 transition-all duration-150"
                style={{
                  fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", padding: "3px 8px",
                  border: activeFilter === null ? "1px solid rgba(255,0,85,0.7)" : "1px solid rgba(255,255,255,0.1)",
                  background: activeFilter === null ? "rgba(255,0,85,0.15)" : "rgba(255,255,255,0.03)",
                  color: activeFilter === null ? "#ff0055" : "rgba(255,255,255,0.4)",
                }}
              >
                ALL
              </button>
              {categoryCounts.map(({ category, count }) => {
                const color = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS];
                const active = activeFilter === category;
                return (
                  <button
                    key={category}
                    onClick={() => setActiveFilter(prev => prev === category ? null : category)}
                    className="flex-shrink-0 transition-all duration-150 whitespace-nowrap"
                    style={{
                      fontSize: 8, fontWeight: 800, letterSpacing: "0.1em", padding: "3px 7px",
                      color: active ? "#000" : color,
                      background: active ? color : "transparent",
                      border: `1px solid ${active ? color : color + "60"}`,
                      opacity: activeFilter && !active ? 0.45 : 1,
                    }}
                  >
                    {category} {count}
                  </button>
                );
              })}
            </div>
          </div>

          {filteredChars.length === 0 && !charsLoading && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.2)", fontSize: 10, letterSpacing: "0.15em" }}>
              NO FIGHTERS FOUND
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {(Array.isArray(filteredChars) ? filteredChars : []).slice(0, visibleCount).map(char => (
              <CharacterCard
                key={char.id}
                character={char}
                selectedTeam={team2.some(c => c.id === char.id) ? 2 : null}
                onClick={() => handleCharClick(char)}
                disabled={team2.length >= requiredTeamSize && !team2.some(c => c.id === char.id)}
              />
            ))}
          </div>
          <div ref={sentinelRef} style={{ height: 1 }} />
        </div>

        {/* ── Sticky lock-in bar ───────────────────────── */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: "10px 14px 14px",
          background: "linear-gradient(to top, #030308 70%, transparent)",
          pointerEvents: "none",
        }}>
          <button
            onClick={handleAccept}
            disabled={!canLockIn}
            style={{
              width: "100%", height: 44,
              background: canLockIn ? "linear-gradient(135deg, rgba(255,0,85,0.18) 0%, rgba(255,0,85,0.08) 100%)" : "rgba(255,255,255,0.02)",
              border: `1.5px solid ${canLockIn ? "rgba(255,0,85,0.65)" : "rgba(255,255,255,0.07)"}`,
              color: canLockIn ? "#ff0055" : "rgba(255,255,255,0.15)",
              fontSize: 11, letterSpacing: "0.25em", fontWeight: 800,
              cursor: canLockIn ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              animation: canLockIn ? "fightPulse 2s ease-in-out infinite" : "none",
              boxShadow: canLockIn ? "0 0 24px rgba(255,0,85,0.2)" : "none",
              pointerEvents: "all",
              fontFamily: "inherit",
              transition: "all 0.2s",
            }}
          >
            <Swords style={{ width: 14, height: 14 }} />
            {accepting ? "STARTING FIGHT…" : "ACCEPT & FIGHT"}
            {!canLockIn && !accepting && (
              <span style={{ fontSize: 8, opacity: 0.6, marginLeft: 4 }}>— pick a fighter first</span>
            )}
          </button>
        </div>

        {/* Fight overlay */}
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
          modifierId={challenge.modifierId}
        />
      </div>
    );
  }

  /* ── CREATOR / LOBBY VIEW ───────────────────────────────────────── */
  // Two states share this render path:
  //   1. team2Ids NOT set → creator's "waiting for opponent" screen (with
  //      share box + leave-and-wait button + push permission status).
  //   2. team2Ids set → both players see the LOBBY with READY buttons, both
  //      teams revealed.
  const inLobby = !!challenge.team2Ids;
  const team2Characters: Character[] = (inLobby && Array.isArray(allCharacters) && Array.isArray(challenge.team2Ids) && challenge.team2Ids.length > 0)
    ? challenge.team2Ids.map(id => allCharacters.find(c => c.id === id)!).filter(Boolean)
    : [];

  // Show whether push is wired up. We don't *gate* anything on it — polling
  // works as a fallback — but it's reassuring to confirm it's set.
  const notifPermission = (typeof Notification !== "undefined") ? Notification.permission : "denied";
  const pushOn = pushSupported() && notifPermission === "granted";

  const enableNotifications = async () => {
    if (!challenge || !ownToken) return;
    const ok = await subscribeForChallenge({ code: challenge.code, token: ownToken, prompt: true });
    if (!ok) {
      toast({
        title: "Notifications unavailable",
        description: notifPermission === "denied"
          ? "Permission was previously denied. Enable it in your browser settings."
          : "We couldn't enable push on this device. Polling will still update the page.",
        variant: "destructive",
      });
    } else {
      toast({ title: "Notifications enabled", description: "We'll ping you when something happens." });
    }
  };

  // Round-trip a push from server → SW → OS notification so the user can
  // confirm end-to-end delivery actually works on their device. If 0 are
  // sent, their subscription is gone (or was never registered) — we
  // re-subscribe and ask them to try once more.
  const sendTestPush = async () => {
    if (!challenge || !ownToken || testingPush) return;
    setTestingPush(true);
    try {
      const r = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: challenge.code, token: ownToken }),
      });
      const j = await r.json().catch(() => ({})) as { sent?: number; failed?: number; error?: string };
      if (!r.ok) {
        toast({ title: "Test failed", description: j.error ?? "Server rejected the request.", variant: "destructive" });
      } else if ((j.sent ?? 0) === 0) {
        // Subscription is gone — try registering a fresh one and tell them.
        await subscribeForChallenge({ code: challenge.code, token: ownToken, prompt: false });
        toast({
          title: "No subscription on file",
          description: "Re-registered just now. Tap test again — you should see a notification.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Test push sent", description: "Should appear in your tray within a few seconds." });
      }
    } catch (e) {
      toast({ title: "Test failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setTestingPush(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#030308" }}>
      {/* Header */}
      <div style={{ flexShrink: 0, background: "linear-gradient(180deg, #000 0%, #080810 100%)", borderBottom: "1px solid rgba(255,0,85,0.2)" }}>
        <div style={{ padding: "8px 12px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: 0, fontSize: 9, letterSpacing: "0.15em" }}>
              ← ARENA
            </button>
            <span style={{ color: "rgba(255,255,255,0.1)" }}>|</span>
            <span style={{ fontSize: 8, letterSpacing: "0.25em", color: "rgba(255,0,85,0.6)", fontWeight: 700 }}>
              ⚔ CHALLENGE · {challenge.code}
            </span>
            <div style={{ marginLeft: "auto" }}>
              <EnergyBadge />
            </div>
          </div>

          {/* Teams */}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 7.5, letterSpacing: "0.2em", color: "rgba(0,240,255,0.5)", marginBottom: 5 }}>
                {ownSide === 1 ? "YOUR TEAM" : "CHALLENGER"}
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {team1Characters.map(c => <MiniPortrait key={c.id} char={c} team={1} />)}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", paddingTop: 16 }}>
              <span style={{ fontSize: 13, letterSpacing: "0.1em", color: "#ff0055", textShadow: "0 0 10px rgba(255,0,85,0.5)" }}>VS</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 7.5, letterSpacing: "0.2em", color: "rgba(255,59,48,0.5)", marginBottom: 5 }}>
                {ownSide === 2 ? "YOUR TEAM" : "OPPONENT"}
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {inLobby
                  ? team2Characters.map(c => <MiniPortrait key={c.id} char={c} team={2} />)
                  : (
                    <div style={{ width: 44, height: 58, border: "1.5px dashed rgba(255,59,48,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 18, color: "rgba(255,59,48,0.15)", fontWeight: 300 }}>?</span>
                    </div>
                  )
                }
              </div>
            </div>
          </div>

          {/* Share box — only useful while waiting for an opponent */}
          {!inLobby && (
            <div style={{ marginBottom: 10 }}>
              <ShareBox code={challenge.code} taunt={challenge.taunt} team1Names={team1Characters.map(c => c.name)} />
            </div>
          )}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      {!showFight && inLobby && (
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "stretch", justifyContent: "center",
          padding: "16px 18px 20px", gap: 14,
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 14, letterSpacing: "0.18em", color: "#fff", fontWeight: 800, marginBottom: 6 }}>
              LOBBY
            </div>
            <div style={{ fontSize: 9, letterSpacing: "0.18em", color: "rgba(255,255,255,0.45)" }}>
              Both players must hit <span style={{ color: "#00f0ff" }}>READY</span> to start the fight.
            </div>
            {/* Chaos modifier badge — picked by the creator at challenge-create
                time, locked once shared. Both players see it here so the rules
                are agreed upon before READY. */}
            {challenge.modifierId && (
              <div style={{ marginTop: 10, display: "flex", justifyContent: "center" }}>
                <ModifierBadge modifierId={challenge.modifierId} />
              </div>
            )}
          </div>

          {/* Ready status row */}
          <div style={{ display: "flex", gap: 8, justifyContent: "center", fontSize: 9, letterSpacing: "0.18em" }}>
            <ReadyChip
              label="Challenger"
              ready={!!challenge.team1Ready}
              isYou={ownSide === 1}
              color="#00f0ff"
            />
            <ReadyChip
              label="Opponent"
              ready={!!challenge.team2Ready}
              isYou={ownSide === 2}
              color="#ff3b30"
            />
          </div>

          {/* Local READY button */}
          <button
            onClick={handleReady}
            disabled={!ownToken || ownReady || readyPending}
            style={{
              width: "100%", height: 52,
              background: ownReady
                ? "rgba(0,240,255,0.1)"
                : ownToken
                  ? "linear-gradient(135deg, rgba(0,240,255,0.22) 0%, rgba(0,240,255,0.06) 100%)"
                  : "rgba(255,255,255,0.03)",
              border: `1.5px solid ${ownReady ? "rgba(0,240,255,0.55)" : ownToken ? "rgba(0,240,255,0.7)" : "rgba(255,255,255,0.07)"}`,
              color: ownReady ? "rgba(0,240,255,0.85)" : ownToken ? "#00f0ff" : "rgba(255,255,255,0.2)",
              fontSize: 12, letterSpacing: "0.28em", fontWeight: 800,
              cursor: ownToken && !ownReady && !readyPending ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              fontFamily: "inherit",
              transition: "all 0.2s",
              boxShadow: ownToken && !ownReady ? "0 0 26px rgba(0,240,255,0.18)" : "none",
            }}
          >
            {ownReady
              ? <><Check style={{ width: 14, height: 14 }} /> READY — WAITING…</>
              : readyPending
                ? "MARKING READY…"
                : ownToken
                  ? <><Swords style={{ width: 14, height: 14 }} /> READY</>
                  : "VIEWER ONLY"}
          </button>

          {!ownReady && opponentReady && (
            <div style={{ textAlign: "center", fontSize: 9, letterSpacing: "0.2em", color: "#ff0055" }}>
              Your opponent is waiting on YOU.
            </div>
          )}
          {ownReady && !opponentReady && (
            <div style={{ textAlign: "center", fontSize: 9, letterSpacing: "0.2em", color: "rgba(255,255,255,0.3)" }}>
              Waiting for {ownSide === 1 ? "opponent" : "challenger"}…
            </div>
          )}

          {/* Push status pill + test button */}
          {ownToken && (
            <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={enableNotifications}
                style={{
                  padding: "6px 12px",
                  fontSize: 8, letterSpacing: "0.18em", fontWeight: 700,
                  background: pushOn ? "rgba(0,240,255,0.06)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${pushOn ? "rgba(0,240,255,0.3)" : "rgba(255,255,255,0.1)"}`,
                  color: pushOn ? "rgba(0,240,255,0.85)" : "rgba(255,255,255,0.4)",
                  cursor: pushOn ? "default" : "pointer",
                  display: "inline-flex", alignItems: "center", gap: 6,
                  fontFamily: "inherit",
                }}
                disabled={pushOn}
              >
                {pushOn
                  ? <>🔔 NOTIFICATIONS ON</>
                  : <><BellOff style={{ width: 10, height: 10 }} /> ENABLE NOTIFICATIONS</>}
              </button>
              {pushOn && (
                <button
                  onClick={sendTestPush}
                  disabled={testingPush}
                  style={{
                    padding: "6px 12px",
                    fontSize: 8, letterSpacing: "0.18em", fontWeight: 700,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: testingPush ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.6)",
                    cursor: testingPush ? "default" : "pointer",
                    display: "inline-flex", alignItems: "center", gap: 6,
                    fontFamily: "inherit",
                  }}
                >
                  {testingPush ? "…" : "TEST PING"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Creator-waiting state — opponent hasn't accepted yet */}
      {!showFight && !inLobby && (
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: 14, color: "rgba(255,255,255,0.4)",
          padding: "16px 18px 18px",
        }}>
          <Eye style={{ width: 26, height: 26, opacity: 0.4 }} />
          <span style={{ fontSize: 9, letterSpacing: "0.3em" }}>WAITING FOR OPPONENT</span>
          <span style={{ fontSize: 8, letterSpacing: "0.15em", color: "rgba(255,255,255,0.25)", textAlign: "center", lineHeight: 1.5, maxWidth: 280 }}>
            {pushOn
              ? "You can leave this screen — we'll buzz your phone the moment they accept."
              : "Enable notifications to be pinged when they accept, or stay on this screen."}
          </span>
          {!pushOn && ownToken && (
            <button
              onClick={enableNotifications}
              style={{
                padding: "8px 14px",
                fontSize: 9, letterSpacing: "0.22em", fontWeight: 700,
                background: "rgba(0,240,255,0.08)",
                border: "1px solid rgba(0,240,255,0.4)",
                color: "#00f0ff",
                cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 6,
                fontFamily: "inherit",
              }}
            >
              🔔 ENABLE NOTIFICATIONS
            </button>
          )}
          <button
            onClick={() => navigate("/")}
            style={{
              padding: "9px 18px",
              fontSize: 10, letterSpacing: "0.25em", fontWeight: 800,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.18)",
              color: "rgba(255,255,255,0.6)",
              cursor: "pointer",
              fontFamily: "inherit",
              marginTop: 4,
            }}
          >
            ← LEAVE & WAIT
          </button>
        </div>
      )}

      {/* ── Fight overlay ─────────────────────────────────────────── */}
      <FightScreen
        open={showFight}
        // Closing a challenge fight should never trap the players in the
        // (now-stale) lobby — both sides are already READY, so the lobby has
        // no useful action left. Take them straight back to home.
        onClose={() => { simulateFight.reset(); setShowFight(false); navigate("/"); }}
        onRematch={() => startFight(fightTeam1, fightTeam2, challenge.mode)}
        result={censoredResult}
        isSimulating={simulateFight.isPending && !simulateFight.streaming}
        team1Names={fightTeam1Chars.map(c => c.name)}
        team2Names={fightTeam2Chars.map(c => c.name)}
        team1Images={fightTeam1Chars.map(c => c.imageUrl)}
        team2Images={fightTeam2Chars.map(c => c.imageUrl)}
        completedSections={simulateFight.completedSections}
        modifierId={challenge.modifierId}
      />

    </div>
  );
}
