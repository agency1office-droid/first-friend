import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const members = sqliteTable("members", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role", { enum: ["member", "foster", "shelter", "admin"] }).notNull().default("member"),
  verified: integer("verified", { mode: "boolean" }).notNull().default(true),
  sanctioned: integer("sanctioned", { mode: "boolean" }).notNull().default(false),
  homeRegion: text("home_region").notNull().default(""),
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
  guardianId: text("guardian_id").references(() => members.id),
  animalId: text("animal_id").notNull(),
  status: text("status", { enum: ["submitted", "review", "consulting", "approved", "rejected", "handover", "completed", "return_support", "withdrawn"] }).notNull().default("submitted"),
  household: text("household").notNull(),
  carePlan: text("care_plan").notNull(),
  readinessScore: integer("readiness_score").notNull(),
  suitabilityScore: integer("suitability_score").notNull().default(0),
  suitabilityJson: text("suitability_json").notNull().default("{}"),
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
  views: integer("views").notNull().default(0),
  shares: integer("shares").notNull().default(0),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
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
  status: text("status", { enum: ["active", "contacting", "resolved", "closed"] }).notNull().default("active"),
  visualTagsJson: text("visual_tags_json").notNull().default("[]"),
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
  reconfirmedAt: text("reconfirmed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
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
  representativeName: text("representative_name").notNull().default(""),
  businessNumber: text("business_number").notNull().default(""),
  shelterType: text("shelter_type").notNull().default(""),
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

export const animalMedia = sqliteTable("animal_media", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  animalId: integer("animal_id").notNull().references(() => directAnimals.id),
  mediaType: text("media_type", { enum: ["image", "video"] }).notNull(),
  objectKey: text("object_key").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_animal_media_animal_order").on(table.animalId, table.sortOrder)]);

export const familyRooms = sqliteTable("family_rooms", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: text("owner_id").notNull().references(() => members.id),
  animalId: text("animal_id").notNull(),
  shareToken: text("share_token").notNull(),
  title: text("title").notNull(),
  status: text("status", { enum: ["discussing", "agreed", "concerned", "closed"] }).notNull().default("discussing"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_family_rooms_token").on(table.shareToken), index("idx_family_rooms_owner").on(table.ownerId)]);

export const familyOpinions = sqliteTable("family_opinions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roomId: integer("room_id").notNull().references(() => familyRooms.id),
  authorName: text("author_name").notNull(),
  decision: text("decision", { enum: ["agree", "question", "concern"] }).notNull(),
  body: text("body").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_family_opinions_room_created").on(table.roomId, table.createdAt)]);

export const shelterProfiles = sqliteTable("shelter_profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: text("owner_id").references(() => members.id),
  publicId: text("public_id").notNull(),
  name: text("name").notNull(),
  organization: text("organization").notNull().default(""),
  region: text("region").notNull(),
  introduction: text("introduction").notNull(),
  verified: integer("verified", { mode: "boolean" }).notNull().default(false),
  imageKey: text("image_key"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_shelter_profiles_public_id").on(table.publicId), index("idx_shelter_profiles_region").on(table.region)]);

export const shelterUpdates = sqliteTable("shelter_updates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shelterId: integer("shelter_id").notNull().references(() => shelterProfiles.id),
  authorId: text("author_id").references(() => members.id),
  category: text("category", { enum: ["daily", "urgent", "result", "notice"] }).notNull().default("daily"),
  title: text("title").notNull(),
  body: text("body").notNull(),
  imageKey: text("image_key"),
  hidden: integer("hidden", { mode: "boolean" }).notNull().default(false),
  reactions: integer("reactions").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_shelter_updates_shelter_created").on(table.shelterId, table.createdAt)]);

export const shelterUpdateReactions = sqliteTable("shelter_update_reactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  updateId: integer("update_id").notNull().references(() => shelterUpdates.id),
  memberId: text("member_id").notNull().references(() => members.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_shelter_update_reaction_unique").on(table.updateId, table.memberId)]);

export const volunteerPosts = sqliteTable("volunteer_posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shelterId: integer("shelter_id").notNull().references(() => shelterProfiles.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  region: text("region").notNull(),
  scheduledAt: text("scheduled_at").notNull(),
  capacity: integer("capacity").notNull().default(1),
  status: text("status", { enum: ["open", "filled", "closed"] }).notNull().default("open"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_volunteer_posts_shelter_status").on(table.shelterId, table.status)]);

export const volunteerApplications = sqliteTable("volunteer_applications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  postId: integer("post_id").notNull().references(() => volunteerPosts.id),
  memberId: text("member_id").notNull().references(() => members.id),
  message: text("message").notNull().default(""),
  status: text("status", { enum: ["submitted", "accepted", "declined", "completed"] }).notNull().default("submitted"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_volunteer_application_unique").on(table.postId, table.memberId)]);

export const shelterNeeds = sqliteTable("shelter_needs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shelterId: integer("shelter_id").notNull().references(() => shelterProfiles.id),
  itemName: text("item_name").notNull(),
  targetQuantity: integer("target_quantity").notNull(),
  receivedQuantity: integer("received_quantity").notNull().default(0),
  unitPrice: integer("unit_price").notNull().default(0),
  status: text("status", { enum: ["needed", "fulfilled", "paused"] }).notNull().default("needed"),
}, (table) => [index("idx_shelter_needs_shelter_status").on(table.shelterId, table.status)]);

export const supportRecords = sqliteTable("support_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: text("member_id").notNull().references(() => members.id),
  kind: text("kind", { enum: ["operations", "goods", "shelter_item", "affiliate", "insurance_referral"] }).notNull(),
  targetId: text("target_id").notNull().default(""),
  title: text("title").notNull(),
  amount: integer("amount").notNull().default(0),
  status: text("status", { enum: ["intent", "paid", "delivered", "confirmed", "cancelled"] }).notNull().default("intent"),
  disclosure: text("disclosure").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_support_records_member_created").on(table.memberId, table.createdAt)]);

export const lostMatches = sqliteTable("lost_matches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  lostReportId: integer("lost_report_id").notNull().references(() => lostReports.id),
  foundReportId: integer("found_report_id").notNull().references(() => lostReports.id),
  score: integer("score").notNull(),
  reasonsJson: text("reasons_json").notNull(),
  status: text("status", { enum: ["suggested", "contacting", "confirmed", "dismissed"] }).notNull().default("suggested"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_lost_matches_pair").on(table.lostReportId, table.foundReportId)]);

export const lostMessages = sqliteTable("lost_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reportId: integer("report_id").notNull().references(() => lostReports.id),
  senderId: text("sender_id").notNull().references(() => members.id),
  body: text("body").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_lost_messages_report_created").on(table.reportId, table.createdAt)]);

export const lostTimelineEvents = sqliteTable("lost_timeline_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reportId: integer("report_id").notNull().references(() => lostReports.id),
  memberId: text("member_id").notNull().references(() => members.id),
  region: text("region").notNull(),
  occurredAt: text("occurred_at").notNull(),
  note: text("note").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_lost_timeline_report_occurred").on(table.reportId, table.occurredAt)]);

export const accountSanctions = sqliteTable("account_sanctions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: text("member_id").notNull().references(() => members.id),
  actorId: text("actor_id").notNull().references(() => members.id),
  reason: text("reason").notNull(),
  status: text("status", { enum: ["proposed", "confirmed", "appealed", "lifted"] }).notNull().default("proposed"),
  fingerprintHash: text("fingerprint_hash").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_account_sanctions_member_status").on(table.memberId, table.status)]);

export const sanctionAppeals = sqliteTable("sanction_appeals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sanctionId: integer("sanction_id").notNull().references(() => accountSanctions.id),
  memberId: text("member_id").notNull().references(() => members.id),
  reason: text("reason").notNull(),
  evidenceKey: text("evidence_key"),
  status: text("status", { enum: ["submitted", "accepted", "rejected"] }).notNull().default("submitted"),
  reviewedBy: text("reviewed_by"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_sanction_appeals_status_created").on(table.status, table.createdAt)]);

export const adoptionCertifications = sqliteTable("adoption_certifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: text("member_id").notNull().references(() => members.id),
  applicationId: integer("application_id").references(() => applications.id),
  source: text("source", { enum: ["platform", "external"] }).notNull(),
  shelterName: text("shelter_name").notNull().default(""),
  animalName: text("animal_name").notNull().default(""),
  verificationCodeHash: text("verification_code_hash").notNull().default(""),
  evidenceKey: text("evidence_key"),
  status: text("status", { enum: ["submitted", "verified", "rejected"] }).notNull().default("submitted"),
  reviewedBy: text("reviewed_by"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_adoption_certifications_member_status").on(table.memberId, table.status)]);

export const adminAuditLogs = sqliteTable("admin_audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actorId: text("actor_id").notNull().references(() => members.id),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  beforeJson: text("before_json").notNull().default("{}"),
  afterJson: text("after_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_admin_audit_target_created").on(table.targetType, table.targetId, table.createdAt)]);
