-- Round 2 of duplicate cleanup:
-- (a) Archive 6 identity-only duplicates (same character, just relabeled).
-- (b) Move 24 power-up / alternate-form variants into a new "Variants"
--     universe so they're grouped together instead of mixed with their
--     canonical entries.

-- (a) Archive identity-only duplicates
UPDATE "characters" SET "archived" = 1 WHERE "id" IN (
  1051, -- Aang (Nick)        → keep id 291  (Aang)
  1054, -- Achilles (Myth)    → keep id 76   (Achilles)
  1059, -- Aku (CN)           → keep id 762  (Aku)
  1078, -- Arbiter (Elite)    → keep id 258  (Arbiter)
  1103, -- Bender (Bite My Shiny Metal) → keep id 1102 (Bender)
  1149  -- Cortana (AI)       → keep id 259  (Cortana)
);

-- (b) Move power-up / alternate-form variants into "Variants" universe.
UPDATE "characters" SET "universe" = 'Variants' WHERE "id" IN (
  -- Anime power forms
  1034, -- Goku (Ultra Instinct)
  1037, -- Vegeta (Ultra Ego)
  1042, -- Naruto (Baryon Mode)
  1043, -- Naruto (Six Paths)
  1229, -- Saitama (Serious Mode)
  1098, -- Beerus (God)
  1125, -- Broly (Full Power)
  1057, -- Akaza (Upper Moon 3)
  1066, -- Alucard (Level 0)
  1181, -- Denji (Chainsaw Devil)
  730,  -- Giorno Giovanna (Gold Experience Requiem)
  -- Comics / media variants
  1030, -- Batman (Arkham)
  1031, -- Batman (Hellbat Suit)
  1032, -- Superman (Injustice)
  1033, -- Superman (Prime One Million)
  1161, -- Darkseid (True Form)
  1233, -- Nova (Sam Alexander)
  -- Games / franchise variants
  1038, -- Kratos (Ragnarok)
  1039, -- Kratos (Young)
  1146, -- Ciri (Full Power)
  1123, -- Bowser (Giga)
  1189, -- Diablo (Prime Evil)
  -- Movie variants
  1083, -- Ash Williams (Necronomicon)
  173   -- Ellen Ripley (Power Loader)
);
