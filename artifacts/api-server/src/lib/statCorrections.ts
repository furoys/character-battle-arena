import { pool } from "@workspace/db";

/**
 * Apply stat corrections on every startup.
 *
 * STEP 1 — Piecewise remap (only when stats are still on old 0-10 000 scale):
 *   Check whether max(strength) across all characters is under 100 000.
 *   If so the DB is still on the original 0-10 000 scale, so apply the
 *   exponential remap before anything else.
 *
 * STEP 2 — Named character corrections (always / idempotent):
 *   Set canonical stat values for specific characters that were wrong after
 *   the remap (wrong tiers, impossible stats, etc.).
 */
export async function applyStatCorrections(): Promise<void> {
  const client = await pool.connect();
  try {
    // ── STEP 1: piecewise remap ───────────────────────────────────────────────
    const { rows } = await client.query<{ maxval: string }>(
      "SELECT MAX(strength) as maxval FROM characters",
    );
    const maxVal = Number(rows[0]?.maxval ?? 0);

    if (maxVal < 100_000) {
      // Still on old 0-10 000 scale. Apply exponential remap:
      // Breakpoints: 900→100, 4 000→2 K, 6 000→10 K,
      //              8 500→200 K, 9 500→2 M, 10 000→10 M
      const remapExpr = (col: string) => `
        CASE
          WHEN ${col} <= 900   THEN ROUND(${col} * 100.0 / 900)
          WHEN ${col} <= 4000  THEN ROUND(100  + (${col} - 900)  * 1900.0  / 3100)
          WHEN ${col} <= 6000  THEN ROUND(2000 + (${col} - 4000) * 8000.0  / 2000)
          WHEN ${col} <= 8500  THEN ROUND(10000 + (${col} - 6000) * 190000.0 / 2500)
          WHEN ${col} <= 9500  THEN ROUND(200000 + (${col} - 8500) * 1800000.0 / 1000)
          ELSE                      ROUND(2000000 + (${col} - 9500) * 8000000.0 / 500)
        END
      `;
      await client.query(`
        UPDATE characters SET
          strength     = ${remapExpr("strength")},
          speed        = ${remapExpr("speed")},
          intelligence = ${remapExpr("intelligence")},
          durability   = ${remapExpr("durability")}
      `);
    }

    // ── STEP 2: named corrections ─────────────────────────────────────────────
    // Each row is [name, strength, speed, intelligence, durability].
    // These override whatever the remap produced for specific characters.
    const corrections: [string, number, number, number, number][] = [
      // ── ANIMALS ──────────────────────────────────────────────────────────────
      ["Tyrannosaurus Rex",  800000,  20000,    1500,  500000],
      ["Sperm Whale",        500000,   8000,    8000,  600000],
      ["Grizzly Bear",       250000,  18000,    3000,  200000],
      ["Megalodon",          600000,  30000,    2000,  500000],
      ["Saltwater Crocodile",200000,  15000,    3000,  150000],
      ["Dunkleosteus",       400000,  10000,    1000,  600000],
      ["Short-Faced Bear",   400000,  30000,    3000,  350000],
      ["Mosasaurus",         500000,  25000,    2000,  400000],
      ["Hippopotamus",       300000,  12000,    5000,  400000],
      ["Spinosaurus",        700000,  18000,    2000,  500000],
      ["Orca",               300000,  35000,   80000,  250000],
      ["Giganotosaurus",     600000,  22000,    2000,  500000],
      ["Andrewsarchus",      350000,  30000,    3000,  300000],
      ["Polar Bear",         350000,  15000,    8000,  300000],
      ["African Wild Dog",    15000,  40000,   20000,   15000],
      ["Velociraptor",        15000,  35000,   12000,   12000],
      ["Allosaurus",         500000,  20000,    2000,  400000],
      ["Green Anaconda",     300000,   8000,    2000,  250000],
      ["Great White Shark",  300000,  30000,    5000,  250000],
      ["Carnotaurus",        400000,  30000,    2000,  300000],
      ["Smilodon",           350000,  25000,    5000,  300000],

      // ── DC ───────────────────────────────────────────────────────────────────
      ["Superman",         8000000, 5000000,  300000, 8000000],
      ["Wonder Woman",     3000000, 2000000,  500000, 3000000],
      ["Darkseid",         6816000, 1000000, 2000000, 6816000],

      // ── MARVEL ───────────────────────────────────────────────────────────────
      ["Silver Surfer",    8000000,10000000, 1000000, 8000000],
      ["Thor",             1145000, 2000000,  100000, 1488800],
      ["Hulk",            10000000,   60000,    5000, 3664000],
      ["Spider-Man",        200000,  140000, 1145000,   60000],
      ["Iron Man",          600000,  120000, 6816000,  600000],
      ["Wolverine",         200000,   80000,   40000, 2000000],
      ["Storm",              15000, 2000000,  400000,   50000],
      ["Magneto",            30000, 1500000, 3000000,  400000],
      ["Jean Grey",         600000, 1500000, 3000000, 1500000],
      ["Deadpool",           50000,   40000,   20000, 1836200],

      // ── DRAGON BALL ──────────────────────────────────────────────────────────
      ["Goku",             5000000, 5000000,   20000, 5000000],
      ["Vegeta",           4000000, 4000000,  150000, 4000000],
      ["Gohan",            3000000, 2000000,  300000, 2000000],
      ["Frieza",           5000000, 5000000,  500000, 3000000],
      ["Cell",             2000000,  800000,  400000, 2000000],

      // ── NARUTO ───────────────────────────────────────────────────────────────
      ["Naruto Uzumaki",   1500000, 3000000,   80000, 2000000],
      ["Sasuke Uchiha",    1000000, 3000000,  800000, 1000000],
      ["Itachi Uchiha",     200000, 2000000, 6816000,  300000],
      ["Kakashi Hatake",    100000,  500000, 1200000,  150000],
      ["Madara Uchiha",    3000000, 3000000, 2500000, 2000000],
      ["Minato Namikaze",   400000, 5000000, 1200000,  300000],

      // ── ONE PIECE ────────────────────────────────────────────────────────────
      ["Monkey D. Luffy",  4000000, 3000000,   80000, 4000000],
      ["Whitebeard",       6000000,  200000,  300000, 3000000],

      // ── BLEACH ───────────────────────────────────────────────────────────────
      ["Ichigo Kurosaki",  3000000, 3000000,   80000, 2000000],
      ["Kenpachi Zaraki", 10000000,  800000,    8000,10000000],
      ["Byakuya Kuchiki",   400000, 2000000,  300000,  500000],

      // ── MY HERO ACADEMIA ─────────────────────────────────────────────────────
      ["All Might",        6816000, 1000000,  400000,  400000],
      ["Izuku Midoriya",   5000000, 5000000, 1500000, 4000000],
      ["Bakugou",           800000, 2000000,  400000,  800000],
      ["Bakugo",            800000, 2000000,  400000,  800000],

      // ── MOB PSYCHO ───────────────────────────────────────────────────────────
      ["Mob",                30000,  500000,   30000, 1000000],

      // ── MORTAL KOMBAT ────────────────────────────────────────────────────────
      ["Shao Kahn",        2000000,  500000, 1000000, 2000000],
      ["Raiden",            500000, 2000000, 1000000, 1000000],
      ["Liu Kang",          150000,  800000,  300000,  300000],
      ["Scorpion",          120000,  400000,   50000,  200000],
      ["Sub-Zero",          120000,  400000,   80000,  200000],

      // ── STAR WARS ────────────────────────────────────────────────────────────
      ["Darth Vader",       300000,   80000,  500000,  300000],
      ["Yoda",               80000,  500000,10000000,  200000],
      ["Luke Skywalker",    150000,  300000,  400000,  200000],
      ["Palpatine",          60000,  200000, 6816000,  100000],

      // ── GAME OF THRONES ──────────────────────────────────────────────────────
      ["Gregor Clegane",    120000,   4000,    5000,   80000],

      // ── GODZILLA / KAIJU ─────────────────────────────────────────────────────
      ["Godzilla",        10000000,  12000,    8500,10000000],

      // ── INTELLIGENCE-INFLATED ACTION CHARS ───────────────────────────────────
      ["Hannibal Lecter",     6736,   4496, 1500000,    4496],
      ["John Matrix",        150000,  40000,   80000,   80000],
      ["Max Rockatansky",     60000,  30000,   60000,   50000],
      ["Keyser Soze",         10000,   7904, 2000000,    6736],
      ["Axel Foley",          10000, 140000,  200000,   10000],
      ["Colonel Hans Landa",   5000,   1755,  800000,    4000],
      ["Dutch",              120000,  40000,  100000,   80000],
      ["John Wick",           50000,  60000,  500000,   50000],

      // ── MISC ─────────────────────────────────────────────────────────────────
      ["Gordon Freeman",      20000,  15000,  800000,   40000],
      ["Sun Tzu",              5000,   8000, 2000000,    6000],
      ["Lelouch vi Britannia", 1081,   1694, 4000000,    1081],
      ["Light Yagami",         1081,   1510, 4000000,     774],

      // Broly / Doomsday — smarter than their original 790 INT
      ["Broly",           10000000, 2000000,    5000,10000000],
      ["Doomsday",        10000000,  800000,   30000,10000000],
    ];

    if (corrections.length === 0) return;

    // Build one big UPDATE … SET … FROM (VALUES …) AS v(…) statement
    const valuePlaceholders = corrections
      .map((_, i) => `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`)
      .join(", ");

    const flatValues = corrections.flatMap(
      ([name, str, spd, intel, dur]) => [name, str, spd, intel, dur],
    );

    await client.query(
      `UPDATE characters AS c
       SET
         strength     = v.strength::int,
         speed        = v.speed::int,
         intelligence = v.intelligence::int,
         durability   = v.durability::int
       FROM (VALUES ${valuePlaceholders})
         AS v(name, strength, speed, intelligence, durability)
       WHERE c.name = v.name`,
      flatValues,
    );
  } finally {
    client.release();
  }
}
