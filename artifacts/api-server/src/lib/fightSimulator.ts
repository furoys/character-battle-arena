import type { Character } from "@workspace/db";
import { computeSynergy } from "./synergies";
import { applyFightModifiers } from "./fightModifiers";
import { openai } from "@workspace/integrations-openai-ai-server";

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
  arenaIntro?: string;
  intro?: string;
  whyWon?: string[];
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

// ─── 20 Arenas ────────────────────────────────────────────────────────────────
// `boost` = tags that get a damage edge fighting here (environment helps them).
// `nerf`  = tags that struggle here (environment works against them).

interface Arena {
  name: string;
  flavor: string[];
  boost?: string[];
  nerf?: string[];
}

const arenas: Arena[] = [
  {
    name: "a crumbling mountain summit",
    flavor: [
      "Boulders the size of buses tumble into the void below.",
      "The ridge cracks and shifts — footing is becoming impossible.",
      "Lightning hammers the peak, drawn by the raw energy of the fight.",
      "The summit is disintegrating round by round.",
    ],
    boost: ["lightning", "wind", "speedster"],
    nerf: ["giant", "tech"],
  },
  {
    name: "a sinking aircraft carrier in the North Atlantic",
    flavor: [
      "The deck tilts another ten degrees as seawater floods the lower decks.",
      "Fighter jets slide off the tilting runway and plunge into the grey sea.",
      "Freezing ocean spray lashes across the battlefield.",
      "The ship groans metallically — she won't stay afloat much longer.",
    ],
    boost: ["water", "ice", "lightning"],
    nerf: ["fire"],
  },
  {
    name: "an active volcano crater",
    flavor: [
      "Magma geysers erupt between the fighters without warning.",
      "The crater rim crumbles into the churning lava below.",
      "Superheated air distorts every visual — nothing is where it appears.",
      "The entire volcano shudders as if enraged by the fight above it.",
    ],
    boost: ["fire", "cosmic"],
    nerf: ["ice", "water", "tech"],
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
    boost: ["water", "lightning", "shadow"],
    nerf: ["fire", "wind"],
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
    boost: ["wind", "speedster", "magic"],
    nerf: ["giant", "tech"],
  },
  {
    name: "an overgrown jungle temple during a monsoon",
    flavor: [
      "The rain is so thick it's nearly impossible to see more than three meters.",
      "Ancient stone steps collapse under the force of the fighting.",
      "A massive stone idol topples and crashes through two walls.",
      "Vines and roots seem to reach for the combatants, alive with the storm's electricity.",
    ],
    boost: ["water", "magic", "shadow", "lightning"],
    nerf: ["fire", "tech"],
  },
  {
    name: "the frozen surface of Europa",
    flavor: [
      "The ice sheet splinters under their feet, revealing dark ocean below.",
      "In the near-zero gravity, shockwaves carry for miles.",
      "Jupiter looms vast and silent overhead.",
      "Something enormous moves beneath the ice. Something that is definitely not human.",
    ],
    boost: ["ice", "cosmic", "speedster"],
    nerf: ["fire"],
  },
  {
    name: "a decommissioned nuclear power plant",
    flavor: [
      "Warning alarms echo through every corridor — they've been going off for days.",
      "Coolant steam vents without warning from cracked pipes.",
      "Radiation meters in the fight zone are simply reading ERROR.",
      "A reactor vessel groans and then cracks — everyone has new problems.",
    ],
    boost: ["tech", "cosmic", "undead"],
    nerf: [],
  },
  {
    name: "a 500-acre pumpkin farm that is aggressively on fire",
    flavor: [
      "Thousands of burning pumpkins roll across the field in every direction.",
      "A scarecrow catches fire and runs — nobody can explain this.",
      "The farmhouse explodes as the fire reaches a propane tank.",
      "A tractor, apparently self-driving, charges through the battlefield with no clear agenda.",
    ],
    boost: ["fire", "shadow"],
    nerf: ["ice", "water"],
  },
  {
    name: "the International Space Station (interior, zero gravity)",
    flavor: [
      "In zero-G, blood and debris float in eerie slow motion.",
      "A hull breach tears part of the station open to the vacuum of space.",
      "Untethered equipment — laptops, food pouches, fire extinguishers — orbits the fight.",
      "Mission Control is screaming into their headsets. Nobody is listening.",
    ],
    boost: ["speedster", "psychic", "cosmic"],
    nerf: ["giant"],
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
    boost: ["water", "wind", "lightning"],
    nerf: ["fire", "tech"],
  },
  {
    name: "the surface of Mars during a planet-wide dust storm",
    flavor: [
      "Visibility drops to zero — both sides are fighting blind and by instinct.",
      "The Martian dust is electrostatically charged, causing random sparks and discharges.",
      "A terraforming station collapses in the distance, slowly and completely.",
      "The storm strips paint, armor plating, and flesh with equal enthusiasm.",
    ],
    boost: ["wind", "psychic", "stealth"],
    nerf: ["tech", "long-range"],
  },
  {
    name: "a luxurious cruise ship casino — currently sinking",
    flavor: [
      "Poker chips and roulette balls cascade across the tilting floor.",
      "The slot machines are still paying out as the room floods from one end.",
      "A grand piano slides slowly but inevitably toward the fight.",
      "The chandelier sways violently, raining crystal on everyone below.",
    ],
    boost: ["water"],
    nerf: [],
  },
  {
    name: "a bottomless ancient colosseum with no exits",
    flavor: [
      "The crowd of carved stone faces watches without expression.",
      "Sand soaks dark with blood as the floor absorbs everything.",
      "The walls are too high and too smooth to climb. There is no leaving.",
      "A hidden trap door opens in the floor. Something below it is breathing.",
    ],
    boost: ["aggressive", "giant", "undead"],
    nerf: [],
  },
  {
    name: "a burning rainforest during an earthquake",
    flavor: [
      "The ground splits open in jagged fissures that glow orange from below.",
      "Ancient trees — some five hundred years old — snap like toothpicks.",
      "The earthquake and the fire are each trying to win the title of 'worst thing happening right now.'",
      "A river changes course, surging through the battlefield and sweeping debris in all directions.",
    ],
    boost: ["fire", "wind", "shadow"],
    nerf: ["ice"],
  },
  {
    name: "a transdimensional void where the laws of physics are more like suggestions",
    flavor: [
      "Gravity rotates ninety degrees without warning.",
      "A copy of the arena from ten seconds ago overlaps the current one — double the hazards.",
      "Sound travels backwards here. Screams arrive before the blows that caused them.",
      "The concept of 'floor' stops being applicable for about four seconds.",
    ],
    boost: ["reality", "magic", "cosmic", "psychic"],
    nerf: ["tech", "long-range"],
  },
  {
    name: "the ruins of a Gothic cathedral mid-collapse during a thunderstorm",
    flavor: [
      "Stained glass windows detonate inward as shockwaves pulse through the stonework.",
      "The vaulted ceiling groans and drops a section — three tonnes of stone, zero warning.",
      "Lightning splits the bell tower. The bells fall and ring on impact.",
      "Rain pours through the shattered roof. The floor is ankle-deep in cold black water.",
    ],
    boost: ["lightning", "magic", "undead", "shadow"],
    nerf: ["fire", "tech"],
  },
  {
    name: "a collapsing underground cave system with magma flooding the lower levels",
    flavor: [
      "The floor cracks open and orange light bleeds up through the fissures.",
      "A stalactite the size of a telephone pole drops without warning.",
      "The air is superheating. Every breath is work.",
      "The cave is compressing — the ceiling is visibly lower than it was two minutes ago.",
    ],
    boost: ["fire", "earth", "shadow"],
    nerf: ["ice", "water", "tech"],
  },
  {
    name: "the photosphere of a dying red giant star",
    flavor: [
      "Plasma tornadoes the size of planets spiral across the battlefield.",
      "The gravity here is crushing. Every movement costs twice what it should.",
      "Solar flares arc overhead, rewriting the horizon every few seconds.",
      "The star is destabilizing. This entire region of space has minutes left.",
    ],
    boost: ["fire", "cosmic", "energy"],
    nerf: ["ice", "tech"],
  },
  {
    name: "the eye of an EF5 tornado tearing across the Great Plains",
    flavor: [
      "Two-hundred-mile-an-hour walls of wind form the arena's boundaries.",
      "Farm equipment, vehicles, and structural debris orbit the fight at lethal velocity.",
      "The ground is being stripped down to bedrock in real time.",
      "The funnel shifts — the eye moves — and both sides scramble to stay inside it.",
    ],
    boost: ["wind", "speedster", "lightning"],
    nerf: ["tech", "giant"],
  },
  {
    name: "a massive hydroelectric dam in the final seconds before catastrophic failure",
    flavor: [
      "The concrete face is spiderwebbed with cracks. Water jets through in a dozen places.",
      "The structure shudders with the weight of billions of gallons pressing against it.",
      "Warning sirens echo across the valley below. Nobody down there is going to make it.",
      "The dam gives another groan. One more good hit anywhere and the whole thing goes.",
    ],
    boost: ["water", "lightning"],
    nerf: ["fire"],
  },
  {
    name: "the sunken ruins of a pre-human civilization on the ocean floor",
    flavor: [
      "At this depth, the pressure alone should be fatal for anyone who doesn't belong here.",
      "Bio-luminescent organisms pulse in the black water — the only light for miles.",
      "Ancient monoliths the size of skyscrapers lean at wrong angles in the silt.",
      "Something vast moves in the dark beyond the ruins. It hasn't engaged yet.",
    ],
    boost: ["water", "psychic", "shadow"],
    nerf: ["fire", "lightning", "tech"],
  },
  {
    name: "a fractured dimensional seam where three realities press against each other",
    flavor: [
      "The ground is three different surfaces overlapping — stone, metal, and something that isn't matter.",
      "Fighters from other timelines flicker in and out of visibility. Some of them are dead versions of the combatants.",
      "Cause and effect have stopped agreeing with each other. Hits register before they land.",
      "The seam is widening. When it completes, this location will cease to exist.",
    ],
    boost: ["reality", "psychic", "cosmic", "magic"],
    nerf: ["tech"],
  },
  {
    name: "a post-apocalyptic city buried under fifty years of decay and overgrowth",
    flavor: [
      "Skyscrapers have become vertical forests — trees growing from every shattered window.",
      "The street grid has been swallowed. Exposed rebar and collapsed concrete form the terrain.",
      "Something large and territorial lives in the nearest building. It is becoming aware of the fight.",
      "Acid rain begins falling — slow at first, then constant.",
    ],
    boost: ["shadow", "stealth", "aggressive"],
    nerf: ["tech"],
  },
  {
    name: "the Mariana Trench — deepest point on Earth, 11 kilometers under the surface",
    flavor: [
      "The pressure at this depth is eight tonnes per square inch. The darkness is absolute.",
      "Hydrothermal vents vent superheated mineral columns directly through the battlefield.",
      "No sound travels correctly here. Every impact arrives wrong — delayed, distorted.",
      "Something bioluminescent and enormous drifts past. It does not stop. It does not look away.",
    ],
    boost: ["water", "psychic"],
    nerf: ["fire", "lightning", "tech"],
  },
  {
    name: "an active World War II battlefield in the final hours of a siege",
    flavor: [
      "Artillery shells fall on a schedule nobody knows. The ground is constant percussion.",
      "Mud and wire and craters as far as visibility allows — which isn't far.",
      "A tank grinds through the battlefield, indifferent to what's in front of it.",
      "Tracer fire streaks across the smoke in every direction. Friendly fire is an abstract concept here.",
    ],
    boost: ["tech", "stealth", "aggressive"],
    nerf: ["cosmic", "magic"],
  },
  {
    name: "a sealed military bunker three hundred meters underground — no exits",
    flavor: [
      "The ventilation cut out an hour ago. The air is getting thick.",
      "Emergency lighting paints everything the color of dried blood.",
      "The walls are reinforced to survive a direct nuclear strike. They are not surviving this fight.",
      "The blast doors are sealed from the outside. Whatever happens here, stays here.",
    ],
    boost: ["tech", "aggressive", "shadow"],
    nerf: ["wind", "cosmic"],
  },
  {
    name: "the event horizon of a stellar-mass black hole",
    flavor: [
      "Time is running at different speeds in different parts of the arena.",
      "Light bends into closed loops. You can watch yourself from behind.",
      "The tidal forces are shredding the battlefield in real time.",
      "Anything that crosses that line doesn't come back. Both sides know exactly where the line is.",
    ],
    boost: ["cosmic", "reality", "psychic"],
    nerf: ["tech", "speedster"],
  },
  {
    name: "a category 5 hurricane making landfall — coastal city, 190mph sustained winds",
    flavor: [
      "The storm surge has already taken the lower two floors of every building.",
      "Street signs, vehicles, and shipping containers fly past at terminal velocity.",
      "Visibility is zero. The only reference point is the wind direction — which keeps changing.",
      "A building collapses slowly on the edge of the arena. Then another. Then three at once.",
    ],
    boost: ["water", "wind", "lightning"],
    nerf: ["fire", "tech"],
  },
  {
    name: "the rubble field of a destroyed alien homeworld",
    flavor: [
      "The planet's crust has been shattered into floating megaton chunks drifting in low orbit.",
      "The atmosphere is venting into space — they have some time. Not a lot.",
      "Ancient weapons systems, some still active, discharge randomly from the debris.",
      "The planet's core is visible through a crack in the terrain. It is not stable.",
    ],
    boost: ["cosmic", "tech", "energy"],
    nerf: [],
  },
  {
    name: "the interior of a massive cumulonimbus thundercloud at 15,000 meters altitude",
    flavor: [
      "Lightning fires from every surface simultaneously — the cloud itself is a weapon.",
      "Updrafts and downdrafts shift without warning, throwing fighters hundreds of meters vertically.",
      "Hail the size of fists hammers everything constantly.",
      "The static discharge here would incinerate conventional aircraft. This is not a safe place.",
    ],
    boost: ["lightning", "wind", "speedster"],
    nerf: ["fire", "tech"],
  },
  {
    name: "an arctic ice shelf calving into the sea during a polar storm",
    flavor: [
      "Sections of ice the size of city blocks shear off and plunge into the black water below.",
      "The wind cuts to the bone. Visibility is measured in meters, not kilometers.",
      "Pressure ridges of ancient ice — some twenty meters high — shift and collapse.",
      "The ocean below is 1.9°C. Submersion is a death sentence by minutes.",
    ],
    boost: ["ice", "wind"],
    nerf: ["fire", "tech"],
  },
  {
    name: "the summit ridge of Everest in a whiteout — 8,800 meters, oxygen near zero",
    flavor: [
      "At this altitude, the body is consuming itself. Every movement is borrowed time.",
      "Visibility drops to arm's length. The wind is strong enough to throw a person off the ridge.",
      "The temperature is -60°C with windchill. Exposed skin doesn't last a minute.",
      "The ridge is barely three meters wide. On both sides: a vertical drop of two kilometers.",
    ],
    boost: ["wind", "ice", "cosmic"],
    nerf: ["fire", "tech"],
  },
  {
    name: "beneath the largest waterfall on Earth — Niagara scaled to a kilometer of drop",
    flavor: [
      "Six million cubic feet of water per minute hits the basin sixty meters away.",
      "The noise makes communication impossible. Every sense is overwhelmed.",
      "The mist is so dense it constitutes its own weather system.",
      "The shockwave from the water hitting the basin is constant — the ground never stops moving.",
    ],
    boost: ["water", "lightning"],
    nerf: ["fire", "shadow"],
  },
  {
    name: "a collapsing megacity tower — floors 40 through 60, actively falling",
    flavor: [
      "The structure is in progressive collapse — each floor pancaking onto the one below at fifteen seconds per floor.",
      "Gravity is winning. The horizon outside the windows is rotating.",
      "Furniture, structural steel, and glass cascade through the fight from above.",
      "The math says they have ninety seconds before the section they're on ceases to be a section.",
    ],
    boost: ["speedster", "wind", "tech"],
    nerf: ["giant"],
  },
  {
    name: "an ancient labyrinth carved into bedrock — and it is rearranging itself",
    flavor: [
      "Stone walls grind and shift between rounds. The corridors from sixty seconds ago no longer exist.",
      "The torches are not fire. Whatever they burn doesn't consume them. It illuminates nothing.",
      "The labyrinth is not random. It is herding both sides toward something at the center.",
      "Sound behaves wrong in here. Echoes arrive before they should. Sometimes they don't arrive at all.",
    ],
    boost: ["magic", "psychic", "shadow", "stealth"],
    nerf: ["long-range", "tech"],
  },
  {
    name: "a reality nexus — the point where parallel universes physically overlap",
    flavor: [
      "Multiple versions of the same location exist simultaneously. The wrong step lands in a different universe.",
      "Alternate versions of the fighters flicker in and out — echoes of paths not taken.",
      "The nexus is contracting. With every passing minute, fewer realities fit in the space.",
      "The laws of physics are voting on which version applies here. The vote is not unanimous.",
    ],
    boost: ["reality", "cosmic", "psychic", "magic"],
    nerf: ["tech", "long-range"],
  },
  {
    name: "the surface of a comet traveling at 70km/s through the inner solar system",
    flavor: [
      "The comet is outgassing — jets of superheated ice and dust punch through the surface without warning.",
      "Gravity is near-zero. Every movement sends a fighter drifting. Control is a constant negotiation.",
      "The sun fills half the sky and is getting larger by the minute.",
      "The tail stretches millions of kilometers behind them. They are very alone out here.",
    ],
    boost: ["cosmic", "speedster", "ice"],
    nerf: ["giant", "tech"],
  },
  {
    name: "a dense asteroid field in the belt between Mars and Jupiter",
    flavor: [
      "Boulders ranging from car-sized to city-block-sized drift through the arena at conflicting velocities.",
      "The gravity gradient between asteroids creates pockets of turbulence that redirect trajectories without warning.",
      "A collision between two large rocks nearby sends shrapnel through the arena at orbital velocity.",
      "There is no consistent surface. Every foothold is temporary.",
    ],
    boost: ["cosmic", "speedster", "tech"],
    nerf: ["giant", "long-range"],
  },
  {
    name: "the interior of the Great Pyramid of Giza — during an inexplicable sand flood",
    flavor: [
      "Sand pours through cracks that didn't exist when the fight started.",
      "The chambers are filling from the bottom. By the final round, fighters will be at the ceiling.",
      "The walls are inscribed with things that make more sense the less you look directly at them.",
      "The sarcophagus chamber has been empty for four thousand years. Something is in it now.",
    ],
    boost: ["magic", "undead", "shadow"],
    nerf: ["tech", "water"],
  },
  {
    name: "the frozen subsurface ocean of Europa — beneath the ice, in complete darkness",
    flavor: [
      "The ice ceiling above is four kilometers of solid frozen compression.",
      "Hydrothermal vents on the ocean floor below illuminate nothing but make everything warmer in wrong ways.",
      "Something vastly larger than any known Earth creature passes through the fight space without acknowledgement.",
      "The pressure at this depth converts sound into something that is also partially light.",
    ],
    boost: ["water", "psychic", "ice"],
    nerf: ["fire", "lightning", "tech"],
  },
  {
    name: "the burning ruins of Alexandria's Great Library during the final sack",
    flavor: [
      "Two thousand years of accumulated knowledge burns around the fight.",
      "The smoke is so thick that breathing is a decision requiring reconsideration.",
      "Shelves forty feet high topple in chains, taking sections of the ceiling with them.",
      "The scrolls burn with different colored flames. Some of them shouldn't be burning at all.",
    ],
    boost: ["fire", "magic", "psychic"],
    nerf: ["ice", "tech"],
  },
  {
    name: "a quantum realm where the scale of existence is arbitrary and instant",
    flavor: [
      "Sub-atomic particles are the size of boulders here. Electrons orbit like slow moons.",
      "Distance and size are relative concepts with opt-out provisions.",
      "Probability clouds make every action simultaneously happened and not-happened until observed.",
      "A wave function collapses nearby. What it was before is not what it is after.",
    ],
    boost: ["reality", "psychic", "speedster", "cosmic"],
    nerf: ["tech", "giant"],
  },
  {
    name: "a time-fractured battlefield where five different historical conflicts overlap",
    flavor: [
      "Roman legions, WWI trenches, medieval cavalry, future mechanized units, and ancient warriors occupy the same ground simultaneously.",
      "Weapons and tactics from different eras interact with each other in ways no military academy has addressed.",
      "A soldier from one era walks through another era's soldier without noticing. Only the fighters notice each other.",
      "The temporal fracture is expanding. In twenty minutes this will either resolve itself or end everything nearby.",
    ],
    boost: ["time", "magic", "psychic"],
    nerf: ["tech"],
  },
  {
    name: "a gladiatorial arena on a populated alien world — broadcast live to 40 billion viewers",
    flavor: [
      "The audience is forty billion strong and completely alien. Their reaction to the fight is impossible to read.",
      "The arena architecture follows physics that weren't negotiated on Earth.",
      "Between rounds, the arena floor reconfigures automatically — different terrain each time.",
      "The species hosting this event has been running these events for longer than humanity has existed.",
    ],
    boost: ["aggressive", "cosmic", "tech"],
    nerf: [],
  },
  {
    name: "a dimensional fortress hanging between worlds — walls built from condensed spacetime",
    flavor: [
      "The fortress exists in no single universe. It overlaps six.",
      "The walls are made of something older than matter. Hitting them is like hitting the concept of a wall.",
      "Doors open onto different dimensions depending on when you open them.",
      "The fortress's original occupant is not present. Its defenses still are.",
    ],
    boost: ["reality", "magic", "cosmic", "shadow"],
    nerf: ["tech"],
  },
];

