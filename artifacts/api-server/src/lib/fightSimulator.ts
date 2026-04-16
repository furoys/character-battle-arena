import type { Character } from "@workspace/db";

export interface FightRound {
  round: number;
  attacker: string;
  defender: string;
  attackType: string;
  narrative: string;
  team1Hp: number;
  team2Hp: number;
}

export interface FightResult {
  winner: number;
  rounds: FightRound[];
  summary: string;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Environments ────────────────────────────────────────────────────────────

const arenas = [
  {
    name: "a shattered mountain peak",
    flavor: [
      "Sheets of rock calve off the cliff face with every impact.",
      "The thin air howls between jagged spires of stone.",
      "Boulders the size of houses tumble into the abyss below.",
      "A fissure splits the ground, belching sulphurous steam.",
      "Lightning strikes the summit, drawn by the raw energy of the fight.",
      "The mountaintop crumbles underfoot, offering no stable ground.",
    ],
  },
  {
    name: "a ruined city at night",
    flavor: [
      "Neon signs flicker and shatter as shockwaves tear through the street.",
      "Abandoned cars are hurled like toys through broken glass storefronts.",
      "The pavement buckles and splits, swallowing chunks of asphalt.",
      "Emergency sirens wail in the distance, drowned out by the carnage.",
      "A skyscraper groans, its windows imploding from the concussive force.",
      "Burning wreckage paints the street in hellish orange light.",
    ],
  },
  {
    name: "an ancient colosseum",
    flavor: [
      "The crowd of spectral onlookers falls deathly silent.",
      "Sand soaks with blood as the combatants tear up the arena floor.",
      "Stone columns shatter and topple under the force of the exchange.",
      "The arena walls crack from floor to ceiling.",
      "Dust rains down from the crumbling archways above.",
      "The stone floor fractures in a spiderweb of cracks beneath their feet.",
    ],
  },
  {
    name: "the surface of a dying planet",
    flavor: [
      "The sky is a sickly red, choked with volcanic ash.",
      "Rivers of magma cut glowing veins across the scorched landscape.",
      "Chunks of the planet's crust float upward, defying gravity.",
      "The atmosphere itself seems to buckle under the scale of the violence.",
      "Shockwaves flatten what little remains of the surface structures.",
      "Gravity fluctuates wildly — bodies and debris arc through the air.",
    ],
  },
  {
    name: "a stormy ocean platform",
    flavor: [
      "Fifty-foot waves crash over the platform, sweeping debris into the abyss.",
      "Lightning hammers the water in a ring around the combatants.",
      "The platform buckles and tilts, threatening to send everyone into the sea.",
      "Salt spray and thunder make it nearly impossible to see.",
      "A massive wave crests overhead, frozen for a moment by the sheer energy of the fight.",
      "Steel struts groan and snap as the platform struggles to hold together.",
    ],
  },
  {
    name: "a burning forest",
    flavor: [
      "Ancient trees, centuries old, are snapped like matchsticks.",
      "Walls of fire close in as the fight tears the forest apart.",
      "The canopy ignites in a rolling curtain of flame.",
      "Smoke turns the air black, forcing both sides to fight half-blind.",
      "A burning tree the size of a cathedral crashes down between them.",
      "Embers swirl upward as explosions of force fan the blaze higher.",
    ],
  },
  {
    name: "a frozen tundra",
    flavor: [
      "The ice shelf groans and cracks under each thunderous blow.",
      "Sheets of permafrost explode upward, hurling shrapnel in every direction.",
      "Their breath fogs in the killing cold between each savage exchange.",
      "A glacier calves into the sea from the shockwaves alone.",
      "Ice crystals hang suspended in the air, lit by flashes of combat energy.",
      "The temperature plummets further with each burst of destructive power.",
    ],
  },
  {
    name: "a hellish volcanic crater",
    flavor: [
      "Magma erupts in geysers around them, turning the air into a furnace.",
      "The crater rim crumbles, raining superheated rock on the combatants.",
      "Columns of fire shoot skyward from vents in the crater floor.",
      "The entire volcano shudders, threatening to erupt.",
      "Pools of molten rock bubble and spit at the edges of the battlefield.",
      "The heat is so intense that the very air distorts and shimmers.",
    ],
  },
];

// ─── Brutal Attack Templates ──────────────────────────────────────────────────

// Generic opening salvos
const openingTemplates = [
  (atk: string, def: string, ability: string, env: string) =>
    `${atk} doesn't wait for the bell. The moment both fighters touch down on ${env}, ${atk} unleashes ${ability} in a blinding opening salvo. ${def} takes the full brunt of it — teeth rattling, vision spinning — and is hurled backward ten meters before slamming into the terrain with bone-jarring force.`,
  (atk: string, def: string, ability: string, env: string) =>
    `The ground of ${env} hasn't finished settling before ${atk} is already moving. ${ability} tears the air apart as ${atk} closes the distance in less than a heartbeat, the impact lifting ${def} completely off their feet and driving them skidding across the ruined landscape.`,
  (atk: string, def: string, ability: string, env: string) =>
    `${atk} surveys ${env} for exactly one second, reads every angle, and moves. ${ability} connects with horrifying precision — the sound of the impact cracks like a thunderclap across the battlefield. ${def} is sent tumbling, leaving a trench in the ground behind them.`,
  (atk: string, def: string, ability: string, env: string) =>
    `Before ${def} can even settle their footing on ${env}, ${atk} is already in their face. ${ability} explodes outward with staggering force, and ${def} is flung into the environment itself, crashing through whatever stands in the way.`,
];

// Mid-fight high-intensity templates
const midTemplates = [
  (atk: string, def: string, ability: string, env: string) =>
    `${atk} drives ${def} backward across ${env} with a relentless barrage, each blow landing harder than the last. Finally, ${ability} detonates against ${def}'s guard, shattering it completely. ${def} crashes to their knees, gasping, blood running freely.`,
  (atk: string, def: string, ability: string, env: string) =>
    `${def} attempts to regroup — a fatal hesitation. ${atk} seizes the opening and channels everything into ${ability}. The strike lands flush, snapping ${def}'s head back with a crack that echoes across ${env}. ${def} staggers, legs threatening to buckle.`,
  (atk: string, def: string, ability: string, env: string) =>
    `The environment of ${env} becomes a weapon in ${atk}'s hands. Using the terrain for momentum, ${atk} amplifies ${ability} beyond its normal limits. ${def} absorbs the hit with a grunt of pain, internal organs rattled, the surrounding landscape cratered from the shockwave.`,
  (atk: string, def: string, ability: string, env: string) =>
    `${atk} feints low, drawing ${def}'s guard down, then erupts upward with ${ability}. The explosive force blows a chunk out of ${env}, and ${def} is launched skyward before crashing back down in a heap of twisted limbs and dust.`,
  (atk: string, def: string, ability: string, env: string) =>
    `${def} lands a glancing blow, but ${atk} absorbs it without flinching. The pain only sharpens ${atk}'s focus. ${ability} comes back in response — vicious, precise, and twice as hard — and ${def} staggers across ${env} with blood streaming from a fresh wound.`,
  (atk: string, def: string, ability: string, env: string) =>
    `${atk} doesn't let ${def} breathe. Circling through ${env}, ${atk} attacks from three directions in rapid succession before the real blow lands — ${ability} smashing through ${def}'s defenses and folding them around the point of impact.`,
  (atk: string, def: string, ability: string, env: string) =>
    `The shockwave from ${atk}'s ${ability} flattens everything in a twenty-meter radius of ${env}. ${def} is at the epicenter, the blast tearing at their armor and flesh, leaving them sprawled in a shallow crater, chest heaving.`,
  (atk: string, def: string, ability: string, env: string) =>
    `${atk} catches ${def} mid-motion — the worst possible moment. ${ability} connects with catastrophic timing, the kinetic energy multiplied by ${def}'s own momentum. The collision is sickening. ${def} is thrown into the nearest structure in ${env}, which does not survive the impact.`,
  (atk: string, def: string, ability: string, env: string) =>
    `Blood is already running down ${def}'s face, but ${atk} shows no intention of slowing down. ${ability} hammers through what little defense ${def} has left, the force driving ${def} knee-deep into the ground of ${env}.`,
  (atk: string, def: string, ability: string, env: string) =>
    `${atk} grabs ${def} by whatever they can grip and drives them headfirst into the terrain of ${env}. Once. Twice. Then ${ability} fires at point-blank range, blasting ${def} across the battlefield in a streak of blood and debris.`,
  (atk: string, def: string, ability: string, env: string) =>
    `${def} thought they had a window — ${atk} lets them believe it just long enough. The moment ${def} commits, ${atk} pivots and unleashes ${ability} with brutal efficiency. ${def} hits the ground of ${env} hard enough to leave an imprint.`,
  (atk: string, def: string, ability: string, env: string) =>
    `The clash of their powers sends visible shockwaves tearing across ${env}. For a moment they're locked together, neither giving ground. Then ${atk}'s ${ability} finds the edge it needs, and ${def} is blown clear, skipping across the ruined landscape like a stone across water.`,
  (atk: string, def: string, ability: string, env: string) =>
    `${atk} snarls and launches ${ability} without restraint — no holding back, no measured calculation. The raw output is staggering. ${def} is engulfed in the resulting explosion and emerges from it battered, singed, and bleeding from a dozen new wounds.`,
  (atk: string, def: string, ability: string, env: string) =>
    `${def} pivots and deflects, barely managing to redirect ${atk}'s first blow. But ${atk} had already accounted for that — ${ability} was the real attack, and it catches ${def} flush in the exposed flank. The crack of impact echoes through ${env}.`,
  (atk: string, def: string, ability: string, env: string) =>
    `${atk} accelerates past ${def}'s guard at an angle no normal fighter could anticipate. ${ability} detonates from inside ${def}'s defenses — a sickening, close-range blast that sends ${def} pinwheeling through the wreckage of ${env}.`,
];

// Counter-attack templates
const counterTemplates = [
  (atk: string, def: string, ability: string, env: string) =>
    `${def} thought they had the advantage on ${env} — they were wrong. ${atk} was baiting them the entire time. ${ability} erupts from an unexpected angle, punching through ${def}'s guard and lifting them clean off the ground. They don't land cleanly.`,
  (atk: string, def: string, ability: string, env: string) =>
    `Bleeding, winded, pushed to the edge — ${atk} shows no sign of stopping. They dig deeper than ${def} thought possible and unleash ${ability} as a counter. The explosion of force tears a fresh scar across ${env} and sends ${def} tumbling.`,
  (atk: string, def: string, ability: string, env: string) =>
    `${def} moves in for what they think is the kill shot. ${atk} absorbs it, uses it, and channels the pain into ${ability} — a vicious, furious counter that staggers ${def} backward with a grunt of shock. The tables have turned on ${env}.`,
  (atk: string, def: string, ability: string, env: string) =>
    `${atk} lets ${def} get close. Close enough to smell the arrogance. Then ${ability} detonates at zero distance, the shockwave shredding the terrain of ${env} and leaving ${def} crumpled against whatever the blast drove them into.`,
];

// Final-round climax templates
const closingTemplates = [
  (atk: string, def: string, ability: string, env: string) =>
    `${def} is done. Anyone watching can see it. But ${atk} refuses to accept anything short of total destruction — ${ability} surges to its absolute peak and crashes into ${def} with apocalyptic force. The ground of ${env} ruptures for fifty meters in every direction. ${def} does not get up.`,
  (atk: string, def: string, ability: string, env: string) =>
    `${atk}'s body is broken. Their armor is shredded. Their blood soaks the surface of ${env}. It doesn't matter. One last time, they pull everything into ${ability} — a final, burning act of will — and drive it through ${def} until there is nothing left to fight.`,
  (atk: string, def: string, ability: string, env: string) =>
    `${def} drops to one knee in the ruins of ${env}. ${atk} stands over them, battered but unbroken, and delivers the ending blow — ${ability} unleashed at full power, point blank, without mercy. The shockwave flattens everything within a hundred meters.`,
  (atk: string, def: string, ability: string, env: string) =>
    `Everything comes down to this moment on ${env}. ${atk} summons something beyond power, beyond technique — pure, desperate will — and ${ability} answers the call. The resulting impact is cataclysmic. ${def} is driven into the earth. The battle is over.`,
  (atk: string, def: string, ability: string, env: string) =>
    `${atk} sees the opening and commits without hesitation. ${ability} screams forward with everything ${atk} has left, crossing the ruined terrain of ${env} in a fraction of a second. The impact is total. ${def} crumbles. Silence falls.`,
  (atk: string, def: string, ability: string, env: string) =>
    `Both fighters are bleeding, both are barely standing. Then ${atk} reaches for something deeper — ${ability} ignites beyond its normal ceiling, a final surge that shouldn't be survivable at this range. On ${env}, the resulting explosion is visible for miles. ${def} goes down and stays down.`,
];

// Special ability attack descriptions — stat-weighted flavor
function buildAbilityNarrative(attacker: Character): string {
  // Pull phrases from the special ability text to make it feel personal
  const ability = attacker.specialAbility ?? "";
  const words = ability.split(/[,;]/)[0]?.trim() ?? attacker.name + "'s power";

  const highStat = Math.max(attacker.strength, attacker.speed, attacker.intelligence, attacker.durability);
  const dominantStat =
    highStat === attacker.strength
      ? "strength"
      : highStat === attacker.speed
        ? "speed"
        : highStat === attacker.intelligence
          ? "intellect"
          : "durability";

  const strengthPhrases = [
    `a crushing physical onslaught powered by ${words}`,
    `raw, unstoppable force channeled through ${words}`,
    `a devastating power strike fueled by ${words}`,
    `a titanic display of ${words}`,
  ];
  const speedPhrases = [
    `a blindingly fast assault leveraging ${words}`,
    `${words} deployed at speeds that defy comprehension`,
    `a blurred series of strikes using ${words}`,
    `${words} moving faster than the eye can follow`,
  ];
  const intellPhrases = [
    `a precisely calculated attack using ${words}`,
    `${words} deployed with surgical tactical precision`,
    `a masterfully timed application of ${words}`,
    `${words} exploiting an exact structural weakness`,
  ];
  const durPhrases = [
    `an unstoppable momentum-driven strike backed by ${words}`,
    `${words} sustained through inhuman endurance`,
    `${words} powering through every attempt at defense`,
    `an attrition-breaking surge of ${words}`,
  ];

  const pool =
    dominantStat === "strength"
      ? strengthPhrases
      : dominantStat === "speed"
        ? speedPhrases
        : dominantStat === "intellect"
          ? intellPhrases
          : durPhrases;

  return pickRandom(pool);
}

// ─── Narrative Selector ───────────────────────────────────────────────────────

function pickNarrative(
  round: number,
  maxRounds: number,
  attacker: Character,
  defender: Character,
  arena: (typeof arenas)[0],
): string {
  const atkName = attacker.name;
  const defName = defender.name;
  const ability = buildAbilityNarrative(attacker);
  const envName = arena.name;
  const envFlavor = pickRandom(arena.flavor);

  const progress = round / maxRounds;
  let template: (atk: string, def: string, ability: string, env: string) => string;

  if (round === 1) {
    template = pickRandom(openingTemplates);
  } else if (progress >= 0.8) {
    template = pickRandom(closingTemplates);
  } else if (round % 4 === 0) {
    template = pickRandom(counterTemplates);
  } else {
    template = pickRandom(midTemplates);
  }

  const base = template(atkName, defName, ability, envName);

  // Append environmental flavor to every other round for immersion
  if (round % 2 === 0) {
    return `${base} ${envFlavor}`;
  }
  return base;
}

// ─── Core Simulation ──────────────────────────────────────────────────────────

function teamPower(team: Character[]): number {
  return team.reduce((sum, c) => sum + c.strength + c.speed + c.intelligence + c.durability, 0);
}

export function simulateFight(team1: Character[], team2: Character[]): FightResult {
  const base1 = teamPower(team1);
  const base2 = teamPower(team2);

  let hp1 = 100;
  let hp2 = 100;
  const rounds: FightRound[] = [];

  // Longer fights: 12–22 rounds
  const maxRounds = 12 + Math.floor(Math.random() * 11);

  // Pick one arena for the whole fight
  const arena = pickRandom(arenas);

  for (let i = 1; i <= maxRounds; i++) {
    if (hp1 <= 0 || hp2 <= 0) break;

    const team1Advantage = base1 / (base1 + base2);
    // Slight randomness on who attacks each round
    const team1Attacks = Math.random() < 0.5 + (team1Advantage - 0.5) * 0.3;

    let attacker: Character;
    let defender: Character;
    let damage: number;
    let attackingTeam: 1 | 2;

    if (team1Attacks) {
      attacker = pickRandom(team1);
      defender = pickRandom(team2);
      attackingTeam = 1;
      const roll = Math.random();
      // Damage scales with advantage, speed, and strength
      const statBonus = (attacker.strength + attacker.speed) / 200;
      const effectiveness = team1Advantage * 0.5 + roll * 0.3 + statBonus * 0.2;
      damage = Math.round(effectiveness * 18 + 4);
      hp2 = Math.max(0, hp2 - damage);
    } else {
      attacker = pickRandom(team2);
      defender = pickRandom(team1);
      attackingTeam = 2;
      const roll = Math.random();
      const statBonus = (attacker.strength + attacker.speed) / 200;
      const effectiveness = (1 - team1Advantage) * 0.5 + roll * 0.3 + statBonus * 0.2;
      damage = Math.round(effectiveness * 18 + 4);
      hp1 = Math.max(0, hp1 - damage);
    }

    const narrative = pickNarrative(i, maxRounds, attacker, defender, arena);

    rounds.push({
      round: i,
      attacker: attacker.name,
      defender: defender.name,
      attackType: buildAbilityNarrative(attacker).split(" ")[0] ?? "strike",
      narrative,
      team1Hp: Math.round(hp1),
      team2Hp: Math.round(hp2),
    });
  }

  const winner = hp1 >= hp2 ? 1 : 2;
  const winTeam = winner === 1 ? team1 : team2;
  const loseTeam = winner === 1 ? team2 : team1;
  const winnerNames = winTeam.map((c) => c.name).join(" and ");
  const loserNames = loseTeam.map((c) => c.name).join(" and ");

  const summaries = [
    `After ${rounds.length} brutal rounds on ${arena.name}, ${winnerNames} stand victorious over the broken form of ${loserNames}. The landscape will bear the scars of this fight for years.`,
    `${winnerNames} have done the impossible — ${rounds.length} rounds of savage combat on ${arena.name}, and they are still standing while ${loserNames} are not. A brutal, defining victory.`,
    `The battle on ${arena.name} lasted ${rounds.length} grueling rounds. When the dust settles, only ${winnerNames} remain on their feet. ${loserNames} gave everything — it simply wasn't enough.`,
    `${rounds.length} rounds. One winner. ${winnerNames} outlasted, outfought, and outpowered ${loserNames} on ${arena.name}. The environment itself was reshaped by the violence of their clash.`,
    `It took ${rounds.length} savage exchanges on ${arena.name} to decide it. ${winnerNames} emerge as the last standing — battered, bleeding, but victorious. ${loserNames} will not soon recover.`,
  ];

  return { winner, rounds, summary: pickRandom(summaries) };
}
