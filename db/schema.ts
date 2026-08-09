import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const members = sqliteTable("members", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role", { enum: ["member", "foster", "shelter", "admin"] }).notNull().default("member"),
  verified: integer("verified", { mode: "boolean" }).notNull().default(true),
  sanctioned: integer("sanctioned", { mode: "boolean" }).notNull().default(false),
  fosterEducationCompleted: integer("foster_education_completed", { mode: "boolean" }).notNull().default(false),
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
  status: text("status", { enum: ["submitted", "review", "consulting", "approved", "rejected", "handover", "completed", "return_support", "withdrawn"] }).notNull().default("submitted"),
  household: text("household").notNull(),
  carePlan: text("care_plan").notNull(),
  readinessScore: integer("readiness_score").notNull(),
  readinessAssessmentId: integer("readiness_assessment_id"),
  absencePlan: text("absence_plan").notNull().default(""),
  emergencyPlan: text("emergency_plan").notNull().default(""),
  agreementAccepted: integer("agreement_accepted", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_applications_member_status").on(table.memberId, table.status)]);

export const readinessAssessments = sqliteTable("readiness_assessments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: text("member_id").notNull().references(() => members.id),
  species: text("species", { enum: ["cat", "dog"] }).notNull(),
  profileJson: text("profile_json").notNull(),
  readinessScore: integer("readiness_score").notNull(),
  educationScore: integer("education_score").notNull(),
  passed: integer("passed", { mode: "boolean" }).notNull().default(false),
  completedAt: text("completed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_readiness_member_completed").on(table.memberId, table.completedAt)]);

export const adoptionAgreements = sqliteTable("adoption_agreements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  applicationId: integer("application_id").notNull().references(() => applications.id),
  memberId: text("member_id").notNull().references(() => members.id),
  version: text("version").notNull().default("2026-08"),
  termsJson: text("terms_json").notNull(),
  signedName: text("signed_name").notNull(),
  agreedAt: text("agreed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_agreements_application").on(table.applicationId)]);

export const handoverReservations = sqliteTable("handover_reservations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  applicationId: integer("application_id").notNull().references(() => applications.id),
  method: text("method", { enum: ["visit", "volunteer", "transport"] }).notNull(),
  scheduledAt: text("scheduled_at").notNull(),
  region: text("region").notNull(),
  checklistJson: text("checklist_json").notNull().default("[]"),
  status: text("status", { enum: ["proposed", "confirmed", "completed", "cancelled"] }).notNull().default("proposed"),
  adopterConfirmed: integer("adopter_confirmed", { mode: "boolean" }).notNull().default(false),
  guardianConfirmed: integer("guardian_confirmed", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_handover_application").on(table.applicationId)]);

export const applicationMessages = sqliteTable("application_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  applicationId: integer("application_id").notNull().references(() => applications.id),
  senderId: text("sender_id").notNull().references(() => members.id),
  body: text("body").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_messages_application_created").on(table.applicationId, table.createdAt)]);

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
  ownershipQuestion: text("ownership_question").notNull().default(""),
  alertRegion: text("alert_region").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const directAnimals = sqliteTable("direct_animals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: text("member_id").notNull().references(() => members.id),
  status: text("status", { enum: ["draft", "review", "published", "closed"] }).notNull().default("review"),
  name: text("name").notNull(),
  species: text("species").notNull(),
  region: text("region").notNull(),
  rescueStory: text("rescue_story").notNull(),
  healthJson: text("health_json").notNull(),
  lifeJson: text("life_json").notNull(),
  adoptionTerms: text("adoption_terms").notNull(),
  imageKey: text("image_key"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_direct_animals_member_status").on(table.memberId, table.status)]);

export const postReactions = sqliteTable("post_reactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: text("member_id").notNull().references(() => members.id),
  postId: integer("post_id").notNull().references(() => posts.id),
  reaction: text("reaction", { enum: ["cheer", "heart"] }).notNull().default("cheer"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_post_reactions_member_post").on(table.memberId, table.postId)]);

export const reports = sqliteTable("reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: text("member_id").notNull().references(() => members.id),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  reason: text("reason").notNull(),
  severity: text("severity", { enum:["normal","high","critical"] }).notNull().default("normal"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_reports_unique_member_target").on(table.memberId, table.targetType, table.targetId)]);

export const savedSearches = sqliteTable("saved_searches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: text("member_id").notNull().references(() => members.id),
  name: text("name").notNull(),
  criteriaJson: text("criteria_json").notNull(),
  alertsEnabled: integer("alerts_enabled", { mode: "boolean" }).notNull().default(true),
  lastMatchedAt: text("last_matched_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_saved_searches_member_created").on(table.memberId, table.createdAt)]);

export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: text("member_id").notNull().references(() => members.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  href: text("href").notNull().default("/mypage"),
  read: integer("read", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_notifications_member_read_created").on(table.memberId, table.read, table.createdAt)]);

export const verificationRequests = sqliteTable("verification_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: text("member_id").notNull().references(() => members.id),
  requestedRole: text("requested_role", { enum: ["foster", "shelter"] }).notNull(),
  organization: text("organization").notNull().default(""),
  evidenceKey: text("evidence_key"),
  status: text("status", { enum: ["submitted", "verified", "rejected", "expired"] }).notNull().default("submitted"),
  reviewedBy: text("reviewed_by"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_verification_status_created").on(table.status, table.createdAt)]);

export const applicationEvents = sqliteTable("application_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  applicationId: integer("application_id").notNull().references(() => applications.id),
  actorId: text("actor_id").notNull().references(() => members.id),
  eventType: text("event_type").notNull(),
  note: text("note").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_application_events_application_created").on(table.applicationId, table.createdAt)]);

export const returnRequests = sqliteTable("return_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  applicationId: integer("application_id").notNull().references(() => applications.id),
  memberId: text("member_id").notNull().references(() => members.id),
  urgency: text("urgency", { enum: ["consult", "soon", "emergency"] }).notNull(),
  reason: text("reason").notNull(),
  safeUntil: text("safe_until").notNull().default(""),
  status: text("status", { enum: ["open", "connected", "resolved"] }).notNull().default("open"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_return_requests_status_created").on(table.status, table.createdAt)]);

export const moderationActions = sqliteTable("moderation_actions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actorId: text("actor_id").notNull().references(() => members.id),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  action: text("action").notNull(),
  reason: text("reason").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_moderation_target_created").on(table.targetType, table.targetId, table.createdAt)]);
