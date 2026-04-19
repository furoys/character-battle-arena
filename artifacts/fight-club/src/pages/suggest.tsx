import { useState, useMemo } from "react";
import { useListCharacters } from "@workspace/api-client-react";
import { Character } from "@workspace/api-client-react/src/generated/api.schemas";
import { useLocation } from "wouter";
import { Flame, Swords, MessageSquare, Zap } from "lucide-react";

// ─── Matchup database ─────────────────────────────────────────────────────────
// Each matchup uses real character IDs from the database
type Matchup = {
  id: string;
  title: string;
  theory: string;
  team1Ids: number[];
  team2Ids: number[];
  mode: "fun" | "debate";
  category: string;
  hot?: boolean;
};

const MATCHUPS: Matchup[] = [
  // DC vs MARVEL
  {
    id: "superman-vs-thor",
    title: "Son of Krypton vs Son of Odin",
    theory: "The eternal comic book war. Superman's solar-powered invulnerability vs Thor's magical lightning — and magic bypasses Kryptonian immunity. Most theorists give it to Superman on raw power, but Thor's Odin Force changes everything.",
    team1Ids: [1],
    team2Ids: [7],
    mode: "debate",
    category: "DC vs Marvel",
    hot: true,
  },
  {
    id: "thanos-vs-darkseid",
    title: "Cosmic Tyrants — The Final War",
    theory: "Thanos with the Infinity Gauntlet vs Darkseid wielding the Anti-Life Equation. The consensus: naked Darkseid beats naked Thanos. But one snap of the Gauntlet ends universes. The real debate: does Omega Force resist Infinity?",
    team1Ids: [29],
    team2Ids: [89],
    mode: "debate",
    category: "DC vs Marvel",
    hot: true,
  },
  {
    id: "justice-league-vs-avengers",
    title: "Justice League vs The Avengers",
    theory: "The biggest crossover debate in comic history. JL fans say Superman alone closes it. Avengers fans counter with Scarlet Witch reality-warping + Hulk's limitless rage. Most analysts give JL the edge, but it's never clean.",
    team1Ids: [1, 13, 4, 14, 15],
    team2Ids: [5, 7, 23, 24, 3],
    mode: "debate",
    category: "DC vs Marvel",
    hot: true,
  },
  {
    id: "green-lantern-vs-silver-surfer",
    title: "Willpower vs Power Cosmic",
    theory: "Hal Jordan's ring constructs are limited only by imagination and willpower. Silver Surfer's Power Cosmic makes him one of Marvel's fastest and strongest. Fan theory: Surfer's raw power wins short-term, but Jordan's will is literally infinite.",
    team1Ids: [16],
    team2Ids: [32],
    mode: "debate",
    category: "DC vs Marvel",
  },
  {
    id: "scarlet-witch-vs-wonder-woman",
    title: "Chaos Magic vs Amazon Goddess",
    theory: "Wanda can rewrite reality — she depowered nearly every mutant with three words. Diana is a demigod blessed by the Olympians. The debate: can physical godhood withstand probability manipulation?",
    team1Ids: [31],
    team2Ids: [4],
    mode: "debate",
    category: "DC vs Marvel",
  },
  // Anime Debates
  {
    id: "goku-vs-naruto",
    title: "Saiyan God vs Ninja God",
    theory: "The most debated anime matchup ever. Goku can destroy planets. Naruto's Kurama chakra is planetary-level too, but Dragon Ball physics are orders of magnitude beyond Naruto's. 9 out of 10 power scalers say Goku — but Naruto fans never accept it.",
    team1Ids: [2],
    team2Ids: [6],
    mode: "debate",
    category: "Anime Debates",
    hot: true,
  },
  {
    id: "gojo-vs-sukuna",
    title: "The Jujutsu Kaisen Final Answer",
    theory: "Gojo's Infinity makes him untouchable. Sukuna's Malevolent Shrine + Reverse Cursed Technique makes him unkillable. The manga answered it — but fans still argue whether Gojo was nerfed by the sealing, and whether it counts.",
    team1Ids: [84],
    team2Ids: [178],
    mode: "debate",
    category: "Anime Debates",
    hot: true,
  },
  {
    id: "saitama-vs-goku",
    title: "One Punch vs Infinite Power",
    theory: "The ultimate power scaling paradox. Saitama's power is canonically limitless — he's never found an upper bound. Goku constantly breaks through power ceilings. Most theorists say Saitama's 'one punch' is always enough, by definition.",
    team1Ids: [87],
    team2Ids: [2],
    mode: "debate",
    category: "Anime Debates",
    hot: true,
  },
  {
    id: "goku-vs-vegeta",
    title: "Rivals for Eternity",
    theory: "The rivalry that defined Dragon Ball. Goku always edges Vegeta when it matters — but Vegeta's pride and raw intelligence make him the better tactician. Ultra Ego vs Ultra Instinct: one uses anger, one transcends it.",
    team1Ids: [2],
    team2Ids: [12],
    mode: "fun",
    category: "Anime Debates",
  },
  {
    id: "naruto-crew-vs-bleach-crew",
    title: "Naruto's Best vs Bleach's Best",
    theory: "Which anime has the stronger top 3? Naruto's ninja gods vs Bleach's Soul Reaper elite. Naruto + Sasuke + Madara vs Ichigo + Gojo + Sukuna — wait, Gojo is JJK. Community pick: Madara's Infinite Tsukuyomi might end it before it begins.",
    team1Ids: [6, 52, 55],
    team2Ids: [83, 84, 178],
    mode: "debate",
    category: "Anime Debates",
  },
  {
    id: "meruem-vs-goku",
    title: "Chimera Ant King vs Super Saiyan",
    theory: "Meruem is the most intelligent HxH character and evolves by consuming Nen users. Could his adaptable Nen system keep pace with Dragon Ball physics? Most agree no — but the debate about his ceiling is genuinely open.",
    team1Ids: [91],
    team2Ids: [2],
    mode: "debate",
    category: "Anime Debates",
  },
  {
    id: "itachi-vs-sasuke",
    title: "The Brother War — Final Form",
    theory: "Itachi threw the fight. In a real no-holds-barred duel, who wins? Itachi's Amaterasu and Tsukuyomi vs Sasuke's Rinnegan and perfect Susanoo. Itachi was already sick — but healthy Itachi with Edo Tensei? Community is split 50/50.",
    team1Ids: [54],
    team2Ids: [52],
    mode: "debate",
    category: "Anime Debates",
  },
  // Gods & Myths
  {
    id: "kratos-vs-thor",
    title: "The God of War vs Marvel's Thor",
    theory: "Kratos has killed Ares, Zeus, Kronos, Odin, and Thor (Norse). Marvel's Thor has fought Galactus and Celestials. The debate: is GoW's power scaling comparable to Marvel cosmic? Most agree in-lore Kratos scales higher than people think.",
    team1Ids: [69],
    team2Ids: [7],
    mode: "debate",
    category: "Gods & Myths",
    hot: true,
  },
  {
    id: "zeus-vs-thor",
    title: "King of Olympus vs Asgardian Thunder",
    theory: "Greek pantheon vs Norse pantheon — the original mythology war. Zeus rules all gods and can throw lightning that leveled Typhon. Thor is mighty but not the king of his pantheon. Most mythology scholars give it to Zeus, but Marvel Thor fans disagree.",
    team1Ids: [78],
    team2Ids: [7],
    mode: "debate",
    category: "Gods & Myths",
  },
  {
    id: "olympus-vs-asgard",
    title: "Olympus vs Asgard — Full Pantheon",
    theory: "Full mythology war: Achilles + Hercules + Zeus vs Thor + Loki + Odin. Greek myth is generally stronger in fiction rankings, but Norse gods have Odin's All-Father power. The team match makes this genuinely unpredictable.",
    team1Ids: [76, 77, 78],
    team2Ids: [7],
    mode: "fun",
    category: "Gods & Myths",
  },
  // Cosmic Tier
  {
    id: "galactus-vs-anos",
    title: "World Eater vs Demon King",
    theory: "Galactus eats planets as snacks. Anos Voldigoad can destroy all of reality — he ended a thousand-year war by dying and resurrecting to do it again. Community debate: Anos is one of few anime characters who could genuinely fight a Marvel Cosmic.",
    team1Ids: [187],
    team2Ids: [182],
    mode: "debate",
    category: "Cosmic Tier",
    hot: true,
  },
  {
    id: "scarlet-witch-vs-dr-strange",
    title: "Chaos Magic vs Sorcerer Supreme",
    theory: "Post-WandaVision Wanda depowered an entire species with 3 words. Doctor Strange has the Eye of Agamotto and mastery of every arcane art. MoM answer: Wanda wins — Strange needed the Darkhold to compete. Fans still argue the MCU downplayed Strange.",
    team1Ids: [31],
    team2Ids: [25],
    mode: "debate",
    category: "Cosmic Tier",
  },
  // Horror
  {
    id: "slasher-royale",
    title: "The Slasher Royale",
    theory: "Freddy kills in dreams, Jason kills physically and can't die, Michael Myers just won't stop. Put them in two teams: community theory is Jason + Pennywise (fear + brute force) vs Freddy + Michael (dreams + persistence). It's chaos — that's the point.",
    team1Ids: [162, 164],
    team2Ids: [163, 165],
    mode: "fun",
    category: "Horror Showdown",
    hot: true,
  },
  {
    id: "alien-vs-predator",
    title: "Alien vs Predator",
    theory: "Predators hunt Xenomorphs as a rite of passage. But Alien Queens command entire hives. 1v1: Predator wins with tech advantage. 1v10: Aliens overwhelm. The lore canon actually showed both sides win in different scenarios — neither has a clear edge.",
    team1Ids: [82],
    team2Ids: [81],
    mode: "fun",
    category: "Sci-Fi Clash",
    hot: true,
  },
  // Street Level
  {
    id: "batman-vs-john-wick",
    title: "Prepared Billionaire vs The Boogeyman",
    theory: "Batman's prep-time is legendary — he has contingencies for gods. John Wick killed 3 men with a pencil. The community debate: pure CQC, no gadgets — Wick wins. With prep and gadgets — Batman wins. The real question is: does Batman count as street level?",
    team1Ids: [13],
    team2Ids: [100],
    mode: "debate",
    category: "Street Level",
    hot: true,
  },
  {
    id: "vader-vs-maul",
    title: "Darth Vader vs Obi-Wan Gang",
    theory: "The Star Wars debate: who was the most powerful at their peak? Vader post-suit is nerfed. Pre-suit Anakin might be the greatest Jedi ever. Luke Skywalker at his peak Legends version scales to universe-busting. Yoda is calm and lethal.",
    team1Ids: [9],
    team2Ids: [45, 46],
    mode: "debate",
    category: "Sci-Fi Clash",
  },
  {
    id: "voldemort-vs-gandalf",
    title: "Dark Lord vs The White",
    theory: "Gandalf is literally a Maia — an angelic being who chose to limit his power. Voldemort is the most powerful dark wizard in centuries but still mortal. Most fantasy theorists say Gandalf's true power, unconstrained, would end Voldemort instantly.",
    team1Ids: [43],
    team2Ids: [10],
    mode: "debate",
    category: "Fantasy Clash",
  },
];

