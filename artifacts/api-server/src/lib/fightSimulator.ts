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

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

// ─── 20 Arenas ────────────────────────────────────────────────────────────────

const arenas = [
  {
    name: "a crumbling mountain summit",
    flavor: [
      "Boulders the size of buses tumble into the void below.",
      "The ridge cracks and shifts — footing is becoming impossible.",
      "Lightning hammers the peak, drawn by the raw energy of the fight.",
      "The summit is disintegrating round by round.",
    ],
  },
  {
    name: "a sinking aircraft carrier in the North Atlantic",
    flavor: [
      "The deck tilts another ten degrees as seawater floods the lower decks.",
      "Fighter jets slide off the tilting runway and plunge into the grey sea.",
      "Freezing ocean spray lashes across the battlefield.",
      "The ship groans metallically — she won't stay afloat much longer.",
    ],
  },
  {
    name: "an active volcano crater",
    flavor: [
      "Magma geysers erupt between the fighters without warning.",
      "The crater rim crumbles into the churning lava below.",
      "Superheated air distorts every visual — nothing is where it appears.",
      "The entire volcano shudders as if enraged by the fight above it.",
    ],
  },
  {
    name: "a Walmart parking lot at 3am",
    flavor: [
      "A shopping cart rolls gently into the fray and explodes on contact with a stray energy blast.",
      "Someone is still sitting in their idling pickup truck, watching and eating a gas station hotdog.",
      "The fluorescent parking lot lights flicker and explode one by one.",
      "A seagull inexplicably dive-bombs the battlefield.",
    ],
  },
  {
    name: "a medieval castle under siege",
    flavor: [
      "Flaming catapult boulders arc overhead and crash into the battlements.",
      "The drawbridge collapses into the moat under the weight of the violence.",
      "Peasants flee screaming through the courtyard below.",
      "The portcullis tears free from its housing and smashes into the fight.",
    ],
  },
  {
    name: "a rapidly flooding subway tunnel",
    flavor: [
      "Brown water surges to knee-depth and rising fast.",
      "A runaway subway train roars through the tunnel with zero warning.",
      "Electrical conduits short-circuit and arc wildly across the flooded floor.",
      "The tunnel ceiling fractures and chunks of concrete rain down.",
    ],
  },
  {
    name: "a children's birthday party venue — now completely destroyed",
    flavor: [
      "A confetti cannon fires at maximum pressure, briefly blinding both sides.",
      "The inflatable bouncy castle has somehow survived the worst of it and is still bouncing.",
      "A seven-tier birthday cake takes a direct hit and coats the arena in frosting.",
      "The animatronic birthday bear continues singing in the corner, undeterred by the carnage.",
    ],
  },
  {
    name: "a glass-floored skyscraper observation deck, 110 floors up",
    flavor: [
      "Cracks spider-web across the glass floor — one wrong step and it's a half-mile drop.",
      "The windows blow out, creating a howling wind tunnel at altitude.",
      "A chunk of the floor gives way and falls silently into the city far below.",
      "The entire building sways in the wind like a reed, amplifying every impact.",
    ],
  },
  {
    name: "an overgrown jungle temple during a monsoon",
    flavor: [
      "The rain is so thick it's nearly impossible to see more than three meters.",
      "Ancient stone steps collapse under the force of the fighting.",
      "A massive stone idol topples and crashes through two walls.",
      "Vines and roots seem to reach for the combatants, alive with the storm's electricity.",
    ],
  },
  {
    name: "the frozen surface of Europa",
    flavor: [
      "The ice sheet splinters under their feet, revealing dark ocean below.",
      "In the near-zero gravity, shockwaves carry for miles.",
      "Jupiter looms vast and silent overhead.",
      "Something enormous moves beneath the ice. Something that is definitely not human.",
    ],
  },
  {
    name: "a decommissioned nuclear power plant",
    flavor: [
      "Warning alarms echo through every corridor — they've been going off for days.",
      "Coolant steam vents without warning from cracked pipes.",
      "Radiation meters in the fight zone are simply reading ERROR.",
      "A reactor vessel groans and then cracks — everyone has new problems.",
    ],
  },
  {
    name: "a 500-acre pumpkin farm that is aggressively on fire",
    flavor: [
      "Thousands of burning pumpkins roll across the field in every direction.",
      "A scarecrow catches fire and runs — nobody can explain this.",
      "The farmhouse explodes as the fire reaches a propane tank.",
      "A tractor, apparently self-driving, charges through the battlefield with no clear agenda.",
    ],
  },
  {
    name: "the International Space Station (interior, zero gravity)",
    flavor: [
      "In zero-G, blood and debris float in eerie slow motion.",
      "A hull breach tears part of the station open to the vacuum of space.",
      "Untethered equipment — laptops, food pouches, fire extinguishers — orbits the fight.",
      "Mission Control is screaming into their headsets. Nobody is listening.",
    ],
  },
  {
    name: "a packed NFL stadium, mid-game",
    flavor: [
      "Eighty thousand people are simultaneously fleeing and filming on their phones.",
      "The jumbotron shows the fight in real time before taking a direct hit and going dark.",
      "A hot dog vendor continues to vend, clearly in shock.",
      "One end zone has already been destroyed. The other end zone is on fire.",
    ],
  },
  {
    name: "a Viking longship in a raging storm",
    flavor: [
      "The longship crests a forty-foot wave and goes briefly airborne.",
      "Lightning splits the mast. Half the sail is gone.",
      "Ice floes collide with the hull, threatening to tear it apart.",
      "A rogue wave sweeps the deck, taking everything not nailed down into the ocean.",
    ],
  },
  {
    name: "the surface of Mars during a planet-wide dust storm",
    flavor: [
      "Visibility drops to zero — both sides are fighting blind and by instinct.",
      "The Martian dust is electrostatically charged, causing random sparks and discharges.",
      "A terraforming station collapses in the distance, slowly and completely.",
      "The storm strips paint, armor plating, and flesh with equal enthusiasm.",
    ],
  },
  {
    name: "a luxurious cruise ship casino — currently sinking",
    flavor: [
      "Poker chips and roulette balls cascade across the tilting floor.",
      "The slot machines are still paying out as the room floods from one end.",
      "A grand piano slides slowly but inevitably toward the fight.",
      "The chandelier sways violently, raining crystal on everyone below.",
    ],
  },
  {
    name: "a bottomless ancient colosseum with no exits",
    flavor: [
      "The crowd of carved stone faces watches without expression.",
      "Sand soaks dark with blood as the floor absorbs everything.",
      "The walls are too high and too smooth to climb. There is no leaving.",
      "A hidden trap door opens in the floor. Something below it is breathing.",
    ],
  },
  {
    name: "a burning rainforest during an earthquake",
    flavor: [
      "The ground splits open in jagged fissures that glow orange from below.",
      "Ancient trees — some five hundred years old — snap like toothpicks.",
      "The earthquake and the fire are each trying to win the title of 'worst thing happening right now.'",
      "A river changes course, surging through the battlefield and sweeping debris in all directions.",
    ],
  },
  {
    name: "a transdimensional void where the laws of physics are more like suggestions",
    flavor: [
      "Gravity rotates ninety degrees without warning.",
      "A copy of the arena from ten seconds ago overlaps the current one — double the hazards.",
      "Sound travels backwards here. Screams arrive before the blows that caused them.",
      "The concept of 'floor' stops being applicable for about four seconds.",
    ],
  },
];

