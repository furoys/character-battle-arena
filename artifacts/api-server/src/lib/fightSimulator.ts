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

const attackTypes = [
  "physical strike",
  "energy blast",
  "special ability",
  "combo attack",
  "signature move",
  "counter-attack",
  "power surge",
  "tactical strike",
];

const victoryPhrases = [
  "overwhelms",
  "outmaneuvers",
  "defeats",
  "overpowers",
  "outlasts",
  "dominates",
  "crushes",
  "vanquishes",
];

const attackNarratives = [
  (atk: string, def: string, type: string) =>
    `${atk} unleashes a devastating ${type} against ${def}, who struggles to withstand the impact!`,
  (atk: string, def: string, type: string) =>
    `${atk} executes a precise ${type} — ${def} is caught off-guard and takes a heavy blow!`,
  (atk: string, def: string, type: string) =>
    `With incredible speed, ${atk} delivers a ${type} that sends ${def} reeling backward!`,
  (atk: string, def: string, type: string) =>
    `${atk} channels their power into a massive ${type}, and ${def} barely manages to stay standing!`,
  (atk: string, def: string, type: string) =>
    `The battlefield shakes as ${atk} strikes ${def} with a fearsome ${type}!`,
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function teamPower(team: Character[]): number {
  return team.reduce((sum, c) => {
    return sum + c.strength + c.speed + c.intelligence + c.durability;
  }, 0);
}

function applySpecialAbilityBonus(team: Character[]): number {
  return team.length * 5;
}

export function simulateFight(team1: Character[], team2: Character[]): FightResult {
  const base1 = teamPower(team1) + applySpecialAbilityBonus(team1);
  const base2 = teamPower(team2) + applySpecialAbilityBonus(team2);

  let hp1 = 100;
  let hp2 = 100;
  const rounds: FightRound[] = [];

  const maxRounds = 6 + Math.floor(Math.random() * 3);

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
    const narrativeFn = pickRandom(attackNarratives);
    const narrative = narrativeFn(attacker, defender, attackType);

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
  const winnerName = winTeam.map((c) => c.name).join(" and ");
  const loserName = loseTeam.map((c) => c.name).join(" and ");
  const phrase = pickRandom(victoryPhrases);

  const summary = `After ${rounds.length} intense rounds, Team ${winner} featuring ${winnerName} ${phrase} Team ${winner === 1 ? 2 : 1} (${loserName}). ${winnerName} stood victorious on the battlefield.`;

  return { winner, rounds, summary };
}