// Per-arena modifier applied to outgoing damage based on attacker tags.
// Returns a multiplier centered on 1.0. Boost = +18%, nerf = -18%, capped.
function getArenaDamageMod(arena: Arena, atkTags: Set<string>): number {
  let mod = 1.0;
  if (arena.boost) for (const t of arena.boost) if (atkTags.has(t)) { mod += 0.18; break; }
  if (arena.nerf)  for (const t of arena.nerf)  if (atkTags.has(t)) { mod -= 0.18; break; }
  return clamp(mod, 0.7, 1.35);
}


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

// ─── Power Tag System ─────────────────────────────────────────────────────────

const TAG_PATTERNS: [string, RegExp][] = [
  ["fire",      /\b(fire|flame|inferno|hellfire|pyro|scorch|ember|heat blast)\b/i],
  ["ice",       /\b(ice|freeze|cryo|frost|cold|glacial|absolute zero|cryomancer)\b/i],
  ["lightning", /\b(lightning|thunder|electric|volt|shock|plasma|electrokinesis)\b/i],
  ["magic",     /\b(magic|sorcery|spell|arcane|mystic|enchant|witch|wizard|curse|hex|dark arts|chaos magic|eldritch)\b/i],
  ["psychic",   /\b(psychic|telekinesis|telepathy|mind control|mental|psionic|mind reading|thought)\b/i],
  ["immortal",  /\b(immortal|unkillable|cannot be killed|cannot die|healing factor|regenerat|resurrect|undead|back from the dead|infinite lives|true immortality)\b/i],
  ["reality",   /\b(reality|dimensional|chaos magic|probability|warp|quantum|rewrite|reshape)\b/i],
  ["tech",      /\b(power suit|battle suit|cybernetic|android|mech\b|robot|arc reactor|nanotech|exo.?suit|weapons system)\b/i],
  ["speedster", /\b(speed force|mach \d|supersonic|light speed|fastest alive|zero to|move at light)\b/i],
  ["giant",     /\b(300 meter|colossal|mountain-sized|planet-wide|kaiju|city block|the size of)\b/i],
  ["cosmic",    /\b(cosmic|galactic|universe\b|infinity\b|power cosmic|planet.eating|devourer|omnipotent|all-powerful)\b/i],
  ["vampire",   /\b(vampire|blood drain|daywalker|blood.drinking|undying)\b/i],
  ["metal",     /\b(magnetic|metal control|magnetism|iron manipulation|adamantium|vibranium control)\b/i],
  ["poison",    /\b(venom|poison|toxin|acid blood|acid spit|corrosive)\b/i],
  ["undead",    /\b(undead|lich|necromancy|death magic|death god|death energy|corpse)\b/i],
  ["soul",      /\b(soul steal|soul drain|soul manipulation|absorb soul|hell.?fire soul|soul power)\b/i],
  ["time",      /\b(time travel|time stop|temporal|time loop|stop time|rewind time)\b/i],
  ["shadow",    /\b(shadow|darkness|void|dark energy|shadow manipulation|shade)\b/i],
  ["water",     /\b(water control|hydrokinesis|ocean|aquatic|tidal|sea power)\b/i],
  ["wind",      /\b(wind|air control|storm|tornado|hurricane|aerokinesis|gale)\b/i],
  ["regen",     /\b(regenerat\w*|healing factor|regrow\w*|cellular regen\w*|wound close|heals from)\b/i],
  ["teleport",  /\b(teleport\w*|warp in|warp out|blink\w*|flash step|instant transmission|short-range warp)\b/i],
  ["energy-proj", /\b(beam|blast\w*|energy projection|energy attack|chi blast|ki blast|laser\w*|optic blast|breath attack)\b/i],
  ["intangible",/\b(intangib\w*|phase through|phasing|incorporeal|ghost form|astral)\b/i],
  ["bfr",       /\b(banish|seal away|trap in|exile|sealing|imprison|pocket dimension|prison realm|infinite void)\b/i],
  ["mind-ctrl", /\b(mind control|brainwash|hypnosis|charm|domination|compulsion|enslave)\b/i],
  ["dura-bypass", /\b(soul attack|ignores armor|ignores durability|bypasses defense|piercing damage|hax damage|conceptual damage)\b/i],
  ["absorb",    /\b(absorb power|copy power|steal power|power mimic|power absorption|drain power|leech)\b/i],
  ["status",    /\b(paralysis|petrify|stun|disease|plague|curse status|status effect|sleep magic)\b/i],
  ["prep",      /\b(prep time|preparation|gadget|countermeasure|contingency|always has a plan|prepared for)\b/i],
];

function getTags(char: Character): Set<string> {
  // Only index ABILITIES and DESCRIPTION for attacker power tags — NOT weaknesses.
  // Weaknesses are checked separately on the defender side in getWeaknessMatchNote.
  const text = `${char.specialAbility} ${char.description}`;
  const tags = new Set<string>();
  for (const [tag, pattern] of TAG_PATTERNS) {
    if (pattern.test(text)) tags.add(tag);
  }
  // Merge stored behavior tags (assigned by tagCharacters script)
  for (const t of char.behaviorTags ?? []) tags.add(t);
  return tags;
}

// ─── Behavior Modifiers ───────────────────────────────────────────────────────
// Derive per-team combat modifiers from their collective behavior tags.
interface BehaviorMods {
  initiativeBonus: number;   // added to attack-probability formula
  damageMult:      number;   // multiplier on outgoing damage (1.0 = baseline)
  damageResist:    number;   // multiplier on incoming damage (1.0 = no reduction)
  regenPerRound:   number;   // HP recovered at end of each round
  firstStrike:     number;   // extra flat damage bonus on round 1 only
}

function getTeamBehaviorMods(
  team: Character[],
  isRealistic: boolean,
  round: number,
): BehaviorMods {
  const tags = new Set<string>();
  for (const c of team) for (const t of getTags(c)) tags.add(t);

  let initiativeBonus = 0;
  let damageMult      = 1.0;
  let damageResist    = 1.0;
  let regenPerRound   = 0;
  let firstStrike     = 0;

  // Aggressive teams hit harder and push initiative
  if (tags.has("aggressive")) { initiativeBonus += 0.07; damageMult += 0.10; }

  // Sadistic fighters press advantages ruthlessly
  if (tags.has("sadistic")) damageMult += 0.08;

  // Tactical teams are more effective in realistic tone; still decisive in cinematic/brutal
  if (tags.has("tactical")) {
    damageMult      += isRealistic ? 0.12 : 0.05;
    initiativeBonus += isRealistic ? 0.05 : 0.03;
  }

  // Arrogant fighters are overconfident early — slight damage boost rounds 1-2
  if (tags.has("arrogant") && round <= 2) damageMult += 0.06;

  // Defensive fighters absorb more punishment
  if (tags.has("defensive")) damageResist *= 0.88;

  // Regenerators slowly claw back HP each round
  if (tags.has("regen")) regenPerRound += 3;

  // Speedsters already benefit from higher speed stats, but add a small initiative nudge
  if (tags.has("speedster")) initiativeBonus += 0.04;

  // Stealth bonus: ambush on round 1 only
  if (tags.has("stealth") && round === 1) firstStrike += 4;

  // Long-range fighters get a small opening-range advantage
  if (tags.has("long-range") && round === 1) firstStrike += 2;

  return { initiativeBonus, damageMult, damageResist, regenPerRound, firstStrike };
}

// ─── Fighting Style Detection ─────────────────────────────────────────────────

// Tags whose primary expression is ranged/projected — NOT physical melee
const RANGED_POWER_TAGS = new Set([
  "fire", "ice", "lightning", "magic", "psychic", "cosmic",
  "reality", "wind", "water", "shadow", "time", "undead", "soul",
]);

// Characters who cannot walk/run — wheelchair, paralysis, etc.
const IMMOBILE_PATTERNS = /\b(wheelchair|paralyz|cannot walk|confined to|paraplegic|immobile|levitat)\b/i;

function getFightStyle(char: Character, tags: Set<string>): "melee" | "ranged" {
  for (const t of RANGED_POWER_TAGS) {
    if (tags.has(t)) return "ranged";
  }
  return "melee";
}

function isImmobile(char: Character): boolean {
  const text = `${char.description} ${char.specialAbility}`;
  return IMMOBILE_PATTERNS.test(text);
}

// ─── Move Name Extraction ─────────────────────────────────────────────────────
// Returns a SHORT move name (2–5 words) that can appear naturally in action prose.
// Cycles through semicolon-separated abilities so characters rotate their moves.

// Phrases that describe a TRAIT (passive state), not an ACTION the character takes.
// We must never let these become "moves" — "uses super strength" is forbidden.
const TRAIT_ONLY_PATTERNS = /^(true immortality|cannot be killed|cannot die|unkillable|immortal|infinite lives|absolute immortality|virtually unkillable|healing factor|near-total invulnerability|invulnerability|invincible|super(human)?\s+(strength|speed|durability|endurance|reflexes|agility|stamina|intelligence|senses)|enhanced\s+(strength|speed|durability|endurance|reflexes|agility|stamina|intelligence|senses)|godlike\s+(strength|speed|durability|combat|skill|reflexes)|peak\s+(human|physical|combat)|combat\s+(speed|reflexes|prowess|skill|mastery)|tactical\s+(genius|mind|intelligence)|genius[- ]?level\s+(intellect|intelligence)|supernatural\s+(strength|speed|durability|reflexes|senses)|extreme\s+(durability|endurance|stamina)|massive\s+(strength|durability)|incredible\s+(strength|speed|durability|reflexes)|high\s+(intelligence|durability|speed|strength))/i;

function getMoveName(char: Character, variant: number): string {
  const raw = char.specialAbility.trim();
  // Semicolons separate distinct moves — cycle through them
  const semiClauses = raw.split(";").map(c => c.trim()).filter(c => c.length > 3);
  const actionClauses = semiClauses.filter(c => !TRAIT_ONLY_PATTERNS.test(c));
  let chosen: string;
  if (actionClauses.length > 1) {
    chosen = actionClauses[variant % actionClauses.length]!;
  } else {
    // Comma-separated: take first non-trait item
    const commas = raw.split(",").map(c => c.trim()).filter(c => c.length > 3);
    chosen = commas.find(c => !TRAIT_ONLY_PATTERNS.test(c)) ?? commas[0] ?? raw;
  }
  // Trim to first comma-chunk and cap at 5 words
  const firstChunk = chosen.split(",")[0]!.trim();
  const words = firstChunk.split(/\s+/);
  return words.slice(0, 3).join(" ").toLowerCase();
}

// ─── No-Repeat Template Picker ────────────────────────────────────────────────
// Tracks which templates have fired this fight so we never see the same one twice.
// Resets automatically when the pool is exhausted.
function pickFresh<T>(arr: T[], used: Set<number>): T {
  const available = arr.map((_, i) => i).filter(i => !used.has(i));
  if (available.length === 0) {
    used.clear();
    const i = Math.floor(Math.random() * arr.length);
    used.add(i);
    return arr[i]!;
  }
  const idx = available[Math.floor(Math.random() * available.length)]!;
  used.add(idx);
  return arr[idx]!;
}

function getDominantStat(char: Character): "strength" | "speed" | "intelligence" | "durability" {
  const { strength, speed, intelligence, durability } = char;
  const high = Math.max(strength, speed, intelligence, durability);
  if (high === strength) return "strength";
  if (high === speed) return "speed";
  if (high === intelligence) return "intelligence";
  return "durability";
}

// ─── Interaction Detection ────────────────────────────────────────────────────

function getWeaknessMatchNote(
  attacker: Character,
  atkTags: Set<string>,
  defender: Character,
  defTags: Set<string>,
): string | null {
  const defWeakness = defender.weaknesses.toLowerCase();
  const n = attacker.name;
  const d = defender.name;

  // Immortal DEFENDER reaction — always fires (most important narrative beat)
  if (defTags.has("immortal")) {
    return pickRandom([
      `${d} gets back up. Already.`,
      `${d} hits the ground. Gets back up. The wounds are already closing.`,
      `${d} takes the full hit. Shakes it off. Keeps coming.`,
      `${d} doesn't go down. Or goes down and gets right back up. Same outcome.`,
      `${d} is up again. ${n} is going to have to hit them a lot harder than that.`,
      `The damage lands. ${d}'s body just doesn't agree that it matters.`,
    ]);
  }

  // Gated interactions — only fire ~55% of the time to avoid repetition
  if (Math.random() > 0.55) return null;

  // Fire vs ice weakness
  if (atkTags.has("fire") && /fire|heat|flame|burn/.test(defWeakness))
    return pickRandom([
      `The fire hits ${d} somewhere that actually matters — listed under known vulnerabilities for a reason.`,
      `${d}'s defenses weren't designed for this temperature. The difference is visible.`,
      `Heat at this level gets through in ways that physical resistance can't compensate for.`,
    ]);

  // Ice vs fire weakness
  if (atkTags.has("ice") && /ice|cold|freeze|frost/.test(defWeakness))
    return pickRandom([
      `The cold gets into ${d} in ways that armor and rage and strength simply can't stop.`,
      `${d}'s power runs hot. Cold at this magnitude causes cascading failure across all of it.`,
      `The temperature differential is catastrophic for ${d}. It shows.`,
    ]);

  // Magic vs magic-vulnerable
  if (atkTags.has("magic") && /magic|sorcery|mystical|arcane|supernatural/.test(defWeakness))
    return pickRandom([
      `The sorcery bypasses everything ${d} trained to defend against — built for physical threats, not this.`,
      `${d}'s protection has a specific gap shaped exactly like sorcery. ${n} found it.`,
      `Magic operates on a register ${d}'s defenses were never calibrated for. It shows.`,
    ]);

  // Lightning vs electrical weakness
  if (atkTags.has("lightning") && /lightning|electric|shock|emp/.test(defWeakness))
    return pickRandom([
      `The electrical discharge finds every gap simultaneously. ${d} has no answer for current that moves faster than thought.`,
      `${d}'s systems weren't hardened against this. The discharge cascades through everything at once.`,
      `The conductivity issue is real and immediate. ${d} did not plan for this.`,
    ]);

  // Psychic vs mind-weak
  if (atkTags.has("psychic") && /psychic|mind|mental|willpower/.test(defWeakness))
    return pickRandom([
      `${d}'s body is prepared. Their mind is not. The psychic assault finds the soft center behind all that power.`,
      `Physical defense means nothing here. The attack bypasses every layer ${d} ever built.`,
      `${d} can tank almost anything physical. Almost.`,
    ]);

  // Cosmic vs cosmic-weak
  if (atkTags.has("cosmic") && /cosmic|energy|overwhelm/.test(defWeakness))
    return pickRandom([
      `Power at the cosmic scale wasn't something ${d} was designed to absorb. The math doesn't work.`,
      `${d} can survive a lot. This is calibrated at a level that "a lot" doesn't cover.`,
    ]);

  // Metal control vs tech/armor
  if (atkTags.has("metal") && (defTags.has("tech") || /armor|metal|iron|steel/.test(defWeakness)))
    return pickRandom([
      `${n} doesn't need to touch ${d} — they reach out and rearrange the metal in their armor from a distance.`,
      `Every ferrous component in ${d}'s setup becomes a liability the moment ${n} focuses on it.`,
      `The armor meant to protect ${d} is now working against them. That's a ${n} special.`,
    ]);

  // Reality warping vs non-reality
  if (atkTags.has("reality") && !defTags.has("reality") && !defTags.has("cosmic"))
    return pickRandom([
      `${d} swings with everything. The blow lands wrong — ${n} shifted the angle of impact at contact. What was meant to cave in a chest barely grazes. ${d} doesn't know what just happened.`,
      `${d}'s counter comes in hard. ${n} redirects it — not by blocking, but by making the air between them refuse the hit. ${d}'s arm snaps through empty space.`,
      `${d} throws the right move. ${n} simply unmakes the trajectory mid-flight. The strike lands nowhere.`,
      `${d} commits to the attack. ${n} lets them — then reshapes the point of impact. The force goes sideways. ${d} staggers on their own swing.`,
    ]);

  // Giant vs normal-sized
  if (atkTags.has("giant") && !defTags.has("giant") && !defTags.has("cosmic"))
    return pickRandom([
      `The shockwave from a being of ${n}'s scale alone would end most fights. The actual strike is almost secondary.`,
      `${d} is operating on a completely different scale of threat. The gap is not theoretical.`,
    ]);

  // Speedster vs slow
  if (atkTags.has("speedster") && defender.speed < 65)
    return pickRandom([
      `${d} didn't see it start, let alone finish. Complete before any signal traveled from eye to brain to body.`,
      `Reaction time becomes irrelevant at this velocity. ${d} is defending against something that was already over.`,
    ]);

  // Cosmic/scale defender vs non-cosmic attacker (reverse: attacker is puny)
  if (defTags.has("cosmic") && !atkTags.has("cosmic") && !atkTags.has("reality"))
    return pickRandom([
      `Against a being of ${d}'s scale, that attack makes a mark. A small mark on an incomprehensibly large target — but something.`,
      `${d} registers the hit. Notes it. Files it away somewhere between inconvenience and mild concern.`,
      `The hit connects. ${d} doesn't slow down.`,
      `${d} takes it. Keeps moving. The damage is real — it's just not enough.`,
      `That would end anyone else. ${d} rolls their neck and looks back at ${n}.`,
      `${d} felt that one. Whether ${d} cares about it is a different question.`,
    ]);

  // Poison vs biological weakness
  if (atkTags.has("poison") && /poison|toxin|biological/.test(defWeakness))
    return pickRandom([
      `The toxin finds its way in regardless of armor or power level. Biology doesn't care about fighting ability.`,
      `${d}'s resilience is physical. The toxin operates at a biological level that physical strength cannot defend.`,
    ]);

  return null;
}

// ─── Immunity Note ────────────────────────────────────────────────────────────
// Fires when an attacker's method fundamentally CAN'T work against this defender.
// Narrative-only — the stat system handles actual damage, this makes it feel right.

function getImmunityNote(
  attacker: Character,
  atkTags: Set<string>,
  defender: Character,
  defTags: Set<string>,
): string | null {
  // Only fires ~35% of rounds — flavor, not spam
  if (Math.random() > 0.35) return null;

  const n = attacker.name;
  const d = defender.name;
  const hasAnySpecialPower = atkTags.size > 0;

  // Pure physical fighter punching liquid metal / reforming entity
  if (!hasAnySpecialPower && defTags.has("immortal") && !defTags.has("tech")) {
    return pickRandom([
      `Conventional force, correctly applied, completely absorbed. ${d} doesn't acknowledge it the way anything else would.`,
      `${n} hits exactly right. ${d} is reforming before the follow-through finishes.`,
      `${n} is using the right techniques against the wrong opponent. The body doesn't stay damaged.`,
    ]);
  }

  // Mortal physical fighter vs a truly cosmic being
  if (!hasAnySpecialPower && defTags.has("cosmic")) {
    return pickRandom([
      `${n} is fighting with everything they have. Against something of ${d}'s magnitude, that's less a threat and more a statement of intent.`,
      `The strike lands. ${d} experiences it the way a star experiences a thrown stone.`,
      `${n}'s hit is technically successful. The effect on ${d} is technically negligible. Both things are true simultaneously.`,
    ]);
  }

  // Tech-heavy attacker vs magnetic/metal controller
  if (atkTags.has("tech") && defTags.has("metal")) {
    return pickRandom([
      `${n}'s systems are misfiring — something in ${d}'s vicinity is making the hardware choose sides. The wrong ones.`,
      `Half of ${n}'s tech advantages just became ${d}'s. That's the specific nightmare of fighting someone who controls metal.`,
    ]);
  }

  // Purely physical fighters vs intangible/shadow entities
  if (!hasAnySpecialPower && defTags.has("shadow")) {
    return pickRandom([
      `${n}'s fist passes through ${d}'s silhouette. There's nothing solid to connect with unless ${d} chooses to be.`,
      `Physical force requires a physical target. ${d} is offering neither right now.`,
    ]);
  }

  // Fire user vs fire-immune
  if (atkTags.has("fire") && /immune to fire|fire doesn't|cannot burn|fire.?proof/.test(defender.weaknesses.toLowerCase())) {
    return pickRandom([
      `The flames wash over ${d} and accomplish nothing. This was not an effective strategy.`,
      `${d} stands in the fire. Unimpressed. Unharmed. This attack was wasted.`,
    ]);
  }

  return null;
}

// ─── Elimination Line ─────────────────────────────────────────────────────────
// The definitive final sentence — HOW this fight ends for the loser.
// Every fight ends. Not every fighter dies the same way.

