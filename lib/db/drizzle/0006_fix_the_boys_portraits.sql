-- Three "The Boys" character portraits were wrong (mismatched gender/race/hair).
-- Regenerated portraits live at:
--   /characters/stormfront.png   (was .jpg, now .png)
--   /characters/the-deep.png     (already .png — file content updated)
--   /characters/translucent.png  (already .png — file content updated)
-- Only Stormfront needs a DB update because its extension changed.
UPDATE "characters"
   SET "image_url" = '/characters/stormfront.png'
 WHERE "id" = 515
   AND "image_url" = '/characters/stormfront.jpg';
