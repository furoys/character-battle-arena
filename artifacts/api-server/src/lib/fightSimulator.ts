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

const attackTypes = [
  "physical strike",
  "energy blast",
  "special ability",
  "combo attack",
  "signature move",
  "counter-attack",
  "power surge",
  "tactical strike",
  "devastating blow",
  "ambush",
  "charged attack",
  "finishing move",
];

const openingNarratives = [
  (atk: string, def: string, type: string) =>
    `${atk} wastes no time, launching a thunderous ${type} straight at ${def}. The impact is felt across the entire arena.`,
  (atk: string, def: string, type: string) =>
    `Without warning, ${atk} closes the distance and delivers a bone-rattling ${type}. ${def} staggers, unprepared for such speed.`,
  (atk: string, def: string, type: string) =>
    `${atk} sizes up ${def} for only a moment before unleashing a brutal ${type}. The crowd goes silent.`,
  (atk: string, def: string, type: string) =>
    `The battle begins with ${atk} seizing the initiative — a swift ${type} catches ${def} completely off guard.`,
];

const midNarratives = [
  (atk: string, def: string, type: string) =>
    `${atk} reads the battlefield and sees an opening. A perfectly-timed ${type} connects, and ${def} is thrown back.`,
  (atk: string, def: string, type: string) =>
    `Sensing weakness, ${atk} presses the attack with a relentless ${type}. ${def} struggles to form a defense.`,
  (atk: string, def: string, type: string) =>
    `${atk} feints left, then delivers a punishing ${type} that ${def} never saw coming.`,
  (atk: string, def: string, type: string) =>
    `The momentum shifts as ${atk} channels everything into a powerful ${type}. ${def} takes the full force of the blow.`,
  (atk: string, def: string, type: string) =>
    `${def} attempts to recover, but ${atk} is already moving — a devastating ${type} connects before ${def} can react.`,
  (atk: string, def: string, type: string) =>
    `${atk} adjusts their strategy and goes on the offensive. The ${type} lands cleanly, leaving ${def} momentarily stunned.`,
  (atk: string, def: string, type: string) =>
    `Explosions of force echo through the arena as ${atk}'s ${type} meets ${def} head-on. Neither yields easily.`,
  (atk: string, def: string, type: string) =>
    `${atk} finds a crack in ${def}'s guard and drives through it with a precise ${type} that draws a gasp from the crowd.`,
  (atk: string, def: string, type: string) =>
    `It looks like ${def} has the upper hand — until ${atk} turns the tide with a surprise ${type} that shakes the ground.`,
  (atk: string, def: string, type: string) =>
    `${atk} draws on their full reserves of power and executes a textbook ${type}. ${def} is sent reeling.`,
  (atk: string, def: string, type: string) =>
    `The arena trembles as ${atk} launches a vicious ${type}. ${def} absorbs the hit but is clearly hurting.`,
  (atk: string, def: string, type: string) =>
    `${atk} narrows their eyes and commits everything to a single, decisive ${type}. ${def} can't dodge in time.`,
];

const counterNarratives = [
  (atk: string, def: string, type: string) =>
    `${def} thought they had ${atk} cornered — a critical mistake. ${atk} turns the tables with a vicious ${type} counter.`,
  (atk: string, def: string, type: string) =>
    `${atk} absorbs a hit and uses the momentum to fuel a retaliatory ${type}. ${def} is caught completely off-balance.`,
  (atk: string, def: string, type: string) =>
    `Just when it seemed like ${atk} was finished, they explode back with a ${type} that nobody expected.`,
];

const closingNarratives = [
  (atk: string, def: string, type: string) =>
    `${atk} summons the last of their power for one final ${type}. ${def} has nothing left to give.`,
  (atk: string, def: string, type: string) =>
    `The end is near. ${atk} delivers a conclusive ${type} — ${def} crumbles under the weight of it.`,
  (atk: string, def: string, type: string) =>
    `${atk} refuses to lose. A desperate, all-or-nothing ${type} crashes into ${def} and decides the fate of the battle.`,
  (atk: string, def: string, type: string) =>
    `With ${def} on the ropes, ${atk} presses their advantage and lands a match-ending ${type}.`,
];

const victoryPhrases = [
  "decisively defeats",
  "overwhelms",
  "outmaneuvers",
  "outlasts",
  "dominates",
  "vanquishes",
  "crushes",
  "proves superior to",
  "stands victorious over",
];

function teamPower(team: Character[]): number {
  return team.reduce((sum, c) => sum + c.strength + c.speed + c.intelligence + c.durability, 0);
}

function applySpecialAbilityBonus(team: Character[]): number {
  return team.length * 5;
}

function pickNarrative(round: number, maxRounds: number, atk: string, def: string, type: string): string {
  const progress = round / maxRounds;
  if (round === 1) return pickRandom(openingNarratives)(atk, def, type);
  if (progress >= 0.75) return pickRandom(closingNarratives)(atk, def, type);
  if (round % 3 === 0) return pickRandom(counterNarratives)(atk, def, type);
  return pickRandom(midNarratives)(atk, def, type);
}

export function simulateFight(team1: Character[], team2: Character[]): FightResult {
  const base1 = teamPower(team1) + applySpecialAbilityBonus(team1);
  const base2 = teamPower(team2) + applySpecialAbilityBonus(team2);

  let hp1 = 100;
  let hp2 = 100;
  const rounds: FightRound[] = [];

  const maxRounds = 6 + Math.floor(Math.random() * 4);

  for (let i = 1; i <= maxRounds; i++) {
    if (hp1 <= 0 || hp2 <= 0) break;

    const team1Advantage = base1 / (base1 + base2);
    const team1Attacks = Math.random() < 0.5;

    let attacker: string;
    let defender: string;
    let damage: number;

    if (team1Attacks) {
      attacker = pickRandom(team1).name;
      defender = pickRandom(team2).name;
      const roll = Math.random();
      const effectiveness = team1Advantage * 0.7 + roll * 0.3;
      damage = Math.round(effectiveness * 25 + 5);
      hp2 = Math.max(0, hp2 - damage);
    } else {
      attacker = pickRandom(team2).name;
      defender = pickRandom(team1).name;
      const roll = Math.random();
      const effectiveness = (1 - team1Advantage) * 0.7 + roll * 0.3;
      damage = Math.round(effectiveness * 25 + 5);
      hp1 = Math.max(0, hp1 - damage);
    }

    const attackType = pickRandom(attackTypes);
    const narrative = pickNarrative(i, maxRounds, attacker, defender, attackType);

    rounds.push({
      round: i,
      attacker,
      defender,
      attackType,
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
  const phrase = pickRandom(victoryPhrases);

  const summaries = [
    `After ${rounds.length} grueling rounds, ${winnerNames} ${phrase} ${loserNames}. The arena falls silent as the dust settles.`,
    `It took ${rounds.length} rounds of fierce combat, but ${winnerNames} ultimately ${phrase} ${loserNames}. A hard-fought victory.`,
    `${winnerNames} stood tall after ${rounds.length} rounds, having ${phrase} ${loserNames} through superior strategy and raw power.`,
    `In a battle that lasted ${rounds.length} rounds, ${winnerNames} ${phrase} ${loserNames}. Their legend grows.`,
  ];

  return { winner, rounds, summary: pickRandom(summaries) };
}