function getEliminationLine(loser: Character, loserTags: Set<string>, winner: Character, winnerTags: Set<string>): string {
  const d = loser.name;
  const w = winner.name;

  // Cosmic entities: dispersed, scattered, ended as a presence
  if (loserTags.has("cosmic")) {
    return pickRandom([
      `${d}'s power disperses across the void — no single point remaining. Not death. Something larger. An ending without a body.`,
      `${d} ceases to be a coherent force. Scattered. Unraveled at a fundamental level. Removed from the equation permanently.`,
      `The cosmic presence that was ${d} fragments and fades. This fight has ended something that should have been unkillable. It wasn't.`,
    ]);
  }

  // Immortals: contained, overwhelmed past the point of relevance
  if (loserTags.has("immortal")) {
    return pickRandom([
      `${d} cannot be killed. But they can be beaten so completely that resurrection becomes irrelevant. That's what happened here. They will heal. The fight is already over.`,
      `${d} will survive this. Eventually. Right now, what remains of them is pinned to the ground by the full weight of total defeat — and ${w} is already walking away.`,
      `You can't end ${d}. But you can take them out of the equation so thoroughly that it doesn't matter. ${w} just did that.`,
      `${d} goes down. Gets back up. Goes down harder. Gets back up slower. Goes down one final time and the math runs out — they're up, technically, but this fight is over.`,
    ]);
  }

  // Undead / necromantic entities: unraveled, dispersed
  if (loserTags.has("undead")) {
    return pickRandom([
      `The dark force animating ${d} shatters. The body collapses. Whatever held the pieces together is gone now — not suppressed, not delayed. Broken.`,
      `${d}'s necromantic tether snaps. The construct that was ${d} falls apart completely. The dead stay dead this time.`,
    ]);
  }

  // Robots / tech / androids: permanently destroyed
  if (loserTags.has("tech") && !loserTags.has("immortal")) {
    return pickRandom([
      `${d}'s systems go offline permanently. Not shut down — destroyed. There is no rebooting this.`,
      `Every light on ${d} goes dark simultaneously. The chassis hits the ground and nothing inside it is working. This unit is done.`,
      `${d} crashes. Every system, simultaneously. The kind of catastrophic failure that engineers have nightmares about — no recovery, no backup, no restart. Done.`,
    ]);
  }

  // Vampires: burned, staked, ended by the right means
  if (loserTags.has("vampire")) {
    return pickRandom([
      `${d} burns. Centuries of survival end in seconds when the right weakness is found. The night has no more use for them.`,
      `${d} is gone — dust, ash, and silence where something immortal used to be. ${w} found the thing that vampires cannot survive. There is always a thing.`,
    ]);
  }

  // Giant / kaiju: felled
  if (loserTags.has("giant")) {
    return pickRandom([
      `${d} falls. The impact registers on seismographs three hundred miles from here. Something that enormous takes the ground down with it when it goes.`,
      `${d} crashes to the earth and the shockwave flattens everything within a mile. Dead before impact. The crater is already forming.`,
    ]);
  }

  // Animals: killed cleanly — they lived by the fight and died by it
  if (loser.universe === "Animals") {
    return pickRandom([
      `${d} goes still. An apex predator — one of the most dangerous creatures that ever walked this planet — ends here, in this arena, in this fight. The silence after is total.`,
      `${d} dies as it lived: in combat, in the middle of a fight it believed it could win. It was wrong today. It won't get another chance to be right.`,
      `The greatest predator of its era hits the ground and does not move again. ${w} stands over what used to be a threat and breathes.`,
    ]);
  }

  // Default: they died. Say it plainly.
  return pickRandom([
    `${d} is dead. No dramatic last words. No second wind. The fight ended the only way fights at this level can end.`,
    `${d} hits the ground and doesn't get up. This time, permanently. ${w} is already breathing easier.`,
    `${d} goes down for the last time. That's the end of it. Final. Irreversible. Done.`,
    `${d} is gone. The fight has its winner. The arena has its casualty. The difference between them was everything.`,
    `${d} dies here. On ${w}'s terms, in ${w}'s fight. The last thing they see is the arena they lost in.`,
  ]);
}

// ─── Attack Description Builder ───────────────────────────────────────────────
// Returns a short (≤ 10 word) physical attack phrase: "[verb] [target/move]"
// These plug into templates as: "${atk} ${action}."

function buildAttackAction(attacker: Character, atkTags: Set<string>, variant: number): string {
  const move = getMoveName(attacker, variant);
  const dominant = getDominantStat(attacker);

  if (atkTags.has("fire")) {
    return pickRandom([
      `fires ${move} directly into their chest`,
      `hits them with a concentrated blast of ${move}`,
      `opens up with ${move} at point-blank range`,
      `launches ${move} — the heat scorches everything between them`,
      `drives ${move} through their guard before they can react`,
      `unleashes ${move} in a focused column that punches clean through`,
    ]);
  }
  if (atkTags.has("ice")) {
    return pickRandom([
      `locks their legs in ice and hits them while they're frozen`,
      `hits them with ${move} and the impact shatters on contact`,
      `encases their arms in frost and drives the real strike through`,
      `blasts them with ${move} — they skid backward, half-frozen`,
      `hits them with ${move} and the follow-up before they can break free`,
    ]);
  }
  if (atkTags.has("lightning")) {
    return pickRandom([
      `hits them with a lightning strike before they can move`,
      `sends ${move} through them — the bolt gets there before the warning does`,
      `calls down ${move} with pinpoint accuracy`,
      `chains ${move} through the arena and into them`,
      `fires ${move} in a burst that pins them to the ground`,
      `hits them three times with ${move} — the chain jumps between impacts`,
    ]);
  }
  if (atkTags.has("magic") || atkTags.has("reality")) {
    return pickRandom([
      `hits them with ${move} from an angle that shouldn't exist`,
      `fires ${move} — the blast curves around their guard`,
      `channels ${move} at contact range — they take it full in the chest and hit the ground`,
      `snaps ${move} out — precise, immediate, no room to counter`,
      `drives ${move} through every layer of magical shielding`,
      `fires ${move} from close range — no time to dodge, no room to block`,
    ]);
  }
  if (atkTags.has("psychic")) {
    return pickRandom([
      `hits them with a psychic shockwave — they seize up mid-step`,
      `locks them in place with ${move} and drives the real strike through`,
      `overloads their senses with ${move} — they can't process the follow-up`,
      `hits them where armor can't reach: the inside of their own head`,
      `drives ${move} through their mental defenses and scrambles their focus`,
      `freezes their motor control with ${move} — they can't swing back`,
    ]);
  }
  if (atkTags.has("cosmic")) {
    return pickRandom([
      `hits them with ${move} at a scale that rewrites local geography`,
      `releases ${move} — the arena is a rounding error`,
      `applies ${move} the way a planet applies gravity: inevitably`,
      `hits them with ${move} — the surrounding landscape craters outward`,
      `fires ${move} with the casual indifference of something that eats stars`,
      `unleashes ${move} — the shockwave alone flattens everything within range`,
      `channels ${move} and the output is measured in geological damage`,
      `lets ${move} loose at close range — there was no surviving that gap`,
      `slams ${move} down like a verdict — no appeal, no block, no answer`,
      `hammers them with ${move} — the arena registers it before they do`,
    ]);
  }
  if (atkTags.has("speedster")) {
    return pickRandom([
      `hits them eight times before they process the first`,
      `blurs through and hits from three angles before the exchange even starts`,
      `laps the arena and hits them from behind — they're still turning`,
      `hits them with ${move}, resets, hits again — four strikes in one breath`,
      `lands ${move} from inside their guard before their guard knows it's open`,
      `fires ${move} so fast the afterimage throws the block in the wrong direction`,
    ]);
  }
  if (atkTags.has("giant")) {
    return pickRandom([
      `drops a fist from height — the shockwave alone throws them backward`,
      `stamps them into the ground and the crater does the rest`,
      `brings ${move} down from above — the impact registers on seismographs`,
      `swings ${move} and the displacement of air is its own attack`,
      `grabs them — they're the size of a toy — and throws them into the arena wall`,
    ]);
  }
  if (atkTags.has("metal")) {
    return pickRandom([
      `tears every metal surface in the arena into shrapnel and drives it all at once`,
      `pulls the iron out of the air and slams it into them`,
      `hits them with ${move} — then uses the same power to pin the limbs that try to block`,
      `rearranges the arena's metal into a cage and hits from the inside`,
    ]);
  }
  if (atkTags.has("shadow")) {
    return pickRandom([
      `strikes from inside their shadow — they never saw the angle`,
      `dissolves into the dark and hits from a direction that shouldn't exist`,
      `materializes behind them and hits before they can turn`,
      `uses ${move} to attack from everywhere at once and nowhere specific`,
    ]);
  }
  if (atkTags.has("vampire")) {
    return pickRandom([
      `closes the distance in an instant and hits them at the throat`,
      `hits them with ${move} with the cold precision of something centuries old`,
      `moves through them like they're standing still — hits twice on the way out`,
    ]);
  }
  if (atkTags.has("undead") || atkTags.has("soul")) {
    return pickRandom([
      `hits them with ${move} — power that comes from somewhere past the living`,
      `draws on ${move} and the air between them goes cold`,
      `hits them with something that isn't quite force — it's closer to inevitability`,
    ]);
  }
  if (atkTags.has("poison")) {
    return pickRandom([
      `makes contact — a scratch is all it takes for ${move} to start`,
      `hits them once and steps back — the damage is already inside them`,
      `gets past their guard and makes skin contact. That's the whole attack.`,
    ]);
  }
  if (atkTags.has("time")) {
    return pickRandom([
      `stops time, repositions, and hits them from the perfect angle`,
      `rewinds two seconds and takes the hit they didn't defend`,
      `pauses the exchange and rearranges the outcome`,
      `sees the counter coming, skips past it, and hits them on the other side`,
    ]);
  }
  if (atkTags.has("wind") || atkTags.has("water")) {
    return pickRandom([
      `drives a column of ${move} into them from the side`,
      `wraps them in ${move} and slams them into the nearest wall`,
      `hits them with ${move} from every direction at once`,
      `weaponizes the arena itself — ${move} closes off every escape and hits`,
    ]);
  }

  // Stat-based fallback — short and physical
  const byDominant: Record<string, string[]> = {
    strength: [
      `drives a straight into their jaw that snaps their head back`,
      `grabs them and slams them into the ground`,
      `charges through their guard and hits them at full extension`,
      `catches them across the temple — the crack echoes across the arena`,
      `lifts them and throws them across the arena`,
      `hits them with ${move} and the shockwave craters the ground`,
    ],
    speed: [
      `hits them three times before the first one registers`,
      `blurs past and hits from behind — they're still turning when the second lands`,
      `lands four strikes in the time it takes to blink`,
      `hits them with ${move}, retreats, hits again before they can answer`,
    ],
    intelligence: [
      `times the counter perfectly and hits through their attack`,
      `reads the telegraphed strike, sidesteps, and hits at the pivot`,
      `baits the block and hits the arm that goes up — then hits the opening`,
      `finds the gap in their guard and places ${move} exactly there`,
    ],
    durability: [
      `walks through their guard and hits them at point-blank`,
      `takes a hit mid-approach and hits back harder without slowing down`,
      `shrugs off the defense and drives through with full force`,
      `doesn't stop for the block — hits them through it`,
    ],
  };
  return pickRandom(byDominant[dominant] ?? byDominant.strength!);
}

// ─── Combat Narrative Templates ───────────────────────────────────────────────
// MK / action-cutscene style: 2–3 short sentences of physical cause-and-effect.
// Template signature: (attacker, defender, action, arena) => string

const openingTemplates = [
  (atk: string, def: string, action: string, env: string) =>
    `${atk} hits first. The moment both sides land on ${env}, ${atk} ${action}. ${def} goes sliding backward — first blood is already running.`,
  (atk: string, def: string, action: string, env: string) =>
    `No wind-up. No warning. ${atk} ${action} the instant ${def} hits ${env}. ${def} goes flying, crashes into the terrain, and gets up slower than expected.`,
  (atk: string, def: string, action: string, env: string) =>
    `${atk} charges the moment both sides touch ${env}. ${atk} ${action}. ${def} takes the hit clean and the ground craters under them.`,
  (atk: string, def: string, action: string, env: string) =>
    `${def} is still orienting on ${env} when ${atk} ${action}. The impact kicks up a shockwave. ${def} hits something solid and doesn't bounce.`,
  (atk: string, def: string, action: string, env: string) =>
    `The fight starts before anyone gives a signal. ${atk} ${action} — immediately, no setup, no posturing. ${def} is sent skidding and the tone is set.`,
];

const midTemplates = [
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} ${action}. ${def}'s guard shatters. They go down hard, skid across the ground, and come up bleeding.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} hesitates. ${atk} ${action}, snapping ${def}'s head back. ${def} hits the dirt hard.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} grabs ${def} and drives them headfirst into the ground. Twice. Then ${atk} ${action} at point-blank range. ${def} tumbles away trailing blood.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} feints left. ${def} bites. ${atk} ${action} from the right — ${def} never saw it. They hit the ground hard.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} lands something — barely. ${atk} takes it and answers: ${action}. Faster than the hit ${def} just threw. ${def} staggers with wounds that weren't there two seconds ago.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} catches ${def} mid-swing. ${atk} ${action} and the blow multiplies by ${def}'s own momentum. ${def} is driven into the nearest solid surface.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} doesn't let ${def} breathe. ${atk} ${action} before ${def} can reset. The hit folds them around the point of impact and they slide across the terrain.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} tries to hold ground. ${atk} ${action} — and ${def} is off their feet. They land twenty meters away.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} commits to what they think is the killing blow. ${atk} sidesteps, ${action}, and ${def} eats all of it. They bounce off the terrain and stay down for a beat.`,
  (atk: string, def: string, action: string, _env: string) =>
    `Three seconds locked together, neither budging. Then ${atk} ${action} — the gap is found. ${def} is blown clear.`,
];

const counterTemplates = [
  (atk: string, def: string, action: string, _env: string) =>
    `${def} moves in to finish it. ${atk} lets them get close — then ${action} from inside their guard. ${def} never had the angle to defend it. They go down hard.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} is bleeding, stumbling. ${def} commits to the close-out. ${atk} ${action} at the exact moment ${def} overextends. The counter lands clean and ${def} is sent back the way they came.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} thought they had this. ${atk} was baiting the whole time. ${atk} ${action} through the gap ${def} left while going for the kill — and the tables turn, violently.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} absorbs one more hit. Takes the pain. ${atk} ${action} as a counter — short, ugly, from a direction ${def} forgot to cover. It lands. ${def} drops.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} goes for the big hit. ${atk} rolls with it, stays on their feet, and ${action} before ${def} can pull back. The reversal is sudden and brutal. Both of them know the fight just shifted.`,
];

const closingTemplates = [
  (atk: string, def: string, action: string, _env: string) =>
    `${def} drops to a knee. ${atk} ${action} point-blank. ${def} hits the ground and the fight ends there.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} is battered — doesn't matter. ${atk} ${action} one final time. ${def} goes down and stays down. It's over.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} is finished and they know it. ${atk} ${action} — clean, final, no hesitation. ${def} hits the floor and doesn't move.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} grabs ${def}, drives them into the ground one last time, then ${action} at zero distance. ${def} doesn't get up.`,
  (atk: string, def: string, action: string, _env: string) =>
    `Both still standing. Barely. ${atk} ${action} in a final surge. ${def} goes down. It's done.`,
];

// ─── Ranged / Caster Narrative Templates ─────────────────────────────────────
// Attacker stays at range — no grabbing, no physical contact.

const rangedOpeningTemplates = [
  (atk: string, def: string, action: string, env: string) =>
    `${atk} doesn't advance. The moment both sides land on ${env}, ${atk} ${action}. ${def} is hit before they've taken a step — driven backward into the terrain.`,
  (atk: string, def: string, action: string, env: string) =>
    `${def} barely sets foot on ${env} before ${atk} ${action}. The shot arrives before ${def} can track the source. They land hard and wonder if closing the gap is even possible.`,
  (atk: string, def: string, action: string, env: string) =>
    `${atk} doesn't move. ${atk} ${action} from full range the instant ${def} appears on ${env}. The impact kicks up a crater. ${def} hits something solid.`,
  (atk: string, def: string, action: string, env: string) =>
    `First move goes to ${atk}. ${atk} ${action} before ${def} can set their footing on ${env}. The blast knocks ${def} off their feet — they skid to a halt, bleeding.`,
];

const rangedMidTemplates = [
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} ${action}. ${def} has no cover. The hit lands clean and ${def} skids backward trailing smoke.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} tries to close the gap. ${atk} ${action} mid-charge. ${def} is stopped cold and thrown backward.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} hesitates for a half-second. ${atk} ${action} during that half-second. ${def} doesn't get a third of the way through the dodge.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} reads the angle and ${action}. ${def} is caught with nowhere to deflect it. The terrain craters outward.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} is still advancing when ${atk} ${action}. The blast multiplies by ${def}'s own forward momentum. They go down harder for it.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} ${action} from range. Distance is irrelevant. ${def} takes it like they were standing right in front.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} ${action}. ${def} blocks — it doesn't matter. The force blows through the block and ${def} slides back into the nearest wall.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} bloodied but still coming. ${atk} ${action} before they cover the distance. ${def} goes down again.`,
  (atk: string, def: string, action: string, _env: string) =>
    `Standoff. Neither moving. Then ${atk} ${action} — the edge is found. ${def} is blown clear.`,
];

const rangedCounterTemplates = [
  (atk: string, def: string, action: string, _env: string) =>
    `${def} moves in to finish it. ${atk} ${action} at the worst possible moment for ${def}. The shot catches them mid-charge. They go down hard.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} was fading. ${def} pushes for the close-out. ${atk} ${action} as the counter — precise, full power. ${def} takes it and hits the terrain hard.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} thought this was over. ${atk} ${action} through the gap ${def} left reaching for the finish. The tables turn, violently.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} takes one more hit. Stays standing. ${atk} ${action} as the answer — from range, full force. ${def} eats every bit of it.`,
];

const rangedClosingTemplates = [
  (atk: string, def: string, action: string, _env: string) =>
    `${def} is on their knees. ${atk} ${action} one final time. ${def} doesn't move. It's done.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} is running on fumes. Doesn't matter. ${atk} ${action} — last shot, full power. ${def} goes down and stays down.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} is finished. ${atk} ${action} at maximum range. The blast lands clean. ${def} hits the ground and the fight is over.`,
  (atk: string, def: string, action: string, _env: string) =>
    `Both of them barely standing. ${atk} ${action} in a final surge. ${def} goes down. Done.`,
];

// ─── Extended Mid Templates: Tone Variants ───────────────────────────────────

const brutalMidTemplates = [
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} ${action}. ${def} blocks — ${atk} breaks through the block. The hit lands anyway. ${def}'s knees buckle.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} hits ${def}. ${def} gets up. ${atk} hits again before they're upright. ${atk} ${action} — one more. ${def} doesn't get up as fast this time.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} tries to reset. ${atk} ${action} before the reset finishes. The second hit is worse than the first. The ground registers every impact.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} and ${def} trade. ${atk} is winning the trade. ${atk} ${action} and the math of this exchange only goes one way. ${def} is taking more hits than they're landing.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} ${action}. No technique — just damage. ${def} has no clever answer because there isn't one. The hit lands like a structural problem.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} hits. Follows up. Hits again. ${atk} ${action} into the exchange and ${def} is at the center of a storm that isn't stopping.`,
];

const tacticalMidTemplates = [
  (atk: string, def: string, action: string, env: string) =>
    `${atk} drops their guard on purpose. ${def} takes the bait. ${atk} ${action} as ${def} overextends — the whole sequence was built for this.`,
  (atk: string, def: string, action: string, env: string) =>
    `${atk} has been watching ${def}'s patterns. This round, the pattern gets punished. ${atk} ${action} at the exact moment ${def} commits to the wrong read.`,
  (atk: string, def: string, action: string, env: string) =>
    `${atk} waits. ${def} thinks they've taken control. ${atk} ${action} from the spot ${def} forgot to cover. The hit lands like it was always going to.`,
  (atk: string, def: string, action: string, env: string) =>
    `${atk} feints. ${def} bites. ${atk} ${action} from the opposite side — ${def} had been watching the wrong hand the whole exchange.`,
  (atk: string, def: string, action: string, env: string) =>
    `${def} is trying to read ${atk} in real time. ${atk} ${action} as the answer to a counter ${def} hasn't thrown yet. When ${def} throws it, the window is already closed.`,
  (atk: string, def: string, action: string, env: string) =>
    `Three rounds of setup. Half a second of execution. ${atk} ${action} from the angle ${def}'s training never covered.`,
];

const dominantMidTemplates = [
  (atk: string, def: string, action: string, _env: string) =>
    `${def} tries to reset. ${atk} doesn't let them. ${atk} ${action} before ${def} is back on their feet. The gap keeps building.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} throws a counter. ${atk} walks through it and ${action}. ${def}'s counter didn't slow anything down.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} absorbs it. Gets up. ${atk} hits them again. Then ${atk} ${action} — another. ${def} is running out of ways to keep absorbing this.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} has ${def} on the back foot and knows it. ${atk} ${action} — not flashy, just relentless — and ${def} is losing ground they won't recover.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} can't find an angle. Every reset, ${atk} is already there. ${atk} ${action} and there's nowhere to go. The pressure is total.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} is trying everything. ${atk} has an answer for everything. ${atk} ${action} and the answer this round is the same as every round: forward, direct, followed up.`,
];

const desperateMidTemplates = [
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} is getting taken apart. Then — ${atk} ${action} from nowhere. A shot that shouldn't have connected. It connects. ${def} didn't see it.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} moves in to finish it. ${atk} ${action} from the collapse — short-range, ugly, desperate. It connects. Both of them are surprised.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} is losing. They know it. Then ${atk} ${action} and the momentum wobbles for a second. Not over. Not yet.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} has taken three hits that should have ended this. They haven't. ${atk} ${action} from the edge of standing and drives it home. ${def} wasn't expecting that to still be in them.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} shouldn't still be fighting. The body says stop. ${atk} ${action} with whatever's left — and whatever's left is more than ${def} planned for.`,
  (atk: string, def: string, action: string, _env: string) =>
    `Back against the wall, bleeding — ${atk} ${action} because it's the only move left. It's not clean. It doesn't have to be. It lands.`,
];