// ─── Chaos Events ─────────────────────────────────────────────────────────────

interface ChaosEvent {
  name: string;
  narrative: (victim: string, beneficiary: string, arena: string) => string;
  hpSwing: number; // positive = hurts leading team, negative = hurts trailing team
  targetStrong: boolean; // true = prefers to target the stronger/winning team
}

const chaosEvents: ChaosEvent[] = [
  {
    name: "lightning strike",
    narrative: (v, b, arena) =>
      `CHAOS — A bolt of lightning from the storm above ${arena} hammers ${v} directly with approximately 300 million volts. ${b} did not cause this. Nature simply chose a side. ${v} is left twitching and smoking while ${b} cannot believe their luck.`,
    hpSwing: 22,
    targetStrong: true,
  },
  {
    name: "a goat",
    narrative: (v, b, arena) =>
      `CHAOS — A goat appears on ${arena}. Nobody knows where it came from. It headbutts ${v} squarely in the back of the knees with laser-targeted precision, dropping them at a critical moment. The goat trots off with the confident energy of someone who had a very specific task to complete.`,
    hpSwing: 14,
    targetStrong: false,
  },
  {
    name: "ancient curse",
    narrative: (v, b, arena) =>
      `CHAOS — Something in ${arena} is cursed. It was always cursed. ${v} triggers it by stepping on exactly the wrong tile. For three agonizing seconds, they experience every bad decision they've ever made simultaneously. ${b} watches with wide eyes and steps carefully around the cursed tile.`,
    hpSwing: 18,
    targetStrong: true,
  },
  {
    name: "rogue satellite",
    narrative: (v, b, arena) =>
      `CHAOS — A decommissioned Soviet satellite re-enters the atmosphere and strikes ${arena} with pinpoint inaccuracy that still somehow hits ${v} directly. The collision is not survivable by most metrics. ${b} picks debris out of their hair and quietly thanks the cosmos.`,
    hpSwing: 26,
    targetStrong: true,
  },
  {
    name: "uninvited spectator",
    narrative: (v, b, arena) =>
      `CHAOS — An elderly man in a fishing hat walks directly into the fight on ${arena}, seemingly lost. ${v} pulls their finishing blow at the last second to avoid hitting him. This hesitation costs them dearly. The old man disappears into a hedge. Nobody finds the hedge later.`,
    hpSwing: 12,
    targetStrong: true,
  },
  {
    name: "gravity inversion",
    narrative: (v, b, arena) =>
      `CHAOS — Gravity briefly inverts on ${arena}. ${b} — by luck, instinct, or sheer absurdity — had already left the ground at the moment of inversion. ${v}, however, was firmly planted and gets launched ceiling-first into whatever ceiling exists with full gravitational force.`,
    hpSwing: 20,
    targetStrong: true,
  },
  {
    name: "dimensional rift",
    narrative: (v, b, arena) =>
      `CHAOS — A dimensional rift tears open inches from ${v}'s face on ${arena}. A different, angrier version of ${v} from a parallel timeline reaches through and delivers a single devastating punch before the rift closes. The regular ${v} has now been beaten up by themselves and has a lot of questions.`,
    hpSwing: 24,
    targetStrong: true,
  },
  {
    name: "swarm of bees",
    narrative: (v, b, arena) =>
      `CHAOS — Sixty thousand bees arrive at ${arena} simultaneously and select ${v} with the unified democratic conviction of a hive that has decided. The bees have no agenda beyond justice. ${b} is not stung once. ${v} cannot stop running in circles for a full fifteen seconds.`,
    hpSwing: 16,
    targetStrong: false,
  },
  {
    name: "betrayal by the arena itself",
    narrative: (v, b, arena) =>
      `CHAOS — ${arena} seems to actively choose a side. The ground shifts, a wall falls, a trap opens — all targeting ${v} with an intentionality that suggests the environment itself has opinions about this fight. ${b} makes a mental note to fight here again sometime.`,
    hpSwing: 18,
    targetStrong: true,
  },
  {
    name: "inspirational music",
    narrative: (v, b, arena) =>
      `CHAOS — Someone on ${arena}'s perimeter starts playing eye-of-the-tiger on a portable speaker directly at ${b}. The effect is medically inexplicable but impossible to deny — ${b} attacks with sudden, renewed fury while ${v} struggles to focus against the tonal assault.`,
    hpSwing: 14,
    targetStrong: true,
  },
  {
    name: "spontaneous sinkholes",
    narrative: (v, b, arena) =>
      `CHAOS — The ground beneath ${v}'s feet on ${arena} gives way — a sinkhole opens with zero warning and swallows ${v} to the waist. They spend two rounds extracting themselves, during which ${b} respectfully (and then disrespectfully) continues fighting.`,
    hpSwing: 20,
    targetStrong: false,
  },
  {
    name: "rogue energy discharge",
    narrative: (v, b, arena) =>
      `CHAOS — The sheer density of power being thrown around ${arena} reaches a critical threshold. A feedback loop of discharged energy spontaneously forms and detonates directly above ${v}. This is technically ${v}'s fault for being too powerful in an enclosed space.`,
    hpSwing: 28,
    targetStrong: true,
  },
  {
    name: "intervention from a talking animal",
    narrative: (v, b, arena) =>
      `CHAOS — A crow lands on a piece of debris on ${arena}, looks directly at ${v}, and says — clearly, in the local language — "Not today." It then divebombs ${v}'s face with surgical precision. The crow has not explained itself and cannot be found for comment. ${b} will remember this crow forever.`,
    hpSwing: 15,
    targetStrong: false,
  },
  {
    name: "time hiccup",
    narrative: (v, b, arena) =>
      `CHAOS — Time stutters on ${arena}. ${v} gets stuck in a 0.8-second loop and throws the same punch at empty air four times in rapid succession while ${b} — who is outside the loop — has an entire uninterrupted window of opportunity and uses all of it.`,
    hpSwing: 22,
    targetStrong: true,
  },
  {
    name: "catastrophic structural failure",
    narrative: (v, b, arena) =>
      `CHAOS — A load-bearing element of ${arena} finally gives up. The section ${v} is standing on drops six meters before catching on a lower ledge. ${v} survives but is briefly occupied with not falling to their death, which costs them the momentum of the round.`,
    hpSwing: 18,
    targetStrong: false,
  },
  {
    name: "the fight goes viral",
    narrative: (v, b, arena) =>
      `CHAOS — The fight is being livestreamed and ${v} has just recognized their face on a phone screen. The comments are not kind. The awareness of being judged publicly causes a critical hesitation in ${v}'s movements that ${b} exploits immediately and without mercy or sympathy.`,
    hpSwing: 13,
    targetStrong: true,
  },
  {
    name: "weather event",
    narrative: (v, b, arena) =>
      `CHAOS — The weather on ${arena} changes instantaneously from whatever it was to something ${v} is specifically vulnerable to. This is either cosmic irony or targeted atmospheric weaponization — either way, ${v} is dealing with hail, UV radiation, or extreme humidity at exactly the wrong time.`,
    hpSwing: 19,
    targetStrong: true,
  },
  {
    name: "a second goat",
    narrative: (v, b, arena) =>
      `CHAOS — The first goat returns. It has brought a friend. They operate as a unit. ${v} is headbutted from two different angles in rapid succession on ${arena}. The goats share a meaningful look, then disperse. The fight continues.`,
    hpSwing: 17,
    targetStrong: false,
  },
  {
    name: "power nullification field",
    narrative: (v, b, arena) =>
      `CHAOS — A localized power nullification field activates on ${arena} — source unknown. For exactly one round, ${v}'s signature abilities simply don't work. All that training, all those powers — temporarily offline. ${b} has never had a better window. They use it.`,
    hpSwing: 30,
    targetStrong: true,
  },
  {
    name: "the floor is actually lava",
    narrative: (v, b, arena) =>
      `CHAOS — Part of the floor on ${arena} is, at this moment, literally lava. This is not a game. ${v} has just stepped in it. The good news is they're still in the fight. The bad news is everything else about this situation.`,
    hpSwing: 16,
    targetStrong: false,
  },
];

