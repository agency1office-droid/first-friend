import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const members = sqliteTable("members", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role", { enum: ["member", "foster", "shelter", "admin"] }).notNull().default("member"),
  verified: integer("verified", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const favorites = sqliteTable("favorites", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: text("member_id").notNull().references(() => members.id),
  animalId: text("animal_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_favorites_member_animal").on(table.memberId, table.animalId)]);

export const applications = sqliteTable("applications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: text("member_id").notNull().references(() => members.id),
  animalId: text("animal_id").notNull(),
  status: text("status", { enum: ["submitted", "review", "consulting", "approved", "withdrawn"] }).notNull().default("submitted"),
  household: text("household").notNull(),
  carePlan: text("care_plan").notNull(),
  readinessScore: integer("readiness_score").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const posts = sqliteTable("posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: text("member_id").notNull().references(() => members.id),
  category: text("category", { enum: ["adoption", "neighborhood", "memory", "rescue"] }).notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  imageKey: text("image_key"),
  hidden: integer("hidden", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const lostReports = sqliteTable("lost_reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: text("member_id").notNull().references(() => members.id),
  kind: text("kind", { enum: ["lost", "found"] }).notNull(),
  species: text("species").notNull(),
  region: text("region").notNull(),
  occurredAt: text("occurred_at").notNull(),
  description: text("description").notNull(),
  imageKey: text("image_key"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const reports = sqliteTable("reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: text("member_id").notNull().references(() => members.id),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  reason: text("reason").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_reports_unique_member_target").on(table.memberId, table.targetType, table.targetId)]);