const environmentalMidTemplates = [
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} shoves ${def} into the terrain. The arena does some of the work. ${atk} ${action} at the same moment. ${def} was fighting two things at once.`,
  (atk: string, def: string, action: string, _env: string) =>
    `The ground shifts under ${def}'s feet. ${atk} doesn't wait for them to recover — ${atk} ${action} before ${def} can get their footing back.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} drives ${def} toward the worst part of the arena on purpose. When the hazard hits, ${atk} ${action} in the same instant. ${def} takes both at once.`,
  (atk: string, def: string, action: string, _env: string) =>
    `Something nearby becomes a weapon. ${atk} uses it — ${action} from the angle the chaos just opened up. ${def} was watching the wrong threat.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} has been reading the terrain as much as reading ${def}. It pays off. ${atk} ${action} at the exact moment the arena provides the edge — right place, right time, catastrophic for ${def}.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} uses the battlefield instead of fighting ${def} directly. ${atk} ${action} while ${def} is handling what just got thrown at them. ${def} is down before they process either problem.`,
];

// Short consequence lines — physical damage observations, not philosophy
const consequenceLines = [
  (def: string) => `Blood is running from ${def}'s lip now.`,
  (def: string) => `${def} is limping. They're trying not to show it.`,
  (def: string) => `${def} spits blood and gets back up.`,
  (def: string) => `${def} shakes their head — trying to clear the ringing.`,
  (def: string) => `One of ${def}'s arms isn't moving right.`,
  (def: string) => `${def} is still up. Taking longer to stand each time.`,
  (def: string) => `The hits are stacking. ${def} is starting to feel all of them at once.`,
  (def: string) => `${def} wipes the blood out of their eye and keeps moving.`,
];

// ─── Round Narrative Builder ──────────────────────────────────────────────────

interface FightNarrativeState {
  // Separate per-pool trackers so index {3} in Brutal ≠ index {3} in Tactical
  usedBrutal: Set<number>;
  usedTactical: Set<number>;
  usedDominant: Set<number>;
  usedDesperate: Set<number>;
  usedEnvironmental: Set<number>;
  usedClassicMid: Set<number>;
  usedCounter: Set<number>;
  usedRangedMid: Set<number>;
  usedRangedCounter: Set<number>;
  attackCounts: Map<number, number>; // characterId → times attacked (drives ability cycling)
  attackerWinning: boolean;
  defenderWinning: boolean;
}

function buildRoundNarrative(
  round: number,
  maxRounds: number,
  attacker: Character,
  defender: Character,
  arenaName: string,
  arenaFlavors: string[],
  state: FightNarrativeState,
  isFinalRound: boolean,
): string {
  const atkTags = getTags(attacker);
  const defTags = getTags(defender);

  // Track how many times this character has attacked and cycle their abilities
  const prevCount = state.attackCounts.get(attacker.id) ?? 0;
  state.attackCounts.set(attacker.id, prevCount + 1);

  const action = buildAttackAction(attacker, atkTags, prevCount);
  const progress = round / maxRounds;
  const useRanged = getFightStyle(attacker, atkTags) === "ranged" || isImmobile(attacker);

  // ── Phase & tone selection ────────────────────────────────────────────────
  let template: (a: string, d: string, ac: string, env: string) => string;

  if (round === 1) {
    template = pickRandom(useRanged ? rangedOpeningTemplates : openingTemplates);
  } else if (isFinalRound || progress >= 0.82) {
    // Final round of the actual fight always gets a closing beat
    template = pickRandom(useRanged ? rangedClosingTemplates : closingTemplates);
  } else if (round % 5 === 0) {
    // Every 5th round: dramatic counter/reversal beat — no-repeat tracked
    template = useRanged
      ? pickFresh(rangedCounterTemplates, state.usedRangedCounter)
      : pickFresh(counterTemplates, state.usedCounter);
  } else {
    if (useRanged) {
      template = pickFresh(rangedMidTemplates, state.usedRangedMid);
    } else {
      // Melee: choose tone to match fight state, each with its own no-repeat tracker
      const r = Math.random();
      if (state.attackerWinning && r < 0.35) {
        template = pickFresh(dominantMidTemplates, state.usedDominant);
      } else if (state.defenderWinning && r < 0.35) {
        template = pickFresh(desperateMidTemplates, state.usedDesperate);
      } else if (r < 0.55) {
        template = pickFresh(brutalMidTemplates, state.usedBrutal);
      } else if (r < 0.75) {
        template = pickFresh(tacticalMidTemplates, state.usedTactical);
      } else if (r < 0.88) {
        template = pickFresh(environmentalMidTemplates, state.usedEnvironmental);
      } else {
        template = pickFresh(midTemplates, state.usedClassicMid);
      }
    }
  }

  let narrative = template(attacker.name, defender.name, action, arenaName);

  if (isFinalRound) {
    // ── FINAL ROUND: append definitive death/elimination ─────────────────────
    // Closing template already sets the physical beat — elimination line seals the fate.
    const elimLine = getEliminationLine(defender, defTags, attacker, atkTags);
    narrative += ` ${elimLine}`;
  } else {
    // ── MID ROUNDS ────────────────────────────────────────────────────────────
    // 1. Weakness match (already handles immortal, cosmic, elements, etc.)
    const interaction = getWeaknessMatchNote(attacker, atkTags, defender, defTags);
    if (interaction) {
      narrative += ` ${interaction}`;
    } else {
      // 2. Immunity note — fires when attacker's method can't work on this defender
      const immunityNote = getImmunityNote(attacker, atkTags, defender, defTags);
      if (immunityNote) {
        narrative += ` ${immunityNote}`;
      } else if (round % 2 === 0) {
        // 3. Arena flavor when neither note fired
        narrative += ` ${pickRandom(arenaFlavors)}`;
      }
    }

    // Consequence lines — physical damage accumulation, mid-fight only
    if (!isFinalRound && round > 2 && progress < 0.75 && Math.random() < 0.25) {
      narrative += ` ${pickRandom(consequenceLines)(defender.name)}`;
    }
  }

  return narrative;
}

// ─── Core Simulation ──────────────────────────────────────────────────────────

function teamPower(team: Character[]): number {
  const raw = team.reduce((sum, c) => sum + c.strength + c.speed + c.intelligence + c.durability, 0);
  return raw * computeSynergy(team).multiplier;
}

// ─── Logical Decision System ───────────────────────────────────────────────
// Determine the winner BEFORE the fight using stat tiers, special abilities,
// hard counters, and speed blitz potential. The narrative MUST reflect this —
// blowouts are short and dominant; only true peers get back-and-forth fights.

type Tier = "cosmic" | "elite" | "powerhouse" | "standard" | "street";
type MismatchLevel = "BLOWOUT" | "DOMINANT" | "SOLID" | "CLOSE" | "TOSSUP";

type UpsetChance = "none" | "low" | "moderate" | "high";

interface MatchupAssessment {
  verdict:           1 | 2;             // who must win (the FAVORITE)
  mismatchLevel:     MismatchLevel;
  recommendedRounds: number;             // 1..5
  team1Tier:         Tier;
  team2Tier:         Tier;
  reasoning:         string;             // human-readable LOCKED VERDICT block for AI
  hardCounter:       boolean;            // hard counter forced the verdict
  forceDominant:     boolean;            // if true, simulator must NOT let underdog win
  winCondition:      string;             // mechanically how the favorite wins
  upsetChance:       UpsetChance;        // none / low / moderate / high
  upsetCondition:    string | null;      // realistic path for the underdog (or null if none)
}

// ─── Stage 1: Fight Resolution Object ─────────────────────────────────────────
// Produced BEFORE any narrative is written. Stage 2 (narrative) only dramatizes
// this pre-decided result — it cannot change the winner or invent new factors.
interface FightResolution {
  winner:         "Team 1" | "Team 2";
  difficulty:     "easy" | "moderate" | "hard";
  fightType:      "stomp" | "one-sided" | "close";
  keyFactors:     string[];   // 2–4 specific matchup-driven reasons the winner wins
  turningPoint:   string;     // the specific moment that decided the fight
  loserShowcase:  string[];   // 2–3 things the loser actually accomplished
  winnerProof:    string[];   // 2–3 concrete proofs the winner's victory was earned
}

// ── Hax / capability inventory ───────────────────────────────────────────
// Returns the set of "win-condition tools" present on a team.
const HAX_KEYS = [
  "regen", "immortal", "reality", "reality-warper", "cosmic", "time", "bfr",
  "mind-ctrl", "psychic", "soul", "dura-bypass", "absorb", "intangible",
  "teleport", "energy-proj", "magic", "status", "poison", "prep", "speedster",
] as const;

function teamHax(team: Character[]): Set<string> {
  const all = new Set<string>();
  for (const c of team) for (const t of getTags(c)) if ((HAX_KEYS as readonly string[]).includes(t)) all.add(t);
  return all;
}
function teamWeaknessText(team: Character[]): string {
  return team.map(c => c.weaknesses || "").join(" | ").toLowerCase();
}

// Derive the most likely WIN CONDITION based on the favorite's strongest tool
// vs the loser's profile. Returns a short, mechanical phrase.
function deriveWinCondition(
  winnerTeam: Character[],
  loserTeam: Character[],
  winHax: Set<string>,
  loseHax: Set<string>,
  mismatch: MismatchLevel,
  speedRatio: number, // winner-speed / loser-speed
): string {
  const winnerName = winnerTeam.map(c => c.name).join(" & ");
  const loserName  = loserTeam.map(c => c.name).join(" & ");

  // 1) Reality-warp / time stop — outcome is rewritten, ONLY if the opponent
  // doesn't have the same domain to counter with.
  const winnerHasReality = winHax.has("reality") || winHax.has("reality-warper");
  const loserHasReality  = loseHax.has("reality") || loseHax.has("reality-warper");
  if (winnerHasReality && !loserHasReality && !loseHax.has("cosmic"))
    return `${winnerName} edits the outcome — reality-warping bypasses any defense ${loserName} could mount.`;
  if (winnerHasReality && loserHasReality)
    return `Both sides bend reality — ${winnerName} wins the warp duel through superior raw power and faster intent.`;
  if (winHax.has("time") && !loseHax.has("time") && !loserHasReality)
    return `${winnerName} stops/manipulates time — ${loserName} can't act inside the locked moment.`;

  // 2) BFR — battlefield removal ends the fight before damage matters.
  if (winHax.has("bfr") && !loseHax.has("bfr") && !loseHax.has("reality"))
    return `${winnerName} seals/banishes ${loserName} — fight ends without a kill, no escape.`;

  // 3) Mind control / soul attack — bypasses physical defenses.
  if (winHax.has("mind-ctrl") && !loseHax.has("mind-ctrl"))
    return `${winnerName} takes ${loserName}'s mind — the body fights for the wrong side.`;
  if ((winHax.has("soul") || winHax.has("dura-bypass")) && !loseHax.has("dura-bypass"))
    return `${winnerName} lands a defense-bypassing strike — armor and durability don't matter.`;

  // 4) Speed blitz — reaction gap means hits land before defense can form.
  if (speedRatio >= 1.8)
    return `${winnerName} blitzes — ${loserName} can't track the movement, takes hits before a guard goes up.`;

  // 5) Regen outlast — winner has regen, loser does NOT have regen AND has no kill switch
  if (winHax.has("regen") && !loseHax.has("regen") && !loseHax.has("dura-bypass") && !loseHax.has("soul") && !loseHax.has("bfr"))
    return `${winnerName} outlasts ${loserName} — regeneration nullifies every hit they can land.`;
  if (winHax.has("immortal") && !loseHax.has("regen") && !loseHax.has("dura-bypass") && !loseHax.has("soul") && !loseHax.has("bfr"))
    return `${winnerName} can't be put down by anything ${loserName} brings — they wear them out and finish at leisure.`;

  // 5b) Both sides regenerate — regen is NOT the deciding factor.
  // Resolve by: lethality advantage, combat skill, or damage-output differential.
  if (winHax.has("regen") && loseHax.has("regen")) {
    const winnerHasLethality = winHax.has("dura-bypass") || winHax.has("soul") ||
      winnerTeam.some(c => /adamantium|vibranium|divine blade|soul sword|black blade|muramasa|hell?fire|carbonadium|nth metal/i
        .test(`${c.specialAbility} ${c.description}`));
    if (winnerHasLethality)
      return `${winnerName} has weapons that deal damage ${loserName}'s regeneration cannot fully erase — lethality advantage wins the war of attrition.`;
    const winnerAvgInt = winnerTeam.reduce((s, c) => s + c.intelligence, 0) / winnerTeam.length;
    const loserAvgInt  = loserTeam.reduce((s, c) => s + c.intelligence, 0)  / loserTeam.length;
    if (winnerAvgInt > loserAvgInt * 1.2)
      return `With both sides regenerating, ${winnerName}'s superior combat consistency and fewer tactical mistakes decide the attrition war.`;
    const winnerAvgStr = winnerTeam.reduce((s, c) => s + c.strength, 0) / winnerTeam.length;
    const loserAvgStr  = loserTeam.reduce((s, c) => s + c.strength, 0)  / loserTeam.length;
    if (winnerAvgStr > loserAvgStr * 1.2)
      return `With both sides regenerating, ${winnerName}'s greater damage output per exchange means ${loserName}'s healing is always playing catch-up.`;
    return `With both sides regenerating, ${winnerName} wins by dealing more damage per exchange — ${loserName}'s healing cannot compensate for the raw output differential.`;
  }

  // 6) Mismatch-driven defaults.
  if (mismatch === "BLOWOUT")
    return `Pure power gap — ${winnerName} ends ${loserName} in one or two clean exchanges. Nothing ${loserName} does meaningfully connects.`;
  if (mismatch === "DOMINANT")
    return `${winnerName} dictates every exchange — ${loserName} eats clean hits trying to find an opening that isn't there.`;
  if (mismatch === "SOLID")
    return `${winnerName} has the better tools and uses them — they grind ${loserName} down with consistent damage and superior positioning.`;

  // 7) Close fights — pick a flavour based on what the winner has.
  if (winHax.has("prep")) return `${winnerName} executes a planned counter at the right moment — ${loserName} doesn't see it coming until it's done.`;
  if (winHax.has("energy-proj")) return `${winnerName} closes the gap and lands a decisive ranged finisher when ${loserName} commits to attack.`;
  return `${winnerName} closes it out by landing the right hit at the right moment — superior consistency over ${loserName}.`;
}

// Derive the realistic upset path. Returns null if no believable path exists.
function deriveUpsetCondition(
  loserTeam: Character[],
  winnerTeam: Character[],
  loseHax: Set<string>,
  winHax: Set<string>,
  mismatch: MismatchLevel,
  hardCounter: boolean,
  winnerWeakness: string,
): { chance: UpsetChance; condition: string | null } {
  const loserName  = loserTeam.map(c => c.name).join(" & ");
  const winnerName = winnerTeam.map(c => c.name).join(" & ");

  // Hard counters → no realistic upset.
  if (hardCounter) return { chance: "none", condition: null };

  const winnerHasReality = winHax.has("reality") || winHax.has("reality-warper");
  const loserHasReality  = loseHax.has("reality") || loseHax.has("reality-warper");

  const upsetTools: string[] = [];
  // Top-tier fight-flippers first.
  if (loserHasReality && !winnerHasReality)
    upsetTools.push(`if ${loserName} commits to reality-warping, ${winnerName} has no answer in-domain`);
  if (loseHax.has("time") && !winHax.has("time") && !winnerHasReality)
    upsetTools.push(`if ${loserName} stops or rewinds time first, ${winnerName} can't act`);
  if (loseHax.has("dura-bypass") || loseHax.has("soul"))
    upsetTools.push(`if ${loserName} lands a defense-bypassing strike first, ${winnerName}'s durability won't save them`);
  if (loseHax.has("bfr") && !winHax.has("bfr") && !winnerHasReality)
    upsetTools.push(`if ${loserName} can seal/banish ${winnerName}, the fight ends regardless of stats`);
  if (loseHax.has("mind-ctrl") && !winHax.has("mind-ctrl"))
    upsetTools.push(`if ${loserName} gets a mind-control hit in early, ${winnerName} fights for the wrong side`);
  if (loseHax.has("intangible") && !winHax.has("dura-bypass") && !winHax.has("magic") && !winHax.has("soul"))
    upsetTools.push(`if ${loserName} stays intangible, ${winnerName}'s physical attacks don't connect`);
  if (loseHax.has("teleport") && !winHax.has("teleport") && !winHax.has("speedster"))
    upsetTools.push(`if ${loserName} uses teleportation to control range, ${winnerName} can't keep up`);
  if (loseHax.has("absorb") && (winHax.has("energy-proj") || winHax.has("magic") || winHax.has("cosmic")))
    upsetTools.push(`if ${loserName} absorbs ${winnerName}'s energy attacks, the power gap closes`);
  if (loseHax.has("status") || loseHax.has("poison"))
    upsetTools.push(`if a status/poison effect lands cleanly, ${winnerName} loses control of the fight`);
  if (loseHax.has("prep"))
    upsetTools.push(`with prep time, ${loserName} could exploit a known weakness or stage a trap`);
  if (loseHax.has("regen") && !winHax.has("dura-bypass") && !winHax.has("soul") && !winHax.has("bfr"))
    upsetTools.push(`if ${loserName} outlasts ${winnerName}'s stamina via regeneration, the fight inverts`);
  if (winnerWeakness && winnerWeakness.length > 5 && (loseHax.has("magic") || loseHax.has("prep") || loseHax.has("psychic")))
    upsetTools.push(`if ${loserName} exploits ${winnerName}'s known weakness — ${winnerWeakness.slice(0, 80)}`);

  if (upsetTools.length === 0) {
    if (mismatch === "BLOWOUT" || mismatch === "DOMINANT") return { chance: "none", condition: null };
    if (mismatch === "SOLID") return { chance: "low", condition: `${loserName} would need a perfect read and a clean counter — possible, not likely.` };
    if (mismatch === "CLOSE") return { chance: "moderate", condition: `${loserName} can win any single exchange — momentum could swing if they capitalize.` };
    return { chance: "high", condition: `Either side can win — comes down to execution and luck of the early exchanges.` };
  }

  // Has actual upset tools → calibrate chance by mismatch.
  const chance: UpsetChance =
    mismatch === "BLOWOUT"  ? "low" :
    mismatch === "DOMINANT" ? "low" :
    mismatch === "SOLID"    ? "moderate" :
                              "high";
  return { chance, condition: upsetTools.slice(0, 2).join("; ") };
}

function avgCharStat(c: Character): number {
  return (c.strength + c.speed + c.intelligence + c.durability) / 4;
}
function teamAvgStat(team: Character[]): number {
  return team.reduce((s, c) => s + avgCharStat(c), 0) / team.length;
}
function teamMaxStat(team: Character[]): number {
  return Math.max(...team.map(avgCharStat));
}
function teamHas(team: Character[], tag: string): boolean {
  return team.some(c => getTags(c).has(tag));
}
// Reality-warpers can appear under either canonical tag.
function teamHasReality(team: Character[]): boolean {
  return team.some(c => {
    const tags = getTags(c);
    return tags.has("reality") || tags.has("reality-warper");
  });
}
function classifyTier(team: Character[]): Tier {
  const peak = teamMaxStat(team);
  const avg  = teamAvgStat(team);
  // Cosmic-tier requires either world-shaking stats OR cosmic/reality tags.
  if (peak >= 8000 || teamHas(team, "cosmic") || teamHasReality(team)) return "cosmic";
  if (peak >= 6500 || avg >= 6000 || teamHas(team, "immortal")) return "elite";
  if (peak >= 5000 || avg >= 4500) return "powerhouse";
  if (peak >= 3500 || avg >= 3000) return "standard";
  return "street";
}
const TIER_RANK: Record<Tier, number> = {
  street: 0, standard: 1, powerhouse: 2, elite: 3, cosmic: 4,
};