// ─── Betrayal Events ──────────────────────────────────────────────────────────

interface BetrayalEvent {
  narrative: (traitor: string, victim: string, justification: string) => string;
  hpSwing: number; // damage dealt to the traitor's own team
}

const betrayalTemplates: BetrayalEvent[] = [
  {
    narrative: (traitor, victim, why) =>
      `BETRAYAL — ${traitor} stops mid-fight, turns, and attacks ${victim} on their own team. ${why} The blow lands clean. Allies and enemies alike stare in disbelief.`,
    hpSwing: 20,
  },
  {
    narrative: (traitor, victim, why) =>
      `BETRAYAL — Without warning, ${traitor} redirects a full-power attack toward ${victim} — their own teammate. ${why} The damage is severe and the alliance may not recover.`,
    hpSwing: 22,
  },
  {
    narrative: (traitor, victim, why) =>
      `BETRAYAL — ${traitor} has been calculating this for several rounds. The moment comes and ${traitor} drives a devastating blow into ${victim}'s exposed flank. ${why} The crowd doesn't know whether to gasp or applaud.`,
    hpSwing: 18,
  },
  {
    narrative: (traitor, victim, why) =>
      `BETRAYAL — ${traitor} pauses, meets ${victim}'s eyes, and says something too quiet to hear — then hits them harder than anyone has hit anything all fight. ${why} Nobody on either side moves for a full second.`,
    hpSwing: 24,
  },
];