const CATEGORIES = ["All", "Developer Legends", "DC vs Marvel", "Anime Debates", "Gods & Myths", "Cosmic Tier", "Horror Showdown", "Sci-Fi Clash", "Street Level", "Fantasy Clash"];

// ─── Matchup card ─────────────────────────────────────────────────────────────
function FighterMini({ character, side }: { character: Character | undefined; side: "left" | "right" }) {
  const color = side === "left" ? "#00f0ff" : "#ff3b30";
  const initials = character ? character.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?";

  return (
    <div className="flex flex-col items-center gap-1" style={{ width: 52 }}>
      <div
        className="relative overflow-hidden flex-shrink-0"
        style={{
          width: 52, height: 64,
          border: `1.5px solid ${color}50`,
          boxShadow: `0 0 12px ${color}20`,
        }}
      >
        {character?.imageUrl ? (
          <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover object-top" />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-display font-bold text-sm" style={{ background: `${color}10`, color }}>
            {initials}
          </div>
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 55%)" }} />
      </div>
      {character && (
        <span className="text-center leading-none font-bold" style={{ fontSize: 8, color: "rgba(255,255,255,0.55)", maxWidth: 52 }}>
          {character.name.split(" ").slice(0, 2).join(" ")}
        </span>
      )}
    </div>
  );
}

function MatchupCard({
  matchup,
  characterMap,
  onLoad,
}: {
  matchup: Matchup;
  characterMap: Map<number, Character>;
  onLoad: (m: Matchup) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const team1 = matchup.team1Ids.map(id => characterMap.get(id));
  const team2 = matchup.team2Ids.map(id => characterMap.get(id));
  const loaded = team1.every(Boolean) && team2.every(Boolean);

  return (
    <div
      className="relative overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderLeft: `3px solid ${matchup.mode === "debate" ? "#c084fc" : "#ff0055"}`,
      }}
    >
      {/* Hot badge */}
      {matchup.hot && (
        <div
          className="absolute top-2 right-2 flex items-center gap-0.5"
          style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.1em", color: "#ff6b35" }}
        >
          <Flame className="w-3 h-3" />
          HOT
        </div>
      )}

      {/* Mode badge */}
      <div
        className="absolute top-2 left-3"
        style={{
          fontSize: 7,
          fontWeight: 800,
          letterSpacing: "0.15em",
          color: matchup.mode === "debate" ? "#c084fc" : "#ff0055",
          opacity: 0.8,
        }}
      >
        {matchup.mode === "debate" ? "⚖ DEBATE" : "⚡ FUN"}
      </div>

      <div className="pt-6 pb-3 px-3">
        {/* Title */}
        <h3 className="font-display uppercase tracking-wider mb-2" style={{ fontSize: 12, color: "rgba(255,255,255,0.9)", lineHeight: 1.2 }}>
          {matchup.title}
        </h3>

        {/* Team display */}
        <div className="flex items-center gap-2 mb-3">
          {/* Team 1 */}
          <div className="flex gap-1.5 flex-1 justify-end">
            {team1.map((c, i) => (
              <FighterMini key={i} character={c} side="left" />
            ))}
          </div>

          {/* VS */}
          <div
            className="flex-shrink-0 font-display font-black italic"
            style={{ fontSize: 18, color: "rgba(255,255,255,0.2)", lineHeight: 1 }}
          >
            VS
          </div>

          {/* Team 2 */}
          <div className="flex gap-1.5 flex-1 justify-start">
            {team2.map((c, i) => (
              <FighterMini key={i} character={c} side="right" />
            ))}
          </div>
        </div>

        {/* Theory toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full text-left mb-2 transition-all"
          style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", lineHeight: 1.5 }}
        >
          {expanded ? matchup.theory : matchup.theory.slice(0, 90) + (matchup.theory.length > 90 ? "…" : "")}
          {matchup.theory.length > 90 && (
            <span style={{ color: "#c084fc", marginLeft: 4 }}>{expanded ? " ↑ Less" : " ↓ The Theory"}</span>
          )}
        </button>

        {/* Load button */}
        <button
          onClick={() => loaded && onLoad(matchup)}
          disabled={!loaded}
          className="w-full flex items-center justify-center gap-1.5 transition-all duration-150 active:scale-95"
          style={{
            padding: "7px 0",
            background: loaded
              ? matchup.mode === "debate"
                ? "linear-gradient(135deg, rgba(192,132,252,0.15), rgba(192,132,252,0.08))"
                : "linear-gradient(135deg, rgba(255,0,85,0.15), rgba(255,0,85,0.08))"
              : "rgba(255,255,255,0.04)",
            border: `1px solid ${loaded ? (matchup.mode === "debate" ? "rgba(192,132,252,0.4)" : "rgba(255,0,85,0.4)") : "rgba(255,255,255,0.08)"}`,
            color: loaded ? (matchup.mode === "debate" ? "#c084fc" : "#ff0055") : "rgba(255,255,255,0.2)",
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: "0.18em",
            cursor: loaded ? "pointer" : "default",
          }}
        >
          {matchup.mode === "debate"
            ? <MessageSquare className="w-3 h-3" />
            : <Swords className="w-3 h-3" />
          }
          {loaded ? `FIGHT THIS — ${matchup.mode.toUpperCase()} MODE` : "LOADING FIGHTERS…"}
        </button>
      </div>
    </div>
  );
}

