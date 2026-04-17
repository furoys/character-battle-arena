import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const charactersTable = pgTable("characters", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  universe: text("universe").notNull(),
  strength: integer("strength").notNull(),
  speed: integer("speed").notNull(),
  intelligence: integer("intelligence").notNull(),
  durability: integer("durability").notNull(),
  specialAbility: text("special_ability").notNull(),
  weaknesses: text("weaknesses").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  behaviorTags: text("behavior_tags").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCharacterSchema = createInsertSchema(charactersTable).omit({ id: true, createdAt: true });
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;
export type Character = typeof charactersTable.$inferSelect;

export const suggestionsTable = pgTable("suggestions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  universe: text("universe").notNull(),
  strength: integer("strength").notNull(),
  speed: integer("speed").notNull(),
  intelligence: integer("intelligence").notNull(),
  durability: integer("durability").notNull(),
  specialAbility: text("special_ability").notNull(),
  weaknesses: text("weaknesses").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Suggestion = typeof suggestionsTable.$inferSelect;