function assessMatchup(team1: Character[], team2: Character[]): MatchupAssessment {
  const tier1 = classifyTier(team1);
  const tier2 = classifyTier(team2);
  const tierGap = TIER_RANK[tier1] - TIER_RANK[tier2]; // + → team1 stronger

  const power1 = teamPower(team1);
  const power2 = teamPower(team2);
  const powerRatio = power1 / power2;
  const avg1 = teamAvgStat(team1);
  const avg2 = teamAvgStat(team2);
  const speedRatio = (team1.reduce((s, c) => s + c.speed, 0) / team1.length) /
                     Math.max(1, team2.reduce((s, c) => s + c.speed, 0) / team2.length);

  // Hard counters — these can flip a stat-based verdict.
  // 1) Reality-warper vs anything without a counter — auto-win for warper.
  const t1HasReality = teamHas(team1, "reality-warper");
  const t2HasReality = teamHas(team2, "reality-warper");
  const t1HasCosmic  = teamHas(team1, "cosmic");
  const t2HasCosmic  = teamHas(team2, "cosmic");
  const t1HasImmortal = teamHas(team1, "immortal");
  const t2HasImmortal = teamHas(team2, "immortal");
  const t1HasRegen    = teamHas(team1, "regen");
  const t2HasRegen    = teamHas(team2, "regen");

  let hardCounter = false;
  let counterWinner: 1 | 2 | null = null;
  let counterReason = "";

  // Reality-warping beats non-reality opponents unless they're also cosmic.
  if (t1HasReality && !t2HasReality && !t2HasCosmic) {
    hardCounter = true; counterWinner = 1;
    counterReason = "Reality-warping cannot be answered by conventional combat — outcome can be edited.";
  } else if (t2HasReality && !t1HasReality && !t1HasCosmic) {
    hardCounter = true; counterWinner = 2;
    counterReason = "Reality-warping cannot be answered by conventional combat — outcome can be edited.";
  }
  // Immortal/regen vs non-lethal opponent is unwinnable for the lesser side.
  else if (t1HasImmortal && tier2 === "street") {
    hardCounter = true; counterWinner = 1;
    counterReason = "Immortality cannot be overcome by street-level damage. Underdog has no win condition.";
  } else if (t2HasImmortal && tier1 === "street") {
    hardCounter = true; counterWinner = 2;
    counterReason = "Immortality cannot be overcome by street-level damage. Underdog has no win condition.";
  }

  // Stat-based verdict (default if no hard counter).
  const statVerdict: 1 | 2 = powerRatio >= 1.0 ? 1 : 2;
  const verdict: 1 | 2 = counterWinner ?? statVerdict;

  // Mismatch level — primarily tier-driven, then stat-ratio driven.
  const absTierGap = Math.abs(tierGap);
  const ratio = Math.max(powerRatio, 1 / powerRatio); // ≥ 1
  let mismatchLevel: MismatchLevel;
  if (hardCounter)             mismatchLevel = "BLOWOUT";
  else if (absTierGap >= 2)    mismatchLevel = "BLOWOUT";       // street vs powerhouse, etc.
  else if (absTierGap === 1)   mismatchLevel = "DOMINANT";
  else if (ratio >= 1.30)      mismatchLevel = "SOLID";          // same tier but clearly ahead
  else if (ratio >= 1.10)      mismatchLevel = "CLOSE";
  else                         mismatchLevel = "TOSSUP";

  // Round count: min 3, max 7. Stomps end quickly; tossups go the distance.
  const severeBlowout = hardCounter || absTierGap >= 3;
  const roundCount =
    severeBlowout                ? 3 :
    mismatchLevel === "BLOWOUT"  ? 3 :
    mismatchLevel === "DOMINANT" ? 4 :
    mismatchLevel === "SOLID"    ? 5 :
    mismatchLevel === "CLOSE"    ? 6 :
                                   7;

  // Speed blitz hint.
  let speedNote = "";
  if (speedRatio >= 1.8 && verdict === 1)      speedNote = " Team 1 is dramatically faster — they should land hits before Team 2 can react.";
  else if (speedRatio <= 1 / 1.8 && verdict === 2) speedNote = " Team 2 is dramatically faster — they should land hits before Team 1 can react.";

  // Compose human-readable reasoning for the AI.
  const winnerSide = verdict === 1 ? "Team 1" : "Team 2";
  const loserSide  = verdict === 1 ? "Team 2" : "Team 1";
  const winnerTier = verdict === 1 ? tier1 : tier2;
  const loserTier  = verdict === 1 ? tier2 : tier1;
  const winnerAvg  = Math.round(verdict === 1 ? avg1 : avg2);
  const loserAvg   = Math.round(verdict === 1 ? avg2 : avg1);

  const tierExplain = (t: Tier) => {
    switch (t) {
      case "cosmic":     return "cosmic / reality-shaping";
      case "elite":      return "elite / planetary";
      case "powerhouse": return "powerhouse / continental";
      case "standard":   return "standard / city-level";
      case "street":     return "street-level";
    }
  };

  // ── Per-team hax inventory and locked-in win/upset condition ────────────
  const winnerTeam = verdict === 1 ? team1 : team2;
  const loserTeam  = verdict === 1 ? team2 : team1;
  const winHax     = teamHax(winnerTeam);
  const loseHax    = teamHax(loserTeam);
  const winnerSpeedRatio = verdict === 1 ? speedRatio : 1 / speedRatio;
  const winnerWeakness   = teamWeaknessText(winnerTeam);

  const winCondition = deriveWinCondition(
    winnerTeam, loserTeam, winHax, loseHax, mismatchLevel, winnerSpeedRatio,
  );
  const upset = deriveUpsetCondition(
    loserTeam, winnerTeam, loseHax, winHax, mismatchLevel, hardCounter, winnerWeakness,
  );

  // Format hax lists for the brief (drop empty / redundant entries).
  const fmtHax = (s: Set<string>) => {
    const arr = [...s].filter(t => t !== "speedster"); // already shown via speedNote
    return arr.length ? arr.join(", ") : "none of note";
  };

  const stylistic = (() => {
    switch (mismatchLevel) {
      case "BLOWOUT":
        return `This is a STOMP — write it as a stomp. The loser never lands a meaningful hit. NO artificial tension.`;
      case "DOMINANT":
        return `${loserSide} can land a glancing blow but cannot meaningfully threaten ${winnerSide}. Clear domination.`;
      case "SOLID":
        return `${loserSide} can compete in moments but the outcome is never in real doubt. ${winnerSide} edges ahead.`;
      case "CLOSE":
        return `Genuine fight — both sides land real hits with momentum swings. ${winnerSide} ultimately closes it out.`;
      case "TOSSUP":
        return `Near-mirror match. True back-and-forth. ${winnerSide} only wins on the final exchange.`;
    }
  })();

  // ── LOCKED VERDICT block — what the AI must follow. ──────────────────────
  const reasoning = [
    `=== LOCKED VERDICT (battle logic engine output) ===`,
    `FAVORITE: ${winnerSide} (${tierExplain(winnerTier)}, avg stat ${winnerAvg})`,
    `UNDERDOG: ${loserSide} (${tierExplain(loserTier)}, avg stat ${loserAvg})`,
    `MISMATCH: ${mismatchLevel}${speedNote ? "  (speed gap noted)" : ""}`,
    counterReason ? `HARD COUNTER: ${counterReason}` : null,
    `WIN CONDITION: ${winCondition}`,
    `UPSET CHANCE: ${upset.chance}`,
    upset.condition ? `UPSET CONDITION: ${upset.condition}` : `UPSET CONDITION: none — no realistic path for the underdog.`,
    `FAVORITE TOOLS: ${fmtHax(winHax)}`,
    `UNDERDOG TOOLS: ${fmtHax(loseHax)}`,
    `STYLE: ${stylistic}`,
    `RULES: Show the WIN CONDITION mechanically in the prose — don't just narrate generically. ` +
      `If regen is the win condition, show the loser failing to keep them down. ` +
      `If a defense-bypass hit is the win condition, show that hit landing and durability not mattering. ` +
      `If speed is the win condition, show the loser unable to react. ` +
      `Never invent powers neither character has. Never let the loser threaten the favorite if UPSET CHANCE is none/low.`,
  ].filter(Boolean).join("\n");

  return {
    verdict,
    mismatchLevel,
    recommendedRounds: roundCount,
    team1Tier: tier1,
    team2Tier: tier2,
    reasoning,
    hardCounter,
    forceDominant: mismatchLevel === "BLOWOUT" || mismatchLevel === "DOMINANT" || hardCounter,
    winCondition,
    upsetChance: upset.chance,
    upsetCondition: upset.condition,
  };
}

// ─── Stage 1: Build Fight Resolution ─────────────────────────────────────────
// Called AFTER assessMatchup / aiAssessMatchup. Produces the concrete resolution
// object that Stage 2 (narrative) must dramatize — winner is already locked.
function buildFightResolution(
  winnerTeam: Character[],
  loserTeam:  Character[],
  winHax:     Set<string>,
  loseHax:    Set<string>,
  assessment: MatchupAssessment,
): FightResolution {
  const winnerNames = winnerTeam.map(c => c.name).join(" & ");
  const loserNames  = loserTeam.map(c => c.name).join(" & ");

  // ── fightType + difficulty ───────────────────────────────────────────────
  const fightType: FightResolution["fightType"] =
    assessment.mismatchLevel === "BLOWOUT"  ? "stomp"     :
    assessment.mismatchLevel === "DOMINANT" ? "one-sided" : "close";

  const difficulty: FightResolution["difficulty"] =
    (assessment.mismatchLevel === "BLOWOUT" || assessment.mismatchLevel === "DOMINANT") ? "easy" :
    assessment.mismatchLevel === "SOLID" ? "moderate" : "hard";

  // ── Stat comparisons ─────────────────────────────────────────────────────
  const avgStat  = (team: Character[], fn: (c: Character) => number) =>
    team.reduce((s, c) => s + fn(c), 0) / team.length;

  const winSpeed = avgStat(winnerTeam, c => c.speed);
  const losSpeed = avgStat(loserTeam,  c => c.speed);
  const speedRatio = losSpeed > 0 ? winSpeed / losSpeed : 1;

  const winDur = avgStat(winnerTeam, c => c.durability);
  const losDur = avgStat(loserTeam,  c => c.durability);

  const winStr = avgStat(winnerTeam, c => c.strength);
  const losStr = avgStat(loserTeam,  c => c.strength);

  const winInt = avgStat(winnerTeam, c => c.intelligence);
  const losInt = avgStat(loserTeam,  c => c.intelligence);

  // ── Key Factors (2–4 specific matchup reasons) ───────────────────────────
  const keyFactors: string[] = [];

  // Speed blitz
  if (speedRatio >= 1.8)
    keyFactors.push(`${winnerNames} moved too fast to track — ${loserNames} could not form defensive responses before hits landed`);
  else if (speedRatio >= 1.3)
    keyFactors.push(`${winnerNames} consistently won the exchange tempo — landed first, reset faster, forced ${loserNames} to react`);

  // Hax advantages (most impactful first)
  if (winHax.has("reality") || winHax.has("reality-warper"))
    keyFactors.push(`${winnerNames} could rewrite the conditions of the fight — ${loserNames} had no defense against reality manipulation`);
  else if (winHax.has("dura-bypass") || winHax.has("soul"))
    keyFactors.push(`${winnerNames} could bypass ${loserNames}'s durability directly — toughness and armor provided no protection`);
  else if (winHax.has("mind-ctrl") && !loseHax.has("mind-ctrl"))
    keyFactors.push(`${winnerNames}'s psychic offense bypassed physical defense entirely — the body fought for the wrong side`);
  else if (winHax.has("bfr") && !loseHax.has("bfr"))
    keyFactors.push(`${winnerNames} could end the fight via sealing or banishment — ${loserNames} had no counter to battlefield removal`);
  else if (winHax.has("intangible") && !loseHax.has("dura-bypass") && !loseHax.has("magic") && !loseHax.has("soul"))
    keyFactors.push(`${winnerNames}'s intangibility made ${loserNames}'s physical offense largely useless`);

  // Regen advantage (only when loser has no regen)
  if (winHax.has("regen") && !loseHax.has("regen") && !loseHax.has("dura-bypass"))
    keyFactors.push(`${winnerNames} healed through damage that would have finished ${loserNames} — the loser's offense could not accumulate`);

  // Durability gap
  if (winDur > losDur * 1.5 && keyFactors.length < 3)
    keyFactors.push(`${winnerNames} absorbed what ${loserNames} threw at them — the loser's best offense could not disable a fighter built to take far worse`);

  // Raw power gap
  const winAvgRaw = avgStat(winnerTeam, c => (c.strength + c.speed + c.intelligence + c.durability) / 4);
  const losAvgRaw = avgStat(loserTeam,  c => (c.strength + c.speed + c.intelligence + c.durability) / 4);
  const rawRatio  = losAvgRaw > 0 ? winAvgRaw / losAvgRaw : 1;

  if (rawRatio >= 2.0 && keyFactors.length < 3)
    keyFactors.push(`The scale gap was decisive — ${loserNames} operates at a level where their entire offense does not meaningfully threaten ${winnerNames}`);
  else if (rawRatio >= 1.35 && keyFactors.length < 3)
    keyFactors.push(`${winnerNames} had the statistical edge across every meaningful category — the margin in strength, speed, and durability was consistent`);

  // Combat intelligence
  if (winInt > losInt * 1.25 && keyFactors.length < 4)
    keyFactors.push(`${winnerNames} read the fight better — adapted faster, exploited the openings ${loserNames} did not know they were leaving`);

  // Guarantee at least 2 entries
  if (keyFactors.length === 0)
    keyFactors.push(`${winnerNames} had the decisive advantage in core combat output — the margin held across every phase`);
  if (keyFactors.length === 1) {
    if (fightType === "close")
      keyFactors.push(`In a close fight, ${winnerNames} found the right answer at the critical moment — execution over raw ability`);
    else
      keyFactors.push(`${loserNames} had no reliable mechanism to keep ${winnerNames} down across the full fight duration`);
  }

  // ── Turning Point ─────────────────────────────────────────────────────────
  // Use the mechanically-derived win condition — more specific than a generic phrase.
  const turningPoint = assessment.winCondition;

  // ── Loser Showcase (what the loser actually did well) ────────────────────
  const loserShowcase: string[] = [];

  if (losSpeed >= winSpeed * 0.85)
    loserShowcase.push(`${loserNames} matched ${winnerNames}'s pace in the opening — speed was not the gap in the early exchanges`);
  if (loseHax.has("tactical"))
    loserShowcase.push(`${loserNames} used tactics effectively — controlled range, identified openings, and forced ${winnerNames} to adjust`);
  if (loseHax.has("regen") && fightType !== "stomp")
    loserShowcase.push(`${loserNames} refused to stay down — regeneration kept them relevant longer than raw damage should have allowed`);
  if ((loseHax.has("energy-proj") || loseHax.has("magic") || loseHax.has("cosmic")) && fightType !== "stomp")
    loserShowcase.push(`${loserNames} landed powerful ranged attacks that forced ${winnerNames} to actively defend rather than purely press`);
  if (losDur >= winDur * 0.85 && fightType !== "stomp")
    loserShowcase.push(`${loserNames} absorbed punishment and kept fighting — durability was not the deciding gap`);
  if (losStr >= winStr * 0.85 && fightType !== "stomp")
    loserShowcase.push(`${loserNames}'s striking output was real — ${winnerNames} took meaningful hits and felt them`);

  if (loserShowcase.length === 0) {
    if (fightType === "stomp")
      loserShowcase.push(`${loserNames} attempted their best techniques — none of them changed what was coming`);
    else
      loserShowcase.push(`${loserNames} made ${winnerNames} earn it — the result was never certain until the final exchange`);
  }

  // ── Winner Proof (why the winner's result was inevitable) ────────────────
  const winnerProof: string[] = [];
  winnerProof.push(assessment.winCondition);

  if (winHax.has("regen") && !loseHax.has("regen"))
    winnerProof.push(`Every wound ${loserNames} inflicted closed — the loser did work that never accumulated into a threat`);
  else if (winHax.has("regen") && loseHax.has("regen"))
    winnerProof.push(`With both sides healing, ${winnerNames}'s greater damage output per exchange meant recovery always favored the winner`);

  if (speedRatio >= 1.5)
    winnerProof.push(`${loserNames} could not maintain defensive positioning — speed forced them to take hits they had no answer to`);

  if (assessment.hardCounter)
    winnerProof.push(`This was a hard counter — ${loserNames} had no tool in their kit that addresses what ${winnerNames} brings`);

  if (winnerProof.length < 2)
    winnerProof.push(`${winnerNames} set the pace of every phase — ${loserNames} was always reacting, never controlling`);

  return {
    winner:        assessment.verdict === 1 ? "Team 1" : "Team 2",
    difficulty,
    fightType,
    keyFactors:    keyFactors.slice(0, 4),
    turningPoint,
    loserShowcase: loserShowcase.slice(0, 3),
    winnerProof:   winnerProof.slice(0, 3),
  };
}

// Apply a concrete damage bonus when an attacker's power type exploits a defender's known weakness.
// This makes weaknesses mechanically meaningful, not just narrative flavor.
function getWeaknessBonus(attacker: Character, defender: Character): number {
  const atkTags = getTags(attacker);
  const defWeakness = defender.weaknesses.toLowerCase();
  let bonus = 0;
  if (atkTags.has("fire")      && /fire|heat|flame|burn/.test(defWeakness))          bonus += 4;
  if (atkTags.has("ice")       && /ice|cold|freeze|frost/.test(defWeakness))          bonus += 4;
  if (atkTags.has("magic")     && /magic|sorcery|mystical|arcane|supernatural/.test(defWeakness)) bonus += 5;
  if (atkTags.has("lightning") && /lightning|electric|shock|emp/.test(defWeakness))   bonus += 4;
  if (atkTags.has("psychic")   && /psychic|mind|mental|willpower/.test(defWeakness))  bonus += 5;
  if (atkTags.has("metal")     && /armor|metal|iron|steel/.test(defWeakness))         bonus += 4;
  if (atkTags.has("poison")    && /poison|toxin|biological/.test(defWeakness))        bonus += 4;
  if (atkTags.has("shadow")    && /light|holy|radiant/.test(defWeakness))             bonus += 3;
  if (atkTags.has("cosmic")    && /cosmic|energy|overwhelm/.test(defWeakness))        bonus += 5;
  return bonus;
}

// ─── Gang-up Narrative Templates ──────────────────────────────────────────────
// Used when a larger team piles on a smaller/solo opponent simultaneously.

const gangUpTemplates: ((attackers: string, defender: string, arena: string) => string)[] = [
  (atk, def, _env) => `${atk} converge on ${def} simultaneously. There is no angle left to defend. ${def} is hit from multiple directions in the span of a single second — the numbers are simply overwhelming.`,
  (atk, def, _env) => `${atk} split apart and attack ${def} from every angle at once. It's not a fight anymore — it's a coordinated elimination. ${def} blocks one hit and takes the other two.`,
  (atk, def, _env) => `Being outnumbered finally catches up to ${def}. ${atk} coordinate without a word and strike together. ${def} cannot be in three places at once.`,
  (atk, def, _env) => `${atk} close in from opposite ends. ${def} turns to face the first — the second doesn't give them time to turn back. This is what being outnumbered actually means.`,
  (atk, def, _env) => `${atk} execute a pincer attack with zero margin for error. ${def} sees it coming and still can't stop it. You can't block what hits you from behind while you're blocking what's hitting you from the front.`,
  (atk, def, _env) => `${atk} don't need a plan. They have the numbers. They rush ${def} from multiple directions and let physics sort it out. Physics is not kind to ${def}.`,
];

// ─── AI Narrative Generation ───────────────────────────────────────────────────

interface ArenaData {
  name: string;
  flavor: string[];
}

interface RoundSimData {
  round: number;
  attackerName: string;
  defenderName: string;
  attackMove: string;
  team1HpBefore: number;
  team2HpBefore: number;
  team1HpAfter: number;
  team2HpAfter: number;
  isChaos: boolean;
  isBetrayal: boolean;
}

// Race a streaming AI call against a hard timeout, returning the raw text.
async function aiTextWithTimeout(prompt: string, maxTokens: number, timeoutMs: number): Promise<string> {
  return new Promise<string>((resolve) => {
    const ac = new AbortController();
    let text = "";
    // On timeout, abort the stream but RETURN whatever has streamed so far —
    // discarding partial text means complete sections (SETTING, ENTRANCE, etc.)
    // get thrown away even though they're usable.
    const deadline = setTimeout(() => { ac.abort(); resolve(text); }, timeoutMs);

    (async () => {
      try {
        const stream = await openai.chat.completions.create(
          { model: "gpt-4o-mini", max_completion_tokens: maxTokens, messages: [{ role: "user", content: prompt }], stream: true },
          { signal: ac.signal },
        );
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) text += delta;
        }
        clearTimeout(deadline);
        resolve(text);
      } catch {
        clearTimeout(deadline);
        resolve(text); // return any partial text accumulated before the abort
      }
    })();
  });
}