const betrayalJustifications = [
  (traitor: string) =>
    `${traitor} has decided that winning with this team is worth less than what they'd gain by switching sides.`,
  (traitor: string) =>
    `${traitor} was never fully committed to this alliance — only to their own survival.`,
  (traitor: string) =>
    `${traitor} sensed an opportunity and has the moral flexibility to take it.`,
  (traitor: string) =>
    `${traitor} privately calculated that the enemy team is more likely to win and adjusted accordingly.`,
  (traitor: string) =>
    `${traitor} was paid — in some currency, metaphysical or otherwise — to do exactly this.`,
  (traitor: string) =>
    `${traitor} doesn't work well with others. This was always going to happen eventually.`,
  (traitor: string) =>
    `${traitor} received a psychic vision. The vision said: hit ${traitor === "them" ? "your allies" : "them"}. ${traitor} trusts the vision.`,
  (traitor: string) =>
    `${traitor} has a deeply complicated history with their teammate that just became relevant.`,
  (traitor: string) =>
    `${traitor} saw their teammate hesitate two rounds ago and has never trusted them since.`,
  (traitor: string) =>
    `The chaos of this arena has cracked something fundamental in ${traitor}'s decision-making.`,
];

// ─── Combat Narratives ────────────────────────────────────────────────────────

