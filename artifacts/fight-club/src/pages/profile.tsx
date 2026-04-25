import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useUser, useClerk, Show } from "@clerk/react";
import { format } from "date-fns";
import { Trophy, Swords, Star, LogOut, User as UserIcon, Pencil, Volume2 } from "lucide-react";
import { CharacterAvatar } from "@/components/character-avatar";
import { CharacterPicker } from "@/components/character-picker";
import { UsernameEditor } from "@/components/username-editor";

const TTS_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;
type TtsVoice = (typeof TTS_VOICES)[number];

const VOICE_LABELS: Record<TtsVoice, string> = {
  alloy: "Alloy — balanced",
  echo: "Echo — warm",
  fable: "Fable — expressive",
  onyx: "Onyx — deep",
  nova: "Nova — bright",
  shimmer: "Shimmer — soft",
};

function NarrationSettings() {
  const [voice, setVoiceState] = useState<TtsVoice>(() => {
    try {
      const v = localStorage.getItem("ava:tts-voice");
      return TTS_VOICES.includes(v as TtsVoice) ? (v as TtsVoice) : "onyx";
    } catch { return "onyx"; }
  });

  const setVoice = (v: TtsVoice) => {
    setVoiceState(v);
    try { localStorage.setItem("ava:tts-voice", v); } catch {}
  };

  return (
    <div
      className="flex-shrink-0 px-4 py-4"
      style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
    >
      <p className="text-[9px] font-bold uppercase tracking-[0.3em] mb-3 flex items-center gap-2"
        style={{ color: "rgba(255,255,255,0.4)" }}>
        <Volume2 className="h-3 w-3" />
        Narration voice
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {TTS_VOICES.map(v => (
          <button
            key={v}
            onClick={() => setVoice(v)}
            className="flex flex-col items-center gap-0.5 py-2 px-1 transition-all active:scale-[0.97]"
            style={{
              border: `1.5px solid ${voice === v ? "rgba(0,240,255,0.5)" : "rgba(255,255,255,0.08)"}`,
              background: voice === v ? "rgba(0,240,255,0.08)" : "rgba(255,255,255,0.02)",
            }}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: voice === v ? "#00f0ff" : "rgba(255,255,255,0.5)" }}>
              {v}
            </span>
            <span className="text-[8px] tracking-wide"
              style={{ color: "rgba(255,255,255,0.25)" }}>
              {VOICE_LABELS[v].split("—")[1]?.trim()}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

type StatsResponse = {
  totalFights: number;
  team1Wins: number;
  team2Wins: number;
  characters: Array<{ name: string; used: number; wins: number }>;
};

type FightSummary = {
  id: number;
  team1Names: string[];
  team2Names: string[];
  winner: number;
  summary: string;
  simulatedAt: string;
};

const apiBase = import.meta.env.BASE_URL;

export function Profile() {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-hidden">
        <Show when="signed-out">
          <SignedOutPrompt />
        </Show>
        <Show when="signed-in">
          <SignedInProfile />
        </Show>
      </div>
      <NarrationSettings />
    </div>
  );
}

function SignedOutPrompt() {
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-16 text-center gap-6">
      <UserIcon className="h-14 w-14 text-muted-foreground/30" />
      <div>
        <h1 className="font-display text-2xl uppercase tracking-widest text-primary mb-2">
          Sign in for stats
        </h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          Track your personal fight history, win/loss record, and favorite
          fighters when you sign in.
        </p>
      </div>
      <Link href="/sign-in">
        <button className="px-6 py-3 bg-primary text-white font-bold uppercase tracking-widest text-sm hover:bg-primary/90 transition-colors">
          Sign in
        </button>
      </Link>
      <Link href="/sign-up">
        <button className="text-xs uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
          Or create an account →
        </button>
      </Link>
    </div>
  );
}

function SignedInProfile() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [fights, setFights] = useState<FightSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [usernameOpen, setUsernameOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`${apiBase}api/me/stats`, { credentials: "include" }).then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch(`${apiBase}api/me/fights`, { credentials: "include" }).then((r) =>
        r.ok ? r.json() : null,
      ),
    ])
      .then(([s, f]) => {
        if (cancelled) return;
        setStats(s);
        setFights(f);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const displayName =
    (user?.unsafeMetadata?.username as string) ||
    user?.username ||
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "Fighter";
  const winRate =
    stats && stats.totalFights > 0
      ? Math.round(
          ((stats.team1Wins + stats.team2Wins) / stats.totalFights) * 100,
        )
      : 0;
  const topFighters = stats?.characters.slice(0, 6) ?? [];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Profile header */}
      <div
        className="px-4 pt-4 pb-3 flex-shrink-0"
        style={{
          background: "linear-gradient(180deg, #000 0%, #080810 100%)",
          borderBottom: "1px solid rgba(255,0,85,0.15)",
        }}
      >
        <div className="flex items-center gap-3">
          <CharacterAvatar
            size={56}
            fallbackInitial={displayName.charAt(0).toUpperCase()}
            onClick={() => setPickerOpen(true)}
            showHover
          />
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60 mb-0.5">
              Fighter
            </p>
            <h1 className="font-display text-xl uppercase tracking-widest text-primary truncate">
              {(user?.unsafeMetadata?.username as string) ? `@${user?.unsafeMetadata?.username as string}` : displayName}
            </h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <button
                onClick={() => setUsernameOpen(true)}
                className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 hover:text-primary transition-colors"
              >
                <Pencil className="h-2.5 w-2.5" />
                {(user?.unsafeMetadata?.username as string) ? "Change tag" : "Set tag"}
              </button>
              <button
                onClick={() => setPickerOpen(true)}
                className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 hover:text-primary transition-colors"
              >
                <Pencil className="h-2.5 w-2.5" />
                Pick fighter
              </button>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-1 border transition-all hover:border-primary/40 hover:text-primary self-start"
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            <LogOut className="h-2.5 w-2.5" />
            Sign out
          </button>
        </div>
      </div>

      <CharacterPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
      <UsernameEditor open={usernameOpen} onClose={() => setUsernameOpen(false)} />

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center p-16">
            <p className="font-display text-2xl uppercase animate-pulse text-muted-foreground">
              Loading...
            </p>
          </div>
        ) : !stats || stats.totalFights === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 gap-4 text-center">
            <Trophy className="h-16 w-16 text-muted-foreground/30" />
            <p className="font-display text-xl text-muted-foreground uppercase">
              No fights yet
            </p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Head to the Arena and start your first fight. Your wins, losses,
              and favorite fighters will track here.
            </p>
            <Link href="/">
              <button className="mt-2 px-5 py-2 bg-primary text-white font-bold uppercase tracking-widest text-xs hover:bg-primary/90 transition-colors">
                Enter Arena
              </button>
            </Link>
          </div>
        ) : (
          <div className="p-4 space-y-5">
            {/* Headline stats */}
            <div className="grid grid-cols-3 gap-2">
              <StatTile label="Fights" value={stats.totalFights} color="#ff0055" />
              <StatTile label="T1 Wins" value={stats.team1Wins} color="#00f0ff" />
              <StatTile label="T2 Wins" value={stats.team2Wins} color="#ff3b30" />
            </div>

            {/* Win split */}
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40 mb-2">
                {winRate}% completion · {stats.totalFights} total
              </p>
              <div className="flex h-2 rounded overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div
                  className="h-full transition-all duration-700"
                  style={{
                    width: `${stats.totalFights > 0 ? (stats.team1Wins / stats.totalFights) * 100 : 0}%`,
                    background: "#00f0ff",
                  }}
                />
                <div
                  className="h-full transition-all duration-700"
                  style={{
                    width: `${stats.totalFights > 0 ? (stats.team2Wins / stats.totalFights) * 100 : 0}%`,
                    background: "#ff3b30",
                  }}
                />
              </div>
            </div>

            {/* Favorite fighters */}
            {topFighters.length > 0 && (
              <div>
                <p
                  className="text-[9px] font-bold uppercase tracking-[0.3em] mb-3 flex items-center gap-2"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  <Star className="h-3 w-3" style={{ color: "#ffd700" }} />
                  Your favorite fighters
                </p>
                <div className="space-y-1.5">
                  {topFighters.map((c, i) => {
                    const winPct = c.used > 0 ? Math.round((c.wins / c.used) * 100) : 0;
                    const medalColor =
                      i === 0
                        ? "#ffd700"
                        : i === 1
                          ? "#c0c0c0"
                          : i === 2
                            ? "#cd7f32"
                            : "rgba(255,255,255,0.2)";
                    return (
                      <div
                        key={c.name}
                        className="flex items-center gap-3 px-3 py-2"
                        style={{
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <span
                          className="font-display text-sm flex-shrink-0 w-5 text-center"
                          style={{ color: medalColor }}
                        >
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-xs font-bold truncate"
                            style={{ color: "rgba(255,255,255,0.85)" }}
                          >
                            {c.name}
                          </p>
                          <div
                            className="mt-1 h-0.5"
                            style={{ background: "rgba(255,255,255,0.06)" }}
                          >
                            <div
                              className="h-full transition-all duration-700"
                              style={{
                                width: `${winPct}%`,
                                background: `linear-gradient(to right, ${medalColor}80, ${medalColor})`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <span className="text-[10px] font-bold" style={{ color: "#34d399" }}>
                            {c.wins}W
                          </span>
                          <span
                            className="text-[9px] mx-1"
                            style={{ color: "rgba(255,255,255,0.2)" }}
                          >
                            /
                          </span>
                          <span
                            className="text-[10px] font-bold"
                            style={{ color: "rgba(255,255,255,0.3)" }}
                          >
                            {c.used - c.wins}L
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent fights */}
            {fights && fights.length > 0 && (
              <div>
                <p
                  className="text-[9px] font-bold uppercase tracking-[0.3em] mb-2"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  Recent matches
                </p>
                <div className="flex flex-col divide-y divide-border/20 border border-white/5">
                  {fights.slice(0, 10).map((fight) => {
                    const winColor = fight.winner === 1 ? "#00f0ff" : "#ff3b30";
                    const winNames =
                      fight.winner === 1 ? fight.team1Names : fight.team2Names;
                    return (
                      <div
                        key={fight.id}
                        className="relative px-3 py-2 flex flex-col gap-1.5"
                      >
                        <div
                          className="absolute left-0 top-0 bottom-0 w-0.5"
                          style={{ background: winColor }}
                        />
                        <div className="flex items-center justify-between pl-2">
                          <div className="flex items-center gap-1.5">
                            <Trophy className="h-2.5 w-2.5" style={{ color: winColor }} />
                            <span
                              className="text-[9px] font-bold uppercase tracking-wide"
                              style={{ color: winColor }}
                            >
                              {winNames.slice(0, 2).join(" & ")}
                            </span>
                          </div>
                          <span className="text-[9px] text-muted-foreground/40">
                            {format(new Date(fight.simulatedAt), "MMM d")}
                          </span>
                        </div>
                        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center pl-2">
                          <p className="text-[10px] text-muted-foreground/70 leading-tight truncate">
                            {fight.team1Names.join(", ")}
                          </p>
                          <Swords
                            className="h-2.5 w-2.5"
                            style={{ color: "rgba(255,0,85,0.4)" }}
                          />
                          <p className="text-[10px] text-muted-foreground/70 leading-tight text-right truncate">
                            {fight.team2Names.join(", ")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className="p-3 text-center"
      style={{
        background: `${color}08`,
        border: `1px solid ${color}25`,
      }}
    >
      <div className="font-display text-2xl" style={{ color }}>
        {value}
      </div>
      <div
        className="text-[9px] font-bold uppercase tracking-widest mt-0.5"
        style={{ color: `${color}99` }}
      >
        {label}
      </div>
    </div>
  );
}