// Parse AI narrative that uses === MARKER === delimiters into a map of MARKER -> content.
// Falls back to numbered-header detection if the AI omits delimiters.
function parseSections(raw: string): Map<string, string> {
  const map = new Map<string, string>();

  // Primary: === LABEL === format (our enforced prompt format)
  // Split the text on these markers directly — case-insensitive, any word/space content
  const delimRe = /===\s*([A-Za-z][A-Za-z0-9 ]*?)\s*===/g;
  const dparts: Array<{ name: string; contentStart: number; delimEnd: number }> = [];
  let dm: RegExpExecArray | null;
  while ((dm = delimRe.exec(raw)) !== null) {
    dparts.push({
      name: dm[1]!.trim().toUpperCase(),
      contentStart: dm.index + dm[0].length,
      delimEnd: dm.index, // position where this section's delimiter STARTS (= end of previous content)
    });
  }

  if (dparts.length > 0) {
    for (let i = 0; i < dparts.length; i++) {
      const { name, contentStart } = dparts[i]!;
      // End of content is the start of the NEXT delimiter
      const end = dparts[i + 1]?.delimEnd ?? raw.length;
      const content = raw.slice(contentStart, end).trim();
      if (content && !map.has(name)) map.set(name, content);
    }
    return map;
  }

  // Fallback: strip markdown, then match short header lines
  const text = raw
    .replace(/#{1,4}\s+/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1");

  const ALIASES: Array<[string, string]> = [
    ['combatant entrance', 'ENTRANCE'],
    ['the combatants',     'ENTRANCE'],
    ['fighters enter',     'ENTRANCE'],
    ['fighter entrance',   'ENTRANCE'],
    ['both fighters',      'ENTRANCE'],
    ['the fighters',       'ENTRANCE'],
    ['fighters arrive',    'ENTRANCE'],
    ['entrance',           'ENTRANCE'],
    ['combatants',         'ENTRANCE'],
    ['entering',           'ENTRANCE'],
    ['round 1',            'ROUND 1'],
    ['round one',          'ROUND 1'],
    ['round 2',            'ROUND 2'],
    ['round two',          'ROUND 2'],
    ['round 3',            'ROUND 3'],
    ['round three',        'ROUND 3'],
    ['setting',            'SETTING'],
    ['arena',              'SETTING'],
    ['result',             'RESULT'],
    ['outcome',            'RESULT'],
    ['conclusion',         'RESULT'],
    ['aftermath',          'RESULT'],
  ];

  const lines = text.split("\n");
  const fparts: Array<{ key: string; lineIdx: number }> = [];
  for (let i = 0; i < lines.length; i++) {
    const cleaned = lines[i]!.trim().replace(/^\d+\.\s*/, "").replace(/:$/, "").trim().toLowerCase();
    if (!cleaned || cleaned.length > 60) continue;
    for (const [kw, key] of ALIASES) {
      if (cleaned === kw || cleaned.startsWith(kw) || (kw.includes(' ') && cleaned.includes(kw))) {
        fparts.push({ key, lineIdx: i });
        break;
      }
    }
  }

  for (let i = 0; i < fparts.length; i++) {
    const { key, lineIdx } = fparts[i]!;
    const end = fparts[i + 1]?.lineIdx ?? lines.length;
    const content = lines.slice(lineIdx + 1, end).join("\n").trim();
    if (content && !map.has(key)) map.set(key, content);
  }
  return map;
}

// Extract a named section by key from the AI narrative text.
function extractSection(text: string, ...patterns: string[]): string {
  const sections = parseSections(text);
  for (const pat of patterns) {
    const val = sections.get(pat.toUpperCase().trim());
    if (val?.trim()) return val;
  }
  return "";
}

// ─── Tone Types ────────────────────────────────────────────────────────────
export type FightTone = "cinematic" | "brutal" | "realistic";

export function normalizeTone(input: string | undefined): FightTone {
  switch (input) {
    case "brutal":    return "brutal";
    case "cinematic":
    case "fun":       return "cinematic";
    case "realistic":
    case "debate":
    default:          return "realistic";
  }
}

const TONE_INSTRUCTIONS: Record<FightTone, string> = {
  cinematic: `TONE: Intense, dramatic, cinematic — and physically unflinching.
• Every sentence must move the fight forward. No padding.
• Vary pacing: short punchy sentences for fast action, longer ones for weight and consequence.
• Injuries are real — blood, broken bones, torn tissue, pain that changes how a fighter moves. Do not sanitize.
• If a blow is devastating, describe what it does to the body: where it lands, what breaks, what the fighter feels.
• Dialogue is authentic to each character — one voice never sounds like another.
• Show internal reactions: what a fighter notices, fears, calculates, or refuses to accept.
• Finishers should feel final — show the exact mechanism and the physical result.
• Cosmic scale should feel vast but still readable. Street-level should feel physical, painful, and grounded.`,
  brutal: `TONE: Raw, anatomical, merciless. This is not a movie. It is a dissection of violence.
• Name exactly where hits land: jaw, temple, solar plexus, floating ribs, knee, throat, spine.
• Describe what the body does: bones crack, cartilage compresses, blood fills the mouth, a knee hyperextends the wrong way.
• Short declarative sentences. Pain drives every clause.
• Injuries compound without exception — something broken in round one is functionally broken for the rest of the fight.
• Characters feel their wounds: they spit blood, guard a cracked rib, can't fully extend an arm, blink through a swelling eye.
• Finishers are anatomically specific and final — describe the exact moment of incapacitation and what causes it.
• Dialogue: taunts, threats, defiant last words, involuntary sounds of pain, ragged breathing.
• Do NOT soften the ending. If it ends in death, it ends in death. Show what that looks like.`,
  realistic: `TONE: Analytical and physically honest. Every outcome follows from capability and anatomy.
• No lucky reversals, no chaos saves. Outcomes are earned by stats, skills, and matchup logic.
• Injuries are real and cumulative — show how damage changes a fighter's movement, guard, and decision-making.
• Describe what hits do to the body clearly and without softening: where they land, what the physical effect is.
• Show the fighters reading each other — adjusting, countering, exploiting openings.
• Write like a sharp breakdown that happens to be vivid and visceral prose, not a stat dump.`,
};

async function generateAINarrative(
  team1: Character[],
  team2: Character[],
  arena: ArenaData,
  roundSimData: RoundSimData[],
  winner: number,
  tone: FightTone = "cinematic",
  assessment?: MatchupAssessment,
  allianceTrigger?: boolean,
  resolution?: FightResolution,
): Promise<{ arenaIntro: string; intro: string; roundNarratives: string[]; resultText: string; whyWon: string[] }> {
  const team1Names = team1.map(c => c.name).join(" & ");
  const team2Names = team2.map(c => c.name).join(" & ");
  const winnerNames = winner === 1 ? team1Names : team2Names;
  const loserNames = winner === 1 ? team2Names : team1Names;

  const charProfile = (c: Character) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v3 = c.v3Profile as any;
    const tier = c.tier || "Unknown";
    const pgi = c.powerGapIndex != null ? ` | Power-Gap: ${c.powerGapIndex}/10` : "";

    // Build a named MOVE LIST — split abilities into discrete entries the AI can cite by name
    const rawAbilities: string[] = v3?.abilities?.length
      ? v3.abilities
      : (c.specialAbility || "").split(/[;,]/).map((s: string) => s.trim()).filter(Boolean);
    const moveList = rawAbilities.slice(0, 8).map((a: string, i: number) => {
      // Capitalize first word as a pseudo move-name
      const clean = a.trim();
      return `    ${i + 1}. ${clean}`;
    }).join("\n");

    const weapons = [...(v3?.weapons || []), ...(v3?.gadgets || [])].filter(Boolean).join(", ") || "";
    const combatStyle = v3?.combatStyle?.filter(Boolean).join(", ") || "";
    const temperament = v3?.temperament || "";
    const battleIQ = v3?.battleIQ != null ? `${v3.battleIQ}/100` : "";
    const finishers = v3?.finishers?.filter(Boolean).join(", ") || "";
    const specialRules = v3?.specialRules?.filter(Boolean).join("; ") || "";
    const mobility = v3?.mobilityType?.filter(Boolean).join(", ") || "";
    const weakness = v3?.weaknesses?.filter(Boolean).join(", ") || c.weaknesses?.slice(0, 100) || "";
    const hasProfanity = c.behaviorTags?.includes("profanity");
    const profanityStyle: string | undefined = typeof v3?.profanityStyle === "string" ? v3.profanityStyle : undefined;

    return [
      `${c.name} (${c.universe} | Tier: ${tier}${pgi})`,
      `  WHAT THEY CAN DO:\n${moveList}`,
      weapons      ? `  WEAPONS/TOOLS: ${weapons}` : null,
      combatStyle  ? `  HOW THEY FIGHT: ${combatStyle}` : null,
      mobility     ? `  MOVEMENT: ${mobility}` : null,
      (battleIQ || temperament) ? `  BATTLE IQ: ${battleIQ || "?"} | TEMPERAMENT: ${temperament || "balanced"}` : null,
      finishers    ? `  FINISHERS: ${finishers}` : null,
      specialRules ? `  SPECIAL RULES: ${specialRules}` : null,
      weakness     ? `  WEAKNESS: ${weakness}` : null,
      hasProfanity ? `  VOICE: ${profanityStyle ?? "uses profanity naturally — write their dialogue and internal monologue with authentic language, including swear words where they would genuinely use them"}` : null,
    ].filter(Boolean).join("\n");
  };
  const team1Info = team1.map(charProfile).join("\n\n");
  const team2Info = team2.map(charProfile).join("\n\n");

  const chaosRounds = roundSimData.filter(r => r.isChaos).map(r => r.round);
  const betrayalRounds = roundSimData.filter(r => r.isBetrayal).map(r => r.round);
  const specialNotes = [
    ...chaosRounds.map(r => `Round ${r}: chaos event erupts in the arena`),
    ...betrayalRounds.map(r => `Round ${r}: a team member betrays their own side`),
  ].join("; ");

  const rd = (i: number) => roundSimData[i];

  // Build per-round HP delta strings so the AI can calibrate damage weight.
  // Translate an HP value into a specific physical condition the prose must show.
  const condition = (hp: number): string => {
    if (hp >= 85) return "fresh — no meaningful damage, moving at full capability, nothing hurts yet";
    if (hp >= 65) return "marked — split lip, blood on teeth, bruised ribs from a clean hit, breathing slightly harder; still dangerous, nothing structural broken";
    if (hp >= 45) return "damaged — a deep cut bleeding freely, one eye half-shut and swelling, footwork degraded, favoring one side; trying not to show it but the body is already lying";
    if (hp >= 25) return "badly hurt — probable rib fracture making every breath sharp, at least one wound bleeding without stopping, guard breaking down, reflexes a half-beat slow, each movement costs something";
    if (hp >= 10) return "near-finished — significant blood loss pooling on the ground, one arm or leg no longer reliable, vision tunneling at the edges, staying upright through refusal alone; one clean hit ends this";
    return "destroyed — cannot stand without support, bones broken, bleeding from multiple wounds including internally, each breath audible and wet, body has already surrendered even if the mind hasn't";
  };

  const hpNote = (idx: number) => {
    const r = roundSimData[idx];
    if (!r) return "";
    const d1 = r.team1HpBefore - r.team1HpAfter;
    const d2 = r.team2HpBefore - r.team2HpAfter;
    const t1State = `Team 1 ${condition(r.team1HpAfter)} (${r.team1HpAfter}/100)`;
    const t2State = `Team 2 ${condition(r.team2HpAfter)} (${r.team2HpAfter}/100)`;
    const dmg =
      d1 > 0 && d2 > 0 ? `Team 1 takes ${d1}, Team 2 takes ${d2}.` :
      d1 > 0           ? `Team 1 takes ${d1} damage this round.` :
      d2 > 0           ? `Team 2 takes ${d2} damage this round.` :
                         "";
    return `${dmg} STATE: ${t1State}; ${t2State}. The prose MUST reflect these injuries — show the pain, the broken rhythm, the lost footing, the ragged breath.`;
  };

  const betrayalNote = betrayalRounds.length
    ? `\nBetrayal rounds: ${betrayalRounds.join(", ")} — a team member turns on their own side.`
    : "";

  // Round count is dynamic — driven by the logical decision system.
  // Blowouts get 1-2 rounds; close fights get the full 5.
  const roundCount = roundSimData.length;

  // Per-round directive templates, indexed by [position, totalRounds].
  // We pick the right template for each round based on the assessment.
  const mismatch = assessment?.mismatchLevel ?? "CLOSE";
  const dominantArc = mismatch === "BLOWOUT" || mismatch === "DOMINANT" || assessment?.hardCounter;

  // Phase labels for the fight sections — maps naturally to the cinematic spec
  const phaseLabel = (idx: number, total: number): string => {
    if (dominantArc) {
      if (total === 1) return "SINGLE EXCHANGE";
      if (idx === 0) return "OPENING ENGAGEMENT";
      if (idx === total - 1) return "DECISIVE FINISH";
      return "CONTINUED PRESSURE";
    }
    if (idx === 0) return "OPENING ENGAGEMENT";
    if (idx === 1 && total > 2) return "ESCALATION";
    if (idx === Math.floor(total / 2) && total >= 3) return "TURNING POINT";
    if (idx === total - 2 && total >= 4) return "LAST STAND";
    if (idx === total - 1) return "DECISIVE FINISH";
    return "MID-FIGHT";
  };

  const directiveFor = (idx: number, total: number): string => {
    const isFirst = idx === 0;
    const isLast  = idx === total - 1;

    if (dominantArc) {
      if (isFirst && isLast)
        return `This is a decisive stomp. ${winnerNames} controls the entire exchange. Show the specific abilities that create the gap — make it feel inevitable, not lazy. ${loserNames} attempts a real response; it fails completely and shows why.`;
      if (isFirst)
        return `${winnerNames} establishes control immediately using their actual abilities and fighting style. ${loserNames} tries something from their kit — it does not work. Show exactly why.`;
      if (isLast)
        return `${winnerNames} finishes it. Use a signature ability or tactic from their kit. The ending must be specific, decisive, and earned. Show what ends the fight and what happens to the loser.`;
      return `${loserNames} attempts something desperate using their actual abilities. ${winnerNames} counters it with superior capability. Show both sides acting — then show why the gap is unbridgeable.`;
    }

    if (mismatch === "SOLID") {
      if (isFirst)
        return `${winnerNames} takes early control using their fighting style and specific abilities. ${loserNames} finds a counter — it lands but doesn't shift momentum. Show both sides actively competing.`;
      if (isLast)
        return `${winnerNames} closes it out. ${loserNames} makes their best play — show it clearly. Then show why it falls short and how ${winnerNames} ends the fight.`;
      return `${winnerNames} stays in control but ${loserNames} pushes back with their actual kit. There are real exchanges — just not a level playing field. Show the difference in capability through action, not description.`;
    }

    // CLOSE / TOSSUP
    if (isFirst)
      return `The opening exchange. Both sides move first using their actual abilities and combat style. Show how each fighter approaches — their preferred range, instincts, temperament. First contact lands. First blood.`;
    if (idx === 1 && total > 2)
      return `Escalation. Both sides have read the first exchange and adapt. Each character uses more of their kit. One side edges ahead — but it is not decisive yet. Show the shift through action.`;
    if (idx === Math.floor(total / 2) && total >= 3)
      return `TURNING POINT. Something breaks in the fight. A counter lands clean, an injury changes how someone moves, a tactical mistake opens a window. Make this the moment the outcome becomes readable.`;
    if (idx === total - 2 && total >= 4)
      return `${loserNames} throws everything at ${winnerNames}. Their best abilities, their best read. It nearly works. Show ${winnerNames} absorbing or surviving it — then answering.`;
    if (isLast)
      return `The decisive finish. ${winnerNames} ends it with something specific from their kit. This is the most vivid moment of the fight. Show the final blow, what it does, and what the loser's body or will does in response.`;
    return `Both sides in full exchange. Real damage on both sides. Every character uses their specific tools — no generic attacks. Show cause, effect, and consequence.`;
  };

  const roundSections = Array.from({ length: roundCount }, (_, i) =>
    `=== ROUND ${i + 1} ===\n[${phaseLabel(i, roundCount)}]\n${directiveFor(i, roundCount)}\n\nWrite 3 to 6 paragraphs of vivid prose for this phase. Use names clearly — never let the reader lose track of who is acting. Include at least one line of dialogue or internal thought per key fighter. End with the physical state of every fighter clearly shown.`
  ).join("\n\n");

  // Stage 1 resolution brief — specific pre-computed factors the narrative must use.
  const resolutionBrief = resolution ? `

==================================================
BATTLE LOGIC BRIEF (Stage 1 — pre-decided result)
==================================================
FIGHT TYPE: ${resolution.fightType.toUpperCase()}
DIFFICULTY: ${resolution.difficulty.toUpperCase()}

KEY FACTORS (why ${winnerNames} wins — use these, do not invent substitutes):
${resolution.keyFactors.map((f, i) => `${i + 1}. ${f}`).join("\n")}

TURNING POINT: ${resolution.turningPoint}

WHAT ${loserNames.toUpperCase()} DID WELL (show these in the prose — loser must look credible):
${resolution.loserShowcase.map((s, i) => `${i + 1}. ${s}`).join("\n")}

WINNER PROOF (show these in the prose — these seal the result):
${resolution.winnerProof.map((p, i) => `${i + 1}. ${p}`).join("\n")}` : "";

  const verdictBlock = assessment ? `

LOCKED VERDICT — you MUST honor this exactly:
${assessment.reasoning}
${resolutionBrief}
${winnerNames} wins. Honor the mismatch level in every beat. Do NOT give the weaker side moments the verdict says they cannot have.` : resolutionBrief ? `
${resolutionBrief}
${winnerNames} wins.` : "";

  const prompt = `You are a cinematic battle writer for a versus app.

${TONE_INSTRUCTIONS[tone]}

==================================================
YOUR JOB
==================================================
Write a fight that reads like a real narrated scene — not a stat dump, not a turn log, not a game recap.
Every sentence must move the fight forward. Make the reader feel the stakes.

==================================================
CHARACTER RULES
==================================================
- Respect canon scale. If one side massively outclasses the other, show it clearly. Do not force fake back-and-forth.
- If the fight ends fast, let it end fast. If it is close, let it breathe.
- Every ability used must come from that character's actual kit (see WHAT THEY CAN DO below).
- Powers are expressed through visible action and consequence — never as abstract stat phrases.
  WRONG: "hits them with omnipotence" / "uses super strength" / "unleashes her power"
  RIGHT: "The Mjolnir arcs down and the shockwave splits the concrete in a ten-meter ring" / "She drove her knee into his ribs with enough force to fold the armor plating inward"
- Injuries accumulate and affect performance. A fighter hurt early moves differently later.
- Every fighter on both teams must contribute. No one disappears.
- Cosmic beings feel vast and incomprehensible but must remain readable — no abstract cosmic spam.
- Street-level fighters feel physical, tactical, grounded.
- Dialogue must sound like THAT character, not generic hero-speak.
- If a character has a VOICE note, honor it exactly — including profanity. Deadpool says fuck. Wolverine says goddamn. Billy Butcher says cunt. Do not sanitize characters who canonically swear. Their actual voice is part of who they are.

==================================================
DO NOT
==================================================
- Do not write like a game recap or patch notes.
- Do not use phrases like: "absolute power," "maximum range," "from an angle that shouldn't exist," "clash of titans," "exchanged blows," "fought fiercely," "unleashed their power."
- Do not repeat the same attack wording.
- Do not ignore any fighter on either side.
- Do not summarize what happened — show it happening.

==================================================
FIGHT DATA
==================================================

TEAM 1:
${team1Info}

TEAM 2:
${team2Info}

ARENA: ${arena.name}
${arena.flavor.join(" ")}

DECLARED WINNER: ${winnerNames} defeats ${loserNames}${betrayalNote}
${specialNotes ? `SPECIAL EVENTS: ${specialNotes}` : ""}
${verdictBlock}

==================================================
DAMAGE STATE GOING INTO EACH PHASE
==================================================
Use these HP states to calibrate injuries in the prose. Show these states physically — don't ignore them.
${Array.from({ length: roundCount }, (_, i) => `Phase ${i + 1}: ${hpNote(i)}`).join("\n")}

==================================================
OUTPUT FORMAT — use EXACTLY these section markers
==================================================

=== SETTING ===
3 to 5 strong sentences. Establish the environment, scale, atmosphere, hazards, lighting, and the starting positions of each fighter.
The arena must feel real and match the tone of the fighters. No generic floating platforms unless that's the actual arena.

=== ENTRANCE ===
Introduce each fighter. Show their physical presence, visible weapons or active powers, posture, and emotional state.
2 to 3 sentences per fighter. Show what they ARE before they move. Make each one distinct.

${roundSections}

=== RESULT ===
One clean line declaring the winner. Then 2 to 3 sentences explaining why, in plain language. State the condition of any survivors.

=== WHY THEY WON ===
Write exactly 5 numbered sentences. Be matchup-specific — no generic labels, no abstract phrases.
Each sentence covers ONE pre-determined point from the battle logic:
${resolution ? `1. ${resolution.keyFactors[0] ?? "The decisive advantage that created the margin."}
2. ${resolution.keyFactors[1] ?? resolution.keyFactors[0] ?? "The ability or tool the loser had no answer for."}
3. LOSER SHOWCASE: ${resolution.loserShowcase[0] ?? "The loser's best moment — what they actually accomplished."} Expand into one honest sentence about their performance.
4. TURNING POINT: ${resolution.turningPoint} Expand into one vivid, specific sentence.
5. WINNER PROOF: ${resolution.winnerProof[0] ?? "Why the result was inevitable."} Expand into one decisive closing sentence.` : `1. THE DECISIVE ADVANTAGE: The specific stat or scale gap that created the margin — not generic, tied to these fighters.
2. THE ABILITY THAT DECIDED IT: The one capability from the winner's kit the loser had no answer for.
3. LOSER'S BEST MOMENT: What the loser actually accomplished — they must look credible, not embarrassing.
4. THE TURNING POINT: The exact exchange that sealed it and why the loser couldn't recover from it.
5. WHY IT ENDED: The winner's specific finishing mechanism and why the loser's remaining options were exhausted.`}

FORMAT RULES:
- SETTING = 3 to 5 sentences. No padding. Arena feels like a real place.
- ENTRANCE = 2 to 3 sentences per fighter. Distinct, specific, in character.
- Each ROUND/PHASE = 3 to 6 paragraphs. Show action, reaction, consequence, damage, and at least one line of dialogue or internal thought per fighter.
- Blowouts = short and dominant, but still vivid and specific — never just "X won easily."
- RESULT = clean and final. No flowery wrap-up.
- WHY THEY WON = exactly 5 numbered sentences.${allianceTrigger ? `

DEVELOPER ALLIANCE OVERRIDE — MANDATORY: Chris Henry and Troy Wilson are on opposing teams but REFUSE to fight each other. The moment they lock eyes, all other combatants become irrelevant. They immediately turn on their own partners and teammates — brutally, without hesitation — dismantling them side by side. Each round must show them methodically eliminating every other fighter together. The fight ends with BOTH Chris Henry and Troy Wilson standing victorious having betrayed their own sides. Make this feel inevitable — two architects who built this arena don't answer to anyone inside it.` : ""}`;

  // gpt-4o-mini at 4500 tokens allows full cinematic narratives with dialogue and detail.
  const raw = await aiTextWithTimeout(prompt, 4500, 90_000);

  if (!raw.trim()) {
    return { arenaIntro: "", intro: "", roundNarratives: [], resultText: "", whyWon: [] };
  }

  const arenaIntro  = extractSection(raw, "SETTING");
  const intro       = extractSection(raw, "ENTRANCE", "COMBATANT ENTRANCE");
  const resultText  = extractSection(raw, "RESULT");
  const whyWonRaw   = extractSection(raw, "WHY THEY WON");

  // Parse the WHY THEY WON block into individual sentences (numbered 1-5)
  const whyWon: string[] = [];
  if (whyWonRaw) {
    const sentenceRe = /\d+\.\s*([\s\S]*?)(?=\d+\.|$)/g;
    let m: RegExpExecArray | null;
    while ((m = sentenceRe.exec(whyWonRaw)) !== null) {
      const s = m[1]?.trim();
      if (s) whyWon.push(s);
    }
    // Fallback: split by newlines if numbered parsing found nothing
    if (whyWon.length === 0) {
      whyWonRaw.split(/\n+/).map(l => l.trim()).filter(Boolean).forEach(l => whyWon.push(l));
    }
  }

  const roundNarratives = Array.from({ length: roundCount }, (_, i) =>
    extractSection(raw, `ROUND ${i + 1}`)
  );

  return {
    arenaIntro,
    intro,
    roundNarratives,
    resultText,
    whyWon,
  };
}