const openingTemplates = [
  (atk: string, def: string, ability: string, env: string) =>
    `${atk} doesn't wait. The moment both sides set foot on ${env}, ${ability} tears the air apart. ${def} takes the full hit and is thrown backward, leaving a trench in whatever passes for ground here.`,
  (atk: string, def: string, ability: string, env: string) =>
    `The ground of ${env} hasn't stopped shaking before ${atk} is already airborne. ${ability} closes the distance in a heartbeat and the impact is catastrophic — ${def} is sent skidding with blood already running.`,
  (atk: string, def: string, ability: string, env: string) =>
    `${atk} reads ${env}, reads ${def}, and moves. ${ability} explodes outward with staggering precision. The crack of impact carries for miles. ${def} hits the environment hard and doesn't bounce.`,
  (atk: string, def: string, ability: string, env: string) =>
    `Before ${def} can orient themselves on ${env}, ${atk} is already inside their guard. ${ability} detonates at close range — the shockwave flattens the surrounding terrain and ${def} is at its epicenter.`,
];

const midTemplates = [
  (atk: string, def: string, ability: string, env: string) =>
    `${atk} drives ${def} backward across ${env}, each blow heavier than the last. ${ability} finally shatters ${def}'s guard entirely — ${def} goes down hard, gasping, blood running freely across the terrain.`,
  (atk: string, def: string, ability: string, env: string) =>
    `${def} hesitates for half a second. That's all ${atk} needs. ${ability} detonates through the gap with clinical brutality, snapping ${def}'s head back and sending them cartwheeling across ${env}.`,
  (atk: string, def: string, ability: string, env: string) =>
    `${atk} uses ${env} itself as a weapon — using the terrain, the wreckage, the momentum — and amplifies ${ability} into something that shouldn't be possible. ${def} is caught in the full force of it. The surrounding landscape craters.`,
  (atk: string, def: string, ability: string, env: string) =>
    `${atk} feints twice, then commits. ${ability} comes from an angle ${def} had ruled out as impossible. The explosion of force blows a fresh scar into ${env}, and ${def} hits the ground hard enough to leave an outline.`,
  (atk: string, def: string, ability: string, env: string) =>
    `${def} lands something — barely. ${atk} takes it, uses the pain, and answers with ${ability}. The counter is vicious and precise and ${def} staggers across ${env} with a fresh wound that wasn't there five seconds ago.`,
  (atk: string, def: string, ability: string, env: string) =>
    `${atk} doesn't let ${def} breathe. Moving through ${env} like it was built for this, ${atk} attacks from three vectors before landing the real blow — ${ability} folding ${def} around the point of impact.`,
  (atk: string, def: string, ability: string, env: string) =>
    `The shockwave from ${atk}'s ${ability} flattens a twenty-meter radius of ${env}. ${def} is at the center of it, emerging from the blast battered, singed, and bleeding from wounds that weren't there before.`,
  (atk: string, def: string, ability: string, env: string) =>
    `${atk} catches ${def} mid-motion — worst possible moment. ${ability} connects and multiplies by ${def}'s own momentum. The collision is sickening. ${def} is driven into the nearest solid thing in ${env}, which does not survive it.`,
  (atk: string, def: string, ability: string, env: string) =>
    `Blood is already dripping from ${def}'s chin, but ${atk} shows zero interest in slowing down. ${ability} hammers through ${def}'s remaining defense and drives them knee-deep into ${env}.`,
  (atk: string, def: string, ability: string, env: string) =>
    `${atk} grabs ${def} and drives them headfirst into whatever ${env} has to offer. Twice. Then ${ability} fires at point-blank range and sends ${def} tumbling across the battlefield trailing blood and debris.`,
  (atk: string, def: string, ability: string, env: string) =>
    `${def} commits to what they think is the kill shot. ${atk} absorbs it — barely — pivots, and unleashes ${ability} with every joule of remaining power. ${def} hits the ground of ${env} hard and stays there for a moment.`,
  (atk: string, def: string, ability: string, env: string) =>
    `The collision of their power levels sends visible shockwaves tearing across ${env}. For three seconds they're locked together, neither giving anything. Then ${ability} finds the edge and ${def} is blown clear, skipping across the ruined landscape.`,
];

