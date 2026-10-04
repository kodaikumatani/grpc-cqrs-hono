import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const recipes = pgTable("recipes", {
  id: uuid().primaryKey(),
  userId: text().notNull(),
  title: text().notNull(),
  description: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull(),
  updatedAt: timestamp({ withTimezone: true }).notNull(),
});