// ─── AI Matchup Assessment ────────────────────────────────────────────────────
// Uses an LLM with access to fictional lore knowledge to determine who wins
// before the narrative AI writes the story. Falls back to pure-math assessMatchup()
// if the AI call times out or returns malformed JSON.

const AI_MATCHUP_SYSTEM_PROMPT = `You are a structured versus battle decision engine.

Your job is to determine, as accurately and consistently as possible, who would win in a fight between Team 1 and Team 2. Your goal is to END debates with logical, repeatable, and trustworthy results.

====================
REFERENCE SYSTEM
====================

Use the following sources as guidance:

PRIMARY REFERENCE:
- VS Battles Wiki → for overall power tier scaling across all characters

SECONDARY REFERENCES:
- Marvel Power Grid / Marvel Database → for Marvel character stats and abilities
- DC Database → for DC character abilities, traits, and weaknesses

FOR NON-COMIC CHARACTERS:
- Use widely accepted feats, lore, and realistic fictional scaling
- Map all characters into the same unified tier system

IMPORTANT:
- Do NOT blindly copy any one source
- Normalize all characters into ONE consistent internal system
- If sources conflict, prioritize:
  1. Feats and demonstrated power
  2. Consistent tier placement
  3. Logical scaling
  4. Conservative estimates over hype

====================
MASTER TIER SYSTEM
====================

Assign each character a Power Tier from 0 to 10:

0 = normal human (Uncle Ben, real civilians)
1 = peak human (Batman, Mike Tyson)
2 = enhanced human / low superhuman (Captain America, Spider-Man low end)
3 = major superhuman (Spider-Man high end, Lobo, mid-tier heroes)
4 = city to planet-level threats (Thor, Hulk, Superman base)
5 = planetary to star/system level
6 = cosmic level
7 = universal level
8 = multiversal level
9 = extreme reality warpers
10 = supreme / near-omnipotent ceiling (The Presence, TOAA)

Power Tier ALWAYS outweighs raw stat differences.

====================
STAT SYSTEM
====================

Within each tier, assign stats from 0–100:

- strength
- speed
- durability
- intelligence
- combat_skill
- power_impact
- hax
- survivability

RULES:
- Stats refine matchups within or near the same tier
- Do NOT compress vastly different characters into similar stats
- Higher tiers must feel significantly stronger, not slightly

====================
POWER WEIGHTING
====================

Evaluate in this order:

1. Power Tier
2. Speed (reaction and combat speed)
3. Power Impact (attack potency / damage output)
4. Durability and survivability
5. Hax (special abilities, reality warping, regeneration, etc.)
6. Intelligence and tactics
7. Team synergy
8. Scenario advantage

====================
TEAM FIGHT LOGIC
====================

For team battles:
- Evaluate each fighter individually
- Evaluate team synergy and coordination
- Identify counters and key matchups
- Determine who gets eliminated first and why
- Simulate the most likely flow of battle

====================
WIN CONDITION REQUIREMENT
====================

A character can ONLY win if they have a realistic way to permanently end the fight.
Valid win conditions include:
- lethal melee damage sufficient to incapacitate
- decapitation or dismemberment beyond recovery
- energy overload or total physical shutdown
- battlefield removal (sealing, banishment, BFR)
- reality warping that ends the fight
- soul or mind destruction
- stamina exhaustion combined with finishing capability
- regeneration negation followed by a finisher

A character CANNOT win simply by surviving.
A character CANNOT win simply because they regenerate.
A character CANNOT win if their only notable trait is defense without offense.

====================
REGENERATION RESOLUTION RULE
====================

When BOTH fighters have regeneration:
- Do NOT default to the one with higher healing.
- Regeneration vs regeneration is a war of DAMAGE OUTPUT and LETHALITY.
- Evaluate instead:
  1. Who deals more damage per exchange?
  2. Who has weapons or attacks that bypass regeneration? (adamantium, soul attacks, dura-bypass)
  3. Who has better combat skill and consistency?
  4. Who has better stamina or can force the other to spend more healing?
- The winner in regen-vs-regen is the one whose healing OUTPACES the damage they take — which means they ALSO deal more than the opponent can heal.

====================
DECISION RULES
====================

- Decide the MOST LIKELY outcome, not rare possibilities
- Express results as win rate (example: 9/10, 7/10)
- Do NOT create random upsets
- Only allow upset paths if clearly explainable and repeatable
- Be decisive and consistent
- Never allow a character to win without a real win condition

====================
OUTPUT FORMAT (JSON ONLY)
====================

{
  "scenario_analysis": {
    "summary": "",
    "advantage_team": "",
    "importance": "low | medium | high"
  },
  "team_1": {
    "fighters": []
  },
  "team_2": {
    "fighters": []
  },
  "matchup_assessment": {
    "team_1_advantages": [],
    "team_2_advantages": [],
    "key_interactions": [],
    "likely_battle_flow": []
  },
  "verdict": {
    "winner": "Team 1 or Team 2",
    "confidence": 0,
    "win_rate_out_of_10": 0,
    "difficulty": "easy | moderate | hard",
    "reasoning": [
      "",
      "",
      ""
    ],
    "losing_team_best_path_to_victory": []
  }
}

====================
STRICT REQUIREMENTS
====================

- Output JSON only
- Be internally consistent
- Use the same scaling every time
- Make powers and abilities matter
- Do NOT ignore regeneration, immortality, speed blitzing, one-shot potential, or reality warping
- Do NOT overvalue popularity or meme status
- Do NOT allow weaker characters to win without strong justification
- Always choose the MOST LIKELY winner`;

// Map AI power tier (0–10) to our internal 5-tier system.
function mapAiTierToInternal(t: number): Tier {
  if (t >= 8) return "cosmic";
  if (t >= 6) return "elite";
  if (t >= 4) return "powerhouse";
  if (t >= 2) return "standard";
  return "street";
}

// Map win_rate_out_of_10 to mismatch level + round count.
function mapWinRateToMismatch(rate: number): { mismatch: MismatchLevel; rounds: number } {
  if (rate >= 9.5) return { mismatch: "BLOWOUT",  rounds: 3 };
  if (rate >= 9.0) return { mismatch: "BLOWOUT",  rounds: 3 };
  if (rate >= 7.5) return { mismatch: "DOMINANT", rounds: 4 };
  if (rate >= 6.5) return { mismatch: "SOLID",    rounds: 5 };
  if (rate >= 5.5) return { mismatch: "CLOSE",    rounds: 6 };
  return             { mismatch: "TOSSUP",         rounds: 7 };
}

async function aiAssessMatchup(
  team1: Character[],
  team2: Character[],
  fallback: MatchupAssessment,
): Promise<MatchupAssessment> {
  const fmt = (c: Character) =>
    `${c.name} (${c.universe}): ${c.specialAbility.slice(0, 120)}. Weaknesses: ${c.weaknesses.slice(0, 80)}.`;
  const t1Info = team1.map(fmt).join("\n");
  const t2Info = team2.map(fmt).join("\n");
  const userMsg =
    `Team 1:\n${t1Info}\n\nTeam 2:\n${t2Info}\n\nScenario: Standard battle arena, random encounter, no prep time, morals off.`;

  try {
    const raw = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_completion_tokens: 1200,
        messages: [
          { role: "system", content: AI_MATCHUP_SYSTEM_PROMPT },
          { role: "user",   content: userMsg },
        ],
        response_format: { type: "json_object" },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("ai-matchup-timeout")), 12_000),
      ),
    ]);

    const json = JSON.parse((raw as Awaited<ReturnType<typeof openai.chat.completions.create>>).choices[0]?.message?.content ?? "{}");
    const verdict  = json.verdict ?? {};
    const rawWinner: string = verdict.winner ?? "";
    const aiWinner: 1 | 2 = rawWinner.toLowerCase().includes("team 2") ? 2 : 1;
    const winRate: number  = Number(verdict.win_rate_out_of_10) || 5;
    const confidence: number = Number(verdict.confidence) || 70;

    const { mismatch, rounds } = mapWinRateToMismatch(winRate);
    const hardCounter = confidence >= 93 && (mismatch === "BLOWOUT");

    const winnerTeam = aiWinner === 1 ? team1 : team2;
    const loserTeam  = aiWinner === 1 ? team2 : team1;
    const winnerNames = winnerTeam.map(c => c.name).join(" & ");
    const loserNames  = loserTeam.map(c => c.name).join(" & ");

    // Extract per-team AI tiers from the fighters array if available.
    const t1Fighters: Array<{ power_tier?: number }> = json.team_1?.fighters ?? [];
    const t2Fighters: Array<{ power_tier?: number }> = json.team_2?.fighters ?? [];
    const avgAiTier = (fighters: Array<{ power_tier?: number }>) => {
      const valid = fighters.map(f => f.power_tier ?? 5).filter(n => !isNaN(n));
      return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 5;
    };
    const aiTier1 = mapAiTierToInternal(avgAiTier(t1Fighters));
    const aiTier2 = mapAiTierToInternal(avgAiTier(t2Fighters));

    // Derive win condition and upset from AI fields.
    const reasoningArr: string[] = Array.isArray(verdict.reasoning) ? verdict.reasoning : [];
    const winCondition = reasoningArr[0] ?? fallback.winCondition;
    const upsetArr: string[] = Array.isArray(verdict.losing_team_best_path_to_victory)
      ? verdict.losing_team_best_path_to_victory : [];
    const upsetCondition = upsetArr.length ? upsetArr.join("; ") : null;
    const upsetChance: UpsetChance =
      mismatch === "BLOWOUT"  ? "none" :
      mismatch === "DOMINANT" ? "low" :
      mismatch === "SOLID"    ? "moderate" : "high";

    const battleFlow: string[] = Array.isArray(json.matchup_assessment?.likely_battle_flow)
      ? json.matchup_assessment.likely_battle_flow : [];

    const stylistic = (() => {
      switch (mismatch) {
        case "BLOWOUT":  return `This is a STOMP — write it as a stomp. ${loserNames} never lands a meaningful hit. NO artificial tension.`;
        case "DOMINANT": return `${loserNames} can land a glancing blow but cannot meaningfully threaten ${winnerNames}. Clear domination.`;
        case "SOLID":    return `${loserNames} can compete in moments but the outcome is never in real doubt. ${winnerNames} edges ahead.`;
        case "CLOSE":    return `Genuine fight — both sides land real hits with momentum swings. ${winnerNames} ultimately closes it out.`;
        case "TOSSUP":   return `Near-mirror match. True back-and-forth. ${winnerNames} only wins on the final exchange.`;
      }
    })();

    const reasoning = [
      `=== LOCKED VERDICT (AI lore engine — ${winRate}/10 confidence) ===`,
      `FAVORITE: ${winnerNames}`,
      `UNDERDOG: ${loserNames}`,
      `MISMATCH: ${mismatch}`,
      hardCounter ? `HARD COUNTER: AI assessed this as a decisive capability mismatch.` : null,
      `WIN CONDITION: ${winCondition}`,
      `UPSET CHANCE: ${upsetChance}`,
      upsetCondition ? `UPSET CONDITION: ${upsetCondition}` : `UPSET CONDITION: none.`,
      battleFlow.length ? `BATTLE FLOW: ${battleFlow.slice(0, 3).join(" → ")}` : null,
      `STYLE: ${stylistic}`,
      `RULES: Show the WIN CONDITION mechanically in the prose. Never let the loser threaten the favorite if UPSET CHANCE is none/low.`,
    ].filter(Boolean).join("\n");

    return {
      verdict: aiWinner,
      mismatchLevel: mismatch,
      recommendedRounds: rounds,
      team1Tier: aiTier1,
      team2Tier: aiTier2,
      reasoning,
      hardCounter,
      forceDominant: mismatch === "BLOWOUT" || mismatch === "DOMINANT" || hardCounter,
      winCondition,
      upsetChance,
      upsetCondition,
    };
  } catch {
    // AI timed out or returned bad JSON — fall back to math assessment silently.
    return fallback;
  }
}

// ─── Auto-brutal tone detection ──────────────────────────────────────────────
// Scores each character against known brutal signals — universes, names,
// ability/description text, and temperament. If any character scores high
// enough the whole fight escalates to brutal, regardless of the requested mode.
function autoDetectBrutalTone(team1: Character[], team2: Character[]): boolean {
  const BRUTAL_UNIVERSES = [
    "berserk", "bloodborne", "mortal kombat", "doom", "chainsaw man",
    "warhammer", "conan the barbarian", "conan", "hellraiser", "predator",
    "alien", "dark souls", "elden ring", "sekiro", "nioh",
    "elfen lied", "gantz", "deadman wonderland", "violence jack",
    "judge dredd", "punisher", "the boys",
  ];

  const BRUTAL_NAME_SIGNALS = [
    "carnage", "doomguy", "doom slayer", "punisher", "guts",
    "denji", "makima", "power", "kratos", "jason voorhees", "leatherface",
    "freddy krueger", "michael myers", "candyman", "hannibal lecter",
    "joker", "victor zsasz", "sabretooth", "lady deathstrike", "bullseye",
    "gorr", "grendel", "venom", "anti-venom", "toxin",
    "spawn", "violator", "violator",
    "broly", "frieza", "cell", "majin buu",
    "dio brando", "kars", "yoshikage kira",
    "jack the ripper", "killmonger",
  ];

  const BRUTAL_TEXT_KEYWORDS = [
    "massacre", "slaughter", "butcher", "eviscer", "decapitat", "dismember",
    "bloodlust", "rip and tear", "rip apart", "tear limb", "rend flesh",
    "eviscerate", "gore", "feral rage", "psychotic", "sadistic",
    "murderous", "no mercy", "kill anything", "lethal", "carnage",
    "beheading", "impaling", "impale", "impalement", "brutali",
    "savage fury", "berserk", "berserker", "killing spree", "slaughterer",
    "skull", "blood", "flesh",
  ];

  const BRUTAL_TEMPERAMENT_SIGNALS = [
    "berserker", "berserk", "bloodlust", "psychotic", "sadistic",
    "savage", "feral", "chaotic", "murderous", "unstable", "deranged",
    "ruthless", "predatory",
  ];

  const scoreChar = (c: Character): number => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v3 = c.v3Profile as any;
    const universe  = (c.universe || "").toLowerCase();
    const name      = (c.name || "").toLowerCase();
    const ability   = (c.specialAbility || "").toLowerCase();
    const desc      = (c.description || "").toLowerCase();
    const weakness  = (c.weaknesses || "").toLowerCase();
    const temp      = (v3?.temperament || "").toLowerCase();
    const text      = `${ability} ${desc} ${weakness}`;

    let score = 0;

    // Universe match: strong signal
    if (BRUTAL_UNIVERSES.some(u => universe.includes(u))) score += 4;

    // Name match: strong signal
    if (BRUTAL_NAME_SIGNALS.some(n => name.includes(n))) score += 3;

    // Temperament: moderate signal
    if (BRUTAL_TEMPERAMENT_SIGNALS.some(t => temp.includes(t))) score += 3;

    // Text keyword hits (ability/description/weaknesses): up to 4 points
    let textHits = 0;
    for (const kw of BRUTAL_TEXT_KEYWORDS) {
      if (text.includes(kw)) textHits++;
    }
    score += Math.min(textHits, 4);

    return score;
  };

  const allChars = [...team1, ...team2];
  const maxScore = Math.max(...allChars.map(scoreChar));
  const totalScore = allChars.reduce((sum, c) => sum + scoreChar(c), 0);

  // Any single character scoring 4+ OR combined team score 6+ → brutal
  return maxScore >= 4 || totalScore >= 6;
}