const counterTemplates = [
  (atk: string, def: string, ability: string, env: string) =>
    `${def} thought they had ${atk} on ${env}. They were wrong the entire time. ${atk} was baiting them. ${ability} erupts from an unexpected angle, punching through ${def}'s guard, and ${def}'s landing is not clean.`,
  (atk: string, def: string, ability: string, env: string) =>
    `Bleeding, winded, against the wall — ${atk} digs deeper than anyone thought possible and detonates ${ability} as a counter. The explosion of force sears a new scar across ${env} and ${def} eats every bit of it.`,
  (atk: string, def: string, ability: string, env: string) =>
    `${def} moves in for the finish. ${atk} absorbs it, channels the pain, and ${ability} fires as a counter — furious, precise, and from a direction ${def} completely failed to account for. The tables on ${env} have turned.`,
  (atk: string, def: string, ability: string, env: string) =>
    `${atk} lets ${def} get close. Close enough to be certain. Then ${ability} detonates at zero distance, the shockwave shredding the surrounding terrain of ${env} and leaving ${def} crumpled against whatever the blast drove them into.`,
];

const closingTemplates = [
  (atk: string, def: string, ability: string, env: string) =>
    `${def} is finished — anyone watching can see it. ${atk} refuses to accept anything short of total. ${ability} surges to its absolute limit and crashes into ${def} with apocalyptic force. ${env} ruptures in a fifty-meter radius. ${def} does not get up.`,
  (atk: string, def: string, ability: string, env: string) =>
    `${atk}'s body is broken. Their armor is gone. Their blood soaks ${env}. None of it matters. One final time, they pull everything into ${ability} — a last, burning act of will — and drive it through ${def} until the fight is over.`,
  (atk: string, def: string, ability: string, env: string) =>
    `${def} drops to one knee in the ruins of ${env}. ${atk} stands over them and delivers the ending — ${ability} at full power, point-blank, without hesitation or mercy. The shockwave flattens everything within a hundred meters.`,
  (atk: string, def: string, ability: string, env: string) =>
    `Everything comes down to this single moment on ${env}. ${atk} summons something beyond power — pure, desperate, irrational will — and ${ability} answers the call. The impact is cataclysmic. ${def} is driven into the earth. It's over.`,
  (atk: string, def: string, ability: string, env: string) =>
    `Both fighters are still standing. Barely. Then ${atk} reaches deeper than ${def} thought possible — ${ability} ignites beyond its ceiling, a final surge that defies everything. The explosion on ${env} is visible for miles. ${def} goes down and stays there.`,
];

// ─── Ability Description ──────────────────────────────────────────────────────

function buildAbilityPhrase(attacker: Character): string {
  const ability = attacker.specialAbility ?? "";
  const firstClause = ability.split(/[,;]/)[0]?.trim() ?? `${attacker.name}'s power`;

  const high = Math.max(attacker.strength, attacker.speed, attacker.intelligence, attacker.durability);
  const dominant =
    high === attacker.strength ? "strength" :
    high === attacker.speed ? "speed" :
    high === attacker.intelligence ? "intelligence" : "durability";

  const byDominant: Record<string, string[]> = {
    strength: [
      `a crushing physical assault channeling ${firstClause}`,
      `raw unstoppable force through ${firstClause}`,
      `a titanic power strike fueled by ${firstClause}`,
      `${firstClause} converted into a devastating physical blow`,
    ],
    speed: [
      `a blindingly fast assault leveraging ${firstClause}`,
      `${firstClause} at speeds that leave afterimages`,
      `a blurred series of strikes using ${firstClause}`,
      `${firstClause} moving faster than perception can track`,
    ],
    intelligence: [
      `a precisely calculated attack exploiting ${firstClause}`,
      `${firstClause} deployed with surgical tactical timing`,
      `a masterfully timed application of ${firstClause}`,
      `${firstClause} targeting an exact structural weakness`,
    ],
    durability: [
      `unstoppable momentum backed by ${firstClause}`,
      `${firstClause} sustained through impossible endurance`,
      `${firstClause} powering through every attempted defense`,
      `an attrition-breaking surge of ${firstClause}`,
    ],
  };

  return pickRandom(byDominant[dominant] ?? byDominant.strength);
}

