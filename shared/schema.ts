import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const scans = pgTable("scans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  url: text("url").notNull(),
  status: text("status").notNull().default("pending"), // pending, scanning, completed, failed
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  userId: varchar("user_id"),
});

export const scanResults = pgTable("scan_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scanId: varchar("scan_id").notNull(),
  pillar: text("pillar").notNull(), // accessibility, trust, performance, agentReadiness
  score: integer("score").notNull(),
  rawData: jsonb("raw_data"),
  recommendations: jsonb("recommendations"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const scanReports = pgTable("scan_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scanId: varchar("scan_id").notNull(),
  overallScore: integer("overall_score").notNull(),
  grade: text("grade").notNull(),
  topFixes: jsonb("top_fixes").notNull(),
  summary: text("summary"),
  geminiAnalysis: jsonb("gemini_analysis"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const scanEvidence = pgTable("scan_evidence", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scanId: varchar("scan_id").notNull(),
  type: text("type").notNull(), // screenshot, lighthouse, axe, security
  filePath: text("file_path"),
  data: jsonb("data"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const scansRelations = relations(scans, ({ many, one }) => ({
  results: many(scanResults),
  report: one(scanReports, {
    fields: [scans.id],
    references: [scanReports.scanId],
  }),
  evidence: many(scanEvidence),
}));

export const scanResultsRelations = relations(scanResults, ({ one }) => ({
  scan: one(scans, {
    fields: [scanResults.scanId],
    references: [scans.id],
  }),
}));

export const scanReportsRelations = relations(scanReports, ({ one }) => ({
  scan: one(scans, {
    fields: [scanReports.scanId],
    references: [scans.id],
  }),
}));

export const scanEvidenceRelations = relations(scanEvidence, ({ one }) => ({
  scan: one(scans, {
    fields: [scanEvidence.scanId],
    references: [scans.id],
  }),
}));

export const insertScanSchema = createInsertSchema(scans).pick({
  url: true,
  userId: true,
});

export const insertScanResultSchema = createInsertSchema(scanResults).pick({
  scanId: true,
  pillar: true,
  score: true,
  rawData: true,
  recommendations: true,
});

export const insertScanReportSchema = createInsertSchema(scanReports).pick({
  scanId: true,
  overallScore: true,
  grade: true,
  topFixes: true,
  summary: true,
  geminiAnalysis: true,
});

export type InsertScan = z.infer<typeof insertScanSchema>;
export type Scan = typeof scans.$inferSelect;
export type ScanResult = typeof scanResults.$inferSelect;
export type ScanReport = typeof scanReports.$inferSelect;
export type ScanEvidence = typeof scanEvidence.$inferSelect;
export type InsertScanResult = z.infer<typeof insertScanResultSchema>;
export type InsertScanReport = z.infer<typeof insertScanReportSchema>;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});
