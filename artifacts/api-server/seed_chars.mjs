import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const chars = [
  { name: "Yennefer of Vengerberg", universe: "The Witcher", strength: 4200, speed: 5800, intelligence: 9100, durability: 5500,
    abilities: ["Chaos magic","Djinn binding","Illusion mastery","Portal creation","Healing magic"],
    weaknesses: ["Vulnerable without magic source","Physically fragile in melee"],
    tags: ["mage","human","magic","female","ranged"],
    bio: "Once a hunchbacked girl, Yennefer became one of the most powerful sorceresses on the Continent through sheer will and mastery of Chaos magic." },
  { name: "Dovahkiin", universe: "The Elder Scrolls", strength: 7800, speed: 6200, intelligence: 7500, durability: 7900,
    abilities: ["Dragon Shouts (Thu um)","Soul absorption","Unrelenting Force","Dragonrend","Slow Time shout","Daedric artifact wielder"],
    weaknesses: ["Finite Shout cooldowns","Mortal physiology"],
    tags: ["human","warrior","magic","dragonborn","elemental"],
    bio: "The Last Dragonborn, a mortal warrior born with the soul of a dragon, wielding the Thu um to level mountains and bring dragons to their knees." },
  { name: "Spawn", universe: "Image Comics", strength: 8800, speed: 7200, intelligence: 7000, durability: 9200,
    abilities: ["Necroplasm manipulation","Symbiote suit (Leetha)","Resurrection","Hellfire","Chains of chaos","Reality warping"],
    weaknesses: ["Finite necroplasm supply","Holy weapons","Sunlight weakens symbiote"],
    tags: ["demon","antihero","supernatural","immortal","dark"],
    bio: "Al Simmons, a murdered CIA assassin resurrected as a Hellspawn. His necroplasm-powered symbiote armor and hellfire make him a terror between worlds." },
  { name: "Light Yagami", universe: "Death Note", strength: 2500, speed: 3200, intelligence: 9900, durability: 2000,
    abilities: ["Death Note (kills by name and face)","Master manipulator","Photographic memory","Multi-step trap setting"],
    weaknesses: ["Physically average","Requires knowing full name and face","Ego-driven blind spots"],
    tags: ["human","genius","reality-warping","mortal","psychological"],
    bio: "A high-school prodigy who found a Death Note and used it to reshape the world. His intelligence is near-unmatched, but so is his hubris." },
  { name: "L", universe: "Death Note", strength: 2800, speed: 3000, intelligence: 9800, durability: 2200,
    abilities: ["World greatest detective","Deductive reasoning","Pattern recognition","Capoeira combat","Psychological profiling"],
    weaknesses: ["Physically unimposing","Vulnerable to Death Note","Over-reliance on deduction"],
    tags: ["human","genius","detective","mortal","psychological"],
    bio: "The world greatest detective, an eccentric savant who matched wits with Kira himself. L sees patterns others cannot imagine." },
  { name: "Walter White", universe: "Breaking Bad", strength: 2600, speed: 2400, intelligence: 9500, durability: 2100,
    abilities: ["Master chemist","Improvised explosives","Manipulation and psychological warfare","Ricin synthesis","Ruthless adaptability"],
    weaknesses: ["Terminally ill","No physical combat ability","Pride causes critical mistakes"],
    tags: ["human","genius","mortal","psychological","villain"],
    bio: "A chemistry teacher turned drug kingpin. Walter White genius lies in his willingness to destroy anything, including himself, to win." },
  { name: "Ip Man", universe: "Martial Arts Films", strength: 5200, speed: 7800, intelligence: 7200, durability: 5800,
    abilities: ["Wing Chun mastery","Simultaneous attack-defense","Chain punching","Joint manipulation"],
    weaknesses: ["No superhuman attributes","Age-related limitations"],
    tags: ["human","martial-artist","mortal","melee"],
    bio: "Grandmaster of Wing Chun kung fu. Ip Man fighting philosophy merges efficiency with devastating speed, he defeated 10 black belts at once." },
  { name: "Rama", universe: "The Raid", strength: 6100, speed: 8200, intelligence: 6800, durability: 6400,
    abilities: ["Pencak Silat mastery","Knife fighting","Extreme pain tolerance","Improvised weapon use","CQC adaptability"],
    weaknesses: ["No superhuman attributes","Human durability limits","Vulnerable at range"],
    tags: ["human","martial-artist","mortal","melee"],
    bio: "An elite Indonesian SWAT officer who fought through an entire skyscraper of killers. Pencak Silat is visceral, brutal, and unstoppable." },
  { name: "Doctor Fate", universe: "DC Comics", strength: 7500, speed: 8200, intelligence: 9200, durability: 8800,
    abilities: ["Helm of Nabu","Sorcery supreme","Flight","Mystic blasts","Teleportation","Fate manipulation","Anti-magic"],
    weaknesses: ["Helm can possess host","Human host has limits without helmet"],
    tags: ["mage","cosmic","DC","magic","superhero","ranged"],
    bio: "Lord of Order. Doctor Fate channels the ancient sorcerer Nabu through the Helm of Fate, one of DC most formidable magical forces." },
  { name: "Bugs Bunny", universe: "Looney Tunes", strength: 4000, speed: 8500, intelligence: 9000, durability: 9500,
    abilities: ["Toon force","Reality immunity","Dimensional travel via holes","Disguise mastery","Hammer space","Breaking 4th wall"],
    weaknesses: ["Only retaliates, never strikes first"],
    tags: ["toon","reality-warping","immortal","cartoon","chaos"],
    bio: "Bugs Bunny operates on pure Toon Force, logic does not apply to him. He has never technically lost a fight he chose to finish." },
];

const client = await pool.connect();
let inserted = 0;
for (const c of chars) {
  const check = await client.query("SELECT id FROM characters WHERE name = $1", [c.name]);
  if (check.rows.length > 0) { console.log(`skip ${c.name} (id=${check.rows[0].id})`); continue; }
  const r = await client.query(
    `INSERT INTO characters (name, universe, image_url, strength, speed, intelligence, durability, abilities, weaknesses, tags, bio)
     VALUES ($1,$2,NULL,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [c.name, c.universe, c.strength, c.speed, c.intelligence, c.durability,
     JSON.stringify(c.abilities), JSON.stringify(c.weaknesses), JSON.stringify(c.tags), c.bio]
  );
  console.log(`inserted ${c.name} id=${r.rows[0].id}`);
  inserted++;
}
await client.release();
await pool.end();
console.log(`Done: ${inserted} inserted`);
