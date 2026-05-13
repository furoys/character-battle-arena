-- Soft-archive duplicate character rows so they're hidden from the live roster
-- but their data (v3Profile etc.) stays in the DB for review.
-- Adds an `archived` flag (0 = active, 1 = archived) and flips it on for the
-- 31 known duplicates identified after the 68-character backfill.

ALTER TABLE "characters"
  ADD COLUMN IF NOT EXISTS "archived" integer NOT NULL DEFAULT 0;

UPDATE "characters" SET "archived" = 1 WHERE "id" IN (
  -- Hercules duplicates (keep id 77, original Mythology entry)
  704, 888,
  -- Ben 10 duplicates (keep id 1099)
  1100, 1101,
  -- Billy / Billy the Puppet (keep id 1107, more specific name)
  1106,
  -- Blue Beetle duplicate (keep id 235, has Ted Kord identity)
  373,
  -- New 1218+ chars duplicating older Legacy/Multiverse Comics entries
  1218, 1219, 1220, 1221, 1222, 1223, 1224, 1225, 1226,
  1227, 1228, 1230, 1231, 1232, 1234, 1235,
  -- Older 1074+ chars duplicating earlier entries
  1074, 1079, 1108, 1110, 1119, 1172, 1192, 1193, 1195
);