// ─── Developer Legends special card ───────────────────────────────────────────
function DevLegendsCard({
  chris,
  troy,
  onLoad,
}: {
  chris: Character | undefined;
  troy: Character | undefined;
  onLoad: (team1: Character[], team2: Character[], mode: string) => void;
}) {
  const loaded = !!(chris && troy);

  // When both are on opposing teams — the betrayal scenario
  const handleBetrayalFight = () => {
    if (!chris || !troy) return;
    // Put them on opposite teams — the AI will detect the alliance and trigger the betrayal override
    onLoad([chris], [troy], "cinematic");
  };

  return (
    <div
      className="relative overflow-hidden col-span-full"
      style={{
        background: "linear-gradient(135deg, rgba(255,200,0,0.06), rgba(0,0,0,0.5))",
        border: "1.5px solid rgba(255,200,0,0.25)",
        borderLeft: "4px solid #ffc800",
      }}
    >
      {/* Gold badge */}
      <div
        className="absolute top-0 right-0 px-3 py-1"
        style={{
          fontSize: 7,
          fontWeight: 900,
          letterSpacing: "0.25em",
          color: "#ffc800",
          background: "rgba(255,200,0,0.12)",
          borderLeft: "1px solid rgba(255,200,0,0.2)",
          borderBottom: "1px solid rgba(255,200,0,0.2)",
        }}
      >
        ◆ DEVELOPER LEGENDS
      </div>

      <div className="pt-6 pb-4 px-4">
        <h3
          className="font-display uppercase tracking-wider mb-1"
          style={{ fontSize: 14, color: "#ffc800", lineHeight: 1.2 }}
        >
          The Architects — Betrayal Protocol
        </h3>
        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginBottom: 12, lineHeight: 1.6, letterSpacing: "0.05em" }}>
          Chris Henry and Troy Wilson built this arena. Put them on opposing teams and watch what happens. 
          They will not fight each other. They will turn on their own sides. They always win together.
        </p>

        {/* Character portraits */}
        <div className="flex items-center gap-4 mb-4">
          {[chris, troy].map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="relative overflow-hidden"
                style={{
                  width: 56, height: 72,
                  border: "2px solid rgba(255,200,0,0.5)",
                  boxShadow: "0 0 16px rgba(255,200,0,0.2)",
                }}
              >
                {c?.imageUrl ? (
                  <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover object-top" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-display font-bold text-sm" style={{ background: "rgba(255,200,0,0.08)", color: "#ffc800" }}>
                    {c?.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() ?? "?"}
                  </div>
                )}
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 55%)" }} />
              </div>
              <div>
                <p className="font-display uppercase text-xs tracking-wider" style={{ color: "#ffc800" }}>
                  {c?.name ?? "Loading..."}
                </p>
                <p style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em" }}>
                  Developer Legend
                </p>
              </div>
              {i === 0 && (
                <span
                  className="font-display font-black italic mx-2"
                  style={{ fontSize: 20, color: "rgba(255,200,0,0.2)" }}
                >
                  VS
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Action button */}
        <button
          onClick={handleBetrayalFight}
          disabled={!loaded}
          className="w-full flex items-center justify-center gap-2 transition-all duration-150 active:scale-95"
          style={{
            padding: "9px 0",
            background: loaded ? "linear-gradient(135deg, rgba(255,200,0,0.15), rgba(255,200,0,0.08))" : "rgba(255,255,255,0.04)",
            border: `1.5px solid ${loaded ? "rgba(255,200,0,0.5)" : "rgba(255,255,255,0.08)"}`,
            color: loaded ? "#ffc800" : "rgba(255,255,255,0.2)",
            fontSize: 9,
            fontWeight: 900,
            letterSpacing: "0.2em",
            cursor: loaded ? "pointer" : "default",
          }}
        >
          <Swords className="w-3.5 h-3.5" />
          {loaded ? "TRIGGER THE BETRAYAL PROTOCOL" : "LOADING LEGENDS…"}
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function Suggest() {
  const { data: characters } = useListCharacters();
  const [, navigate] = useLocation();
  const [activeCategory, setActiveCategory] = useState("All");

  const characterMap = useMemo(() => {
    const m = new Map<number, Character>();
    characters?.forEach(c => m.set(c.id, c));
    return m;
  }, [characters]);

  // Find Developer Legends by name (IDs are dynamic)
  const chris = useMemo(() => characters?.find(c => c.name === "Chris Henry"), [characters]);
  const troy  = useMemo(() => characters?.find(c => c.name === "Troy Wilson"), [characters]);

  const filtered = useMemo(
    () => activeCategory === "All" ? MATCHUPS : activeCategory === "Developer Legends" ? [] : MATCHUPS.filter(m => m.category === activeCategory),
    [activeCategory]
  );

  const hotCount = MATCHUPS.filter(m => m.hot).length;

  function handleLoad(matchup: Matchup) {
    const team1 = matchup.team1Ids.map(id => characterMap.get(id)).filter(Boolean) as Character[];
    const team2 = matchup.team2Ids.map(id => characterMap.get(id)).filter(Boolean) as Character[];
    try {
      localStorage.setItem("ava_pending_fight", JSON.stringify({
        team1,
        team2,
        mode: matchup.mode,
      }));
    } catch {}
    navigate("/");
  }

  function handleDevLoad(team1: Character[], team2: Character[], mode: string) {
    try {
      localStorage.setItem("ava_pending_fight", JSON.stringify({ team1, team2, mode }));
    } catch {}
    navigate("/");
  }

  const showDevLegends = activeCategory === "All" || activeCategory === "Developer Legends";

  return (
    <div className="flex flex-col min-h-full" style={{ background: "#0a0a0f" }}>
      {/* Header */}
      <div
        className="px-4 pt-5 pb-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-end justify-between mb-1">
          <div>
            <h1 className="font-display text-2xl uppercase tracking-[0.2em]" style={{ color: "#ff0055", lineHeight: 1 }}>
              Debate Room
            </h1>
            <p className="mt-1" style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>
              CURATED MATCHUPS · ONLINE THEORIES · INSTANT LOAD
            </p>
          </div>
          <div className="flex items-center gap-1.5" style={{ fontSize: 10, color: "#ff6b35" }}>
            <Flame className="w-4 h-4" />
            <span className="font-bold">{hotCount} HOT</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-3 mt-3">
          <div className="flex items-center gap-1">
            <div style={{ width: 10, height: 10, background: "#c084fc", borderRadius: 1 }} />
            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>DEBATE MODE — AI uses real fan theories</span>
          </div>
          <div className="flex items-center gap-1">
            <div style={{ width: 10, height: 10, background: "#ff0055", borderRadius: 1 }} />
            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>FUN MODE — cinematic chaos</span>
          </div>
        </div>
      </div>

      {/* Category tabs */}
      <div
        className="flex gap-1 px-3 py-2 overflow-x-auto flex-shrink-0"
        style={{ scrollbarWidth: "none", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className="flex-shrink-0 transition-all duration-150"
            style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: "0.12em",
              padding: "4px 10px",
              background: activeCategory === cat ? "rgba(255,0,85,0.15)" : "transparent",
              border: `1px solid ${activeCategory === cat ? "rgba(255,0,85,0.5)" : "rgba(255,255,255,0.08)"}`,
              color: activeCategory === cat ? "#ff0055" : "rgba(255,255,255,0.35)",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Matchup grid */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {showDevLegends && (
            <DevLegendsCard chris={chris} troy={troy} onLoad={handleDevLoad} />
          )}
          {filtered.map(matchup => (
            <MatchupCard
              key={matchup.id}
              matchup={matchup}
              characterMap={characterMap}
              onLoad={handleLoad}
            />
          ))}
        </div>

        {filtered.length === 0 && !showDevLegends && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Zap className="w-10 h-10" style={{ color: "rgba(255,255,255,0.1)" }} />
            <p className="font-display uppercase tracking-widest" style={{ fontSize: 13, color: "rgba(255,255,255,0.2)" }}>
              No matchups in this category
            </p>
          </div>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}