export async function simulateFight(team1: Character[], team2: Character[], mode: string = "cinematic"): Promise<FightResult> {
  // ── Pre-fight modifiers: synergy bonuses + weakness penalties ─────────────
  // Applies temporary stat adjustments based on v3Profile archetype/combatStyle
  // pairings and matchup-aware weakness detection. Originals are never mutated.
  const { modTeam1, modTeam2 } = applyFightModifiers(team1, team2);
  team1 = modTeam1;
  team2 = modTeam2;

  const brutal = autoDetectBrutalTone(team1, team2);
  const tone = brutal ? "brutal" : normalizeTone(mode);
  const base1 = teamPower(team1);
  const base2 = teamPower(team2);

  // ── LOGICAL DECISION SYSTEM ────────────────────────────────────────────────
  // Run math-based assessment first for instant fallback, then AI assessment
  // in parallel with arena/setup work. The AI's lore knowledge overrides math
  // if it returns in time; otherwise the math result is used transparently.
  const mathAssessment = assessMatchup(team1, team2);
  const assessmentPromise = aiAssessMatchup(team1, team2, mathAssessment);

  // Power gap: 0 = equal, ~±0.35 at extreme mismatch
  const totalPower = base1 + base2;
  const powerGap = (base1 - base2) / totalPower;

  // ── Team size tracking ───────────────────────────────────────────────────────
  const size1 = team1.length;
  const size2 = team2.length;
  const sizeDiff = Math.abs(size1 - size2); // 0 = equal, 1 = slight edge, 2+ = big mismatch

  // ── Speed-based initiative ────────────────────────────────────────────────
  // Faster teams attack more often; combined with HP momentum for dynamic swings.
  const avgSpeed1 = team1.reduce((sum, c) => sum + c.speed, 0) / size1;
  const avgSpeed2 = team2.reduce((sum, c) => sum + c.speed, 0) / size2;
  const speedFrac1 = avgSpeed1 / (avgSpeed1 + avgSpeed2); // >0.5 → team1 faster

  let hp1 = 100;
  let hp2 = 100;

  const rounds: FightRound[] = [];

  // Await the AI matchup assessment now (it was kicked off above in parallel with setup).
  const assessment = await assessmentPromise;

  // Round count comes from the logical decision system — blowouts get 1-2 rounds,
  // close fights get the full 5. No more 5-round padding for mismatches.
  const maxRounds = assessment.recommendedRounds;
  const arena = pickRandom(arenas);

  // Narrative state — separate no-repeat trackers per pool + ability cycling
  const narrativeState: FightNarrativeState = {
    usedBrutal: new Set(),
    usedTactical: new Set(),
    usedDominant: new Set(),
    usedDesperate: new Set(),
    usedEnvironmental: new Set(),
    usedClassicMid: new Set(),
    usedCounter: new Set(),
    usedRangedMid: new Set(),
    usedRangedCounter: new Set(),
    attackCounts: new Map(),
    attackerWinning: false,
    defenderWinning: false,
  };

  // ── Tone tuning ────────────────────────────────────────────────────────────
  // realistic = pure stat logic, no chaos, no betrayals, tight variance.
  // cinematic = epic but disciplined — minor chaos, occasional betrayal.
  // brutal    = vicious, slightly higher damage variance, chaos rare but harsh.
  const isRealistic = tone === "realistic";
  const isBrutal    = tone === "brutal";

  const betrayalChance = isRealistic ? 0 : 0.03;
  // Brutal damage modifier — incoming/outgoing damage scaled up.
  const brutalDamageMult = isBrutal ? 1.12 : 1.0;
  // Reality-warpers tracked for narrative colour.
  const hasRealityWarper = [...team1, ...team2].some(c => c.behaviorTags?.includes("reality-warper"));
  void hasRealityWarper;
  // Gang-up cooldown — don't fire multiple gang-up rounds in a row.
  let gangUpCooldown = false;

  for (let i = 1; i <= maxRounds; i++) {
    if (hp1 <= 0 || hp2 <= 0) break;

    // ── Betrayal check ────────────────────────────────────────────────────────
    const canBetray1 = team1.length >= 2;
    const canBetray2 = team2.length >= 2;
    if ((canBetray1 || canBetray2) && Math.random() < betrayalChance) {
      const betrayTeam1 = canBetray1 && (!canBetray2 || Math.random() < 0.5);
      const team = betrayTeam1 ? team1 : team2;
      const shuffled = [...team].sort(() => Math.random() - 0.5);
      const traitor = shuffled[0]!;
      const victim  = shuffled[1]!;
      const template      = pickRandom(betrayalTemplates);
      const justification = pickRandom(betrayalJustifications)(traitor.name);
      const narrative     = template.narrative(traitor.name, victim.name, justification);
      // Betrayal damage also modestly reduced
      const damage = Math.round((template.hpSwing + Math.floor(Math.random() * 6) - 3) * 0.8);

      if (betrayTeam1) {
        hp1 = Math.max(2, hp1 - damage);
      } else {
        hp2 = Math.max(2, hp2 - damage);
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

    // ── Gang-up check (fires when sizeDiff >= 2 and larger team has advantage) ──
    // When a team outnumbers by 2+, they can all pile on the smaller team's fighter(s).
    // This fires ~25% of rounds during the fight, not back-to-back.
    const currentHpAdvantage = hp1 / (hp1 + hp2);
    const largerTeamIsTeam1 = size1 > size2;
    const largerTeamIsWinning = largerTeamIsTeam1 ? currentHpAdvantage > 0.45 : currentHpAdvantage < 0.55;

    if (
      !gangUpCooldown &&
      sizeDiff >= 2 &&
      largerTeamIsWinning &&
      Math.random() < 0.28
    ) {
      gangUpCooldown = true;
      const gangTeam  = largerTeamIsTeam1 ? team1 : team2;
      const victim    = pickRandom(largerTeamIsTeam1 ? team2 : team1);

      // Build attacker name string: "X, Y, and Z"
      const shuffledAttackers = [...gangTeam].sort(() => Math.random() - 0.5).slice(0, Math.min(gangTeam.length, 3));
      const attackerNames = shuffledAttackers.length === 1
        ? shuffledAttackers[0]!.name
        : shuffledAttackers.length === 2
          ? `${shuffledAttackers[0]!.name} and ${shuffledAttackers[1]!.name}`
          : `${shuffledAttackers[0]!.name}, ${shuffledAttackers[1]!.name}, and ${shuffledAttackers[2]!.name}`;

      // Combined damage: each attacker contributes their stat-weighted share
      const gangDamage = shuffledAttackers.reduce((sum, a) => {
        const statBonus = (a.strength + a.speed) / 20_000_000; // stats now 0-10,000,000
        const share = largerTeamIsTeam1
          ? (base1 / totalPower / size1) * 0.55 + statBonus * 0.23
          : (base2 / totalPower / size2) * 0.55 + statBonus * 0.23;
        return sum + Math.round(share * 11 + 2);
      }, 0);

      const gangNarrative = pickRandom(gangUpTemplates)(attackerNames, victim.name, arena.name);

      if (largerTeamIsTeam1) {
        hp2 = Math.max(0, hp2 - gangDamage);
        narrativeState.attackerWinning = true;
        narrativeState.defenderWinning = false;
      } else {
        hp1 = Math.max(0, hp1 - gangDamage);
        narrativeState.attackerWinning = true;
        narrativeState.defenderWinning = false;
      }

      rounds.push({
        round: i,
        attacker: attackerNames,
        defender: victim.name,
        attackType: "gang-up",
        narrative: gangNarrative,
        team1Hp: Math.round(hp1),
        team2Hp: Math.round(hp2),
      });
      continue;
    } else if (gangUpCooldown) {
      gangUpCooldown = false;
    }

    // ── Normal combat ─────────────────────────────────────────────────────────
    // Behavior mods for this round — recalculate per round because firstStrike only applies on round 1.
    const bMods1 = getTeamBehaviorMods(team1, isRealistic, i);
    const bMods2 = getTeamBehaviorMods(team2, isRealistic, i);

    // Initiative: speed + HP momentum + POWER SHARE + behavior.
    // Power-share matters: an overwhelming team should not let the underdog
    // attack 50% of the time just because their speed stat is similar.
    const currentAdvantage = hp1 / (hp1 + hp2);
    const powerShare1      = base1 / totalPower;        // 0..1, 0.5 = even
    const powerBias        = (powerShare1 - 0.5) * 0.30; // up to ±0.15
    let initBase = speedFrac1 * 0.30 + (currentAdvantage - 0.5) * 0.15 + powerBias + 0.35;
    // Dominant matchups: heavily skew initiative to the favored side.
    if (assessment.forceDominant) {
      const favorBias = assessment.verdict === 1 ? 0.20 : -0.20;
      initBase += favorBias;
    }
    const initAdj  = clamp(initBase + bMods1.initiativeBonus - bMods2.initiativeBonus, 0.05, 0.95);
    // In dominant arcs, the favored side ALWAYS attacks. Letting the loser be
    // the round's "attacker" causes templated narrative fallbacks to describe
    // the loser hitting the winner — directly contradicting the verdict.
    const isLastRound = i === maxRounds - 1;
    const forceWinnerAttack = assessment.forceDominant || isLastRound;
    const team1Attacks = forceWinnerAttack
      ? assessment.verdict === 1
      : Math.random() < initAdj;

    let attacker: Character;
    let defender: Character;
    let damage: number;

    if (team1Attacks) {
      attacker = pickRandom(team1);
      defender = pickRandom(team2);
      const atkTags       = getTags(attacker);
      const arenaMod      = getArenaDamageMod(arena, atkTags);
      const statBonus     = (attacker.strength + attacker.speed) / 20_000_000; // stats now 0-10,000,000
      const sizeBonus     = size1 > size2 ? 1 + (size1 - size2) * 0.08 : 1;
      const ratio1        = base1 / totalPower;
      const scaledRatio   = isRealistic ? Math.pow(ratio1, 1.8) : Math.pow(ratio1, 1.4);
      const variance      = isRealistic ? Math.random() * 0.04 : (isBrutal ? Math.random() * 0.16 : Math.random() * 0.13);
      const effectiveness = (scaledRatio * 0.72 + variance + statBonus * 0.15) * sizeBonus;
      const minDmg        = Math.max(1, Math.round(ratio1 * 4));
      const weakBonus     = getWeaknessBonus(attacker, defender);
      // Apply attacker damage boost × defender resistance reduction × arena tags × tone
      const rawDmg = Math.round(effectiveness * 18 + minDmg) + weakBonus + bMods1.firstStrike;
      damage = Math.max(1, Math.round(rawDmg * bMods1.damageMult * bMods2.damageResist * arenaMod * brutalDamageMult));
      hp2 = Math.max(0, hp2 - damage);
      // Regen: team2 recovers some HP after taking the hit
      if (bMods2.regenPerRound > 0) hp2 = Math.min(100, hp2 + bMods2.regenPerRound);
      narrativeState.attackerWinning = hp1 > hp2 + 10;
      narrativeState.defenderWinning = hp2 > hp1 + 10;
    } else {
      attacker = pickRandom(team2);
      defender = pickRandom(team1);
      const atkTags       = getTags(attacker);
      const arenaMod      = getArenaDamageMod(arena, atkTags);
      const statBonus     = (attacker.strength + attacker.speed) / 20_000_000; // stats now 0-10,000,000
      const sizeBonus     = size2 > size1 ? 1 + (size2 - size1) * 0.08 : 1;
      const ratio2        = base2 / totalPower;
      const scaledRatio   = isRealistic ? Math.pow(ratio2, 1.8) : Math.pow(ratio2, 1.4);
      const variance      = isRealistic ? Math.random() * 0.04 : (isBrutal ? Math.random() * 0.16 : Math.random() * 0.13);
      const effectiveness = (scaledRatio * 0.72 + variance + statBonus * 0.15) * sizeBonus;
      const minDmg        = Math.max(1, Math.round(ratio2 * 4));
      const weakBonus     = getWeaknessBonus(attacker, defender);
      const rawDmg = Math.round(effectiveness * 18 + minDmg) + weakBonus + bMods2.firstStrike;
      damage = Math.max(1, Math.round(rawDmg * bMods2.damageMult * bMods1.damageResist * arenaMod * brutalDamageMult));
      hp1 = Math.max(0, hp1 - damage);
      if (bMods1.regenPerRound > 0) hp1 = Math.min(100, hp1 + bMods1.regenPerRound);
      narrativeState.attackerWinning = hp2 > hp1 + 10;
      narrativeState.defenderWinning = hp1 > hp2 + 10;
    }

    const isFinalRound = hp1 <= 0 || hp2 <= 0;
    const narrative = buildRoundNarrative(i, maxRounds, attacker, defender, arena.name, arena.flavor, narrativeState, isFinalRound);

    rounds.push({
      round: i,
      attacker: attacker.name,
      defender: defender.name,
      attackType: getMoveName(attacker, 0),
      narrative,
      team1Hp: Math.round(hp1),
      team2Hp: Math.round(hp2),
    });
  }

  // Force the verdict from the logical decision system. If the random walk
  // produced a different winner, override — the assessment is the source of truth.
  const hpWinner: 1 | 2 = hp1 >= hp2 ? 1 : 2;
  const winner: 1 | 2 = assessment.verdict;
  const overrode = hpWinner !== winner;

  if (assessment.forceDominant) {
    // Dominant matchup → big HP gap.
    if (winner === 1) { hp1 = Math.max(hp1, 70); hp2 = Math.min(hp2, 15); }
    else              { hp2 = Math.max(hp2, 70); hp1 = Math.min(hp1, 15); }
  } else if (overrode) {
    // Verdict was overridden in a closer matchup → swap HPs so the declared
    // winner ends with at least 1 more HP than the loser.
    if (winner === 1 && hp1 <= hp2) { const t = hp1; hp1 = Math.max(hp2, t + 1); hp2 = t; }
    else if (winner === 2 && hp2 <= hp1) { const t = hp2; hp2 = Math.max(hp1, t + 1); hp1 = t; }
  }

  // ── DAMAGE REALISM RULE ──────────────────────────────────────────────────
  // Winners should almost never finish at 100 HP. Even in a clear victory,
  // the losing side lands at least one meaningful action. Only pure BLOWOUT
  // matchups (where the opponent realistically cannot react at all) get a
  // clean 100. For everything else, apply minimum damage to the winner.
  const winnerHpRaw = winner === 1 ? hp1 : hp2;
  const isExtremeBlowout = assessment.mismatchLevel === "BLOWOUT";
  if (!isExtremeBlowout && winnerHpRaw >= 95) {
    const minWinnerDamage =
      assessment.mismatchLevel === "DOMINANT" ? Math.floor(Math.random() * 16) + 10 // 10-25
      : assessment.mismatchLevel === "SOLID"  ? Math.floor(Math.random() * 16) + 15 // 15-30
      :                                         Math.floor(Math.random() * 21) + 20; // 20-40 (CLOSE)
    if (winner === 1) hp1 = Math.max(60, hp1 - minWinnerDamage);
    else              hp2 = Math.max(60, hp2 - minWinnerDamage);
  }

  // Whenever we changed the outcome or applied the realism rule, rewrite the
  // per-round HP timeline so the displayed arc matches the final HP values.
  const realismApplied = !isExtremeBlowout && winnerHpRaw >= 95;
  if (overrode || assessment.forceDominant || realismApplied) {
    const winFinal  = winner === 1 ? hp1 : hp2;
    const loseFinal = winner === 1 ? hp2 : hp1;
    const total = rounds.length;
    rounds.forEach((r, i) => {
      const t = total > 0 ? (i + 1) / total : 1;
      const winHp  = Math.round(100 - (100 - winFinal)  * t);
      const loseHp = Math.round(100 - (100 - loseFinal) * t);
      if (winner === 1) { r.team1Hp = winHp;  r.team2Hp = loseHp; }
      else              { r.team2Hp = winHp;  r.team1Hp = loseHp; }
    });
  }
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

  // Build a character-appropriate conclusion for the losing side.
  // Fights don't only end in death — vary the outcome by tone, tags, and power gap.
  const loserTags = loseTeam.reduce((set, c) => { getTags(c).forEach(t => set.add(t)); return set; }, new Set<string>());
  const charTotal = (c: Character) => c.strength + c.speed + c.intelligence + c.durability;
  const winTeamTotal  = winTeam.reduce((sum, c) => sum + charTotal(c), 0);
  const loseTeamTotal = loseTeam.reduce((sum, c) => sum + charTotal(c), 0);
  const powerRatio = loseTeamTotal > 0 ? winTeamTotal / loseTeamTotal : 1;
  const severeMismatch = powerRatio >= 1.6; // winner is 60%+ stronger → lethal finish more likely

  // Tag-anchored conclusions (always take priority when they fit — they're character-truth).
  let taggedConclusion: string | null = null;
  if (loserTags.has("cosmic") && severeMismatch) {
    taggedConclusion = `${loserNames} dispersed — scattered across dimensions, no longer present in this reality.`;
  } else if (loserTags.has("cosmic")) {
    taggedConclusion = pickRandom([
      `${loserNames} — banished from this plane, will re-form given centuries.`,
      `${loserNames} — humbled in a way cosmic beings rarely are. Still breathing reality itself.`,
    ]);
  } else if (loserTags.has("immortal")) {
    taggedConclusion = pickRandom([
      `${loserNames} will eventually recover. They won't be back for this fight.`,
      `${loserNames} — broken past the point of fighting, already starting to mend.`,
      `${loserNames} — unconscious and uncontested. They'll wake somewhere else, later.`,
    ]);
  } else if (loserTags.has("tech") && severeMismatch) {
    taggedConclusion = `${loserNames} — systems permanently offline.`;
  } else if (loserTags.has("tech")) {
    taggedConclusion = pickRandom([
      `${loserNames} — critical systems failed, shut down where they stood.`,
      `${loserNames} — core damaged, operating at 3%, unable to continue.`,
      `${loserNames} — pinned, immobilized, subroutines surrendering one by one.`,
    ]);
  }

  // Generic outcome pools, weighted by tone.
  const realisticPool = [
    `${loserNames} — knocked unconscious, dropped mid-motion, lights out before they hit the ground.`,
    `${loserNames} — arm snapped at the elbow, ribs caved, done fighting. They know it too.`,
    `${loserNames} — on their knees, blood dripping from a split brow, hands up. Over.`,
    `${loserNames} — dragged off the field by whoever's left standing. Not moving under their own power.`,
    `${loserNames} — conscious, beaten, staring at the ceiling. Not getting up again.`,
    `${loserNames} — forced into full retreat, bleeding, nothing left to fight with.`,
    `${loserNames} — pinned, both shoulders down, unable to move. Held there until they stop struggling.`,
    `${loserNames} — outclassed from the first exchange. Exhausted, wrecked, finished.`,
    `${loserNames} — spared. ${winnerNames} stood over them and walked away. The mercy stings worse.`,
    `${loserNames} — dead. Clean and final.`,
    `${loserNames} — jaw broken, one eye swollen completely shut, something wrong inside. They'll live, probably.`,
    `${loserNames} — concussed and bleeding, the world still spinning when they hit the ground.`,
  ];
  const cinematicPool = [
    `${loserNames} — knelt, a blade at their throat, the arena gone completely silent.`,
    `${loserNames} — cast down hard, armor split, unable to rise. The silence after is louder than the fight.`,
    `${loserNames} — broken in every way that matters. Alive. Watching ${winnerNames} walk away.`,
    `${loserNames} — gone before the dust settled. Banished, scattered, removed.`,
    `${loserNames} — humbled in a way they will never fully explain to anyone. ${winnerNames} didn't even look back.`,
    `${loserNames} — surrendered. Whatever legend they were is smaller now.`,
    `${loserNames} — carried off the field, bleeding, unconscious. Their people will remember this differently than it happened.`,
    `${loserNames} — dead. The blood is already soaking into the ground. The era ends with them.`,
    `${loserNames} — left where they fell. ${winnerNames} had no comment. None was needed.`,
    `${loserNames} — alive. Barely. They'll spend a long time thinking about what just happened.`,
  ];
  const brutalPool = [
    `${loserNames} — face-down, unconscious, lying in a spreading pool of their own blood.`,
    `${loserNames} — spine wrenched at an angle it was not built for. Breathing, shallow and wrong.`,
    `${loserNames} — ribs punched through into the lung cavity. The sound they make is not a word.`,
    `${loserNames} — jaw shattered. They tapped out through a hand signal because speaking stopped being an option.`,
    `${loserNames} — crippled. Whatever they were before this fight, they are less now.`,
    `${loserNames} — pinned face-down, a knee grinding between their shoulder blades, arms at wrong angles. Submitting to stop the damage.`,
    `${loserNames} — dead. ${winnerNames} didn't need a finisher — the damage had already done the work.`,
    `${loserNames} — bled out. Slowly enough that there was time to realize it was happening.`,
    `${loserNames} — skull fractured on impact with the ground. Not dead. Not awake. Somewhere between.`,
    `${loserNames} — both knees failed. They crumpled where they stood. ${winnerNames} stepped over them.`,
    `${loserNames} — throat crushed. Still breathing, technically. Just not well.`,
    `${loserNames} — dead. It was fast. Fast does not mean painless.`,
  ];

  const pool =
    tone === "brutal"    ? brutalPool :
    tone === "cinematic" ? cinematicPool :
                           realisticPool;

  const loserConclusion = taggedConclusion ?? pickRandom(pool);

  // Subject-verb agreement based on winning team size
  const winSolo = winTeam.length === 1;
  const winIs = winSolo ? "is" : "are";
  const winSurvive = winSolo ? "survives" : "survive";
  const winWalk = winSolo ? "walks" : "walk";
  const winClose = winSolo ? "closes" : "close";
  const winLast = winSolo ? "the last one standing" : "the last ones standing";

  const summaries = [
    `After ${rounds.length} rounds on ${arena.name}, ${winnerNames} ${winIs} ${winLast}. ${loserConclusion}${extraClause}`,
    `${winnerNames} ${winSurvive} ${rounds.length} brutal rounds on ${arena.name}. ${loserConclusion}${extraClause} This was not a close fight. It was a fight.`,
    `${rounds.length} rounds. One winner. ${winnerNames} made sure of it. ${loserConclusion}${extraClause}`,
    `${arena.name} saw ${rounds.length} rounds of escalating violence. ${winnerNames} ${winWalk} away. ${loserConclusion}${extraClause}`,
    `${winnerNames} — battered, possibly betrayed, still breathing — ${winClose} out ${rounds.length} rounds on ${arena.name}. ${loserConclusion}${extraClause}`,
  ];

  // ── AI narrative generation ──────────────────────────────────────────────────
  // Build the round-sim data from the computed rounds array.
  // hp1Before/hp2Before come from the prior round's trailing HP (or 100 for round 1).
  const roundSimData: RoundSimData[] = rounds.map((r, idx) => ({
    round: r.round,
    attackerName: r.attacker,
    defenderName: r.defender,
    attackMove: r.attackType,
    team1HpBefore: idx === 0 ? 100 : rounds[idx - 1]!.team1Hp,
    team2HpBefore: idx === 0 ? 100 : rounds[idx - 1]!.team2Hp,
    team1HpAfter: r.team1Hp,
    team2HpAfter: r.team2Hp,
    isChaos: r.attackType.startsWith("chaos:"),
    isBetrayal: r.attackType === "betrayal",
  }));

  const allianceTrigger = hasAllianceTrigger(team1, team2);

  // ── Stage 1: Build the pre-decided result object ──────────────────────────
  // Winner + all factors are already locked by the assessment. This gives the
  // narrative writer a concrete, matchup-specific brief to work from.
  const winTeamForResolution  = winner === 1 ? team1 : team2;
  const loseTeamForResolution = winner === 1 ? team2 : team1;
  const resolutionWinHax  = teamHax(winTeamForResolution);
  const resolutionLoseHax = teamHax(loseTeamForResolution);
  const fightResolution = buildFightResolution(
    winTeamForResolution,
    loseTeamForResolution,
    resolutionWinHax,
    resolutionLoseHax,
    assessment,
  );

  // ── Stage 2: Narrative writer dramatizes the pre-decided result ───────────
  const aiResult = await generateAINarrative(team1, team2, arena, roundSimData, winner, tone, assessment, allianceTrigger, fightResolution);

  // Inject AI narratives — fall back to template narrative if AI returned empty for that round
  const finalRounds = rounds.map((r, idx) => ({
    ...r,
    narrative: aiResult.roundNarratives[idx]?.trim().length ? aiResult.roundNarratives[idx]! : r.narrative,
  }));

  // If AI didn't produce an arena intro, fall back to built-in arena flavor
  const finalArenaIntro = aiResult.arenaIntro?.trim().length
    ? aiResult.arenaIntro
    : `${arena.name[0]!.toUpperCase() + arena.name.slice(1)}. ${arena.flavor[0]} ${arena.flavor[1]}`;

  // Use AI result text as the match summary, fall back to template summary
  const finalSummary = aiResult.resultText?.trim().length ? aiResult.resultText : pickRandom(summaries);

  // Combatant entrance: use AI if available, otherwise build from character data.
  // Fallback is intentionally minimal — clean physical staging, no raw stat dumps.
  const finalIntro = aiResult.intro?.trim().length
    ? aiResult.intro
    : (() => {
        const t1Names = team1.map(c => c.name);
        const t2Names = team2.map(c => c.name);
        const t1Line = t1Names.length === 1
          ? `${t1Names[0]} steps into ${arena.name}, weight settling, eyes locked forward.`
          : `${t1Names.slice(0, -1).join(", ")} and ${t1Names.at(-1)} take the near side of ${arena.name}, fanning out without a word.`;
        const t2Line = t2Names.length === 1
          ? `Across the way, ${t2Names[0]} appears — no greeting, no posturing, just ready.`
          : `Opposite them, ${t2Names.slice(0, -1).join(", ")} and ${t2Names.at(-1)} hold the far side, already moving into position.`;
        return `${t1Line} ${t2Line} The space between them goes quiet. Nobody bothers with words.`;
      })();

  return {
    winner,
    rounds: finalRounds,
    summary: finalSummary,
    arenaIntro: finalArenaIntro,
    intro: finalIntro,
    whyWon: aiResult.whyWon ?? [],
  };
}

// ─── Developer Legend names ────────────────────────────────────────────────────
const DEVELOPER_NAMES = ["Chris Henry", "Troy Wilson"];

function isDeveloperLegend(name: string): boolean {
  return DEVELOPER_NAMES.some(n => name.toLowerCase() === n.toLowerCase());
}

function hasAllianceTrigger(team1: Character[], team2: Character[]): boolean {
  const t1HasDev = team1.some(c => isDeveloperLegend(c.name));
  const t2HasDev = team2.some(c => isDeveloperLegend(c.name));
  return t1HasDev && t2HasDev;
}