// ─── Narrative Selector ───────────────────────────────────────────────────────

function pickNarrative(
  round: number,
  maxRounds: number,
  attacker: Character,
  defender: Character,
  arenaName: string,
  arenaFlavors: string[],
): string {
  const ability = buildAbilityPhrase(attacker);
  const progress = round / maxRounds;

  let template: (a: string, d: string, ab: string, env: string) => string;
  if (round === 1) template = pickRandom(openingTemplates);
  else if (progress >= 0.8) template = pickRandom(closingTemplates);
  else if (round % 4 === 0) template = pickRandom(counterTemplates);
  else template = pickRandom(midTemplates);

  const base = template(attacker.name, defender.name, ability, arenaName);
  if (round % 2 === 0) return `${base} ${pickRandom(arenaFlavors)}`;
  return base;
}

// ─── Core Simulation ──────────────────────────────────────────────────────────

function teamPower(team: Character[]): number {
  return team.reduce((sum, c) => sum + c.strength + c.speed + c.intelligence + c.durability, 0);
}

export function simulateFight(team1: Character[], team2: Character[]): FightResult {
  const base1 = teamPower(team1);
  const base2 = teamPower(team2);

  // Power gap: 0 = equal, 1 = team1 completely dominant, -1 = team2 completely dominant
  const totalPower = base1 + base2;
  const powerGap = (base1 - base2) / totalPower; // range roughly -0.5 to +0.5

  let hp1 = 100;
  let hp2 = 100;
  const rounds: FightRound[] = [];

  const maxRounds = 14 + Math.floor(Math.random() * 9); // 14–22 rounds
  const arena = pickRandom(arenas);

  // Chaos frequency: more chaos = more level playing field
  const chaosFrequency = 0.22 + Math.abs(powerGap) * 0.5; // 22-47% per round
  // Betrayal: chance per round that a character attacks their own team
  const betrayalChance = 0.06; // 6% per round

  for (let i = 1; i <= maxRounds; i++) {
    if (hp1 <= 0 || hp2 <= 0) break;

    // ── Chaos event check ─────────────────────────────────────────────────────
    if (Math.random() < chaosFrequency) {
      const event = pickRandom(chaosEvents);
      // Decide which team eats the chaos
      // If team1 is stronger and event.targetStrong, hit team1; otherwise mix it up
      let chaosHitsTeam1: boolean;
      if (event.targetStrong) {
        chaosHitsTeam1 = powerGap > 0 ? Math.random() < 0.72 : Math.random() < 0.28;
      } else {
        chaosHitsTeam1 = Math.random() < 0.5;
      }

      const victim = chaosHitsTeam1 ? pickRandom(team1).name : pickRandom(team2).name;
      const beneficiary = chaosHitsTeam1 ? pickRandom(team2).name : pickRandom(team1).name;
      const chaos = event.narrative(victim, beneficiary, arena.name);
      const swing = event.hpSwing + Math.floor(Math.random() * 8) - 4;

      if (chaosHitsTeam1) {
        hp1 = Math.max(1, hp1 - swing); // floor at 1 to keep fight alive
      } else {
        hp2 = Math.max(1, hp2 - swing);
      }

      rounds.push({
        round: i,
        attacker: beneficiary,
        defender: victim,
        attackType: `chaos: ${event.name}`,
        narrative: chaos,
        team1Hp: Math.round(hp1),
        team2Hp: Math.round(hp2),
      });
      continue;
    }

    // ── Betrayal check ────────────────────────────────────────────────────────
    // Betrayal only possible if team has 2+ members
    const canBetray1 = team1.length >= 2;
    const canBetray2 = team2.length >= 2;
    if ((canBetray1 || canBetray2) && Math.random() < betrayalChance) {
      const betrayTeam1 = canBetray1 && (!canBetray2 || Math.random() < 0.5);
      const team = betrayTeam1 ? team1 : team2;
      const shuffled = [...team].sort(() => Math.random() - 0.5);
      const traitor = shuffled[0];
      const victim = shuffled[1];
      const template = pickRandom(betrayalTemplates);
      const justification = pickRandom(betrayalJustifications)(traitor.name);
      const narrative = template.narrative(traitor.name, victim.name, justification);
      const damage = template.hpSwing + Math.floor(Math.random() * 8) - 4;

      if (betrayTeam1) {
        hp1 = Math.max(1, hp1 - damage);
      } else {
        hp2 = Math.max(1, hp2 - damage);
      }

      rounds.push({
        round: i,
        attacker: traitor.name,
        defender: victim.name,
        attackType: "betrayal",
        narrative,
        team1Hp: Math.round(hp1),
        team2Hp: Math.round(hp2),
      });
      continue;
    }

    // ── Normal combat ─────────────────────────────────────────────────────────
    // Base attack probability weighted by power, but chaos has been leveling the field via HP
    const currentAdvantage = hp1 / (hp1 + hp2); // shifts as chaos hits
    const team1Attacks = Math.random() < 0.5 + (currentAdvantage - 0.5) * 0.25;

    let attacker: Character;
    let defender: Character;
    let damage: number;

    if (team1Attacks) {
      attacker = pickRandom(team1);
      defender = pickRandom(team2);
      const statBonus = (attacker.strength + attacker.speed) / 200;
      const effectiveness = (base1 / totalPower) * 0.45 + Math.random() * 0.35 + statBonus * 0.2;
      damage = Math.round(effectiveness * 16 + 3);
      hp2 = Math.max(0, hp2 - damage);
    } else {
      attacker = pickRandom(team2);
      defender = pickRandom(team1);
      const statBonus = (attacker.strength + attacker.speed) / 200;
      const effectiveness = (base2 / totalPower) * 0.45 + Math.random() * 0.35 + statBonus * 0.2;
      damage = Math.round(effectiveness * 16 + 3);
      hp1 = Math.max(0, hp1 - damage);
    }

    const narrative = pickNarrative(i, maxRounds, attacker, defender, arena.name, arena.flavor);

    rounds.push({
      round: i,
      attacker: attacker.name,
      defender: defender.name,
      attackType: buildAbilityPhrase(attacker).split(" ")[0] ?? "strike",
      narrative,
      team1Hp: Math.round(hp1),
      team2Hp: Math.round(hp2),
    });
  }

  const winner = hp1 >= hp2 ? 1 : 2;
  const winTeam = winner === 1 ? team1 : team2;
  const loseTeam = winner === 1 ? team2 : team1;
  const winnerNames = winTeam.map((c) => c.name).join(" & ");
  const loserNames = loseTeam.map((c) => c.name).join(" & ");

  // Count chaos events and betrayals for summary flavour
  const chaosCount = rounds.filter((r) => r.attackType.startsWith("chaos:")).length;
  const betrayalCount = rounds.filter((r) => r.attackType === "betrayal").length;

  const summaryAddons = [];
  if (chaosCount > 0) summaryAddons.push(`the environment intervened ${chaosCount} time${chaosCount > 1 ? "s" : ""}`);
  if (betrayalCount > 0) summaryAddons.push(`${betrayalCount} act${betrayalCount > 1 ? "s" : ""} of betrayal changed the course of the fight`);

  const extraClause = summaryAddons.length > 0 ? ` Along the way, ${summaryAddons.join(" and ")}.` : "";

  const summaries = [
    `After ${rounds.length} rounds of mayhem on ${arena.name}, ${winnerNames} stand victorious over the wreckage that was ${loserNames}.${extraClause}`,
    `${winnerNames} survive ${rounds.length} savage rounds on ${arena.name} and emerge as the last ones standing. ${loserNames} gave everything — it simply wasn't enough.${extraClause}`,
    `${rounds.length} rounds on ${arena.name}. One winner. ${winnerNames} outlasted, outfought, and outlucked ${loserNames}.${extraClause} The arena will never fully recover.`,
    `When the dust settles on ${arena.name} after ${rounds.length} brutal rounds, ${winnerNames} remain standing while ${loserNames} do not.${extraClause} Whether this counts as a fair fight is a matter of opinion.`,
    `${winnerNames} — battered, bleeding, possibly betrayed — stand victorious after ${rounds.length} rounds on ${arena.name}.${extraClause} History will remember this as a spectacular mess.`,
  ];

  return { winner, rounds, summary: pickRandom(summaries) };
}
